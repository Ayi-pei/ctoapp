
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';
import { verifySession, signSession, getDefaultCookieOptions, sessionCookieName } from '@/lib/auth/session';
import type { User } from '@/types';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: Request) {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ success: false, error: 'Supabase not configured' }, { status: 503 });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get(sessionCookieName)?.value;
    const { valid, userId } = verifySession(token);
    if (!valid || !userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const updates = body?.updates;
    if (!updates || typeof updates !== 'object') {
      return NextResponse.json({ success: false, error: 'Invalid input' }, { status: 400 });
    }

    const allowedFields = ['nickname', 'email', 'avatar_url'] as const;
    const toUpdate: any = {};
    for (const key of allowedFields) {
      if (key in updates) toUpdate[key] = updates[key];
    }

    if ('password' in updates && updates.password) {
      toUpdate.password_hash = await bcrypt.hash(updates.password, 10);
    }

    if (Object.keys(toUpdate).length === 0) {
      return NextResponse.json({ success: false, error: 'No updatable fields' }, { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { error: updateError } = await supabase
      .from('profiles')
      .update(toUpdate)
      .eq('id', userId);

    if (updateError) {
      console.error('Update user error:', updateError);
      return NextResponse.json({ success: false, error: 'database_error' }, { status: 500 });
    }

    const { data: updatedUserProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('id, username, nickname, email, inviter_id, is_admin, is_test_user, is_frozen, invitation_code, created_at, credit_score, avatar_url')
      .eq('id', userId)
      .single();

    if (fetchError || !updatedUserProfile) {
      console.error('Failed to fetch updated user profile:', fetchError);
      return NextResponse.json({ success: false, error: 'Failed to retrieve updated profile' }, { status: 500 });
    }

    const safeUser: User = {
        id: updatedUserProfile.id,
        username: updatedUserProfile.username,
        nickname: updatedUserProfile.nickname,
        email: updatedUserProfile.email ?? '',
        avatar_url: updatedUserProfile.avatar_url,
        inviter_id: updatedUserProfile.inviter_id,
        is_admin: updatedUserProfile.is_admin,
        is_test_user: updatedUserProfile.is_test_user,
        is_frozen: updatedUserProfile.is_frozen,
        invitation_code: updatedUserProfile.invitation_code,
        created_at: updatedUserProfile.created_at,
        credit_score: updatedUserProfile.credit_score,
    };

    const newToken = signSession(safeUser.id);
    const res = NextResponse.json({ success: true, user: safeUser });
    res.cookies.set(sessionCookieName, newToken, getDefaultCookieOptions());
    return res;

  } catch (error) {
    console.error('Update API error:', error);
    return NextResponse.json({ success: false, error: 'internal_error' }, { status: 500 });
  }
}
