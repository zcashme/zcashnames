import { validateAddress } from "@/lib/zns/address-validation";

export const SECURITY_SEVERITIES = ["critical", "high", "medium", "low"] as const;
export type SecuritySeverity = (typeof SECURITY_SEVERITIES)[number];

export type ValidatedReport = {
  title: string;
  affectedModule: string;
  severity: SecuritySeverity;
  cwe: string;
  description: string;
  impact: string;
  proofOfConcept: string;
  suggestedFix: string;
  researcherHandle: string;
  githubUsername: string;
  payoutAddress: string;
};

const TEXT_LIMIT = 12_000;

function cleanLine(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > max || /[\u0000-\u001F]/.test(trimmed)) return null;
  return trimmed;
}

/** Empty string means blank. Null means the value is not acceptable. */
function normalizeBlock(value: unknown, max: number): string | null {
  if (value == null || value === "") return "";
  if (typeof value !== "string") return null;
  const normalized = value.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (normalized.length > max || /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(normalized)) return null;
  return normalized;
}

export function validateSecurityReport(input: unknown): { ok: true; value: ValidatedReport } | { ok: false; error: string } {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Enter the report fields and try again." };
  }
  const body = input as Record<string, unknown>;
  const title = cleanLine(body.title, 200);
  if (!title) return { ok: false, error: "Enter a title up to 200 characters." };
  const affectedModule = cleanLine(body.affectedModule, 200);
  if (!affectedModule) return { ok: false, error: "Enter the affected module or file." };

  const severityRaw = typeof body.severity === "string" ? body.severity.trim().toLowerCase() : "";
  if (!SECURITY_SEVERITIES.includes(severityRaw as SecuritySeverity)) {
    return { ok: false, error: "Choose a severity of critical, high, medium, or low." };
  }
  const severity = severityRaw as SecuritySeverity;

  const cweRaw = typeof body.cwe === "string" ? body.cwe.trim().toUpperCase() : "";
  const cweMatch = /^CWE-(\d{1,5})$/.exec(cweRaw);
  if (!cweMatch) return { ok: false, error: "Enter a CWE id such as CWE-287." };
  const cwe = `CWE-${cweMatch[1]}`;

  const description = normalizeBlock(body.description, TEXT_LIMIT);
  if (!description) return { ok: false, error: "Enter a description." };
  const impact = normalizeBlock(body.impact, TEXT_LIMIT);
  if (!impact) return { ok: false, error: "Enter the impact." };
  const proof = normalizeBlock(body.proofOfConcept, TEXT_LIMIT);
  if (proof == null) return { ok: false, error: "The proof of concept is too long." };
  if ((severity === "critical" || severity === "high") && !proof) {
    return { ok: false, error: "A proof of concept is required for critical and high findings." };
  }
  const suggestedFix = normalizeBlock(body.suggestedFix, TEXT_LIMIT);
  if (suggestedFix == null) return { ok: false, error: "The suggested fix is too long." };

  const researcherHandle = cleanLine(body.researcherHandle, 64);
  if (!researcherHandle) return { ok: false, error: "Enter the researcher handle." };

  const usernameRaw = typeof body.githubUsername === "string" ? body.githubUsername.trim().replace(/^@/, "") : "";
  if (usernameRaw && !/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/.test(usernameRaw)) {
    return { ok: false, error: "Enter a GitHub username, or leave it blank." };
  }

  const payoutAddress = typeof body.payoutAddress === "string" ? body.payoutAddress.trim() : "";
  const address = validateAddress(payoutAddress);
  if (address.status !== "unified" && address.status !== "sapling" && address.status !== "transparent") {
    return { ok: false, error: "Enter a Zcash unified, Sapling, or transparent payout address." };
  }

  return {
    ok: true,
    value: {
      title,
      affectedModule,
      severity,
      cwe,
      description,
      impact,
      proofOfConcept: proof,
      suggestedFix,
      researcherHandle,
      githubUsername: usernameRaw,
      payoutAddress,
    },
  };
}
