
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession, sessionCookieName } from '@/lib/auth/session';
import { createClient } from '@supabase/supabase-js';
import type { User } from '@/types';

const ADMIN_USER_ID = 'admin_user_001';

export async function GET() {
  try {
    // Correctly await the cookies() promise
    const cookieStore = await cookies(); 
    const token = cookieStore.get(sessionCookieName)?.value;
    const { valid, userId } = verifySession(token);
    if (!valid || !userId) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // 如果服务端 Supabase 没有配置，或仅用于本地开发，返回一个最小用户对象作为回退
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      const fallbackUser: User = {
        id: userId,
        username: userId === ADMIN_USER_ID ? 'admin' : userId.substring(0, 8),
        nickname: userId === ADMIN_USER_ID ? 'Administrator' : 'Local User',
        email: `${userId}@noemail.app`,
        inviter_id: null,
        is_admin: userId === ADMIN_USER_ID,
        is_test_user: true,
        is_frozen: false,
        invitation_code: 'LOCAL',
        created_at: new Date().toISOString(),
        credit_score: 100,
      };
      return NextResponse.json({ authenticated: true, user: fallbackUser });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 从数据库加载用户资料
    const { data: p, error } = await supabase
      .from('profiles')
      .select('id, username, nickname, email, inviter_id, is_admin, is_test_user, is_frozen, invitation_code, created_at, credit_score')
      .eq('id', userId)
      .single();

    // 如果数据库不可用或没有该用户，回退到最小用户对象（保证本地可用性）
    if (error || !p) {
      const fallbackUser: User = {
        id: userId,
        username: userId === ADMIN_USER_ID ? 'admin' : userId.substring(0, 8),
        nickname: userId === ADMIN_USER_ID ? 'Administrator' : 'Local User',
        email: `${userId}@noemail.app`,
        inviter_id: null,
        is_admin: userId === ADMIN_USER_ID,
        is_test_user: true,
        is_frozen: false,
        invitation_code: 'LOCAL',
        created_at: new Date().toISOString(),
        credit_score: 100,
      };
      return NextResponse.json({ authenticated: true, user: fallbackUser });
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
