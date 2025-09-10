
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { User } from '@/types';
import bcrypt from 'bcrypt';
import { signSession, getDefaultCookieOptions, sessionCookieName } from '@/lib/auth/session';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_NAME = process.env.ADMIN_NAME || '';
const ADMIN_KEY = process.env.ADMIN_KEY || '';
const ADMIN_AUTH = process.env.ADMIN_AUTH || '';

const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null as any;

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    // 1) Admin Login using .env ADMIN_NAME/ADMIN_KEY
    if (username === ADMIN_NAME && password === ADMIN_KEY) {
      // If Supabase not configured, allow local admin login without DB (dev only)
      if (!supabase) {
        const adminUser: User = {
          id: 'admin_local',
          username: ADMIN_NAME,
          nickname: 'Administrator',
          email: 'admin@local',
          inviter_id: null,
          is_admin: true,
          is_test_user: false,
          is_frozen: false,
          invitation_code: ADMIN_AUTH,
          created_at: new Date().toISOString(),
          credit_score: 999,
        };
        const token = signSession(adminUser.id);
        const res = NextResponse.json({ success: true, user: adminUser });
        res.cookies.set(sessionCookieName, token, getDefaultCookieOptions());
        return res;
      }

      // Ensure admin profile exists and is bound to ADMIN_AUTH
      let adminProfile = null as any;
      try {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('username', ADMIN_NAME)
          .single();
        adminProfile = data;
      } catch (_) {
        adminProfile = null;
      }

      if (!adminProfile) {
        // Insert admin profile
        const adminId = (globalThis as any).crypto?.randomUUID?.() || `${Date.now()}-admin`;
        const insertPayload = {
          id: adminId,
          username: ADMIN_NAME,
          nickname: 'Administrator',
          email: null,
          inviter_id: null,
          invitation_code: ADMIN_AUTH,
          is_admin: true,
          is_test_user: false,
          is_frozen: false,
          credit_score: 999,
          created_at: new Date().toISOString(),
          last_login_at: new Date().toISOString(),
        };
        try {
          await supabase.from('profiles').insert(insertPayload);
          adminProfile = insertPayload;
        } catch (e) {
          // If insert conflicted (e.g., race), try fetch again
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('username', ADMIN_NAME)
            .single();
          adminProfile = data;
        }
      } else {
        // Ensure flags and invitation_code are correct; update last_login_at
        await supabase
          .from('profiles')
          .update({
            is_admin: true,
            is_frozen: false,
            invitation_code: ADMIN_AUTH || adminProfile.invitation_code,
            last_login_at: new Date().toISOString(),
          })
          .eq('id', adminProfile.id);
        // Refresh
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', adminProfile.id)
          .single();
        adminProfile = data;
      }

      const safeAdminUser: User = {
        id: adminProfile.id,
        username: adminProfile.username,
        nickname: adminProfile.nickname || 'Administrator',
        email: adminProfile.email,
        inviter_id: adminProfile.inviter_id,
        is_admin: true,
        is_test_user: !!adminProfile.is_test_user,
        is_frozen: !!adminProfile.is_frozen,
        invitation_code: adminProfile.invitation_code,
        created_at: adminProfile.created_at,
        credit_score: adminProfile.credit_score ?? 999,
      };
      const token = signSession(safeAdminUser.id);
      const res = NextResponse.json({ success: true, user: safeAdminUser });
      res.cookies.set(sessionCookieName, token, getDefaultCookieOptions());
      return res;
    }

    // 2) Regular User Login
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Auth backend not configured' }, { status: 500 });
    }

    const { data: userProfile, error } = await supabase
      .from('profiles')
      .select('id, username, nickname, email, inviter_id, is_admin, is_test_user, is_frozen, invitation_code, created_at, credit_score, password_hash')
      .eq('username', username)
      .single();

    if (error || !userProfile || userProfile.is_frozen) {
      return NextResponse.json({ success: false, error: 'Invalid username or password' }, { status: 401 });
    }

    if (!userProfile.password_hash) {
      return NextResponse.json({ success: false, error: 'Account not configured for password login' }, { status: 400 });
    }

    const passwordOk = await bcrypt.compare(password, userProfile.password_hash);
    if (!passwordOk) {
      return NextResponse.json({ success: false, error: 'Invalid username or password' }, { status: 401 });
    }

    await supabase
      .from('profiles')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', userProfile.id);

    const safeUser: User = {
      id: userProfile.id,
      username: userProfile.username,
      nickname: userProfile.nickname,
      email: userProfile.email,
      inviter_id: userProfile.inviter_id,
      is_admin: userProfile.is_admin,
      is_test_user: userProfile.is_test_user,
      is_frozen: userProfile.is_frozen,
      invitation_code: userProfile.invitation_code,
      created_at: userProfile.created_at,
      credit_score: userProfile.credit_score,
    };

    const token = signSession(safeUser.id);
    const res = NextResponse.json({ success: true, user: safeUser });
    res.cookies.set(sessionCookieName, token, getDefaultCookieOptions());
    return res;
  } catch (error) {
    console.error('Login API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An internal server error occurred';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
