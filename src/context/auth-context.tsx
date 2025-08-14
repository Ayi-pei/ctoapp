

"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';
import type { User, RegisterUserResponse } from '@/types';

export type { User };

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  register: (username: string, password: string, invitationCode: string) => Promise<boolean>;
  session: Session | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const fetchUserProfile = async (supabaseUser: SupabaseUser | null): Promise<User | null> => {
    if (!supabaseUser) return null;
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();

      if (error) throw error;
      return data as User;

    } catch (error: any) {
      console.error('Error fetching user profile:', error.message);
      await supabase.auth.signOut();
      return null;
    }
  };

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setIsLoading(true);
        setSession(session);
        if (session?.user) {
            const userProfile = await fetchUserProfile(session.user);
            setUser(userProfile);
            setIsAdmin(userProfile?.is_admin || false);
        } else {
            setUser(null);
            setIsAdmin(false);
        }
        setIsLoading(false);
      }
    );

    // Initial check
    const checkUser = async () => {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (session?.user) {
        const userProfile = await fetchUserProfile(session.user);
        setUser(userProfile);
        setIsAdmin(userProfile?.is_admin || false);
      }
      setIsLoading(false);
    };
    checkUser();

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    const email = `${username.toLowerCase()}@rsf.app`;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      console.error('Login failed:', error.message);
      return false;
    }
    // Auth listener handles setting user state
    return true;
  };
  
  const register = async (username: string, password: string, invitationCode: string): Promise<boolean> => {
     try {
        const email = `${username.toLowerCase()}@rsf.app`;
        const { data, error: rpcError } = await supabase.rpc('register_new_user', {
            p_email: email,
            p_password: password,
            p_username: username,
            p_invitation_code: invitationCode
        });
      
        if (rpcError) throw rpcError;
        
        const result = data as RegisterUserResponse;

        if (result.status === 'error') {
           throw new Error(result.message);
        }
      
        toast({ title: '注册成功', description: result.message });
        return true;

    } catch (error: any) {
        console.error("An unexpected error occurred during registration:", error);
        toast({
            variant: 'destructive',
            title: '注册失败',
            description: error.message || '发生未知错误，请重试。',
        });
        return false;
    }
  }

  const logout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };
  
   useEffect(() => {
    if (!isLoading) {
      const isAuthenticated = !!session;
      const isAuthPage = pathname === '/login' || pathname === '/register';
      
      if (!isAuthenticated && !isAuthPage) {
          router.push('/login');
      } else if (isAuthenticated && isAuthPage) {
          router.push(isAdmin ? '/admin/users' : '/dashboard');
      }
    }
  }, [session, isAdmin, isLoading, pathname, router]);


  const value = {
    isAuthenticated: !!user,
    user,
    isAdmin,
    login,
    logout,
    register,
    session,
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

