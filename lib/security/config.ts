import "server-only";

import { validateAddress } from "@/lib/zns/address-validation";
import {
  competitionPhase,
  formatCompetitionInstant,
  parseCommit,
  parseFeeZec,
  parseGithubSlug,
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
  pinnedCommit: string | null;
  feeAddress: string | null;
  feeZec: string | null;
  feeZats: number | null;
  txTable: string | null;
  owner: string | null;
  repo: string | null;
  appId: string | null;
  installationId: string | null;
  privateKey: string | null;
  submissionsOpen: boolean;
};

function readPrivateKey(): string | null {
  const raw = process.env.SECURITY_COMP_GITHUB_PRIVATE_KEY?.trim() ?? "";
  if (!raw) return null;
  const unquoted = raw.startsWith("\"") && raw.endsWith("\"") ? raw.slice(1, -1) : raw;
  return unquoted.replace(/\\n/g, "\n");
}

function payableAddress(raw: string | undefined): string | null {
  const value = raw?.trim() ?? "";
  if (!value) return null;
  const status = validateAddress(value).status;
  if (status !== "unified" && status !== "sapling" && status !== "transparent") return null;
  return value;
}

export function getSecurityConfig(now = new Date()): SecurityConfig {
  const start = parseInstant(process.env.SECURITY_COMP_START);
  const end = parseInstant(process.env.SECURITY_COMP_END);
  const phase = competitionPhase(start, end, now);
  const feeRaw = process.env.SECURITY_COMP_FEE_ZEC;
  const feeZec = parseFeeZec(feeRaw === undefined || feeRaw.trim() === "" ? "0.01" : feeRaw);
  const feeZats = feeZec ? zecToZats(feeZec) : null;
  const pinnedCommit = parseCommit(process.env.SECURITY_COMP_PINNED_COMMIT);
  const feeAddress = payableAddress(process.env.SECURITY_COMP_FEE_ADDRESS);
  const txTable = parseTxTable(process.env.SECURITY_COMP_TX_TABLE);
  const appId = process.env.SECURITY_COMP_GITHUB_APP_ID?.trim() || null;
  const installationId = process.env.SECURITY_COMP_GITHUB_INSTALLATION_ID?.trim() || null;
  return {
    start,
    end,
    phase,
    pinnedCommit,
    feeAddress,
    feeZec,
    feeZats,
    txTable,
    owner: parseGithubSlug(process.env.SECURITY_COMP_GITHUB_OWNER, "znsme"),
    repo: parseGithubSlug(process.env.SECURITY_COMP_GITHUB_REPO, "zns-mint"),
    appId,
    installationId,
    privateKey: readPrivateKey(),
    submissionsOpen: phase === "open" && Boolean(pinnedCommit && feeAddress && feeZec && feeZats && txTable),
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
    startLabel: config.start ? formatCompetitionInstant(config.start) : null,
    endLabel: config.end ? formatCompetitionInstant(config.end) : null,
    pinnedCommit: config.pinnedCommit,
    feeZec: config.feeZec ?? "0.01",
    submissionsOpen: config.submissionsOpen,
    closedMessage,
  };
}
