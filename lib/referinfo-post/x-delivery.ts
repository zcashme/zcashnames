export const REFERINFO_X_THREAD_MODES = ["linear", "root_only", "quote_root"] as const;

export type ReferinfoXThreadMode = (typeof REFERINFO_X_THREAD_MODES)[number];
export type ReferinfoXPostKind = "closing_note" | string;

export type ReferinfoXPostTarget =
  | { type: "standalone" }
  | { type: "quote"; quotedTweetId: string }
  | { type: "reply"; replyToTweetId: string };

export function normalizeReferinfoXThreadMode(value: unknown): ReferinfoXThreadMode {
  return value === "quote_root" || value === "root_only" || value === "linear" ? value : "linear";
}

export function formatReferinfoXThreadMode(mode: ReferinfoXThreadMode): string {
  if (mode === "quote_root") return "Daily quote roots with CTA replies";
  if (mode === "root_only") return "Root post only";
  return "Linear reply thread";
}

export function getReferinfoXPostTarget(args: {
  mode: ReferinfoXThreadMode;
  kind: ReferinfoXPostKind;
  latestTopLevelTweetId: string | null;
}): ReferinfoXPostTarget {
  if (args.mode === "quote_root") {
    if (args.kind === "closing_note") {
      if (!args.latestTopLevelTweetId) {
        throw new Error("Cannot publish the X CTA because no current top-level post is available.");
      }
      return { type: "reply", replyToTweetId: args.latestTopLevelTweetId };
    }

    return args.latestTopLevelTweetId
      ? { type: "quote", quotedTweetId: args.latestTopLevelTweetId }
      : { type: "standalone" };
  }

  return args.latestTopLevelTweetId
    ? { type: "reply", replyToTweetId: args.latestTopLevelTweetId }
    : { type: "standalone" };
}

export function shouldBlockReferinfoXDeliveryAfterFailure(kind: ReferinfoXPostKind): boolean {
  return kind !== "closing_note";
}

export function buildXPostRequestBody(args: {
  text: string;
  mediaId?: string | null;
  target?: ReferinfoXPostTarget;
}) {
  return {
    text: args.text,
    ...(args.mediaId ? { media: { media_ids: [args.mediaId] } } : {}),
    ...(args.target?.type === "reply" ? { reply: { in_reply_to_tweet_id: args.target.replyToTweetId } } : {}),
    ...(args.target?.type === "quote" ? { quote_tweet_id: args.target.quotedTweetId } : {}),
  };
}
