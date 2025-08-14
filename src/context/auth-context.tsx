
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
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const INITIAL_ADMIN_INVITATION_CODE = "STARTERCODE";

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
        setIsLoading(true);
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
    const email = `${username.toLowerCase()}@rsf.app`; 
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      console.error('Login failed:', error.message);
      return false;
    }
    return true;
  };
  
  const register = async (username: string, password: string, invitationCode: string): Promise<boolean> => {
     try {
        let inviterUsername: string | null = null;
        let isAdminUser = false;

        // Check for the universal starter code
        if (invitationCode === INITIAL_ADMIN_INVITATION_CODE) {
             const { count, error: countError } = await supabase.from('users').select('*', { count: 'exact' });
             if (countError) {
                throw new Error(countError.message);
             }
             
             if (count !== null && count > 0) {
                 toast({ variant: 'destructive', title: '注册失败', description: '初始邀请码已失效。' });
                 return false;
             }
             // This is the first user, make them an admin
             isAdminUser = true;
             inviterUsername = null; // No inviter for the first admin
        } else {
             const { data: inviterData, error: inviterError } = await supabase
                .from('users')
                .select('id, username')
                .eq('invitation_code', invitationCode)
                .single();
            
            if (inviterError) {
                toast({ variant: 'destructive', title: '注册失败', description: '无效的邀请码。'});
                console.error("Invalid invitation code:", invitationCode, inviterError.message);
                return false;
            }
            inviterUsername = inviterData.username;
        }

      
      const email = `${username.toLowerCase()}@rsf.app`;
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (authError) {
        throw new Error(authError.message);
      }
      
      const registeredUser = authData.user;
      if (!registeredUser) {
        throw new Error("User registration did not return a user object.");
      }
      
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: registeredUser.id,
          username: username,
          email: email,
          is_admin: isAdminUser,
          is_test_user: isAdminUser, // Make admin a test user to have initial funds for testing
          is_frozen: false,
          inviter: inviterUsername,
          registered_at: new Date().toISOString()
        });
        
      if (profileError) {
         console.error("Failed to create user profile:", profileError.message);
         // Rollback auth user creation
         const { error: deleteError } = await supabase.auth.admin.deleteUser(registeredUser.id);
         if(deleteError) console.error("FATAL: Failed to clean up orphaned auth user:", deleteError.message);
         throw new Error('无法创建用户资料，请重试。');
      }

      toast({ title: '注册成功', description: '请登录。' });
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
    setUser(null);
    setIsAdmin(false);
    setSession(null);
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
      const isAuthPage = pathname === '/login' || pathname === '/register';
      
      if (!isAuthenticated && !isAuthPage) {
          router.push('/login');
      } else if (isAuthenticated && isAuthPage) {
          router.push(user?.is_admin ? '/admin' : '/dashboard');
      }
    }
  }, [session, user, isLoading, pathname, router]);

  const value = {
    isAuthenticated: !!session,
    user,
    isAdmin,
    login,
    logout,
    register,
    updateUser,
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
