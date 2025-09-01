import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function POST(request: Request) {
  try {
    const { username, password, invitationCode } = await request.json();

    if (!username || !password || !invitationCode) {
      return NextResponse.json({ success: false, error: 'Missing fields' }, { status: 400 });
    }

    // 1. 检查用户名是否已存在
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .single();

    if (existingUser) {
      return NextResponse.json({ success: false, error: 'username_exists' }, { status: 409 });
    }

    // 2. 验证邀请码
    const { data: inviter, error: inviterError } = await supabase
      .from('profiles')
      .select('id')
      .eq('invitation_code', invitationCode)
      .single();

    if (inviterError || !inviter) {
      return NextResponse.json({ success: false, error: 'invalid_code' }, { status: 400 });
    }

    // 3. 创建新用户（服务端生成哈希）
    const userId = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(password, 10);
    const newInvitationCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const { error: createError } = await supabase
      .from('profiles')
      .insert({
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
      });

    if (createError) {
      console.error('Create user error:', createError);
      return NextResponse.json({ success: false, error: 'database_error' }, { status: 500 });
    }

    // 4. 创建初始余额
    await supabase.rpc('create_initial_balances', { p_user_id: userId });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Register API error:', error);
    return NextResponse.json({ success: false, error: 'internal_error' }, { status: 500 });
  }
}
