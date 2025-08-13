
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
      // This case handles if a user exists in auth but not in public.users, a sign of inconsistent data.
      // Signing them out is a safe default.
      if (error.code === 'PGRST116') { 
          console.warn(`Profile not found for user ${supabaseUser.id}, signing out.`);
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
    // To allow login with username, we must construct the email supabase expects.
    const email = `${username.toLowerCase()}@rsf.app`; 
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      console.error('Login failed:', error.message);
      return false;
    }
    // onAuthStateChange will handle fetching the profile and updating state.
    return true;
  };
  
  const register = async (username: string, password: string, invitationCode: string): Promise<boolean> => {
     try {
      // 1. Validate invitation code and get the inviter's details.
      const { data: inviterData, error: inviterError } = await supabase
        .from('users')
        .select('id, username')
        .eq('invitation_code', invitationCode)
        .single();
      
      if (inviterError || !inviterData) {
        toast({ variant: 'destructive', title: '注册失败', description: '无效的邀请码。'});
        console.error("Invalid invitation code:", invitationCode, inviterError);
        return false;
      }
      
      // 2. Create the authentication user in Supabase Auth.
      const email = `${username.toLowerCase()}@rsf.app`;
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
        console.error("Supabase auth.signUp error:", authError);
        return false;
      }
      
      const registeredUser = authData.user;
      if (!registeredUser) {
        throw new Error("User registration did not return a user object.");
      }
      
      // 3. Create the corresponding user profile in the public.users table.
      // This is the critical step that was missing/flawed.
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: registeredUser.id, // Use the ID from the created auth user
          username: username,
          email: email,
          is_admin: false, // Default to non-admin
          is_test_user: false, // Default to real user
          is_frozen: false,
          inviter: inviterData.username, // Set the inviter
          registered_at: new Date().toISOString()
        });
        
      // 4. If creating the profile fails, roll back by deleting the auth user.
      if (profileError) {
         console.error("Failed to create user profile:", profileError.message);
         // IMPORTANT: Clean up the orphaned auth user.
         const { error: deleteError } = await supabase.auth.admin.deleteUser(registeredUser.id);
         if(deleteError) console.error("FATAL: Failed to clean up orphaned auth user:", deleteError.message);
         toast({ variant: 'destructive', title: '注册失败', description: '无法创建用户资料，请重试。' });
         return false;
      }

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
      const isPublicPath = publicPaths.includes(pathname);

      if (isAuthenticated) {
        // If logged in, redirect from public paths
        if (isPublicPath) {
          if (isAdmin) {
            router.push('/admin');
          } else {
            router.push('/dashboard');
          }
        }
      } else {
        // If not logged in, redirect from protected paths
        if (!isPublicPath) {
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

  if (isLoading && !session) {
    // Render nothing or a loading spinner to avoid flashes of content.
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
