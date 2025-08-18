
import { NextResponse } from 'next/server';
import type { User } from '@/types';

// --- Mock Database using localStorage ---
// In a real app, this would be a database connection.
// For this Next.js API route, we can't access localStorage, so we'll
// define the mock data retrieval logic here again.
const USERS_STORAGE_KEY = 'tradeflow_users';
const ADMIN_USER_ID = 'admin_user_001';

// This is a server-side representation of the localStorage logic.
// In a real scenario, this would be replaced with actual database queries.
// Since API routes run on the server and don't have access to browser localStorage,
// this approach is fundamentally flawed for a stateful user DB.
// We'll proceed with the admin check which uses env vars, and for users,
// we'll have to acknowledge this is a simulation limitation.
const getMockUsers = (): { [id: string]: User } => {
    // This function can't actually get users from localStorage on the server.
    // This highlights the need to move to a real database.
    // For now, it will only be able to log in the admin.
    return {};
};
// --- End Mock Database ---


export async function POST(request: Request) {
    try {
        const { username, password } = await request.json();

        // 1. Check for Admin credentials (using environment variables)
        if (
            username === process.env.NEXT_PUBLIC_ADMIN_NAME &&
            password === process.env.NEXT_PUBLIC_ADMIN_KEY
        ) {
            const adminUser: User = {
                id: ADMIN_USER_ID,
                username: username,
                nickname: 'Administrator',
                // IMPORTANT: Never return the password in a real API response
                email: `${username}@noemail.app`,
                is_admin: true,
                is_test_user: false,
                is_frozen: false,
                invitation_code: process.env.NEXT_PUBLIC_ADMIN_AUTH || '',
                inviter_id: null,
                created_at: new Date().toISOString(),
                credit_score: 999,
            };
            return NextResponse.json({ success: true, user: adminUser });
        }

        // 2. Check for Regular User credentials (simulated)
        // NOTE: This part is tricky because API routes are stateless and can't access localStorage.
        // For the purpose of this refactor, we'll return a hardcoded user for demonstration.
        // A full implementation requires a database.
        // This simulates finding a user in a database.
        if (username === 'testuser' && password === 'password') {
             const mockUser: User = {
                id: 'user_mock_001',
                username: 'testuser',
                nickname: 'Test User',
                email: 'testuser@noemail.app',
                is_admin: false,
                is_test_user: true,
                is_frozen: false,
                invitation_code: 'TESTCODE',
                inviter_id: ADMIN_USER_ID,
                created_at: new Date().toISOString(),
                credit_score: 100,
             };
             return NextResponse.json({ success: true, user: mockUser });
        }
        
        // This is a placeholder for a real database lookup.
        // Since we can't access localStorage here, regular user login will fail
        // unless they use the hardcoded 'testuser' credentials above.
        // This is an expected limitation of this refactoring step.

        return NextResponse.json({ success: false, error: 'Invalid username or password' }, { status: 401 });

    } catch (error) {
        console.error('Login API error:', error);
        return NextResponse.json({ success: false, error: 'An internal server error occurred' }, { status: 500 });
    }
}
