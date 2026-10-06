import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  if (!request.cookies.has("kemindo_session")) {
    if (request.nextUrl.pathname.startsWith("/api/")) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/recruitment/:path*", "/requisitions/:path*", "/candidates/:path*", "/interviews/:path*", "/account/:path*"],
};
