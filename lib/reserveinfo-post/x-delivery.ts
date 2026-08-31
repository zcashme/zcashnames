export function buildReserveinfoXPostBody(args: {
  text: string;
  mediaId?: string;
  replyTo?: string | null;
  quoteTweetId?: string | null;
}) {
  return {
    text: args.text,
    ...(args.mediaId ? { media: { media_ids: [args.mediaId] } } : {}),
    ...(args.replyTo ? { reply: { in_reply_to_tweet_id: args.replyTo } } : {}),
    ...(args.quoteTweetId ? { quote_tweet_id: args.quoteTweetId } : {}),
  };
}
