
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/types';

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

      if (error) {
         if (error.code === 'PGRST116') { // "Not a single row" error, means profile doesn't exist
            console.warn(`User profile for ${supabaseUser.id} not found.`);
            return null; 
        }
        throw error;
      }
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
        const currentSession = session;
        setSession(currentSession);
        
        if (currentSession?.user) {
            let userProfile = await fetchUserProfile(currentSession.user);
            
            setUser(userProfile);
            setIsAdmin(userProfile?.is_admin || false);
        } else {
            setUser(null);
            setIsAdmin(false);
        }
        setIsLoading(false);
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    const email = `${username.toLowerCase()}@noemail.app`;

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email, 
      password,
    });
    
    if (error || !data.user) {
      console.error('Login failed:', error?.message);
      return false;
    }
    
    return true;
  };
  
  const register = async (username: string, password: string, invitationCode: string): Promise<boolean> => {
    const email = `${username.toLowerCase()}@noemail.app`;

    try {
        const { data, error } = await supabase.rpc('register_new_user', {
            p_username: username,
            p_email: email,
            p_password: password,
            p_invitation_code: invitationCode
        });

        if (error) {
            throw error;
        }

        const result = data as { status: string; message: string };

        if (result.status === 'success') {
            toast({ title: '注册成功', description: '您的账户已创建，请登录。' });
            return true;
        } else {
            toast({ variant: 'destructive', title: '注册失败', description: result.message });
            return false;
        }

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
      const isAuthenticated = !!user;
      const isAuthPage = pathname === '/login' || pathname === '/register';
      
      if (isAuthenticated && isAuthPage) {
          router.replace(isAdmin ? '/admin' : '/dashboard');
      } else if (!isAuthenticated && !isAuthPage) {
          router.replace('/login');
      }
    }
  }, [user, isAdmin, isLoading, pathname, router]);


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
