
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
    const { valid, userId: callerId } = verifySession(token);
    if (!valid || !callerId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userId: targetUserId, updates } = body;

    if (!targetUserId || !updates || typeof updates !== 'object') {
      return NextResponse.json({ success: false, error: 'Invalid input' }, { status: 400 });
    }
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Fetch caller's profile to check for admin privileges
    const { data: callerProfile, error: callerError } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', callerId)
        .single();

    if (callerError || !callerProfile) {
        return NextResponse.json({ success: false, error: 'Could not verify caller identity' }, { status: 500 });
    }

    const isAdmin = callerProfile.is_admin;

    // Authorization check: either admin or user updating their own profile
    if (!isAdmin && callerId !== targetUserId) {
        return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const allowedFields = ['nickname', 'email', 'avatar_url'];
    const adminOnlyFields = ['is_frozen', 'is_test_user', 'credit_score', 'is_admin'];
    const toUpdate: any = {};

    for (const key in updates) {
        if (allowedFields.includes(key)) {
            toUpdate[key] = updates[key];
        }
        if (isAdmin && adminOnlyFields.includes(key)) {
            toUpdate[key] = updates[key];
        }
    }
    
    if ('password' in updates && updates.password) {
        // Only allow users to change their own password, unless you want admins to have this power.
        if (callerId === targetUserId) {
             toUpdate.password_hash = await bcrypt.hash(updates.password, 10);
        } else if (isAdmin) {
             // Decide if admins can change user passwords. For now, let's allow it.
             toUpdate.password_hash = await bcrypt.hash(updates.password, 10);
        }
    }

    if (Object.keys(toUpdate).length === 0) {
      return NextResponse.json({ success: false, error: 'No updatable fields provided or permitted' }, { status: 400 });
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update(toUpdate)
      .eq('id', targetUserId);

    if (updateError) {
      console.error('Update user error:', updateError);
      return NextResponse.json({ success: false, error: 'database_error', details: updateError.message }, { status: 500 });
    }

    // If the user updated their own profile, issue a new session token with potentially new details
    if (callerId === targetUserId) {
        const { data: updatedUserProfile, error: fetchError } = await supabase
            .from('profiles')
            .select('id, username, nickname, email, inviter_id, is_admin, is_test_user, is_frozen, invitation_code, created_at, credit_score, avatar_url')
            .eq('id', targetUserId)
            .single();
            
        if (fetchError || !updatedUserProfile) {
            console.error('Failed to fetch updated user profile for session refresh:', fetchError);
            // The update succeeded, but session refresh failed. Not critical enough to fail the whole request.
            return NextResponse.json({ success: true, message: "Update successful, but session could not be refreshed." });
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
    }

    // If an admin updated another user, just return success, no need to change the admin's session token
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Update API error:', error);
    return NextResponse.json({ success: false, error: 'internal_error' }, { status: 500 });
  }
}
