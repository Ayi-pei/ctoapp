'use server';

import type { User } from '@/types';

const ADMIN_USER_ID = 'admin_user_001';

// This is a server-only function to securely check admin credentials
export async function loginUser(username: string, password: string): Promise<{ success: boolean, user: User | null, error?: string }> {
    if (
        username === process.env.ADMIN_NAME &&
        password === process.env.ADMIN_KEY
    ) {
        // Construct the admin user object. In a real app, this would come from a database.
        const adminUser: User = {
            id: ADMIN_USER_ID,
            username: username,
            nickname: 'Administrator',
            password: password, // Note: In a real app, you would not store or return the password.
            email: `${username}@noemail.app`,
            is_admin: true,
            is_test_user: false,
            is_frozen: false,
            invitation_code: process.env.ADMIN_AUTH || '',
            inviter_id: null,
            created_at: new Date().toISOString(),
            credit_score: 999,
        };
        
        return { success: true, user: adminUser };
    }

    // If it's not an admin, we return an error. The client will then handle regular user login.
    return { success: false, user: null, error: "Invalid admin credentials" };
}

// This is a server-only function to securely check the admin invitation code
export async function checkAdminInviteCode(code: string): Promise<boolean> {
    return code === process.env.ADMIN_AUTH;
}
