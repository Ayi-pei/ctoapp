
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
  is_frozen?: boolean;
  inviter: string | null;
  registered_at?: string;
  username: string;
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
    
    // Using an RPC call that is security-definer to get profile
    const { data, error } = await supabase
      .rpc('get_user_profile_by_id', { user_id_input: supabaseUser.id });

    if (error) {
      console.error('Error fetching user profile:', error.message);
      // If the profile doesn't exist for a logged-in user, it's a data integrity issue.
      // Log them out to prevent a broken app state.
      if (error.code === 'PGRST116') { // "relation does not exist" or similar if RLS fails to find row
          console.warn(`Profile not found for user ${supabaseUser.id}, signing out.`);
          await supabase.auth.signOut();
      }
      return null;
    }
    
    // The RPC function returns an array, we expect a single user object.
    return (data?.[0] as User) || null;
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

    // Also check user on initial load
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
    // Standardize email format for login
    const email = `${username.toLowerCase()}@rsf.app`;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      console.error('Login failed:', error.message);
      return false;
    }
    // Auth state change listener will handle setting user and isAdmin
    return true;
  };
  
  const register = async (username: string, password: string, invitationCode: string): Promise<boolean> => {
     try {
        // Find the user who owns the invitation code.
        const { data: inviterData, error: inviterError } = await supabase
            .from('users')
            .select('username')
            .eq('invitation_code', invitationCode)
            .single();
        
        if (inviterError || !inviterData) {
            toast({ variant: 'destructive', title: '注册失败', description: '无效的邀请码。'});
            console.error("Invalid invitation code:", invitationCode, inviterError?.message);
            return false;
        }

      const email = `${username.toLowerCase()}@rsf.app`;
      // Call the new registration RPC function
       const { error: rpcError } = await supabase.rpc('register_new_user', {
            p_email: email,
            p_password: password,
            p_username: username,
            p_inviter_username: inviterData.username
        });
      
      if (rpcError) {
        throw new Error(rpcError.message);
      }
      
      toast({ title: '注册成功', description: '请登录。' });
      return true;

    } catch (error: any) {
      console.error("An unexpected error occurred during registration:", error);
      let errorMessage = '发生未知错误，请重试。';
      if (error.message?.includes('duplicate key value violates unique constraint "users_username_key"')) {
        errorMessage = "该用户名已被占用，请使用其他用户名。";
      } else if (error.message?.includes('User already registered')) {
        errorMessage = "该邮箱/用户名已被注册。";
      }

      toast({
        variant: 'destructive',
        title: '注册失败',
        description: errorMessage,
      });
      return false;
    }
  }

  const logout = async () => {
    await supabase.auth.signOut();
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
    // This effect handles redirection based on auth state.
    if (!isLoading) {
      const isAuthenticated = !!session;
      const isAuthPage = pathname === '/login' || pathname === '/register';
      
      if (!isAuthenticated && !isAuthPage) {
          router.push('/login');
      } else if (isAuthenticated && isAuthPage) {
          router.push(isAdmin ? '/admin' : '/dashboard');
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
