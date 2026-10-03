import type { SecuritySeverity, ValidatedReport } from "./report";

export type GitHubPrivateReportBody = {
  summary: string;
  description: string;
  severity: SecuritySeverity;
  cwe_ids: string[];
  vulnerabilities: Array<{
    package: { ecosystem: "rust"; name: string };
    vulnerable_version_range: string;
  }>;
};

function section(label: string, value: string): string {
  return `${label}\n${value.trim() ? value : "(none)"}`;
}

/**
 * Map a competition report onto the documented
 * POST /repos/{owner}/{repo}/security-advisories/reports body.
 * Fields GitHub does not accept are placed in the description.
 */
export function buildGitHubReportBody(args: {
  ticketId: string;
  report: ValidatedReport;
  affectedCommit: string;
  packageName: string;
}): GitHubPrivateReportBody {
  const summary = `[${args.ticketId}] ${args.report.title}`.slice(0, 1024);
  const description = [
    section("Competition ticket", args.ticketId),
    section("Affected commit", args.affectedCommit),
    section("Affected module", args.report.affectedModule),
    section("Researcher handle", args.report.researcherHandle),
    section("GitHub username", args.report.githubUsername || "(none)"),
    section("Payout address", args.report.payoutAddress),
    section("Description", args.report.description),
    section("Impact", args.report.impact),
    section("Proof of concept", args.report.proofOfConcept || "(none)"),
    section("Suggested fix", args.report.suggestedFix || "(none)"),
  ].join("\n\n");

  if (description.length > 65_000) {
    throw new Error("report description exceeds the GitHub limit");
  }

  return {
    summary,
    description,
    severity: args.report.severity,
    cwe_ids: [args.report.cwe],
    vulnerabilities: [
      {
        package: { ecosystem: "rust", name: args.packageName },
        vulnerable_version_range: args.affectedCommit,
      },
    ],
  };
}
