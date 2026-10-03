import "server-only";

import { db } from "@/lib/db";
import { validateAddress } from "@/lib/zns/address-validation";
import {
  competitionPhase,
  formatCompetitionInstant,
  parseFeeZec,
  parseInstant,
  parseTxTable,
  zecToZats,
  type CompetitionPhase,
  type SecurityPageModel,
} from "./window";

export type { SecurityPageModel } from "./window";

export type SecurityConfig = {
  start: Date | null;
  end: Date | null;
  phase: CompetitionPhase;
  feeAddress: string | null;
  feeZec: string | null;
  feeZats: number | null;
  txTable: string | null;
  submissionsOpen: boolean;
};

function payableAddress(raw: string | undefined): string | null {
  const value = raw?.trim() ?? "";
  if (!value) return null;
  const status = validateAddress(value).status;
  if (status !== "unified" && status !== "sapling" && status !== "transparent") return null;
  return value;
}

export function getSecurityConfig(now = new Date()): SecurityConfig {
  const start = parseInstant(process.env.SECURITY_COMP_START || "2026-10-03T20:00:00Z");
  const end = parseInstant(process.env.SECURITY_COMP_END || "2026-10-13T20:00:00Z");
  const phase = competitionPhase(start, end, now);
  const feeRaw = process.env.SECURITY_COMP_FEE_ZEC;
  const feeZec = parseFeeZec(feeRaw === undefined || feeRaw.trim() === "" ? "0.01" : feeRaw);
  const feeZats = feeZec ? zecToZats(feeZec) : null;
  const feeAddress = payableAddress(process.env.SECURITY_COMP_FEE_ADDRESS);
  const txTable = parseTxTable(process.env.SECURITY_COMP_TX_TABLE);
  return {
    start,
    end,
    phase,
    feeAddress,
    feeZec,
    feeZats,
    txTable,
    submissionsOpen: phase === "open" && Boolean(feeAddress && feeZec && feeZats && txTable),
  };
}

/** Use the active scanner registry row as the payment recipient. Never select its view_key. */
export async function getActiveSecurityConfig(now = new Date()): Promise<SecurityConfig> {
  const config = getSecurityConfig(now);
  let feeAddress: string | null = null;
  if (config.txTable) {
    const { data, error } = await db
      .from("zn_view_keys")
      .select("recipient_address")
      .eq("reserve_table_name", config.txTable)
      .eq("is_active", true)
      .maybeSingle();
    if (error) {
      console.error("[security] fee recipient lookup", { code: error.code });
    } else {
      feeAddress = payableAddress(typeof data?.recipient_address === "string" ? data.recipient_address : undefined);
    }
  }
  return {
    ...config,
    feeAddress,
    submissionsOpen: config.phase === "open" && Boolean(
      feeAddress && config.feeZec && config.feeZats && config.txTable,
    ),
  };
}

export function securityPageModel(config: SecurityConfig): SecurityPageModel {
  const closedMessage = !config.start || !config.end || config.phase === "unconfigured"
    ? "Competition dates are not set."
    : config.phase === "before"
      ? "Submissions open when the competition starts."
      : config.phase === "after"
        ? "The competition is closed. New reports are not being accepted."
        : config.submissionsOpen
          ? null
          : "Submissions are not open yet.";
  return {
    phase: config.phase,
    startAt: config.start?.getTime() ?? null,
    endAt: config.end?.getTime() ?? null,
    startLabel: config.start ? formatCompetitionInstant(config.start) : null,
    endLabel: config.end ? formatCompetitionInstant(config.end) : null,
    feeZec: config.feeZec ?? "0.01",
    submissionsOpen: config.submissionsOpen,
    closedMessage,
  };
}
