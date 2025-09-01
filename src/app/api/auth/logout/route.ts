import { NextResponse } from 'next/server';
import { sessionCookieName, getDefaultCookieOptions } from '@/lib/auth/session';

export async function POST() {
  try {
    const res = NextResponse.json({ success: true });
    // Expire the cookie immediately
    const opts = { ...getDefaultCookieOptions(), maxAge: 0 } as any;
    res.cookies.set(sessionCookieName, '', opts);
    return res;
  } catch (e) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
