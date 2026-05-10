import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, verifySessionCookie } from "@/lib/adminSession";

export const config = {
  matcher: ["/admin/:path*"],
};

export async function middleware(req: NextRequest) {
  if (req.nextUrl.pathname === "/admin/login") {
    return NextResponse.next();
  }
  const cookie = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const ok = await verifySessionCookie(cookie);
  if (!ok) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("from", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}
