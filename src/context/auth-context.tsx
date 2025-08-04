
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  isTestUser: boolean;
  login: (username: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isTestUser, setIsTestUser] = useState<boolean>(false);
  
  // On initial load, assume not authenticated until checked.
  // This avoids rendering protected routes prematurely.
  useEffect(() => {
    try {
      const loggedInUser = localStorage.getItem('loggedInUser');
      if (loggedInUser) {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const currentUser = users.find((u: any) => u.username === loggedInUser);
        if (currentUser) {
          setIsAuthenticated(true);
          setIsTestUser(currentUser.isTestUser || false);
        }
      }
    } catch (e) {
        console.error("Failed to parse auth data from localStorage", e);
        // Clear potentially corrupted data
        localStorage.removeItem('loggedInUser');
        setIsAuthenticated(false);
        setIsTestUser(false);
    }
  }, []);

  const login = (username: string, password: string): boolean => {
    try {
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      const user = users.find((u: any) => u.username === username && u.password === password);
      if (user) {
        localStorage.setItem('loggedInUser', username);
        setIsAuthenticated(true);
        setIsTestUser(user.isTestUser || false);
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
    setIsTestUser(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isTestUser, login, logout }}>
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
