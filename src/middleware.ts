import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const needsAuth = pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
  if (!needsAuth) return NextResponse.next();

  const header = req.headers.get("authorization");
  if (!header || !header.startsWith("Basic ")) {
    return unauthorized();
  }
  try {
    const decoded = Buffer.from(header.replace("Basic ", ""), "base64").toString("utf8");
    const [user, pass] = decoded.split(":");
    if (user === "admin" && pass === "Admin@123") {
      return NextResponse.next();
    }
  } catch {}
  return unauthorized();
}

function unauthorized() {
  return new NextResponse("Unauthorized", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Admin"' },
  });
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};


