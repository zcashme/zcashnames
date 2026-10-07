const ALLOWED_PREFIXES = ["/profile_images/", "/media/"];

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("src");
  if (!raw) return new Response("Missing image", { status: 400 });

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return new Response("Bad image", { status: 400 });
  }

  const allowed =
    target.protocol === "https:" &&
    target.hostname === "pbs.twimg.com" &&
    ALLOWED_PREFIXES.some((prefix) => target.pathname.startsWith(prefix));
  if (!allowed) return new Response("Image host not allowed", { status: 400 });

  const upstream = await fetch(target, {
    headers: { "User-Agent": "ZcashNamesPress/1.0" },
  });
  if (!upstream.ok) return new Response("Image unavailable", { status: 502 });

  const type = upstream.headers.get("content-type") ?? "image/jpeg";
  return new Response(upstream.body, {
    headers: {
      "Content-Type": type.startsWith("image/") ? type : "image/jpeg",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
