import "server-only";

import { createHmac, randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/db";
import {
  fetchDeterministicSnapshot,
  getDeterministicAssetConfig,
  loadDeterministicLayout,
  loadDeterministicCaptionPolicy,
  renderDeterministicImage,
} from "@/lib/blockinfo-post/deterministic";
import { buildDeterministicCaptionDecision } from "@/lib/blockinfo-post/caption-policy";
import { getDefaultBlockinfoOutputDir } from "@/lib/blockinfo-post/runtime";
import { sanitizeXPostText } from "@/lib/blockinfo-post/x-post-text";
import {
  acquireBlockinfoPostRunLock,
  getBlockinfoPostScheduleState,
  releaseBlockinfoPostRunLock,
} from "@/lib/blockinfo-post/store";
import {
  expandBlockinfoPostDestination,
  type BlockinfoPostDataFreshness,
  type BlockinfoPostDeliveryResult,
  type BlockinfoPostDestination,
  type BlockinfoPostRenderMode,
  type BlockinfoPostResult,
  type BlockinfoPostRowSummary,
  type BlockinfoPostRunArgs,
} from "@/lib/blockinfo-post/types";

const LOG_PREFIX = "[blockinfo-post]";
const ORDER_FIELD_CANDIDATES = ["height", "measured_at", "measured_date"] as const;
const EDIT_CAPABLE_MODELS = new Set([
  "gpt-image-1.5",
  "gpt-image-1",
  "gpt-image-1-mini",
  "chatgpt-image-latest",
]);
const PLACEHOLDER_PATTERN = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
const MAX_OPENAI_INPUT_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_X_POST_LENGTH = 280;

type OrderField = (typeof ORDER_FIELD_CANDIDATES)[number];
type JsonRecord = Record<string, unknown>;

type SharedConfig = {
  promptTemplatePath: string;
  outputDir: string;
  storageBucket: string;
  storagePrefix: string;
};

type OpenAiConfig = {
  imageTemplatePath: string;
  openAiApiKey: string;
  openAiModel: string;
  outputFormat: "png" | "jpeg" | "webp";
  size: "auto" | "1024x1024" | "1536x1024" | "1024x1536";
  quality: "low" | "medium" | "high" | "auto";
  background: "transparent" | "opaque" | "auto";
  inputFidelity: "high" | "low";
};

type TelegramConfig = {
  telegramBotToken: string;
  telegramChatId: string;
};

type XConfig = {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessTokenSecret: string;
};

type OpenAiAssets = {
  promptTemplate: string;
  imageBuffer: Buffer;
  imageMimeType: string;
};

type GeneratedImage = {
  buffer: Buffer;
  mimeType: string;
};

type RunArtifacts = {
  fileName: string;
  localFilePath: string;
  storageObjectPath: string;
  generated: GeneratedImage;
  postText: string;
  summary: BlockinfoPostRowSummary;
};

function log(message: string, details?: unknown) {
  if (details === undefined) {
    console.log(`${LOG_PREFIX} ${message}`);
    return;
  }
  console.log(`${LOG_PREFIX} ${message}`, details);
}

function fail(message: string): never {
  throw new Error(message);
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) fail(`Missing required environment variable: ${name}.`);
  return value;
}

function resolveEnvPath(name: string): string {
  return path.resolve(requireEnv(name));
}

function getSharedConfig(): SharedConfig {
  const configuredOutputDir = process.env.BLOCKINFO_POST_OUTPUT_DIR?.trim();
  const outputDir = configuredOutputDir ? path.resolve(configuredOutputDir) : getDefaultBlockinfoOutputDir();
  if (!outputDir) {
    fail("Missing required environment variable: BLOCKINFO_POST_OUTPUT_DIR.");
  }

  return {
    promptTemplatePath: resolveEnvPath("BLOCKINFO_POST_TEMPLATE_PATH"),
    outputDir: path.resolve(outputDir),
    storageBucket: requireEnv("BLOCKINFO_POST_STORAGE_BUCKET"),
    storagePrefix: requireEnv("BLOCKINFO_POST_STORAGE_PREFIX").replace(/^\/+|\/+$/g, ""),
  };
}

function getOpenAiConfig(): OpenAiConfig {
  const openAiModel = requireEnv("BLOCKINFO_POST_OPENAI_MODEL");
  if (!EDIT_CAPABLE_MODELS.has(openAiModel)) {
    fail(
      `BLOCKINFO_POST_OPENAI_MODEL must support image edits in this implementation. Supported values: ${[...EDIT_CAPABLE_MODELS].join(", ")}.`,
    );
  }

  const outputFormat = (process.env.BLOCKINFO_POST_OUTPUT_FORMAT?.trim() ?? "png") as OpenAiConfig["outputFormat"];
  if (!["png", "jpeg", "webp"].includes(outputFormat)) {
    fail("BLOCKINFO_POST_OUTPUT_FORMAT must be one of: png, jpeg, webp.");
  }

  const size = (process.env.BLOCKINFO_POST_OPENAI_SIZE?.trim() ?? "1024x1024") as OpenAiConfig["size"];
  if (!["auto", "1024x1024", "1536x1024", "1024x1536"].includes(size)) {
    fail("BLOCKINFO_POST_OPENAI_SIZE must be one of: auto, 1024x1024, 1536x1024, 1024x1536.");
  }

  const quality = (process.env.BLOCKINFO_POST_OPENAI_QUALITY?.trim() ?? "high") as OpenAiConfig["quality"];
  if (!["low", "medium", "high", "auto"].includes(quality)) {
    fail("BLOCKINFO_POST_OPENAI_QUALITY must be one of: low, medium, high, auto.");
  }

  const background = (process.env.BLOCKINFO_POST_OPENAI_BACKGROUND?.trim() ?? "auto") as OpenAiConfig["background"];
  if (!["transparent", "opaque", "auto"].includes(background)) {
    fail("BLOCKINFO_POST_OPENAI_BACKGROUND must be one of: transparent, opaque, auto.");
  }

  const inputFidelity = (process.env.BLOCKINFO_POST_OPENAI_INPUT_FIDELITY?.trim() ?? "high") as OpenAiConfig["inputFidelity"];
  if (!["high", "low"].includes(inputFidelity)) {
    fail("BLOCKINFO_POST_OPENAI_INPUT_FIDELITY must be one of: high, low.");
  }

  return {
    imageTemplatePath: resolveEnvPath("BLOCKINFO_POST_TEMPLATE_IMAGE_PATH"),
    openAiApiKey: requireEnv("OPENAI_API_KEY"),
    openAiModel,
    outputFormat,
    size,
    quality,
    background,
    inputFidelity,
  };
}

function getTelegramConfig(): TelegramConfig {
  return {
    telegramBotToken: requireEnv("TELEGRAM_BOT_TOKEN"),
    telegramChatId: requireEnv("TELEGRAM_CHAT_ID"),
  };
}

function getMaxDataAgeHours(): number {
  const raw = process.env.BLOCKINFO_POST_MAX_DATA_AGE_HOURS?.trim();
  if (!raw) return 24;

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    fail("BLOCKINFO_POST_MAX_DATA_AGE_HOURS must be a positive number.");
  }

  return parsed;
}

function getXConfig(): XConfig {
  try {
    return {
      apiKey: requireEnv("X_API_KEY"),
      apiSecret: requireEnv("X_API_SECRET"),
      accessToken: requireEnv("X_ACCESS_TOKEN"),
      accessTokenSecret: requireEnv("X_ACCESS_TOKEN_SECRET"),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    fail(
      `X delivery configuration error: ${message} Required env vars: X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET.`,
    );
  }
}

function getRequestedChannels(destination: BlockinfoPostDestination): Array<"telegram" | "x"> {
  return expandBlockinfoPostDestination(destination);
}

function validateDeliveryConfiguration(destination: BlockinfoPostDestination) {
  for (const channel of getRequestedChannels(destination)) {
    if (channel === "telegram") {
      getTelegramConfig();
      continue;
    }
    getXConfig();
  }
}

function summarizeXApiError(payload: {
  errors?: Array<{ message?: string }>;
  title?: string;
  detail?: string;
}): string | null {
  const message =
    payload.errors?.map((entry) => entry.message?.trim()).filter(Boolean).join("; ") || payload.detail || payload.title;
  return message?.trim() || null;
}

function formatXHttpError(args: {
  stage: "media upload" | "post creation";
  response: Response;
  message: string | null;
  context?: string;
}): never {
  const statusLine = `HTTP ${args.response.status}${args.response.statusText ? ` ${args.response.statusText}` : ""}`;
  const detail = args.message ? ` ${args.message}` : "";
  const suffix = args.context ? ` ${args.context}` : "";

  if (args.response.status === 401 || args.response.status === 403) {
    fail(
      `X ${args.stage} failure (${statusLine}). Authentication or app-permission failure.${detail} Check X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET, and confirm the X app has write access.${suffix}`,
    );
  }

  if (args.response.status === 429) {
    fail(`X ${args.stage} failure (${statusLine}). Rate limited by X API.${detail}${suffix}`);
  }

  fail(`X ${args.stage} failure (${statusLine}).${detail}${suffix}`);
}

function inferMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    default:
      fail(`Unsupported image template file type for ${filePath}. Expected png, jpg, jpeg, or webp.`);
  }
}

async function loadPromptTemplate(shared: SharedConfig): Promise<string> {
  log("Loading prompt template.");
  try {
    const promptTemplate = await readFile(shared.promptTemplatePath, "utf8");
    if (!promptTemplate.trim()) {
      fail(`Prompt template file is empty: ${shared.promptTemplatePath}.`);
    }
    return promptTemplate;
  } catch (error) {
    fail(
      `Missing template file or unreadable prompt template at ${shared.promptTemplatePath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function loadOpenAiAssets(shared: SharedConfig, config: OpenAiConfig): Promise<OpenAiAssets> {
  log("Loading OpenAI image template asset.");
  const promptTemplate = await loadPromptTemplate(shared);

  let imageBuffer: Buffer;
  try {
    imageBuffer = await readFile(config.imageTemplatePath);
  } catch (error) {
    fail(
      `Missing template file or unreadable image template at ${config.imageTemplatePath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (imageBuffer.byteLength === 0) {
    fail(`Image template file is empty: ${config.imageTemplatePath}.`);
  }

  if (imageBuffer.byteLength > MAX_OPENAI_INPUT_IMAGE_BYTES) {
    fail(
      `Image template file exceeds the OpenAI edit input limit of ${MAX_OPENAI_INPUT_IMAGE_BYTES} bytes: ${config.imageTemplatePath}.`,
    );
  }

  return {
    promptTemplate,
    imageBuffer,
    imageMimeType: inferMimeType(config.imageTemplatePath),
  };
}

function pickOrderField(row: JsonRecord): OrderField {
  for (const field of ORDER_FIELD_CANDIDATES) {
    if (field in row) return field;
  }
  fail(
    `public.zebra_stats does not expose any supported ordering fields. Expected one of: ${ORDER_FIELD_CANDIDATES.join(", ")}.`,
  );
}

function toNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function toNullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function parseMeasuredDateAtUtcStart(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = new Date(`${trimmed}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function evaluateDataFreshness(summary: BlockinfoPostRowSummary, now = new Date()): BlockinfoPostDataFreshness {
  const maxAgeHours = getMaxDataAgeHours();

  if (summary.measuredAt) {
    const measuredAt = new Date(summary.measuredAt);
    if (!Number.isNaN(measuredAt.getTime())) {
      const ageHours = Math.max(0, (now.getTime() - measuredAt.getTime()) / (60 * 60 * 1000));
      return {
        ok: ageHours <= maxAgeHours,
        sourceField: "measured_at",
        sourceTimestamp: measuredAt.toISOString(),
        maxAgeHours,
        ageHours,
      };
    }
  }

  if (summary.measuredDate) {
    const measuredDate = parseMeasuredDateAtUtcStart(summary.measuredDate);
    if (measuredDate) {
      const ageHours = Math.max(0, (now.getTime() - measuredDate.getTime()) / (60 * 60 * 1000));
      return {
        ok: ageHours <= maxAgeHours,
        sourceField: "measured_date",
        sourceTimestamp: measuredDate.toISOString(),
        maxAgeHours,
        ageHours,
      };
    }
  }

  return {
    ok: false,
    sourceField: null,
    sourceTimestamp: null,
    maxAgeHours,
    ageHours: null,
  };
}

function formatAgeHours(ageHours: number | null): string {
  if (ageHours == null || !Number.isFinite(ageHours)) return "unknown";
  return ageHours >= 100 ? ageHours.toFixed(0) : ageHours.toFixed(1);
}

function buildStaleDataSkipReason(freshness: BlockinfoPostDataFreshness): string {
  const sourceField = freshness.sourceField ?? "no usable timestamp field";
  const sourceTimestamp = freshness.sourceTimestamp ?? "N/A";
  const age = formatAgeHours(freshness.ageHours);
  return `Skipped scheduled publish because zebra_stats is stale. Source: ${sourceField}; timestamp: ${sourceTimestamp}; age: ${age}h; max allowed: ${freshness.maxAgeHours}h.`;
}

function buildStaleDataWarningMessage(freshness: BlockinfoPostDataFreshness): string {
  const sourceField = freshness.sourceField ?? "none";
  const sourceTimestamp = freshness.sourceTimestamp ?? "N/A";
  const age = formatAgeHours(freshness.ageHours);
  return [
    "Warning: scheduled blockinfo post skipped because zebra_stats is stale.",
    `Timestamp field: ${sourceField}`,
    `Latest row timestamp: ${sourceTimestamp}`,
    `Age hours: ${age}`,
    `Max allowed age hours: ${freshness.maxAgeHours}`,
    "Telegram image post and X post were skipped.",
  ].join("\n");
}

async function fetchLatestZebraStatsRow(): Promise<{ row: JsonRecord; summary: BlockinfoPostRowSummary }> {
  log("Fetching zebra_stats sample row.");
  const sampleQuery = await db.from("zebra_stats").select("*").limit(1);
  if (sampleQuery.error) {
    fail(`Supabase connection failure while inspecting public.zebra_stats: ${sampleQuery.error.message}`);
  }

  const sampleRow = (sampleQuery.data?.[0] ?? null) as JsonRecord | null;
  if (!sampleRow) {
    fail("No rows found in public.zebra_stats.");
  }

  const orderField = pickOrderField(sampleRow);
  log(`Ordering zebra_stats by ${orderField}.`);
  const latestQuery = await db
    .from("zebra_stats")
    .select("*")
    .order(orderField, { ascending: false, nullsFirst: false })
    .limit(1);

  if (latestQuery.error) {
    fail(`Supabase connection failure while fetching latest zebra_stats row: ${latestQuery.error.message}`);
  }

  const latestRow = (latestQuery.data?.[0] ?? null) as JsonRecord | null;
  if (!latestRow) {
    fail("No rows found in public.zebra_stats after ordering.");
  }

  return {
    row: latestRow,
    summary: {
      orderField,
      height: toNullableNumber(latestRow.height),
      measuredAt: toNullableString(latestRow.measured_at),
      measuredDate: toNullableString(latestRow.measured_date),
      bestBlockHash: toNullableString(latestRow.best_block_hash),
    },
  };
}

function serializeTokenValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value);
  }
  return JSON.stringify(value);
}

function buildPromptTokens(args: {
  row: JsonRecord;
  summary: BlockinfoPostRowSummary;
  imagePath: string | null;
}): Record<string, string> {
  const tokens: Record<string, string> = {};
  for (const [key, value] of Object.entries(args.row)) {
    tokens[key] = serializeTokenValue(value);
  }

  tokens.height = tokens.height || (args.summary.height != null ? String(args.summary.height) : "");
  tokens.measured_at = tokens.measured_at || (args.summary.measuredAt ?? "");
  tokens.measured_date = tokens.measured_date || (args.summary.measuredDate ?? "");
  tokens.best_block_hash = tokens.best_block_hash || (args.summary.bestBlockHash ?? "");
  tokens.row_json = JSON.stringify(args.row);
  tokens.row_json_pretty = JSON.stringify(args.row, null, 2);
  tokens.generated_at_iso = new Date().toISOString();
  tokens.order_field = args.summary.orderField;
  tokens.image_template_path = args.imagePath ?? "";

  return tokens;
}

function renderPrompt(template: string, tokens: Record<string, string>): string {
  const unresolved = new Set<string>();
  const rendered = template.replace(PLACEHOLDER_PATTERN, (_, tokenName: string) => {
    const value = tokens[tokenName];
    if (value === undefined) {
      unresolved.add(tokenName);
      return "";
    }
    return value;
  });

  if (unresolved.size > 0) {
    fail(`Invalid template data. Unresolved placeholders: ${[...unresolved].sort().join(", ")}.`);
  }

  PLACEHOLDER_PATTERN.lastIndex = 0;
  if (PLACEHOLDER_PATTERN.test(rendered)) {
    fail("Invalid template data. Prompt still contains unresolved placeholders after rendering.");
  }

  if (!rendered.trim()) {
    fail("Invalid template data. Rendered prompt is empty.");
  }

  return rendered.trim();
}

function buildPostText(prompt: string): string {
  const collapsed = prompt.replace(/\s+/g, " ").trim();
  if (collapsed.length <= MAX_X_POST_LENGTH) return collapsed;
  return `${collapsed.slice(0, MAX_X_POST_LENGTH - 3).trimEnd()}...`;
}

function toDataUrl(buffer: Buffer, mimeType: string): string {
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

function buildFileStem(summary: BlockinfoPostRowSummary): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const heightPart = summary.height != null ? `height-${summary.height}` : "height-unknown";
  const hashPart = summary.bestBlockHash ? summary.bestBlockHash.slice(0, 12) : "hash-unknown";
  return `blockinfo-post-${timestamp}-${heightPart}-${hashPart}`;
}

function outputExtension(format: "png" | "jpeg" | "webp"): string {
  return format === "jpeg" ? "jpg" : format;
}

function buildPaths(shared: SharedConfig, summary: BlockinfoPostRowSummary, format: "png" | "jpeg" | "webp") {
  const fileStem = buildFileStem(summary);
  const extension = outputExtension(format);
  const fileName = `${fileStem}.${extension}`;
  const localFilePath = path.join(shared.outputDir, fileName);
  const storageObjectPath = `${shared.storagePrefix}/${fileName}`.replace(/\/+/g, "/");
  return { fileName, localFilePath, storageObjectPath };
}

async function generateOpenAiImage(
  config: OpenAiConfig,
  prompt: string,
  imageBuffer: Buffer,
  imageMimeType: string,
): Promise<GeneratedImage> {
  log(`Generating image with ${config.openAiModel}.`);
  const response = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.openAiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.openAiModel,
      prompt,
      images: [{ image_url: toDataUrl(imageBuffer, imageMimeType) }],
      background: config.background,
      input_fidelity: config.inputFidelity,
      quality: config.quality,
      size: config.size,
      output_format: config.outputFormat,
      moderation: "auto",
      n: 1,
    }),
  });

  const payload = (await response.json().catch(async () => ({ raw: await response.text().catch(() => "") }))) as {
    data?: Array<{ b64_json?: string }>;
    error?: { message?: string };
    raw?: string;
  };

  if (!response.ok) {
    fail(`Image generation failure: ${payload.error?.message ?? payload.raw ?? response.statusText}`);
  }

  const base64 = payload.data?.[0]?.b64_json;
  if (!base64) {
    fail("Image generation failure: response did not include image bytes.");
  }

  return {
    buffer: Buffer.from(base64, "base64"),
    mimeType: config.outputFormat === "png" ? "image/png" : config.outputFormat === "jpeg" ? "image/jpeg" : "image/webp",
  };
}

async function saveImageToDisk(buffer: Buffer, filePath: string) {
  log(`Saving generated image to ${filePath}.`);
  try {
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, buffer);
  } catch (error) {
    fail(`File write failure for ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function uploadImageToStorage(
  shared: SharedConfig,
  buffer: Buffer,
  mimeType: string,
  storageObjectPath: string,
) {
  log(`Uploading generated image to Supabase Storage at ${storageObjectPath}.`);
  const { error } = await db.storage.from(shared.storageBucket).upload(storageObjectPath, buffer, {
    contentType: mimeType,
    upsert: false,
  });

  if (error) {
    fail(`Supabase Storage upload failure: ${error.message}`);
  }
}

async function sendTelegramPhoto(
  config: TelegramConfig,
  buffer: Buffer,
  mimeType: string,
  fileName: string,
  summary: BlockinfoPostRowSummary,
  caption: string,
): Promise<number | null> {
  log("Sending generated image to Telegram.");
  const formData = new FormData();
  formData.append("chat_id", config.telegramChatId);
  formData.append(
    "caption",
    caption,
  );
  formData.append("photo", new Blob([new Uint8Array(buffer)], { type: mimeType }), fileName);

  const response = await fetch(`https://api.telegram.org/bot${config.telegramBotToken}/sendPhoto`, {
    method: "POST",
    body: formData,
  });

  const payload = (await response.json().catch(async () => ({ description: await response.text().catch(() => "") }))) as {
    ok?: boolean;
    description?: string;
    result?: { message_id?: number };
  };

  if (!response.ok || !payload.ok) {
    fail(`Telegram send failure: ${payload.description ?? response.statusText}`);
  }

  return payload.result?.message_id ?? null;
}

async function sendTelegramMessage(config: TelegramConfig, text: string): Promise<number | null> {
  log("Sending Telegram warning message.");
  const response = await fetch(`https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_id: config.telegramChatId,
      text,
    }),
  });

  const payload = (await response.json().catch(async () => ({ description: await response.text().catch(() => "") }))) as {
    ok?: boolean;
    description?: string;
    result?: { message_id?: number };
  };

  if (!response.ok || !payload.ok) {
    fail(`Telegram warning failure: ${payload.description ?? response.statusText}`);
  }

  return payload.result?.message_id ?? null;
}

function percentEncode(value: string): string {
  return encodeURIComponent(value)
    .replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function buildOauthHeader(args: {
  method: "POST";
  url: string;
  query?: Record<string, string>;
  bodyParams?: Record<string, string>;
  consumerKey: string;
  consumerSecret: string;
  token: string;
  tokenSecret: string;
}): string {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: args.consumerKey,
    oauth_nonce: randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: args.token,
    oauth_version: "1.0",
  };

  const allPairs: Array<[string, string]> = [];
  for (const [key, value] of Object.entries({ ...(args.query ?? {}), ...(args.bodyParams ?? {}), ...oauthParams })) {
    allPairs.push([percentEncode(key), percentEncode(value)]);
  }

  const normalizedParams = allPairs
    .sort(([keyA, valueA], [keyB, valueB]) => {
      if (keyA === keyB) return valueA.localeCompare(valueB);
      return keyA.localeCompare(keyB);
    })
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  const baseString = [args.method.toUpperCase(), percentEncode(args.url), percentEncode(normalizedParams)].join("&");
  const signingKey = `${percentEncode(args.consumerSecret)}&${percentEncode(args.tokenSecret)}`;
  const signature = createHmac("sha1", signingKey).update(baseString).digest("base64");
  oauthParams.oauth_signature = signature;

  return `OAuth ${Object.entries(oauthParams)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${percentEncode(key)}="${percentEncode(value)}"`)
    .join(", ")}`;
}

async function uploadMediaToX(config: XConfig, buffer: Buffer): Promise<string> {
  const url = "https://upload.twitter.com/1.1/media/upload.json";
  const bodyParams = {
    media_data: buffer.toString("base64"),
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: buildOauthHeader({
        method: "POST",
        url,
        bodyParams,
        consumerKey: config.apiKey,
        consumerSecret: config.apiSecret,
        token: config.accessToken,
        tokenSecret: config.accessTokenSecret,
      }),
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    },
    body: new URLSearchParams(bodyParams).toString(),
  });

  const payload = (await response.json().catch(async () => ({ errors: [{ message: await response.text().catch(() => "") }] }))) as {
    media_id_string?: string;
    errors?: Array<{ message?: string }>;
    title?: string;
    detail?: string;
  };

  const message = summarizeXApiError(payload);

  if (!response.ok) {
    formatXHttpError({
      stage: "media upload",
      response,
      message,
      context: "Endpoint: upload.twitter.com/1.1/media/upload.json.",
    });
  }

  if (!payload.media_id_string) {
    fail(
      `X media upload failure: upload endpoint returned success but no media_id_string. ${message ? `API detail: ${message}. ` : ""}Endpoint: upload.twitter.com/1.1/media/upload.json.`,
    );
  }

  return payload.media_id_string;
}

async function createXPost(config: XConfig, text: string, mediaId: string): Promise<string | null> {
  const url = "https://api.x.com/2/tweets";
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: buildOauthHeader({
        method: "POST",
        url,
        consumerKey: config.apiKey,
        consumerSecret: config.apiSecret,
        token: config.accessToken,
        tokenSecret: config.accessTokenSecret,
      }),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      media: { media_ids: [mediaId] },
    }),
  });

  const payload = (await response.json().catch(async () => ({ errors: [{ message: await response.text().catch(() => "") }] }))) as {
    data?: { id?: string };
    errors?: Array<{ message?: string }>;
    title?: string;
    detail?: string;
  };

  const message = summarizeXApiError(payload);

  if (!response.ok) {
    formatXHttpError({
      stage: "post creation",
      response,
      message,
      context: text.length > MAX_X_POST_LENGTH ? `Post text length ${text.length} exceeds ${MAX_X_POST_LENGTH}.` : undefined,
    });
  }

  if (!payload.data?.id) {
    fail(
      `X post creation failure: create tweet endpoint returned success but no tweet id.${message ? ` API detail: ${message}.` : ""}`,
    );
  }

  return payload.data.id ?? null;
}

async function sendXPost(config: XConfig, buffer: Buffer, text: string): Promise<string | null> {
  log("Sending generated image to X.");
  const mediaId = await uploadMediaToX(config, buffer);
  return createXPost(config, sanitizeXPostText(text), mediaId);
}

function emptyDelivery(): NonNullable<BlockinfoPostResult["delivery"]> {
  return {
    telegram: { attempted: false, ok: false, error: null, telegramMessageId: null },
    x: { attempted: false, ok: false, error: null, xPostId: null },
  };
}

function baseResult(args: {
  run: BlockinfoPostRunArgs;
  providerModel: string;
  summary: BlockinfoPostRowSummary;
  dataFreshness: BlockinfoPostDataFreshness;
  prompt: string;
  postText: string;
  promptTemplatePath: string;
  imageTemplatePath?: string;
  deterministicBackgroundPath?: string;
  deterministicLayoutPath?: string;
  deterministicCaptionPolicyPath?: string;
  deterministicSnapshot?: BlockinfoPostResult["deterministicSnapshot"];
  deterministicCaptionDecision?: BlockinfoPostResult["deterministicCaptionDecision"];
  localFilePath: string;
  storageObjectPath: string;
}): BlockinfoPostResult {
  return {
    ok: true,
    mode: args.run.mode,
    renderMode: args.run.renderMode,
    providerModel: args.providerModel,
    destinationsRequested: args.run.destination,
    selectedRowSummary: args.summary,
    dataFreshness: args.dataFreshness,
    renderedPrompt: args.prompt,
    postText: args.postText,
    promptTemplatePath: args.promptTemplatePath,
    imageTemplatePath: args.imageTemplatePath,
    deterministicBackgroundPath: args.deterministicBackgroundPath,
    deterministicLayoutPath: args.deterministicLayoutPath,
    deterministicCaptionPolicyPath: args.deterministicCaptionPolicyPath,
    deterministicSnapshot: args.deterministicSnapshot,
    deterministicCaptionDecision: args.deterministicCaptionDecision,
    intendedLocalFilePath: args.localFilePath,
    intendedStorageObjectPath: args.storageObjectPath,
    scheduled: !!args.run.scheduled,
    delivery: emptyDelivery(),
  };
}

async function buildRunArtifacts(args: {
  shared: SharedConfig;
  summary: BlockinfoPostRowSummary;
  postText: string;
  generated: GeneratedImage;
  format: "png" | "jpeg" | "webp";
}): Promise<RunArtifacts> {
  const { fileName, localFilePath, storageObjectPath } = buildPaths(args.shared, args.summary, args.format);
  await saveImageToDisk(args.generated.buffer, localFilePath);
  await uploadImageToStorage(args.shared, args.generated.buffer, args.generated.mimeType, storageObjectPath);

  return {
    fileName,
    localFilePath,
    storageObjectPath,
    generated: args.generated,
    postText: args.postText,
    summary: args.summary,
  };
}

async function dispatchDeliveries(
  destination: BlockinfoPostDestination,
  artifacts: RunArtifacts,
): Promise<{
  delivery: NonNullable<BlockinfoPostResult["delivery"]>;
  telegramMessageId: number | null;
  xPostId: string | null;
}> {
  const delivery = emptyDelivery();
  let telegramMessageId: number | null = null;
  let xPostId: string | null = null;

  for (const channel of expandBlockinfoPostDestination(destination)) {
    if (channel === "telegram") {
      delivery.telegram.attempted = true;
      try {
        telegramMessageId = await sendTelegramPhoto(
          getTelegramConfig(),
          artifacts.generated.buffer,
          artifacts.generated.mimeType,
          artifacts.fileName,
          artifacts.summary,
          artifacts.postText,
        );
        delivery.telegram.ok = true;
        delivery.telegram.telegramMessageId = telegramMessageId;
      } catch (error) {
        delivery.telegram.error = error instanceof Error ? error.message : String(error);
      }
      continue;
    }

    delivery.x.attempted = true;
    try {
      xPostId = await sendXPost(getXConfig(), artifacts.generated.buffer, artifacts.postText);
      delivery.x.ok = true;
      delivery.x.xPostId = xPostId;
    } catch (error) {
      delivery.x.error = error instanceof Error ? error.message : String(error);
    }
  }

  return { delivery, telegramMessageId, xPostId };
}

function collectDeliveryErrors(
  delivery: NonNullable<BlockinfoPostResult["delivery"]>,
  destination: BlockinfoPostDestination,
): string[] {
  return expandBlockinfoPostDestination(destination)
    .map((channel) => delivery[channel])
    .filter((entry) => entry.attempted && !entry.ok && entry.error)
    .map((entry) => entry.error as string);
}

function outputFormatForRenderMode(renderMode: BlockinfoPostRenderMode, openAiConfig?: OpenAiConfig): "png" | "jpeg" | "webp" {
  return renderMode === "openai" ? openAiConfig?.outputFormat ?? "png" : "png";
}

export async function runBlockinfoPost(run: BlockinfoPostRunArgs): Promise<BlockinfoPostResult> {
  log(`Starting workflow in ${run.mode} mode for ${run.destination} via ${run.renderMode}.`);

  let lockToken: string | null = null;
  let partialResult: BlockinfoPostResult | null = null;

  try {
    const shared = getSharedConfig();
    validateDeliveryConfiguration(run.destination);
    const promptTemplate = await loadPromptTemplate(shared);
    const { row, summary } = await fetchLatestZebraStatsRow();
    const dataFreshness = evaluateDataFreshness(summary);

    const openAiConfig = run.renderMode === "openai" ? getOpenAiConfig() : null;
    const deterministicAssets = run.renderMode === "deterministic" ? getDeterministicAssetConfig() : null;
    const prompt = renderPrompt(
      promptTemplate,
      buildPromptTokens({
        row,
        summary,
        imagePath:
          run.renderMode === "openai"
            ? openAiConfig?.imageTemplatePath ?? null
            : deterministicAssets?.backgroundPath ?? null,
      }),
    );
    const postText = buildPostText(prompt);

    if (run.renderMode === "deterministic") {
      const snapshot = await fetchDeterministicSnapshot(row);
      const captionPolicy = await loadDeterministicCaptionPolicy(deterministicAssets?.captionPolicyPath);
      const captionDecision = buildDeterministicCaptionDecision(snapshot, summary, captionPolicy);
      const deterministicPostText = buildPostText(captionDecision.text);
      const layout = await loadDeterministicLayout(deterministicAssets?.layoutPath);
      const { localFilePath, storageObjectPath } = buildPaths(shared, summary, "png");

      partialResult = baseResult({
        run,
        providerModel: "deterministic-template",
        summary,
        dataFreshness,
        prompt,
        postText: deterministicPostText,
        promptTemplatePath: shared.promptTemplatePath,
        deterministicBackgroundPath: deterministicAssets?.backgroundPath,
        deterministicLayoutPath: deterministicAssets?.layoutPath,
        deterministicCaptionPolicyPath: deterministicAssets?.captionPolicyPath,
        deterministicSnapshot: snapshot,
        deterministicCaptionDecision: captionDecision,
        localFilePath,
        storageObjectPath,
      });

      if (run.mode === "dry-run") {
        if (run.scheduled && !dataFreshness.ok) {
          partialResult.skipped = true;
          partialResult.skipReason = buildStaleDataSkipReason(dataFreshness);
        }
        partialResult.schedule = await getBlockinfoPostScheduleState().catch(() => undefined);
        log("Dry run completed.");
        return partialResult;
      }

      const lock = await acquireBlockinfoPostRunLock();
      lockToken = lock.token;

      if (run.scheduled && !dataFreshness.ok) {
        const warningText = buildStaleDataWarningMessage(dataFreshness);
        partialResult.skipped = true;
        partialResult.skipReason = buildStaleDataSkipReason(dataFreshness);
        partialResult.delivery = emptyDelivery();

        try {
          partialResult.delivery.telegram.attempted = true;
          const telegramMessageId = await sendTelegramMessage(getTelegramConfig(), warningText);
          partialResult.delivery.telegram.ok = true;
          partialResult.delivery.telegram.telegramMessageId = telegramMessageId;
          partialResult.telegramMessageId = telegramMessageId;
          partialResult.schedule = await releaseBlockinfoPostRunLock({
            token: lockToken,
            status: "skipped_stale_data",
            errorMessage: warningText,
          });
          lockToken = null;
          return partialResult;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          partialResult.ok = false;
          partialResult.error = errorMessage;
          partialResult.delivery.telegram.error = errorMessage;
          partialResult.schedule = await releaseBlockinfoPostRunLock({
            token: lockToken!,
            status: "stale_data_warning_failed",
            errorMessage: errorMessage,
          });
          lockToken = null;
          return partialResult;
        }
      }

      const generated = {
        buffer: await renderDeterministicImage({
          backgroundPath: deterministicAssets!.backgroundPath,
          layout,
          summary,
          snapshot,
        }),
        mimeType: "image/png",
      } satisfies GeneratedImage;

      const artifacts = await buildRunArtifacts({
        shared,
        summary,
        postText: deterministicPostText,
        generated,
        format: "png",
      });

      const { delivery, telegramMessageId, xPostId } = await dispatchDeliveries(run.destination, artifacts);
      const deliveryErrors = collectDeliveryErrors(delivery, run.destination);

      const schedule = await releaseBlockinfoPostRunLock({
        token: lockToken,
        status: deliveryErrors.length === 0 ? "succeeded" : "partial_failure",
        errorMessage: deliveryErrors.length > 0 ? deliveryErrors.join(" | ") : null,
      });
      lockToken = null;

      return {
        ...partialResult,
        ok: deliveryErrors.length === 0,
        localFilePath: artifacts.localFilePath,
        storageObjectPath: artifacts.storageObjectPath,
        telegramMessageId,
        xPostId,
        delivery,
        schedule,
        error: deliveryErrors.length > 0 ? deliveryErrors.join(" | ") : undefined,
      };
    }

    const assets = await loadOpenAiAssets(shared, openAiConfig!);
    const { localFilePath, storageObjectPath } = buildPaths(shared, summary, outputFormatForRenderMode(run.renderMode, openAiConfig!));
    partialResult = baseResult({
      run,
      providerModel: openAiConfig!.openAiModel,
      summary,
      dataFreshness,
      prompt,
      postText,
      promptTemplatePath: shared.promptTemplatePath,
      imageTemplatePath: openAiConfig!.imageTemplatePath,
      localFilePath,
      storageObjectPath,
    });

    if (run.mode === "dry-run") {
      if (run.scheduled && !dataFreshness.ok) {
        partialResult.skipped = true;
        partialResult.skipReason = buildStaleDataSkipReason(dataFreshness);
      }
      partialResult.schedule = await getBlockinfoPostScheduleState().catch(() => undefined);
      log("Dry run completed.");
      return partialResult;
    }

    const lock = await acquireBlockinfoPostRunLock();
    lockToken = lock.token;

    if (run.scheduled && !dataFreshness.ok) {
      const warningText = buildStaleDataWarningMessage(dataFreshness);
      partialResult.skipped = true;
      partialResult.skipReason = buildStaleDataSkipReason(dataFreshness);
      partialResult.delivery = emptyDelivery();

      try {
        partialResult.delivery.telegram.attempted = true;
        const telegramMessageId = await sendTelegramMessage(getTelegramConfig(), warningText);
        partialResult.delivery.telegram.ok = true;
        partialResult.delivery.telegram.telegramMessageId = telegramMessageId;
        partialResult.telegramMessageId = telegramMessageId;
        partialResult.schedule = await releaseBlockinfoPostRunLock({
          token: lockToken,
          status: "skipped_stale_data",
          errorMessage: warningText,
        });
        lockToken = null;
        return partialResult;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        partialResult.ok = false;
        partialResult.error = errorMessage;
        partialResult.delivery.telegram.error = errorMessage;
        partialResult.schedule = await releaseBlockinfoPostRunLock({
          token: lockToken!,
          status: "stale_data_warning_failed",
          errorMessage: errorMessage,
        });
        lockToken = null;
        return partialResult;
      }
    }

    const generated = await generateOpenAiImage(
      openAiConfig!,
      prompt,
      assets.imageBuffer,
      assets.imageMimeType,
    );

    const artifacts = await buildRunArtifacts({
      shared,
      summary,
      postText,
      generated,
      format: openAiConfig!.outputFormat,
    });

    const { delivery, telegramMessageId, xPostId } = await dispatchDeliveries(run.destination, artifacts);
    const deliveryErrors = collectDeliveryErrors(delivery, run.destination);

    const schedule = await releaseBlockinfoPostRunLock({
      token: lockToken,
      status: deliveryErrors.length === 0 ? "succeeded" : "partial_failure",
      errorMessage: deliveryErrors.length > 0 ? deliveryErrors.join(" | ") : null,
    });
    lockToken = null;

    return {
      ...partialResult,
      ok: deliveryErrors.length === 0,
      localFilePath: artifacts.localFilePath,
      storageObjectPath: artifacts.storageObjectPath,
      telegramMessageId,
      xPostId,
      delivery,
      schedule,
      error: deliveryErrors.length > 0 ? deliveryErrors.join(" | ") : undefined,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log("Workflow failed.", message);

    let schedule;
    if (lockToken) {
      try {
        schedule = await releaseBlockinfoPostRunLock({
          token: lockToken,
          status: "failed",
          errorMessage: message,
        });
      } catch (releaseError) {
        log("Failed to release blockinfo-post lock after error.", releaseError);
      }
    } else {
      try {
        schedule = await getBlockinfoPostScheduleState();
      } catch {
        schedule = undefined;
      }
    }

    return {
      ...(partialResult ?? {
        ok: false,
        mode: run.mode,
        renderMode: run.renderMode,
        destinationsRequested: run.destination,
        scheduled: !!run.scheduled,
        delivery: emptyDelivery(),
      }),
      ok: false,
      error: message,
      schedule,
    };
  }
}
