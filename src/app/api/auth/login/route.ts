
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { User } from '@/types';
import bcrypt from 'bcrypt';
import { signSession, getDefaultCookieOptions, sessionCookieName } from '@/lib/auth/session';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const ADMIN_NAME = process.env.ADMIN_NAME;
const ADMIN_KEY = process.env.ADMIN_KEY;

export async function POST(request: Request) {
    try {
        const { username, password } = await request.json();

        // 1. Admin Login Flow
        if (username === ADMIN_NAME && password === ADMIN_KEY) {
            const { data: adminProfile, error: fetchError } = await supabase
                .from('profiles')
                .select('*')
                .eq('username', ADMIN_NAME)
                .single();

            // If admin user does not exist in the DB, authentication fails.
            // Admins should be created via a secure, separate process (e.g., DB migration).
            if (fetchError || !adminProfile) {
                console.error('Admin authentication failed: Admin user not found in database.');
                return NextResponse.json({ success: false, error: 'Invalid admin credentials' }, { status: 401 });
            }

            const safeAdminUser: User = {
                id: adminProfile.id,
                username: adminProfile.username,
                nickname: adminProfile.nickname,
                email: adminProfile.email,
                inviter_id: adminProfile.inviter_id,
                is_admin: adminProfile.is_admin,
                is_test_user: adminProfile.is_test_user,
                is_frozen: adminProfile.is_frozen,
                invitation_code: adminProfile.invitation_code,
                created_at: adminProfile.created_at,
                credit_score: adminProfile.credit_score,
            };

            // 若服务端已配置 Supabase，确保管理员档案存在（含邀请代码）
            try {
              if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
                const adminInvitationCode = process.env.ADMIN_AUTH || '';
                await supabase
                  .from('profiles')
                  .upsert({
                    id: ADMIN_USER_ID,
                    username: username,
                    nickname: 'Administrator',
                    email: null,
                    inviter_id: null,
                    invitation_code: adminInvitationCode,
                    is_admin: true,
                    is_test_user: false,
                    is_frozen: false,
                    created_at: new Date().toISOString(),
                    credit_score: 999,
                    last_login_at: new Date().toISOString(),
                  });
              }
            } catch (e) {
              console.warn('Admin bootstrap upsert failed (non-fatal):', e);
            }

            const token = signSession(adminUser.id);
            const res = NextResponse.json({ success: true, user: adminUser });
            res.cookies.set(sessionCookieName, token, getDefaultCookieOptions());
            return res;
        }

        // 2. Regular User Login Flow
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
