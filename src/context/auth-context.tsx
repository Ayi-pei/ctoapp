
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { User as UserType, SecureUser } from '@/types';

// Re-exporting the type from types/index.ts to avoid circular dependencies
// and to be the single source of truth.
export type User = UserType;


interface AuthContextType {
  isAuthenticated: boolean;
  user: SecureUser | null;
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; isAdmin: boolean }>;
  logout: () => void;
  register: (username: string, password: string, invitationCode: string) => Promise<{ success: boolean; error?: 'username_exists' | 'invalid_code' }>;
  isLoading: boolean;
  getUserById: (id: string) => User | null;
  getAllUsers: () => User[];
  getDownline: (userId: string) => User[];
  updateUser: (userId: string, updates: Partial<User>) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// --- Mock Database using localStorage ---
const USERS_STORAGE_KEY = 'tradeflow_users';
export const ADMIN_USER_ID = 'admin_user_001';

const INVITATION_CODE_LENGTH = 6;
const INVITATION_CODE_CHARS = '123456789ABCDEFGHJKLMNPQRSTUVWXYZ';

const generateInvitationCode = () => {
    let result = '';
    for (let i = 0; i < INVITATION_CODE_LENGTH; i++) {
        result += INVITATION_CODE_CHARS.charAt(Math.floor(Math.random() * INVITATION_CODE_CHARS.length));
    }
    return result;
};

const getMockUsers = (): { [id: string]: User } => {
    if (typeof window === 'undefined') return {};
    const storedUsers = localStorage.getItem(USERS_STORAGE_KEY);
    return storedUsers ? JSON.parse(storedUsers) : {};
};

const saveMockUsers = (users: { [id: string]: User }) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
};
// --- End Mock Database ---


export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SecureUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if a user session exists in localStorage
    const storedUser = localStorage.getItem('userSession');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    
    // Initialize admin user if not present
    const allUsers = getMockUsers();
    if (!allUsers[ADMIN_USER_ID] && process.env.NEXT_PUBLIC_ADMIN_NAME && process.env.NEXT_PUBLIC_ADMIN_KEY) {
        allUsers[ADMIN_USER_ID] = {
            id: ADMIN_USER_ID,
            username: process.env.NEXT_PUBLIC_ADMIN_NAME,
            nickname: 'Administrator',
            password: process.env.NEXT_PUBLIC_ADMIN_KEY,
            email: `${process.env.NEXT_PUBLIC_ADMIN_NAME}@noemail.app`,
            is_admin: true,
            is_test_user: false,
            is_frozen: false,
            invitation_code: process.env.NEXT_PUBLIC_ADMIN_AUTH || '',
            inviter_id: null,
            created_at: new Date().toISOString(),
            credit_score: 999,
        };
        saveMockUsers(allUsers);
    }

    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<{ success: boolean; isAdmin: boolean }> => {
    const allUsers = getMockUsers();
    const foundUser = Object.values(allUsers).find(u => u.username === username && u.password === password);
    
    if (foundUser) {
        const now = new Date().toISOString();
        const { password, ...secureUser } = { ...foundUser, last_login_at: now };
        
        allUsers[secureUser.id] = { ...allUsers[secureUser.id], ...secureUser, password: foundUser.password };
        saveMockUsers(allUsers);
        
        setUser(secureUser);
        localStorage.setItem('userSession', JSON.stringify(secureUser));
        return { success: true, isAdmin: foundUser.is_admin };
    }

    return { success: false, isAdmin: false };
  };
  
  const register = async (username: string, password: string, invitationCode: string): Promise<{ success: boolean; error?: 'username_exists' | 'invalid_code' }> => {
      let allUsers = getMockUsers();
      if (Object.values(allUsers).some(u => u.username.toLowerCase() === username.toLowerCase())) {
          console.error("Username already exists");
          return { success: false, error: 'username_exists' };
      }
      
      let inviterId: string | null = null;
      
      const adminCode = process.env.NEXT_PUBLIC_ADMIN_AUTH;
      if (invitationCode === adminCode) {
          inviterId = ADMIN_USER_ID;
      } else {
          const inviter = Object.values(allUsers).find(u => u.invitation_code === invitationCode);
          if (inviter) {
              inviterId = inviter.id;
          }
      }

      if (!inviterId) {
          console.error("Invalid invitation code");
          return { success: false, error: 'invalid_code' };
      }
      
      const newUserId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const newUser: User = {
          id: newUserId,
          username,
          nickname: username, // Set nickname to username by default
          password,
          email: `${username}@noemail.app`,
          is_admin: false,
          is_test_user: true,
          is_frozen: false,
          invitation_code: generateInvitationCode(),
          inviter_id: inviterId,
          created_at: new Date().toISOString(),
          credit_score: 95, // Default credit score
          avatar_url: `https://api.dicebear.com/8.x/initials/svg?seed=${newUserId}`,
      };
      
      allUsers[newUser.id] = newUser;
      saveMockUsers(allUsers);
      
      return { success: true };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('userSession');
    router.replace('/login'); // This is the single source of truth for logout redirection.
  };
  
  const getUserById = (id: string): User | null => {
      const allUsers = getMockUsers();
      return allUsers[id] || null;
  }

  const getAllUsers = (): User[] => {
    const usersObject = getMockUsers();
    return Object.values(usersObject);
  }

  const getDownline = (userId: string) => {
    const allUsers = getMockUsers();
    let downline: User[] = [];

    // Level 1
    const level1 = Object.values(allUsers).filter(u => u.inviter_id === userId);
    downline.push(...level1.map(u => ({ ...u, level: 1 })));

    // Level 2
    const level1_ids = level1.map(u => u.id);
    if (level1_ids.length > 0) {
      const level2 = Object.values(allUsers).filter(u => u.inviter_id && level1_ids.includes(u.inviter_id));
      downline.push(...level2.map(u => ({ ...u, level: 2 })));
      
      // Level 3
      const level2_ids = level2.map(u => u.id);
      if (level2_ids.length > 0) {
          const level3 = Object.values(allUsers).filter(u => u.inviter_id && level2_ids.includes(u.inviter_id));
          downline.push(...level3.map(u => ({ ...u, level: 3 })));
      }
    }

    return downline;
  };

  const updateUser = async (userId: string, updates: Partial<User>): Promise<boolean> => {
      const allUsers = getMockUsers();
      if (!allUsers[userId]) {
          return false;
      }
      
      const originalPassword = allUsers[userId].password;
      allUsers[userId] = { ...allUsers[userId], ...updates };
      // Ensure password is not overwritten if not provided in updates
      if (!updates.password) {
        allUsers[userId].password = originalPassword;
      }

      saveMockUsers(allUsers);

      // If the updated user is the current user, update the state and session storage
      if (user && user.id === userId) {
        const { password, ...secureUser } = allUsers[userId];
        setUser(secureUser);
        localStorage.setItem('userSession', JSON.stringify(secureUser));
      }

      return true;
  }

  const value = {
    isAuthenticated: !!user,
    user,
    isAdmin: user?.is_admin || false,
    login,
    logout,
    register,
    isLoading,
    getUserById,
    getAllUsers,
    getDownline,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
