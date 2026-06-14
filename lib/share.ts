export function buildXShareHref(message: string): string {
  return `https://x.com/intent/post?text=${encodeURIComponent(message)}`;
}

export function buildTelegramShareHref(message: string): string {
  return `https://t.me/share/url?url=${encodeURIComponent(message)}`;
}

export function buildEmailShareHref(subject: string, message: string): string {
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
}

export function buildShareMessageWithLink(message: string, shareUrl: string): string {
  const trimmedMessage = message.trim();
  const trimmedShareUrl = shareUrl.trim();

  if (!trimmedShareUrl) return trimmedMessage;
  if (trimmedMessage.includes(trimmedShareUrl)) return trimmedMessage;
  if (!trimmedMessage) return trimmedShareUrl;

  return `${trimmedMessage}\n${trimmedShareUrl}`;
}
