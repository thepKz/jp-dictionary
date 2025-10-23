import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    // Hardcoded credentials as requested
    if (username === "admin" && password === "1234567") {
      const response = NextResponse.json({ success: true });
      // Set cookie for authentication
      response.cookies.set("adminAuth", "true", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 24 * 60 * 60, // 24 hours
      });
      return response;
    } else {
      return NextResponse.json({ error: "Tên đăng nhập hoặc mật khẩu không đúng" }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: "Lỗi xử lý yêu cầu" }, { status: 500 });
  }
}
