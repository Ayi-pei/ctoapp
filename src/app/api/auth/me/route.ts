import { NextResponse } from "next/server";
import { getCurrentSession, unifiedAuth } from "@/lib/auth/unified-auth";

export async function GET() {
  try {
    const session = await getCurrentSession();

    if (!session.valid || !session.userId) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const user = await unifiedAuth.getUser(session.userId);

    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({ authenticated: true, user });
  } catch (error) {
    console.error("Auth me error:", error);
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}
