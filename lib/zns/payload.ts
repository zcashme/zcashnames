import { isValidUsername, validateAddress } from "./name";

export type PayloadLevel = "empty" | "valid" | "warning" | "error";

export type PayloadValidation = {
  level: PayloadLevel;
  message: string;
};

export type ActionSpec = {
  action: string;
  parts: Array<{ type: "name" | "address" | "nonce" | "price" }>;
};

const ACTION_SPECS: ActionSpec[] = [
  { action: "CLAIM", parts: [{ type: "name" }, { type: "address" }] },
  { action: "BUY", parts: [{ type: "name" }, { type: "address" }] },
  { action: "UPDATE", parts: [{ type: "name" }, { type: "address" }, { type: "nonce" }] },
  { action: "LIST", parts: [{ type: "name" }, { type: "price" }, { type: "nonce" }] },
  { action: "DELIST", parts: [{ type: "name" }, { type: "nonce" }] },
  { action: "RELEASE", parts: [{ type: "name" }, { type: "nonce" }] },
];

const ACTION_SPEC_MAP = new Map(ACTION_SPECS.map((s) => [s.action, s]));

function isWholeNumber(value: string): boolean {
  return /^\d+$/.test(value);
}

function validatePart(type: "name" | "address" | "nonce" | "price", value: string): PayloadValidation | null {
  switch (type) {
    case "name":
      if (!isValidUsername(value)) {
        return { level: "error", message: "Name is invalid. Use lowercase a-z and 0-9, 1 to 62 chars." };
      }
      return null;
    case "address": {
      const v = validateAddress(value);
      if (v.status === "viewkey" || v.status === "tex" || v.status === "invalid") {
        return { level: "error", message: v.warning || "Address is invalid for this payload." };
      }
      if (v.status !== "unified") return { level: "warning", message: `Address warning: ${v.warning}` };
      return null;
    }
    case "nonce":
      if (!isWholeNumber(value)) {
        return { level: "error", message: "Nonce must be a whole number." };
      }
      return null;
    case "price":
      if (!isWholeNumber(value) || Number(value) <= 0) {
        return { level: "error", message: "Price must be a positive whole number in zats." };
      }
      return null;
  }
}

export function validatePayload(payload: string): PayloadValidation {
  const raw = payload.trim();
  if (!raw) return { level: "empty", message: "No payload yet. Paste the payload from the signing modal." };

  const colonIdx = raw.indexOf(":");
  if (colonIdx === -1) {
    return { level: "error", message: "Missing action. Expected format like CLAIM:name:address." };
  }

  const action = raw.slice(0, colonIdx).toUpperCase();
  const spec = ACTION_SPEC_MAP.get(action);

  if (!spec) {
    return {
      level: "warning",
      message: "Unrecognized action format. You can still sign, but your transaction may not be interpreted correctly.",
    };
  }

  const expectedParts = spec.parts.length + 1;
  const parts = raw.split(":");
  if (parts.length !== expectedParts) {
    const partNames = spec.parts.map((p) => p.type === "price" ? "price_zats" : p.type).join(":");
    return { level: "error", message: `Expected ${action}:${partNames}.` };
  }

  for (let i = 0; i < spec.parts.length; i++) {
    const partVal = parts[i + 1] ?? "";
    const err = validatePart(spec.parts[i].type, partVal);
    if (err) return err;
  }

  return { level: "valid", message: `${action} payload looks valid.` };
}

const LEVEL_STYLE: Record<PayloadLevel, { border: string; color: string }> = {
  empty: { border: "1px solid var(--border-muted)", color: "var(--fg-muted)" },
  valid: { border: "1px solid var(--color-accent-green)", color: "var(--color-accent-green)" },
  warning: { border: "1px solid #ca8a04", color: "#ca8a04" },
  error: { border: "1px solid var(--accent-red, #e05252)", color: "var(--accent-red, #e05252)" },
};

export function payloadBorderStyle(level: PayloadLevel): string {
  return LEVEL_STYLE[level].border;
}

export function payloadMessageColor(level: PayloadLevel): string {
  return LEVEL_STYLE[level].color;
}