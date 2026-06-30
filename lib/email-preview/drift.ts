import "server-only";

import { createHash } from "crypto";
import fs from "fs";
import path from "path";

export type EmailPreviewDriftStatus = "in_sync" | "drift" | "unknown";

export interface EmailPreviewDriftManifest {
  files: Array<{
    internal: string;
    main: string;
  }>;
}

export interface EmailPreviewDriftResult {
  status: EmailPreviewDriftStatus;
  detail: string;
}

const INTERNAL_ROOT = process.cwd();
const MAIN_ROOT = path.resolve(INTERNAL_ROOT, "..", "dotzcash_main");

function readNormalizedFile(root: string, relativePath: string): string | null {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) return null;
  return fs.readFileSync(absolutePath, "utf8").replace(/\r\n/g, "\n");
}

function normalizeForHash(content: string): string {
  return content
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function hashBundle(root: string, files: string[]): string | null {
  const hash = createHash("sha256");

  for (const relativePath of files) {
    const content = readNormalizedFile(root, relativePath);
    if (content === null) return null;
    hash.update(`${relativePath}\n`);
    hash.update(normalizeForHash(content));
    hash.update("\n---\n");
  }

  return hash.digest("hex");
}

export function getPreviewDriftStatus(
  manifest: EmailPreviewDriftManifest | null | undefined,
): EmailPreviewDriftResult {
  if (!manifest || manifest.files.length === 0) {
    return { status: "unknown", detail: "No drift manifest configured." };
  }

  for (const file of manifest.files) {
    if (readNormalizedFile(INTERNAL_ROOT, file.internal) === null) {
      return {
        status: "unknown",
        detail: `Missing internal file: ${file.internal}`,
      };
    }
    if (readNormalizedFile(MAIN_ROOT, file.main) === null) {
      return {
        status: "unknown",
        detail: `Missing main file: ${file.main}`,
      };
    }
  }

  const internalHash = hashBundle(
    INTERNAL_ROOT,
    manifest.files.map((file) => file.internal),
  );
  const mainHash = hashBundle(
    MAIN_ROOT,
    manifest.files.map((file) => file.main),
  );

  if (!internalHash || !mainHash) {
    return { status: "unknown", detail: "Unable to compute comparison bundle hash." };
  }

  if (internalHash === mainHash) {
    return { status: "in_sync", detail: "Internal and main bundles match." };
  }

  return { status: "drift", detail: "Internal and main bundles differ." };
}
