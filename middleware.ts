import { NextRequest, NextResponse } from "next/server";

//
// Next.js middleware — runs on every request before the route handler.
//
// The main purpose is subdomain routing: requests to docs.zcashnames.com
// are rewritten to the /docs path internally, so the docs subdomain serves
// the same Nextra-powered documentation as zcashnames.com/docs.
//
// Legacy paths: /reserve (waitlist-era reservation page) redirects home.
// Action slugs must stay in sync with lib/purchases/nameActionHref.ts.
//
// App Router matching is case-sensitive on Linux (Vercel). Canonicalize
// /Reserve, /RESERVE, etc. so shared links keep working.
//
// The matcher config excludes static assets and prefetch requests to avoid
// running this logic on every CSS/JS/image load.
//
const ACTION_SLUGS = new Set([
  "claim",
  "update",
  "release",
]);

function isActionPath(pathname: string): boolean {
  const firstSegment = pathname.split("/").filter(Boolean)[0]?.toLowerCase();
  return firstSegment != null && ACTION_SLUGS.has(firstSegment);
}

function canonicalReservePathname(pathname: string): string | null {
  const trimmed =
    pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  if (trimmed.toLowerCase() === "/reserve" && trimmed !== "/reserve") {
    return "/reserve";
  }
  return null;
}

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";

  if (host.startsWith("docs.")) {
    const { pathname } = request.nextUrl;

    // Let docs routes, Next.js internals, and pagefind assets pass through
    if (pathname.startsWith("/docs") || pathname.startsWith("/_next") || pathname.startsWith("/_pagefind") || pathname.startsWith("/favicon")) {
      return NextResponse.next();
    }

    // Everything else on the docs subdomain gets rewritten to /docs/*
    const url = request.nextUrl.clone();
    url.pathname = `/docs${pathname === "/" ? "" : pathname}`;
    return NextResponse.rewrite(url);
  }

  const { pathname } = request.nextUrl;

  const reservePath = canonicalReservePathname(pathname);
  if (reservePath) {
    const url = request.nextUrl.clone();
    url.pathname = reservePath;
    return NextResponse.redirect(url, 308);
  }

  // Legacy waitlist-era /reserve page is gone — send it home (308 for SEO).
  if (pathname === "/reserve" || pathname === "/waitlist") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url, 308);
  }

  // Name-action pages are public: the Mint gates claims on-chain.
  if (isActionPath(pathname)) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|api/og).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
