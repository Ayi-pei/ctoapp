
'use server';

// This file is deprecated and its contents have been moved to the new API route
// at /api/auth/login/route.ts and the authService.
// We keep it here to avoid breaking imports but it should be removed later.

import type { User } from '@/types';

// This function is now part of the API route logic.
export async function loginUser(username: string, password: string): Promise<{ success: boolean, user: User | null, error?: string }> {
    console.warn("DEPRECATED: loginUser in /app/actions/auth.ts is deprecated. Use the /api/auth/login endpoint.");
    
    if (
        username === process.env.NEXT_PUBLIC_ADMIN_NAME &&
        password === process.env.NEXT_PUBLIC_ADMIN_KEY
    ) {
        const adminUser: User = {
            id: 'admin_user_001',
            username: username,
            nickname: 'Administrator',
            password: password,
            email: `${username}@noemail.app`,
            is_admin: true,
            is_test_user: false,
            is_frozen: false,
            invitation_code: process.env.NEXT_PUBLIC_ADMIN_AUTH || '',
            inviter_id: null,
            created_at: new Date().toISOString(),
            credit_score: 999,
        };
        
        return { success: true, user: adminUser };
    }

    return { success: false, user: null, error: "Invalid admin credentials" };
}

// This function is now part of the authService.
export async function checkAdminInviteCode(code: string): Promise<boolean> {
     console.warn("DEPRECATED: checkAdminInviteCode in /app/actions/auth.ts is deprecated. It is now part of authService.");
    return code === process.env.NEXT_PUBLIC_ADMIN_AUTH;
}
