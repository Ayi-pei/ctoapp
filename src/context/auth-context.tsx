
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type User = {
  username: string;
  isTestUser: boolean;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  
  useEffect(() => {
    try {
      const loggedInUsername = localStorage.getItem('loggedInUser');
      if (loggedInUsername) {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const currentUser = users.find((u: any) => u.username === loggedInUsername);
        if (currentUser) {
          setIsAuthenticated(true);
          setUser({ username: currentUser.username, isTestUser: currentUser.isTestUser || false });
        }
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch (e) {
        console.error("Failed to parse auth data from localStorage", e);
        // Clear potentially corrupted data
        localStorage.removeItem('loggedInUser');
        setIsAuthenticated(false);
        setUser(null);
    }
  }, []);

  const login = (username: string, password: string): boolean => {
    try {
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      const foundUser = users.find((u: any) => u.username === username && u.password === password);
      if (foundUser) {
        localStorage.setItem('loggedInUser', username);
        const userData = { username: foundUser.username, isTestUser: foundUser.isTestUser || false };
        setIsAuthenticated(true);
        setUser(userData);
        return true;
      }
      return false;
    } catch (e) {
      console.error("Failed to parse user data from localStorage during login", e);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('loggedInUser');
    localStorage.removeItem('userBalances'); // Clear balances on logout
    setIsAuthenticated(false);
    setUser(null);
  };

  // Expose isTestUser through the user object
  const isTestUser = user?.isTestUser || false;

  return (
    <AuthContext.Provider value={{ isAuthenticated, user: { ...user, isTestUser } as User, login, logout }}>
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
