import { NextResponse } from "next/server";
import { sessionCookieName } from "@/lib/auth/unified-auth";

export async function POST() {
  try {
    const response = NextResponse.json({ success: true });

    // 清除认证Cookie
    response.cookies.set(sessionCookieName, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Logout API error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
