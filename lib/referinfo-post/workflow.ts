import "server-only";

import { createHmac, randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildReferinfoDraftBundle } from "@/lib/referinfo-post/analytics";
import {
  getDeterministicLayoutPathForKind,
  getReferinfoDeterministicAssetConfig,
  loadReferinfoCaptionPolicy,
  loadReferinfoDeterministicLayout,
  renderReferinfoDeterministicImage,
} from "@/lib/referinfo-post/deterministic";
import { db } from "@/lib/db";
import { getDefaultReferinfoOutputDir } from "@/lib/referinfo-post/runtime";
import {
  acquireReferinfoPostRunLock,
  getReferinfoPostScheduleState,
  releaseReferinfoPostRunLock,
} from "@/lib/referinfo-post/store";
import {
  expandReferinfoPostDestination,
  isReferinfoImagePostKind,
  type ReferinfoPlannedPost,
  type ReferinfoPostDestination,
  type ReferinfoPostResult,
  type ReferinfoPostRunArgs,
} from "@/lib/referinfo-post/types";
import type { ReferinfoPostTemplateVariant } from "@/lib/referinfo-post/template-variant";

const LOG_PREFIX = "[referinfo-post]";

type SharedConfig = {
  outputDir: string;
  storageBucket: string;
  storagePrefix: string;
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

type GeneratedArtifact = {
  post: ReferinfoPlannedPost;
  buffer: Buffer;
  mimeType: string;
  fileName: string;
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

function getSharedConfig(): SharedConfig {
  const configuredOutputDir = process.env.REFERINFO_POST_OUTPUT_DIR?.trim();
  const storageBucket = process.env.REFERINFO_POST_STORAGE_BUCKET?.trim() || process.env.BLOCKINFO_POST_STORAGE_BUCKET?.trim();
  if (!storageBucket) {
    fail("Referinfo storage configuration error: missing REFERINFO_POST_STORAGE_BUCKET. Fallback BLOCKINFO_POST_STORAGE_BUCKET is also unset.");
  }

  return {
    outputDir: path.resolve(configuredOutputDir || getDefaultReferinfoOutputDir()),
    storageBucket,
    storagePrefix: (process.env.REFERINFO_POST_STORAGE_PREFIX?.trim() || "referinfo/weekly").replace(/^\/+|\/+$/g, ""),
  };
}

function getTelegramConfig(): TelegramConfig {
  return {
    telegramBotToken: requireEnv("TELEGRAM_BOT_TOKEN"),
    telegramChatId: requireEnv("TELEGRAM_CHAT_ID"),
  };
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

function validateDeliveryConfiguration(destination: ReferinfoPostDestination) {
  for (const channel of expandReferinfoPostDestination(destination)) {
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

  if (args.response.status === 402) {
    fail(`X ${args.stage} failure (${statusLine}).${detail}${suffix}`);
  }

  if (args.response.status === 429) {
    fail(`X ${args.stage} failure (${statusLine}). Rate limited by X API.${detail}${suffix}`);
  }

  fail(`X ${args.stage} failure (${statusLine}).${detail}${suffix}`);
}

function percentEncode(value: string): string {
  return encodeURIComponent(value)
    .replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function normalizeXPostText(text: string): string {
  let cashtagCount = 0;
  return text.replace(/\$([A-Za-z][A-Za-z0-9]{0,9})/g, (_, symbol: string) => {
    cashtagCount += 1;
    return cashtagCount === 1 ? `$${symbol}` : symbol;
  });
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

function buildFileStem(post: ReferinfoPlannedPost, weekStartIso: string): string {
  const weekKey = weekStartIso.slice(0, 10);
  return `referinfo-post-${weekKey}-${String(post.order + 1).padStart(2, "0")}-${post.kind}`;
}

function buildPaths(shared: SharedConfig, post: ReferinfoPlannedPost, weekStartIso: string) {
  const fileStem = buildFileStem(post, weekStartIso);
  const fileName = `${fileStem}.png`;
  const localFilePath = path.join(shared.outputDir, fileName);
  const storageObjectPath = `${shared.storagePrefix}/${weekStartIso.slice(0, 10)}/${fileName}`.replace(/\/+/g, "/");
  return { fileName, localFilePath, storageObjectPath };
}

async function saveImageToDisk(buffer: Buffer, filePath: string) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, buffer);
}

async function uploadImageToStorage(shared: SharedConfig, buffer: Buffer, storageObjectPath: string) {
  const { error } = await db.storage.from(shared.storageBucket).upload(storageObjectPath, buffer, {
    contentType: "image/png",
    upsert: true,
  });
  if (error) {
    fail(`Supabase Storage upload failure: ${error.message}`);
  }
}

async function sendTelegramPhoto(
  config: TelegramConfig,
  artifact: GeneratedArtifact,
): Promise<number | null> {
  const formData = new FormData();
  formData.append("chat_id", config.telegramChatId);
  formData.append("caption", artifact.post.caption);
  formData.append("photo", new Blob([new Uint8Array(artifact.buffer)], { type: artifact.mimeType }), artifact.fileName);

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

async function sendTelegramMessage(
  config: TelegramConfig,
  text: string,
): Promise<number | null> {
  const response = await fetch(`https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: config.telegramChatId,
      text,
      disable_web_page_preview: true,
    }),
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
    fail(`X media upload failure: upload endpoint returned success but no media_id_string. ${message ? `API detail: ${message}. ` : ""}Endpoint: upload.twitter.com/1.1/media/upload.json.`);
  }

  return payload.media_id_string;
}

async function createXPost(config: XConfig, text: string, mediaId?: string | null, replyToTweetId?: string | null): Promise<string | null> {
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
      ...(mediaId ? { media: { media_ids: [mediaId] } } : {}),
      ...(replyToTweetId ? { reply: { in_reply_to_tweet_id: replyToTweetId } } : {}),
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
    });
  }

  if (!payload.data?.id) {
    fail(`X post creation failure: create tweet endpoint returned success but no tweet id.${message ? ` API detail: ${message}.` : ""}`);
  }

  return payload.data.id ?? null;
}

async function sendXPost(config: XConfig, artifact: GeneratedArtifact, replyToTweetId?: string | null): Promise<string | null> {
  const mediaId = await uploadMediaToX(config, artifact.buffer);
  return createXPost(config, normalizeXPostText(artifact.post.caption), mediaId, replyToTweetId);
}

function emptyDelivery() {
  return {
    telegram: { attempted: false, ok: false, error: null, telegramMessageId: null },
    x: { attempted: false, ok: false, error: null, xPostId: null },
  } satisfies ReferinfoPlannedPost["delivery"];
}

async function buildReferinfoPlannedPosts(shared: SharedConfig, now?: Date, templateVariant?: ReferinfoPostTemplateVariant) {
  const assets = getReferinfoDeterministicAssetConfig(templateVariant);
  const policy = await loadReferinfoCaptionPolicy(assets.captionPolicyPath);
  const bundle = await buildReferinfoDraftBundle({
    policy,
    now,
  });
  const ordered = bundle.thread.rootKind
    ? [...bundle.posts].sort((a, b) => {
        const orderA = policy.postOrder.indexOf(a.kind);
        const orderB = policy.postOrder.indexOf(b.kind);
        return orderA - orderB;
      })
    : bundle.posts;

  return {
    ...bundle,
    plannedPosts: ordered.map((post, index) => {
      const layoutPath = isReferinfoImagePostKind(post.kind) ? getDeterministicLayoutPathForKind(post.kind, assets) : "";
      const paths = isReferinfoImagePostKind(post.kind)
        ? buildPaths(shared, {
            ...post,
            delivery: emptyDelivery(),
            localFilePath: "",
            storageObjectPath: "",
            deterministicLayoutPath: layoutPath,
          }, bundle.reportWindow.weekStartIso)
        : { localFilePath: "", storageObjectPath: "" };

      return {
        ...post,
        order: index,
        localFilePath: paths.localFilePath,
        storageObjectPath: paths.storageObjectPath,
        deterministicLayoutPath: layoutPath,
        delivery: emptyDelivery(),
      } satisfies ReferinfoPlannedPost;
    }),
    assets,
  };
}

export async function buildReferinfoPreviewResult(now?: Date): Promise<Pick<ReferinfoPostResult, "reportWindow" | "thread" | "plannedPosts" | "deterministicBackgroundPath" | "deterministicCaptionPolicyPath">> {
  const shared = getSharedConfig();
  const preview = await buildReferinfoPlannedPosts(shared, now);
  return {
    reportWindow: preview.reportWindow,
    thread: preview.thread,
    plannedPosts: preview.plannedPosts,
    deterministicBackgroundPath: preview.assets.backgroundPath,
    deterministicCaptionPolicyPath: preview.assets.captionPolicyPath,
  };
}

async function dispatchTelegramArtifacts(artifacts: GeneratedArtifact[], plannedPosts: ReferinfoPlannedPost[]) {
  const config = getTelegramConfig();
  const artifactByKind = new Map(artifacts.map((artifact) => [artifact.post.kind, artifact]));
  for (const post of plannedPosts) {
    post.delivery.telegram.attempted = true;
    try {
      const artifact = artifactByKind.get(post.kind);
      const messageId = artifact
        ? await sendTelegramPhoto(config, artifact)
        : await sendTelegramMessage(config, post.caption);
      post.delivery.telegram.ok = true;
      post.delivery.telegram.telegramMessageId = messageId;
    } catch (error) {
      post.delivery.telegram.error = error instanceof Error ? error.message : String(error);
    }
  }
}

async function dispatchXArtifacts(
  artifacts: GeneratedArtifact[],
  plannedPosts: ReferinfoPlannedPost[],
  xThreadMode: "linear" | "root_only",
): Promise<string | null> {
  const config = getXConfig();
  let previousTweetId: string | null = null;
  let rootTweetId: string | null = null;
  let threadBroken = false;
  const artifactByKind = new Map(artifacts.map((artifact) => [artifact.post.kind, artifact]));
  const xPosts = xThreadMode === "root_only" ? plannedPosts.slice(0, 1) : plannedPosts;

  for (const post of xPosts) {
    post.delivery.x.attempted = true;

    if (threadBroken) {
      post.delivery.x.error = "Cannot continue X thread because a previous X post failed.";
      continue;
    }

    try {
      const artifact = artifactByKind.get(post.kind);
      const postId: string | null = artifact
        ? await sendXPost(config, artifact, previousTweetId)
        : await createXPost(config, normalizeXPostText(post.caption), null, previousTweetId);
      post.delivery.x.ok = true;
      post.delivery.x.xPostId = postId;
      previousTweetId = postId ?? null;
      if (!rootTweetId) rootTweetId = postId ?? null;
    } catch (error) {
      post.delivery.x.error = error instanceof Error ? error.message : String(error);
      threadBroken = true;
    }
  }

  return rootTweetId;
}

function collectDeliveryErrors(plannedPosts: ReferinfoPlannedPost[], destination: ReferinfoPostDestination): string[] {
  const errors: string[] = [];
  for (const post of plannedPosts) {
    for (const channel of expandReferinfoPostDestination(destination)) {
      const entry = post.delivery[channel];
      if (entry.attempted && !entry.ok && entry.error) {
        errors.push(`${post.kind}/${channel}: ${entry.error}`);
      }
    }
  }
  return errors;
}

export async function runReferinfoPost(run: ReferinfoPostRunArgs): Promise<ReferinfoPostResult> {
  log(`Starting workflow in ${run.mode} mode for ${run.destination} via ${run.renderMode}.`);

  let lockToken: string | null = null;
  let partialResult: ReferinfoPostResult | null = null;

  try {
    const shared = getSharedConfig();
    validateDeliveryConfiguration(run.destination);
    const preview = await buildReferinfoPlannedPosts(shared, undefined, run.templateVariant);

    partialResult = {
      ok: true,
      mode: run.mode,
      renderMode: run.renderMode,
      providerModel: "deterministic-template",
      destinationsRequested: run.destination,
      scheduled: !!run.scheduled,
      reportWindow: preview.reportWindow,
      thread: preview.thread,
      plannedPosts: preview.plannedPosts,
      deterministicBackgroundPath: preview.assets.backgroundPath,
      deterministicCaptionPolicyPath: preview.assets.captionPolicyPath,
    };

    const artifacts: GeneratedArtifact[] = [];
    for (const post of preview.plannedPosts) {
      if (!isReferinfoImagePostKind(post.kind)) continue;
      const layout = await loadReferinfoDeterministicLayout(post.deterministicLayoutPath, post.table.columns.map((column) => column.key));
      const buffer = await renderReferinfoDeterministicImage({
        backgroundPath: preview.assets.backgroundPath,
        templateVariant: preview.assets.templateVariant,
        layout,
        post,
        reportWindow: preview.reportWindow,
      });
      artifacts.push({
        post,
        buffer,
        mimeType: "image/png",
        fileName: path.basename(post.localFilePath),
      });
    }

    if (run.mode === "dry-run") {
      partialResult.schedule = await getReferinfoPostScheduleState().catch(() => undefined);
      return partialResult;
    }

    const lock = await acquireReferinfoPostRunLock();
    lockToken = lock.token;

    for (const artifact of artifacts) {
      await saveImageToDisk(artifact.buffer, artifact.post.localFilePath);
      await uploadImageToStorage(shared, artifact.buffer, artifact.post.storageObjectPath);
    }

    if (run.destination === "telegram" || run.destination === "both") {
      await dispatchTelegramArtifacts(artifacts, preview.plannedPosts);
    }

    let rootXPostId: string | null = null;
    if (run.destination === "x" || run.destination === "both") {
      rootXPostId = await dispatchXArtifacts(artifacts, preview.plannedPosts, preview.thread.xThreadMode);
    }

    const deliveryErrors = collectDeliveryErrors(preview.plannedPosts, run.destination);
    const schedule = await releaseReferinfoPostRunLock({
      token: lockToken,
      status: deliveryErrors.length === 0 ? "succeeded" : "partial_failure",
      errorMessage: deliveryErrors.length > 0 ? deliveryErrors.join(" | ") : null,
    });
    lockToken = null;

    return {
      ...partialResult,
      ok: deliveryErrors.length === 0,
      plannedPosts: preview.plannedPosts,
      rootXPostId,
      schedule,
      error: deliveryErrors.length > 0 ? deliveryErrors.join(" | ") : undefined,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log("Workflow failed.", message);

    let schedule;
    if (lockToken) {
      try {
        schedule = await releaseReferinfoPostRunLock({
          token: lockToken,
          status: "failed",
          errorMessage: message,
        });
      } catch (releaseError) {
        log("Failed to release referinfo-post lock after error.", releaseError);
      }
    } else {
      try {
        schedule = await getReferinfoPostScheduleState();
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
        thread: {
          rootKind: "summary_top10",
          xThreadMode: "linear",
          telegramDeliveryMode: "sequential",
        },
        plannedPosts: [],
      }),
      ok: false,
      error: message,
      schedule,
    };
  }
}
