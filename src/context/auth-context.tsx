
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';

export type User = {
  id: string; // Supabase auth user ID
  email?: string;
  is_test_user: boolean;
  is_admin: boolean;
  avatar?: string;
  is_frozen?: boolean;
  inviter: string | null;
  registered_at?: string;
  username: string; // Add username to the type
  invitation_code?: string;
};

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
  session: Session | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        if (session?.user) {
          const { data: userProfile, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (error) {
            console.error('Error fetching user profile:', error);
            setUser(null);
            setIsAdmin(false);
          } else if (userProfile) {
            setUser(userProfile);
            setIsAdmin(userProfile.is_admin || false);
          }
        } else {
          setUser(null);
          setIsAdmin(false);
        }
        setIsLoading(false);
      }
    );

    // Initial check
    const checkUser = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
       if (data.session?.user) {
          const { data: userProfile, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', data.session.user.id)
            .single();

          if (error) {
            console.error('Error fetching user profile on initial load:', error);
            setUser(null);
            setIsAdmin(false);
          } else if (userProfile) {
            setUser(userProfile);
            setIsAdmin(userProfile.is_admin || false);
          }
        }
      setIsLoading(false);
    };
    checkUser();

    return () => {
      authListener?.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error('Login failed:', error.message);
      return false;
    }
    // Auth state change will handle setting user and redirecting
    return true;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const updateUser = async (userData: Partial<User>) => {
     if (!user) return;
    const { data, error } = await supabase
        .from('users')
        .update(userData)
        .eq('id', user.id)
        .select()
        .single();
    if (error) {
        console.error("Failed to update user in Supabase", error);
    } else {
        setUser(data as User);
    }
  };
  
   useEffect(() => {
    if (!isLoading) {
      const isAuthenticated = !!session;
      const publicPaths = ['/login', '/register'];
      if (isAuthenticated) {
        if (isAdmin && !pathname.startsWith('/admin')) {
          router.push('/admin/users');
        } else if (!isAdmin && pathname.startsWith('/admin')) {
          router.push('/dashboard');
        }
      } else {
        if (!publicPaths.includes(pathname)) {
            router.push('/login');
        }
      }
    }
  }, [session, isAdmin, isLoading, pathname, router]);


  const value = {
    isAuthenticated: !!session,
    user,
    isAdmin,
    login,
    logout,
    updateUser,
    session,
  };

  if (isLoading) {
    return null; // Or a loading spinner
  }

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
