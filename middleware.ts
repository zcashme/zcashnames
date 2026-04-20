import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";

  // docs subdomain → /docs rewrite
  if (host.startsWith("docs.")) {
    const { pathname } = request.nextUrl;

    // Do not rewrite real static assets or API routes — otherwise `/landing/*`, `/icons/*`, etc.
    // resolve under `/docs/...` and break favicons and images.
    const passthroughPrefixes = ["/docs", "/_next", "/favicon", "/landing", "/icons", "/assets", "/api"];
    if (passthroughPrefixes.some((p) => pathname.startsWith(p))) {
      return NextResponse.next();
    }
    if (pathname.startsWith("/docs") || pathname.startsWith("/_next") || pathname.startsWith("/_pagefind") || pathname.startsWith("/favicon")) {
      return NextResponse.next();
    }

    const url = request.nextUrl.clone();
    url.pathname = `/docs${pathname === "/" ? "" : pathname}`;
    return NextResponse.rewrite(url);
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
