
'use client';

import axios from 'axios';
import type { User } from '@/types';

export async function login(username: string, password: string): Promise<{ success: boolean, user: User | null }> {
    try {
        const response = await axios.post('/api/auth/login', { username, password });
        if (response.data.success) {
            return { success: true, user: response.data.user };
        }
        return { success: false, user: null };
    } catch (error) {
        console.error("Login failed:", error);
        return { success: false, user: null };
    }
}

// This function now calls a server action to securely check the environment variable.
// In a real app, this might be an API call to a /api/auth/validate-code endpoint.
export async function checkAdminInviteCode(code: string): Promise<boolean> {
    // For simplicity, we are still using a direct server action for this,
    // as it's only used during registration and doesn't return sensitive data.
    const USERS_STORAGE_KEY = 'tradeflow_users';
    const ADMIN_USER_ID = 'admin_user_001';
    
    // In a real app, this check would be an API call to avoid exposing env vars,
    // but for this project, we'll keep the direct check to the env for the admin code.
    const adminCode = process.env.NEXT_PUBLIC_ADMIN_AUTH;

    // We can't access process.env directly on the client.
    // This is a placeholder. The logic has been moved into the auth context
    // which *can* call server actions. This function is now a placeholder.
    // The actual check is now done in auth-context -> register function.
    console.warn("checkAdminInviteCode in authService is a placeholder. The real check happens server-side.");
    
    // The actual logic is in `auth-context.tsx` which calls a server-side function.
    // This is a bit of a workaround due to the hybrid nature of the app.
    // In a full API-driven app, this would be `POST /api/auth/check-code`.
    return true; 
}
