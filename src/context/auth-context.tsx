
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type User = {
  username: string;
  isTestUser: boolean;
  avatar?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
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
          setUser({ 
              username: currentUser.username, 
              isTestUser: currentUser.isTestUser || false,
              avatar: currentUser.avatar || `https://placehold.co/100x100.png?text=${currentUser.username.charAt(0).toUpperCase()}`
          });
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
        const userData = { 
            username: foundUser.username, 
            isTestUser: foundUser.isTestUser || false,
            avatar: foundUser.avatar || `https://placehold.co/100x100.png?text=${foundUser.username.charAt(0).toUpperCase()}`
        };
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
    // We don't clear all user data on logout, just the logged in state
    setIsAuthenticated(false);
    setUser(null);
    // Redirect handled by components
  };
  
  const updateUser = (userData: Partial<User>) => {
    if (user) {
        const updatedUser = { ...user, ...userData };
        setUser(updatedUser);

        try {
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            const userIndex = users.findIndex((u: any) => u.username === user.username);
            if (userIndex !== -1) {
                users[userIndex] = { ...users[userIndex], ...userData };
                localStorage.setItem('users', JSON.stringify(users));
            }
        } catch(e) {
             console.error("Failed to update user data in localStorage", e);
        }
    }
  }


  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, updateUser }}>
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
