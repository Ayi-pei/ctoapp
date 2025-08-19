
'use client';

import axios from 'axios';
import type { User } from '@/types';

// This entire service is now deprecated as all auth logic is handled
// directly in the AuthContext using localStorage as the mock database.

// export async function login(username: string, password: string): Promise<{ success: boolean, user: User | null }> {
//     try {
//         const response = await axios.post('/api/auth/login', { username, password });
//         if (response.data.success) {
//             return { success: true, user: response.data.user };
//         }
//         return { success: false, user: null };
//     } catch (error) {
//         console.error("Login failed:", error);
//         return { success: false, user: null };
//     }
// }
