export type CompetitionPhase = "before" | "open" | "after" | "unconfigured";

/** Public competition facts. This object must not carry the fee address or GitHub secrets. */
export type SecurityPageModel = {
  phase: CompetitionPhase;
  startLabel: string | null;
  endLabel: string | null;
  pinnedCommit: string | null;
  feeZec: string;
  submissionsOpen: boolean;
  closedMessage: string | null;
};

export function parseInstant(raw: string | undefined): Date | null {
  const value = raw?.trim() ?? "";
  if (!value) return null;
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return null;
  return new Date(time);
}

export function competitionPhase(start: Date | null, end: Date | null, now = new Date()): CompetitionPhase {
  if (!start || !end || start.getTime() >= end.getTime()) return "unconfigured";
  const time = now.getTime();
  if (time < start.getTime()) return "before";
  if (time >= end.getTime()) return "after";
  return "open";
}

export function formatCompetitionInstant(value: Date): string {
  const formatted = new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(value);
  return `${formatted} UTC`;
}

/** Accept a positive ZEC amount with at most 8 decimal places and return a short form. */
export function parseFeeZec(raw: string | undefined): string | null {
  const value = raw?.trim() ?? "";
  if (!/^\d+(\.\d{1,8})?$/.test(value)) return null;
  const [wholePart, fractionPart = ""] = value.split(".");
  const whole = Number(wholePart);
  if (!Number.isFinite(whole)) return null;
  const zats = whole * 100_000_000 + Number(`${fractionPart}00000000`.slice(0, 8));
  if (!Number.isSafeInteger(zats) || zats <= 0) return null;
  const fraction = fractionPart.replace(/0+$/, "");
  return fraction ? `${Number(wholePart)}.${fraction}` : String(Number(wholePart));
}

export function zecToZats(value: string): number | null {
  const canonical = parseFeeZec(value);
  if (!canonical) return null;
  const [wholePart, fractionPart = ""] = canonical.split(".");
  return Number(wholePart) * 100_000_000 + Number(`${fractionPart}00000000`.slice(0, 8));
}

export function parseCommit(raw: string | undefined): string | null {
  const value = raw?.trim().toLowerCase() ?? "";
  if (!/^[0-9a-f]{7,64}$/.test(value)) return null;
  return value;
}

export function parseTxTable(raw: string | undefined): string | null {
  const value = (raw?.trim() || "zn_security_comp").toLowerCase();
  if (!/^[a-z][a-z0-9_]{0,62}$/.test(value)) return null;
  return value;
}

export function parseGithubSlug(raw: string | undefined, fallback: string): string | null {
  const value = raw?.trim() || fallback;
  if (!/^[A-Za-z0-9_.-]{1,100}$/.test(value)) return null;
  return value;
}
