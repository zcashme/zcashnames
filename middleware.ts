import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";

  if (host.startsWith("docs.")) {
    const { pathname } = request.nextUrl;

    if (
      pathname.startsWith("/docs") ||
      pathname.startsWith("/_next") ||
      pathname.startsWith("/_pagefind") ||
      pathname.startsWith("/favicon")
    ) {
      return NextResponse.next();
    }

    const url = request.nextUrl.clone();
    url.pathname = `/docs${pathname === "/" ? "" : pathname}`;
    return NextResponse.rewrite(url);
  }

  if (
    request.headers.get("next-router-prefetch") ||
    request.headers.get("purpose") === "prefetch"
  ) {
    return NextResponse.next();
  }

  if (request.nextUrl.pathname === "/" && !request.cookies.get("zn_beta")) {
    const url = request.nextUrl.clone();
    url.pathname = "/waitlist";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|api/og).*)"],
};
