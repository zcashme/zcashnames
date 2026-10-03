import "server-only";

import { NextResponse } from "next/server";
import { SECURITY_MESSAGES, SecurityError } from "./errors";

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

export function stringField(record: Record<string, unknown>, key: string): string {
  return typeof record[key] === "string" ? record[key].trim() : "";
}

export function securityJson(body: unknown, status = 200) {
  return NextResponse.json(body, { status });
}

export function securityErrorResponse(error: unknown) {
  if (error instanceof SecurityError) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
        code: error.code,
        ...(error.retryAfter != null ? { retryAfter: error.retryAfter } : {}),
      },
      { status: error.status },
    );
  }
  console.error("[security] unexpected", error instanceof Error ? error.name : "unknown");
  return NextResponse.json(
    { ok: false, error: SECURITY_MESSAGES.unexpected, code: "unexpected" },
    { status: 500 },
  );
}
