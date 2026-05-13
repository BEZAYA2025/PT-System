import { NextResponse, type NextRequest } from "next/server";

// Next.js 16: this file is `proxy.ts`, formerly `middleware.ts`.
// It performs an OPTIMISTIC auth check — protected routes get redirected
// to /signin when the access_token cookie is missing. Secure verification
// happens later in Server Components via lib/dal.ts.

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/dashboard")) {
    const token = request.cookies.get("access_token")?.value;
    if (!token) {
      const url = new URL("/signin", request.url);
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
