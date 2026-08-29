export const ENS_OUTREACH_VARIATIONS = [
  "Hey @{username}, if you want {name}.zec, it's yours! If not, let me know so someone else can claim it during Early Access.",
  "@{username}, {name}.zec is reserved for you. Claim it during Early Access, or let me know so it can go to someone else.",
  "Hey @{username}, your {name}.zec is waiting. Want it? It is yours. Otherwise, I will open it up during Early Access.",
  "@{username}, we protected {name}.zec with you in mind. Say the word if you want it during Early Access.",
  "Hey @{username}, {name}.zec has your name on it. Claim it now, or let me know so another person can have the opportunity.",
  "@{username}, this is a personal invitation to claim {name}.zec during Early Access. If it is not for you, please let me know.",
  "Hey @{username}, we would love for {name}.zec to be yours. If you are passing, a quick reply lets us offer it onward.",
  "@{username}, {name}.zec is set aside for you. Take it during Early Access or help us place it with someone else.",
  "Hey @{username}, make {name}.zec yours during Early Access. If it is not the right fit, let me know and we will release it.",
  "@{username}, your priority window for {name}.zec is open. Claim it, or let us know so the name can find its next home.",
  "Hey @{username}, {name}.zec is available to you first. If you do not want it, please reply so we can offer it to someone else.",
  "@{username}, we saved {name}.zec for you. It can be yours during Early Access. If not, tell us and we will keep things moving.",
] as const;

export function ensOutreachDraft(username: string, name: string, protectedUrl: string, variation = 0): string {
  const template = ENS_OUTREACH_VARIATIONS[variation] ?? ENS_OUTREACH_VARIATIONS[0];
  return `${template.replaceAll("{username}", username).replaceAll("{name}", name)} ${protectedUrl}`;
}

export type EnsOutreachStatus = "pending" | "preparing" | "ready" | "no_match" | "failed" | "rejected" | "sent";

export type EnsOutreachItem = {
  id: string;
  batchId: string;
  queueOrder: number;
  name: string;
  normalizedName: string;
  xUsername: string;
  followerCount: number;
  sourceReason: string;
  sourceEvidence: string;
  protectedUrl: string;
  draftText: string;
  lookupStatus: "pending" | "matched" | "no_match" | "failed";
  targetTweetId: string | null;
  targetTweetUrl: string | null;
  targetTweetText: string | null;
  pngUrl: string | null;
  status: EnsOutreachStatus;
  error: string | null;
  rejectedAt: string | null;
  reviewReason: string | null;
  sentAt: string | null;
  updatedAt: string | null;
};

export type EnsOutreachBatch = {
  id: string;
  totalItems: number;
  createdAt: string;
  items: EnsOutreachItem[];
};
