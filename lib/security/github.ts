import "server-only";

import { createSign } from "node:crypto";
import { getSecurityConfig } from "./config";
import type { GitHubPrivateReportBody } from "./github-body";

const API = "https://api.github.com";
const API_VERSION = "2026-03-10";

export class GitHubError extends Error {
  readonly kind: "auth" | "validation" | "unavailable";

  constructor(kind: "auth" | "validation" | "unavailable") {
    super(kind);
    this.name = "GitHubError";
    this.kind = kind;
  }
}

export type GitHubAdvisoryRef = {
  ghsaId: string;
  htmlUrl: string | null;
};

type TokenCache = { token: string; expiresAt: number; key: string };
let tokenCache: TokenCache | null = null;

function appJwt(appId: string, privateKey: string): string {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ iat: now - 30, exp: now + 540, iss: appId })).toString("base64url");
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${payload}`);
  signer.end();
  return `${header}.${payload}.${signer.sign(privateKey).toString("base64url")}`;
}

function githubHeaders(token: string): HeadersInit {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": API_VERSION,
    "User-Agent": "zcashnames-security-competition",
  };
}

async function githubFetch(url: string, token: string, init?: RequestInit): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(url, { ...init, headers: { ...githubHeaders(token), ...(init?.headers ?? {}) }, redirect: "manual" });
  } catch {
    throw new GitHubError("unavailable");
  }
  if (response.status >= 300 && response.status < 400) throw new GitHubError("unavailable");
  return response;
}

function classify(status: number): GitHubError {
  if (status === 401 || status === 403) {
    tokenCache = null;
    return new GitHubError("auth");
  }
  if (status === 422) return new GitHubError("validation");
  return new GitHubError("unavailable");
}

async function installationToken(): Promise<string> {
  const config = getSecurityConfig();
  if (!config.appId || !config.installationId || !config.privateKey || !config.repo) {
    throw new GitHubError("auth");
  }
  const key = `${config.appId}:${config.installationId}:${config.repo}`;
  if (tokenCache && tokenCache.key === key && tokenCache.expiresAt > Date.now() + 60_000) {
    return tokenCache.token;
  }
  let jwt: string;
  try {
    jwt = appJwt(config.appId, config.privateKey);
  } catch {
    throw new GitHubError("auth");
  }
  const response = await githubFetch(`${API}/app/installations/${encodeURIComponent(config.installationId)}/access_tokens`, jwt, {
    method: "POST",
    body: JSON.stringify({
      repositories: [config.repo],
      permissions: { security_advisories: "write" },
    }),
  });
  if (!response.ok) {
    console.error("[security] github token", { status: response.status });
    throw classify(response.status);
  }
  const body = await response.json() as { token?: unknown; expires_at?: unknown };
  if (typeof body.token !== "string" || !body.token) throw new GitHubError("auth");
  const expiresAt = typeof body.expires_at === "string" ? Date.parse(body.expires_at) : Date.now() + 8 * 60_000;
  tokenCache = { token: body.token, expiresAt: Number.isFinite(expiresAt) ? expiresAt : Date.now() + 8 * 60_000, key };
  return body.token;
}

function advisoryRef(row: { ghsa_id?: unknown; html_url?: unknown }): GitHubAdvisoryRef | null {
  if (typeof row.ghsa_id !== "string" || !/^[A-Za-z0-9-]{1,64}$/.test(row.ghsa_id)) return null;
  const htmlUrl = typeof row.html_url === "string" && row.html_url.startsWith("https://github.com/") && row.html_url.length <= 300
    ? row.html_url
    : null;
  return { ghsaId: row.ghsa_id, htmlUrl };
}

function nextPage(link: string | null): string | null {
  const part = link?.split(",").find((entry) => entry.includes("rel=\"next\""));
  return part?.match(/<([^>]+)>/)?.[1] ?? null;
}

async function listState(token: string, owner: string, repo: string, state: "triage" | "draft", ticketId: string): Promise<GitHubAdvisoryRef | null> {
  let url: string | null = `${API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/security-advisories?state=${state}&per_page=100`;
  for (let page = 0; url && page < 3; page += 1) {
    const response = await githubFetch(url, token);
    if (response.status === 404) return null;
    if (!response.ok) {
      console.error("[security] github list", { status: response.status });
      throw classify(response.status);
    }
    const rows = await response.json() as Array<{ summary?: unknown; ghsa_id?: unknown; html_url?: unknown }>;
    if (!Array.isArray(rows)) throw new GitHubError("unavailable");
    const prefix = `[${ticketId}] `;
    const found = rows.find((row) => typeof row.summary === "string" && row.summary.startsWith(prefix));
    if (found) return advisoryRef(found);
    url = nextPage(response.headers.get("link"));
  }
  return null;
}

export async function findPrivateReport(ticketId: string): Promise<GitHubAdvisoryRef | null> {
  const config = getSecurityConfig();
  if (!config.owner || !config.repo) throw new GitHubError("auth");
  const token = await installationToken();
  return await listState(token, config.owner, config.repo, "triage", ticketId)
    ?? await listState(token, config.owner, config.repo, "draft", ticketId);
}

export async function createPrivateReport(body: GitHubPrivateReportBody): Promise<GitHubAdvisoryRef> {
  const config = getSecurityConfig();
  if (!config.owner || !config.repo) throw new GitHubError("auth");
  const token = await installationToken();
  const response = await githubFetch(
    `${API}/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/security-advisories/reports`,
    token,
    { method: "POST", body: JSON.stringify(body) },
  );
  if (!response.ok) {
    let field = "";
    try {
      const parsed = await response.json() as { errors?: Array<{ field?: unknown }> };
      const candidate = parsed.errors?.[0]?.field;
      field = typeof candidate === "string" ? candidate.slice(0, 80) : "";
    } catch {
      field = "";
    }
    console.error("[security] github create", { status: response.status, field });
    throw classify(response.status);
  }
  const created = advisoryRef(await response.json() as { ghsa_id?: unknown; html_url?: unknown });
  if (!created) throw new GitHubError("unavailable");
  return created;
}

/** Test hook. Installation tokens are process-local and must not survive env changes. */
export function clearGitHubTokenCache(): void {
  tokenCache = null;
}
