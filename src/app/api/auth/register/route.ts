import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';
import { signSession, getDefaultCookieOptions, sessionCookieName } from '@/lib/auth/session';

export async function POST(request: Request) {
  try {
    const { username, password, invitationCode } = await request.json();

    if (!username || !password || !invitationCode) {
      return NextResponse.json({ success: false, error: 'Missing fields' }, { status: 400 });
    }

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // 开发环境回退：如果服务端未配置 Supabase，则允许使用 ADMIN_AUTH 作为邀请码直接成功，inviter_id 视为 admin_user_001
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      const adminCode = process.env.ADMIN_AUTH || '';
      if (invitationCode !== adminCode) {
        return NextResponse.json({ success: false, error: 'invalid_code' }, { status: 400 });
      }
      // 不进行数据库写入，直接返回成功（仅用于本地联调，登录请使用管理员账户或配置 Supabase）
      return NextResponse.json({ success: true, devFallback: true });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. 检查用户名是否已存在
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .single();

    if (existingUser) {
      return NextResponse.json({ success: false, error: 'username_exists' }, { status: 409 });
    }

    // 2. 验证邀请码（从数据库查找）或匹配管理员 ADMIN_AUTH
    let inviter: { id: string } | null = null;
    // Try DB first
    const { data: inviterDb } = await supabase
      .from('profiles')
      .select('id')
      .eq('invitation_code', invitationCode)
      .single();
    if (inviterDb) {
      inviter = inviterDb as any;
    } else if (invitationCode === (process.env.ADMIN_AUTH || '')) {
      // If matches admin code, ensure admin exists or create
      const adminName = process.env.ADMIN_NAME || '';
      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', adminName)
        .single();
      if (adminProfile) {
        inviter = adminProfile as any;
      } else {
        // bootstrap minimal admin record as inviter
        const adminId = (globalThis as any).crypto?.randomUUID?.() || `${Date.now()}-admin`;
        await supabase.from('profiles').insert({
          id: adminId,
          username: adminName || 'admin',
          nickname: 'Administrator',
          email: null,
          inviter_id: null,
          invitation_code: process.env.ADMIN_AUTH || '',
          is_admin: true,
          is_test_user: false,
          is_frozen: false,
          credit_score: 999,
          created_at: new Date().toISOString(),
        });
        inviter = { id: adminId };
      }
    }

    if (!inviter) {
      return NextResponse.json({ success: false, error: 'invalid_code' }, { status: 400 });
    }

    // 3. Create new user
    const userId = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(password, 10);
    const newInvitationCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const newUserProfileData = {
      id: userId,
      username,
      nickname: username,
      email: null,
      inviter_id: inviter.id,
      invitation_code: newInvitationCode,
      password_hash: passwordHash,
      is_admin: false,
      is_test_user: true,
      credit_score: 95,
      avatar_url: `https://api.dicebear.com/8.x/initials/svg?seed=${username}`,
      created_at: new Date().toISOString(),
    };

    const { data: createdUser, error: createError } = await supabase
      .from('profiles')
      .insert(newUserProfileData)
      .select('id, username, nickname, email, inviter_id, is_admin, is_test_user, is_frozen, invitation_code, created_at, credit_score') // Select safe fields
      .single();

    if (createError || !createdUser) {
      console.error('Create user error:', createError);
      return NextResponse.json({ success: false, error: 'database_error' }, { status: 500 });
    }

    // 4. Create initial balances
    await supabase.rpc('create_initial_balances', { p_user_id: userId });

    // 5. Create session and set cookie (THE FIX)
    const token = signSession(createdUser.id);
    const res = NextResponse.json({ success: true, user: createdUser });
    res.cookies.set(sessionCookieName, token, getDefaultCookieOptions());

    return res;
    
  } catch (error) {
    console.error('Register API error:', error);
    return NextResponse.json({ success: false, error: 'internal_error' }, { status: 500 });
  }
}
