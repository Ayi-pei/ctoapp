import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession, sessionCookieName } from '@/lib/auth/session';
import { createClient } from '@supabase/supabase-js';
import type { User } from '@/types';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function GET() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(sessionCookieName)?.value;
    const { valid, userId } = verifySession(token);
    if (!valid || !userId) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    // Load a safe subset of the user profile
    const { data: p, error } = await supabase
      .from('profiles')
      .select('id, username, nickname, email, inviter_id, is_admin, is_test_user, is_frozen, invitation_code, created_at, credit_score')
      .eq('id', userId)
      .single();

    if (error || !p) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const user: User = {
      id: p.id,
      username: p.username,
      nickname: p.nickname,
      email: p.email ?? `${p.username}@noemail.app`,
      inviter_id: p.inviter_id,
      is_admin: p.is_admin,
      is_test_user: p.is_test_user,
      is_frozen: !!p.is_frozen,
      invitation_code: p.invitation_code,
      created_at: p.created_at,
      credit_score: p.credit_score,
    };

    return NextResponse.json({ authenticated: true, user });
  } catch (e) {
    console.error('auth/me error:', e);
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}
