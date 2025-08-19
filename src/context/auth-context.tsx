
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { User as UserType } from '@/types';
import { login as apiLogin } from '@/services/authService';

// Re-exporting the type from types/index.ts to avoid circular dependencies
// and to be the single source of truth.
export type User = UserType;


interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  register: (username: string, password: string, invitationCode: string) => Promise<boolean>;
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

const generateInvitationCode = () => {
    const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
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
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if a user session exists in localStorage
    const storedUser = localStorage.getItem('userSession');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    const result = await apiLogin(username, password);

    if (result.success && result.user) {
        const now = new Date().toISOString();
        const loggedInUser = { ...result.user, last_login_at: now };
        
        const allUsers = getMockUsers();
        allUsers[loggedInUser.id] = { ...allUsers[loggedInUser.id], ...loggedInUser };
        saveMockUsers(allUsers);
        
        setUser(loggedInUser);
        localStorage.setItem('userSession', JSON.stringify(loggedInUser));
        return true;
    }
    
    // Fallback to localStorage check for regular users if API fails
    const allUsers = getMockUsers();
    const foundUser = Object.values(allUsers).find(u => u.username === username && u.password === password);
    if (foundUser) {
        const now = new Date().toISOString();
        const loggedInUser = { ...foundUser, last_login_at: now };
        
        allUsers[loggedInUser.id] = loggedInUser;
        saveMockUsers(allUsers);
        
        setUser(loggedInUser);
        localStorage.setItem('userSession', JSON.stringify(loggedInUser));
        return true;
    }

    return false;
  };
  
  const register = async (username: string, password: string, invitationCode: string): Promise<boolean> => {
      let allUsers = getMockUsers();
      if (Object.values(allUsers).some(u => u.username === username)) {
          console.error("Username already exists");
          return false;
      }
      
      let inviterId: string | null = null;
      
      // In a real app, this check would be an API call to avoid exposing env vars.
      // For this project, we accept the security tradeoff for simplicity.
      const adminCode = process.env.NEXT_PUBLIC_ADMIN_AUTH;
      if (invitationCode === adminCode) {
          inviterId = ADMIN_USER_ID;
      } else {
          const inviter = Object.values(allUsers).find(u => u.invitation_code === invitationCode);
          if (inviter) {
              inviterId = inviter.id;
          } else if (invitationCode.length > 6 && /^\d+$/.test(invitationCode)) {
              inviterId = ADMIN_USER_ID;
          }
      }

      if (!inviterId) {
          console.error("Invalid invitation code");
          return false;
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
          credit_score: 100,
          avatar_url: `https://api.dicebear.com/8.x/initials/svg?seed=${newUserId}`,
      };
      
      allUsers[newUser.id] = newUser;
      saveMockUsers(allUsers);
      
      return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('userSession');
    router.replace('/login'); // Redirect directly to login page
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
      allUsers[userId] = { ...allUsers[userId], ...updates };
      saveMockUsers(allUsers);

      // If the updated user is the current user, update the state and session storage
      if (user && user.id === userId) {
        const updatedCurrentUser = { ...user, ...updates };
        setUser(updatedCurrentUser);
        localStorage.setItem('userSession', JSON.stringify(updatedCurrentUser));
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
