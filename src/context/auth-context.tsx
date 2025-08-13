
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';

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
  register: (username: string, password: string, invitationCode: string) => Promise<boolean>;
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
  const { toast } = useToast();

  const fetchUserProfile = async (supabaseUser: SupabaseUser | null): Promise<User | null> => {
    if (!supabaseUser) return null;
    
    const { data: userProfile, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', supabaseUser.id)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error.message);
      if (error.code === 'PGRST116') { 
          await supabase.auth.signOut();
      }
      return null;
    }
    return userProfile as User;
  };


  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        const userProfile = await fetchUserProfile(session?.user || null);
        setUser(userProfile);
        setIsAdmin(userProfile?.is_admin || false);
        setIsLoading(false);
      }
    );

    const checkUser = async () => {
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
    const email = `${username}@rsf.app`;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error('Login failed:', error.message);
      return false;
    }
    return true;
  };
  
  const register = async (username: string, password: string, invitationCode: string): Promise<boolean> => {
     try {
      const { data: inviterData, error: inviterError } = await supabase
        .from('users')
        .select('id, username')
        .eq('invitation_code', invitationCode)
        .single();
      
      if (inviterError || !inviterData) {
        toast({ variant: 'destructive', title: '注册失败', description: '无效的邀请码。'});
        return false;
      }
      
      const email = `${username}@rsf.app`;
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username
          }
        }
      });
      
      if (authError) {
        toast({ variant: 'destructive', title: '注册失败', description: authError.message });
        return false;
      }
      
      const registeredUser = authData.user;
      if (!registeredUser) {
        throw new Error("User registration did not return a user.");
      }
      
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: registeredUser.id,
          username: username,
          email: email,
          is_admin: false,
          is_test_user: false,
          is_frozen: false,
          inviter: inviterData.username,
          registered_at: new Date().toISOString()
        });
        
      if (profileError) {
         console.error("Failed to create user profile:", profileError.message);
         const { error: deleteError } = await supabase.auth.admin.deleteUser(registeredUser.id);
         if(deleteError) console.error("Failed to clean up orphaned auth user:", deleteError.message);
         toast({ variant: 'destructive', title: '注册失败', description: '无法创建用户资料，请重试。' });
         return false;
      }

      return true;

    } catch (error: any) {
      console.error(error);
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
    register,
    updateUser,
    session,
  };

  if (isLoading) {
    return null; 
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
