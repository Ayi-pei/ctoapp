
import axios from 'axios';
import type { Investment } from '@/types';

type Balances = { [key: string]: { available: number; frozen: number } };

type UserAssets = {
    balances: Balances;
    investments: Investment[];
};

/**
 * Fetches the current user's assets (balances and investments) from the API.
 * The authentication token is automatically added by the axios interceptor.
 * @returns A promise that resolves to the user's asset data.
 */
export async function getUserAssets(): Promise<UserAssets> {
    try {
        const response = await axios.get('/api/user/assets');
        return response.data;
    } catch (error) {
        console.error("Error fetching user assets in userService:", error);
        // Return a default empty state in case of an error to prevent crashes
        return {
            balances: {},
            investments: []
        };
    }
}

// Future service functions can be added here, e.g.:
// export async function getUserProfile() { ... }
// export async function updateUserProfile(data) { ... }
