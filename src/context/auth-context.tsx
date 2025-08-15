
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

export type User = {
  id: string;
  username: string;
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// A mock user for the new auth system
const createMockUser = (username: string, isAdmin = false): User => ({
    id: `mock-${Date.now()}`,
    username,
    email: `${username}@noemail.app`,
    is_admin: isAdmin,
    is_test_user: !isAdmin,
    is_frozen: false,
    invitation_code: Math.random().toString(36).substring(2, 8).toUpperCase(),
    inviter_id: null,
    created_at: new Date().toISOString(),
});


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
    // In a real app, you'd verify against a backend.
    // For now, we allow any login for a "normal" user if they are already registered.
    const storedUser = localStorage.getItem('userRegistry');
    const registry = storedUser ? JSON.parse(storedUser) : {};
    
    if (registry[username] && registry[username] === password) {
       const mockUser = createMockUser(username, false);
       setUser(mockUser);
       localStorage.setItem('userSession', JSON.stringify(mockUser));
       return true;
    }
    return false;
  };
  
  const register = async (username: string, password: string, invitationCode: string): Promise<boolean> => {
    // Special admin registration check
    if (
        username === process.env.NEXT_PUBLIC_ADMIN_NAME &&
        password === process.env.NEXT_PUBLIC_ADMIN_KEY &&
        invitationCode === process.env.NEXT_PUBLIC_ADMIN_AUTH
    ) {
        const adminUser = createMockUser(username, true);
        setUser(adminUser);
        localStorage.setItem('userSession', JSON.stringify(adminUser));
        console.log("Admin registration successful");
        return true;
    }
    
    // Normal user registration
    const storedUser = localStorage.getItem('userRegistry');
    const registry = storedUser ? JSON.parse(storedUser) : {};
    if (registry[username]) {
        console.error("Username already exists");
        return false;
    }
    
    registry[username] = password;
    localStorage.setItem('userRegistry', JSON.stringify(registry));
    
    // For this flow, we just register them. They still need to log in.
    return true;
  }

  const logout = () => {
    setUser(null);
    localStorage.removeItem('userSession');
    router.push('/login');
  };
  
  const value = {
    isAuthenticated: !!user,
    user,
    isAdmin: user?.is_admin || false,
    login,
    logout,
    register,
    isLoading,
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
