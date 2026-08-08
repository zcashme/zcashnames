import { NextRequest, NextResponse } from "next/server";

//
// Next.js middleware — runs on every request before the route handler.
//
// The main purpose is subdomain routing: requests to docs.zcashnames.com
// are rewritten to the /docs path internally, so the docs subdomain serves
// the same Nextra-powered documentation as zcashnames.com/docs.
//
// Mainnet mode and name-action form pages require the zn_beta cookie
// (set via shared password or invite). Without it, redirect to /waitlist.
// Action slugs must stay in sync with lib/purchases/nameActionHref.ts.
//
// The matcher config excludes static assets and prefetch requests to avoid
// running this logic on every CSS/JS/image load.
//
const ACTION_SLUGS = new Set([
  "claim",
  "buy",
  "update",
  "list",
  "delist",
  "release",
]);

function isBetaGatedPath(pathname: string): boolean {
  if (pathname === "/") return true;
  const firstSegment = pathname.split("/").filter(Boolean)[0]?.toLowerCase();
  return firstSegment != null && ACTION_SLUGS.has(firstSegment);
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
  if (isBetaGatedPath(pathname) && !request.cookies.get("zn_beta")) {
    const url = request.nextUrl.clone();
    url.pathname = "/waitlist";
    return NextResponse.redirect(url);
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
