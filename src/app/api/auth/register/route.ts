import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';
import { signSession, getDefaultCookieOptions, sessionCookieName } from '@/lib/auth/session';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function POST(request: Request) {
  try {
    const { username, password, invitationCode } = await request.json();

    if (!username || !password || !invitationCode) {
      return NextResponse.json({ success: false, error: 'Missing fields' }, { status: 400 });
    }

    // 1. Check if username exists
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .single();

    if (existingUser) {
      return NextResponse.json({ success: false, error: 'username_exists' }, { status: 409 });
    }

    // 2. Validate invitation code
    const { data: inviter, error: inviterError } = await supabase
      .from('profiles')
      .select('id')
      .eq('invitation_code', invitationCode)
      .single();

    if (inviterError || !inviter) {
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
