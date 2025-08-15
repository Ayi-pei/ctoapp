
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

export type User = {
  id: string;
  username: string;
  password?: string; // Keep password for our mock DB
  email: string;
  inviter_id: string | null;
  is_admin: boolean;
  is_test_user: boolean;
  is_frozen: boolean;
  invitation_code: string;
  created_at: string;
};

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  register: (username: string, password: string, invitationCode: string) => Promise<boolean>;
  isLoading: boolean;
  getUserById: (id: string) => User | null;
  getDownline: (userId: string) => User[];
  updateUser: (userId: string, updates: Partial<User>) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// --- Mock Database using localStorage ---
const USERS_STORAGE_KEY = 'tradeflow_users';
const ADMIN_USER_ID = 'admin_user_001';

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
    // Admin Login Check (using environment variables)
    if (
        username === process.env.NEXT_PUBLIC_ADMIN_NAME &&
        password === process.env.NEXT_PUBLIC_ADMIN_KEY
    ) {
        let allUsers = getMockUsers();
        let adminUser = allUsers[ADMIN_USER_ID];

        // If admin user doesn't exist in our mock DB, create it on first login.
        if (!adminUser) {
            adminUser = {
                id: ADMIN_USER_ID,
                username: username,
                password: password, // Save password for mock login
                email: `${username}@noemail.app`,
                is_admin: true,
                is_test_user: false,
                is_frozen: false,
                invitation_code: process.env.NEXT_PUBLIC_ADMIN_AUTH || '147258', 
                inviter_id: null,
                created_at: new Date().toISOString(),
            };
            allUsers[ADMIN_USER_ID] = adminUser;
            saveMockUsers(allUsers);
        }
        
        setUser(adminUser);
        localStorage.setItem('userSession', JSON.stringify(adminUser));
        return true;
    }
    
    // Regular User Login
    const allUsers = getMockUsers();
    const foundUser = Object.values(allUsers).find(u => u.username === username && u.password === password);

    if (foundUser) {
        if (foundUser.is_frozen) {
            console.error("Login failed: Account is frozen.");
            return false;
        }
        setUser(foundUser);
        localStorage.setItem('userSession', JSON.stringify(foundUser));
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
      
      // Special check for Admin's "genesis" invitation code from .env
      if (invitationCode === process.env.NEXT_PUBLIC_ADMIN_AUTH) {
          inviterId = ADMIN_USER_ID;
      } else {
          // Check for a standard user invitation code OR the dynamically generated admin code.
          const inviter = Object.values(allUsers).find(u => u.invitation_code === invitationCode);
          if (inviter) {
              inviterId = inviter.id;
          } else if (invitationCode.length > 6 && /^\d+$/.test(invitationCode)) {
              // Heuristic: If the code is long and all digits, assume it's a dynamically generated admin code.
              // In this case, the inviter is the admin.
              inviterId = ADMIN_USER_ID;
          }
      }


      if (!inviterId) {
          console.error("Invalid invitation code");
          return false;
      }
      
      const newUser: User = {
          id: `user_${Date.now()}`,
          username,
          password,
          email: `${username}@noemail.app`,
          is_admin: false,
          is_test_user: true,
          is_frozen: false,
          invitation_code: generateInvitationCode(),
          inviter_id: inviterId,
          created_at: new Date().toISOString(),
      };
      
      allUsers[newUser.id] = newUser;
      saveMockUsers(allUsers);
      
      return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('userSession');
    router.push('/login');
  };
  
  const getUserById = (id: string): User | null => {
      const allUsers = getMockUsers();
      return allUsers[id] || null;
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
