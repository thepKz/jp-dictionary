import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  
  // Allow login page and login API
  if (pathname === "/admin/login" || pathname === "/api/admin/login") {
    return NextResponse.next();
  }
  
  const needsAuth = pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
  if (!needsAuth) return NextResponse.next();

  // Check for admin auth token in cookies
  const adminAuth = req.cookies.get("adminAuth")?.value;
  if (adminAuth === "true") {
    return NextResponse.next();
  }

  // Redirect to login page for admin routes
  if (pathname.startsWith("/admin")) {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }

  return new NextResponse("Unauthorized", { status: 401 });
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};


