import { isLocalRequestHost } from "@/lib/admin/local-only";

export interface InternalBasicAuthCredentials {
  username: string;
  password: string;
}

export function getInternalBasicAuthCredentials():
  | InternalBasicAuthCredentials
  | null {
  const username = process.env.ADMIN_USERNAME?.trim();
  const password = process.env.ADMIN_PASSWORD?.trim();
  if (!username || !password) return null;
  return { username, password };
}

export function hasConfiguredInternalBasicAuth(): boolean {
  return getInternalBasicAuthCredentials() !== null;
}

export function parseBasicAuthHeader(
  authorization: string | null | undefined,
): InternalBasicAuthCredentials | null {
  const value = authorization?.trim();
  if (!value || !value.startsWith("Basic ")) return null;

  const encoded = value.slice("Basic ".length).trim();
  if (!encoded) return null;

  try {
    const decoded = atob(encoded);
    const separatorIndex = decoded.indexOf(":");
    if (separatorIndex < 0) return null;

    return {
      username: decoded.slice(0, separatorIndex),
      password: decoded.slice(separatorIndex + 1),
    };
  } catch {
    return null;
  }
}

export function isAuthorizedInternalBasicAuthHeader(
  authorization: string | null | undefined,
): boolean {
  const configured = getInternalBasicAuthCredentials();
  if (!configured) return false;

  const provided = parseBasicAuthHeader(authorization);
  if (!provided) return false;

  return (
    provided.username === configured.username &&
    provided.password === configured.password
  );
}

export function shouldBypassInternalBasicAuth(
  host: string | null | undefined,
): boolean {
  return isLocalRequestHost(host);
}
