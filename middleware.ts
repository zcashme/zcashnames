import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  hasConfiguredInternalBasicAuth,
  isAuthorizedInternalBasicAuthHeader,
  shouldBypassInternalBasicAuth,
} from "@/lib/admin/basic-auth";

function unauthorizedResponse() {
  return new NextResponse("Authentication required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Internal Tools"',
    },
  });
}

function unconfiguredResponse() {
  return new NextResponse("Internal auth is not configured.", {
    status: 503,
  });
}

export function middleware(request: NextRequest) {
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");

  if (shouldBypassInternalBasicAuth(host)) {
    return NextResponse.next();
  }

  if (!hasConfiguredInternalBasicAuth()) {
    return unconfiguredResponse();
  }

  if (
    !isAuthorizedInternalBasicAuthHeader(
      request.headers.get("authorization"),
    )
  ) {
    return unauthorizedResponse();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/internal/:path*", "/admin/:path*"],
};
