
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type User = {
  username: string;
  isTestUser: boolean;
  isAdmin: boolean;
  avatar?: string;
  isFrozen?: boolean;
  invitationCode?: string;
  inviter?: string;
  downline?: string[];
  registeredAt?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  isAdmin: boolean;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  
  useEffect(() => {
    // Initialize admin user if not present
    try {
        const usersRaw = localStorage.getItem('users');
        let users = usersRaw ? JSON.parse(usersRaw) : [];
        const adminUser = users.find((u: any) => u.username === 'demo123');
        if (!adminUser) {
            users.push({
                username: 'demo123',
                password: '111222', // This is just for local simulation
                isAdmin: true,
                isTestUser: false,
                isFrozen: false,
                invitationCode: '111222', // Special code for initial registrations
                inviter: null,
                downline: [],
            });
            localStorage.setItem('users', JSON.stringify(users));
        }
    } catch (e) {
        console.error("Failed to initialize admin user", e);
    }


    try {
      const loggedInUsername = localStorage.getItem('loggedInUser');
      const adminLoggedIn = localStorage.getItem('isAdminLoggedIn');

      if (adminLoggedIn === 'true' && loggedInUsername) {
        setIsAuthenticated(true);
        setIsAdmin(true);
        setUser({ 
            username: loggedInUsername, 
            isTestUser: false,
            isAdmin: true,
            avatar: `https://placehold.co/100x100.png?text=A`
        });
      } else if (loggedInUsername) {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const currentUser = users.find((u: any) => u.username === loggedInUsername);
        if (currentUser) {
          setIsAuthenticated(true);
          setIsAdmin(false);
          setUser({ 
              username: currentUser.username, 
              isTestUser: currentUser.isTestUser || false,
              isAdmin: false,
              avatar: currentUser.avatar || `https://placehold.co/100x100.png?text=${currentUser.username.charAt(0).toUpperCase()}`,
              isFrozen: currentUser.isFrozen || false,
          });
        }
      } else {
        setIsAuthenticated(false);
        setUser(null);
        setIsAdmin(false);
      }
    } catch (e) {
        console.error("Failed to parse auth data from localStorage", e);
        // Clear potentially corrupted data
        localStorage.removeItem('loggedInUser');
        localStorage.removeItem('isAdminLoggedIn');
        setIsAuthenticated(false);
        setUser(null);
        setIsAdmin(false);
    }
  }, []);

  const login = (username: string, password: string): boolean => {
    try {
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      const foundUser = users.find((u: any) => u.username === username && u.password === password);
      
      if (foundUser) {
        if (foundUser.isFrozen) {
          return false;
        }

        if (foundUser.isAdmin) {
           localStorage.setItem('loggedInUser', username);
           localStorage.setItem('isAdminLoggedIn', 'true');
            const adminData = {
                username: username,
                isTestUser: false,
                isAdmin: true,
                avatar: `https://placehold.co/100x100.png?text=A`
            }
            setIsAuthenticated(true);
            setIsAdmin(true);
            setUser(adminData);
        } else {
            localStorage.setItem('loggedInUser', username);
            localStorage.removeItem('isAdminLoggedIn');
            const userData = { 
                username: foundUser.username, 
                isTestUser: foundUser.isTestUser || false,
                isAdmin: false,
                avatar: foundUser.avatar || `https://placehold.co/100x100.png?text=${foundUser.username.charAt(0).toUpperCase()}`,
                isFrozen: foundUser.isFrozen || false,
            };
            setIsAuthenticated(true);
            setIsAdmin(false);
            setUser(userData);
        }
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
    localStorage.removeItem('isAdminLoggedIn');
    setIsAuthenticated(false);
    setUser(null);
    setIsAdmin(false);
    // Redirect handled by components
  };
  
  const updateUser = (userData: Partial<User>) => {
    if (user && !isAdmin) {
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
    <AuthContext.Provider value={{ isAuthenticated, user, isAdmin, login, logout, updateUser }}>
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
