
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export type User = {
  username: string;
  isTestUser: boolean;
  isAdmin: boolean;
  avatar?: string;
  isFrozen?: boolean;
  inviter: string | null;
  registeredAt?: string;
  password?: string;
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
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    try {
      const usersRaw = localStorage.getItem('users');
      let users: User[] = usersRaw ? JSON.parse(usersRaw) : [];
      const adminUserExists = users.some((u: any) => u.username === 'demo123');

      if (!adminUserExists) {
        users.push({
          username: 'demo123',
          password: '111222',
          isAdmin: true,
          isTestUser: false,
          isFrozen: false,
          inviter: null,
          registeredAt: new Date().toISOString(),
        });
        localStorage.setItem('users', JSON.stringify(users));
      }

      const loggedInUsername = localStorage.getItem('loggedInUser');
      if (loggedInUsername) {
        const allUsers: User[] = JSON.parse(localStorage.getItem('users') || '[]');
        const currentUserData = allUsers.find(u => u.username === loggedInUsername);

        if (currentUserData) {
          const { password, ...userState } = currentUserData;
          setIsAuthenticated(true);
          setUser(userState as User);
          setIsAdmin(currentUserData.isAdmin || false);
        } else {
          localStorage.removeItem('loggedInUser');
          setIsAuthenticated(false);
          setUser(null);
          setIsAdmin(false);
        }
      }
    } catch (e) {
      console.error("Failed to parse auth data from localStorage", e);
      localStorage.removeItem('loggedInUser');
      setIsAuthenticated(false);
      setUser(null);
      setIsAdmin(false);
    } finally {
        setIsLoading(false);
    }
  }, []);
  
  const login = (username: string, password: string): boolean => {
    try {
      const users: User[] = JSON.parse(localStorage.getItem('users') || '[]');
      const foundUser = users.find((u: User) => u.username === username && u.password === password);

      if (foundUser) {
        if (foundUser.isFrozen) {
          return false;
        }

        localStorage.setItem('loggedInUser', username);
        const { password: userPassword, ...userState } = foundUser;

        setIsAuthenticated(true);
        setUser(userState as User);
        setIsAdmin(!!foundUser.isAdmin);
        router.push(foundUser.isAdmin ? '/admin' : '/dashboard');
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
    setIsAuthenticated(false);
    setUser(null);
    setIsAdmin(false);
    router.push('/login');
  };

  const updateUser = (userData: Partial<User>) => {
    setUser(prevUser => prevUser ? { ...prevUser, ...userData } : null);

    if (user) {
      try {
        const users: User[] = JSON.parse(localStorage.getItem('users') || '[]');
        const userIndex = users.findIndex((u: User) => u.username === user.username);
        if (userIndex !== -1) {
          const newUserData = { ...users[userIndex], ...userData };
          if (!userData.password) {
            newUserData.password = users[userIndex].password;
          }
          users[userIndex] = newUserData;
          localStorage.setItem('users', JSON.stringify(users));
        }
      } catch (e) {
        console.error("Failed to update user data in localStorage", e);
      }
    }
  }

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
        const publicPaths = ['/login', '/register'];
        if (!publicPaths.includes(pathname)) {
            router.push('/login');
        }
    }
  }, [isLoading, isAuthenticated, router, pathname]);
  
  if (isLoading) {
    return null; 
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
