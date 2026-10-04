import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  hasConfiguredInternalBasicAuth,
  isAuthorizedInternalBasicAuthHeader,
  shouldBypassInternalBasicAuth,
} from "@/lib/admin/basic-auth";
import {
  canBypassExpenseAccess,
  constantTimeEqual,
  expenseAccessCookieOptions,
  getExpenseFormSecret,
  hashExpenseAccessCookie,
  isExpensePath,
} from "@/lib/expenses/access";
import { EXPENSE_ACCESS_QUERY_PARAM } from "@/lib/expenses/config";

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

async function handleExpenseAccess(request: NextRequest) {
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (canBypassExpenseAccess(host)) {
    return NextResponse.next();
  }

  const secret = getExpenseFormSecret();
  if (!secret) {
    return NextResponse.next();
  }

  const provided = request.nextUrl.searchParams.get(EXPENSE_ACCESS_QUERY_PARAM)?.trim() ?? "";
  const isDocumentGet = request.method === "GET" || request.method === "HEAD";
  if (provided && isDocumentGet && constantTimeEqual(provided, secret)) {
    const url = request.nextUrl.clone();
    url.searchParams.delete(EXPENSE_ACCESS_QUERY_PARAM);
    const response = NextResponse.redirect(url);
    const cookie = expenseAccessCookieOptions();
    response.cookies.set({
      name: cookie.name,
      value: await hashExpenseAccessCookie(secret),
      httpOnly: cookie.httpOnly,
      sameSite: cookie.sameSite,
      secure: cookie.secure,
      path: cookie.path,
      maxAge: cookie.maxAge,
    });
    return response;
  }

  return NextResponse.next();
}

export async function middleware(request: NextRequest) {
  if (isExpensePath(request.nextUrl.pathname)) {
    return handleExpenseAccess(request);
  }

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
  matcher: ["/internal/:path*", "/admin/:path*", "/expenses", "/expenses/:path*"],
};
