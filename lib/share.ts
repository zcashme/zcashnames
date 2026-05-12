export function buildXShareHref(message: string): string {
  return `https://x.com/intent/post?text=${encodeURIComponent(message)}`;
}

export function buildTelegramShareHref(message: string): string {
  return `https://t.me/share/url?url=${encodeURIComponent(message)}`;
}

export function buildEmailShareHref(subject: string, message: string): string {
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
}
