
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
  logout: () => Promise<void>;
  register: (username: string, password: string, invitationCode: string) => Promise<boolean>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// A mock user for the new auth system
const mockAdminUser: User = {
    id: '00000000-0000-0000-0000-000000000001',
    username: 'admin',
    email: 'admin@noemail.app',
    is_admin: true,
    is_test_user: true,
    is_frozen: false,
    invitation_code: 'ADMIN',
    inviter_id: null,
    created_at: new Date().toISOString(),
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(mockAdminUser);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  
  const login = async (username: string, password: string): Promise<boolean> => {
    console.log("Mock login successful");
    setUser(mockAdminUser);
    router.push('/admin');
    return true;
  };
  
  const register = async (username: string, password: string, invitationCode: string): Promise<boolean> => {
    console.log("Mock register successful");
    return true;
  }

  const logout = async () => {
    setUser(null);
    router.push('/login');
  };
  
  const value = {
    isAuthenticated: !!user,
    user,
    isAdmin: user?.is_admin || false,
    login,
    logout,
    register,
    session: null,
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
