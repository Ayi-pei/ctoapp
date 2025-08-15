
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
        // Handle special admin case
        if (sessionStorage.getItem('isSpecialAdmin') === 'true') {
            const adminUser: User = {
                id: '00000000-0000-0000-0000-000000000001',
                username: 'admin',
                email: 'admin@noemail.app',
                inviter_id: null,
                is_admin: true,
                is_test_user: true,
                is_frozen: false,
                invitation_code: 'admin8888',
                created_at: new Date().toISOString(),
            };
            setUser(adminUser);
            setIsAdmin(true);
            setSession(null); // No real session for this special case
        } else {
            setSession(session);
            if (session?.user) {
                const userProfile = await fetchUserProfile(session.user);
                setUser(userProfile);
                setIsAdmin(userProfile?.is_admin || false);
            } else {
                setUser(null);
                setIsAdmin(false);
            }
        }
        setIsLoading(false);
      }
    );

    // Initial check
    const checkUser = async () => {
      setIsLoading(true);
      if (sessionStorage.getItem('isSpecialAdmin') === 'true') {
         const adminUser: User = {
                id: '00000000-0000-0000-0000-000000000001',
                username: 'admin',
                email: 'admin@noemail.app',
                inviter_id: null,
                is_admin: true,
                is_test_user: true,
                is_frozen: false,
                invitation_code: 'admin8888',
                created_at: new Date().toISOString(),
            };
        setUser(adminUser);
        setIsAdmin(true);
        setSession(null);
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        if (session?.user) {
          const userProfile = await fetchUserProfile(session.user);
          setUser(userProfile);
          setIsAdmin(userProfile?.is_admin || false);
        }
      }
      setIsLoading(false);
    };
    checkUser();

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    // Special case for admin login to simplify process
    if (username.toLowerCase() === 'admin' && password === 'password') {
        sessionStorage.setItem('isSpecialAdmin', 'true');
        const adminUser: User = {
            id: '00000000-0000-0000-0000-000000000001',
            username: 'admin',
            email: 'admin@noemail.app',
            inviter_id: null,
            is_admin: true,
            is_test_user: true,
            is_frozen: false,
            invitation_code: 'admin8888',
            created_at: new Date().toISOString(),
        };
        setUser(adminUser);
        setIsAdmin(true);
        setSession(null); // No real session for this special case
        setIsLoading(false);
        router.push('/admin'); // Manually redirect
        return true;
    }

    // Standard login for all other users
    const email = `${username.toLowerCase()}@noemail.app`;
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email, 
      password,
    });
    
    if (error) {
      console.error('Login failed:', error.message);
      toast({
        variant: 'destructive',
        title: '登录失败',
        description: '用户名或密码错误。',
      });
      return false;
    }
    // Auth listener will handle setting user state for regular users
    return true;
  };
  
  const register = async (username: string, password: string, invitationCode: string): Promise<boolean> => {
    const email = `${username.toLowerCase()}@noemail.app`;
     try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    username: username,
                    invitation_code: invitationCode,
                    is_admin: invitationCode === 'admin8888'
                }
            }
        });
      
        if (error) throw error;
        
        if (!data.user) {
             throw new Error("Registration succeeded but no user object was returned.");
        }
      
        toast({ title: '注册成功', description: '您的账户已创建，请登录。' });
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
    sessionStorage.removeItem('isSpecialAdmin');
    await supabase.auth.signOut();
    setUser(null);
    setIsAdmin(false);
    setSession(null);
    router.push('/login');
  };
  
   useEffect(() => {
    if (!isLoading) {
      const isAuthenticated = !!user;
      const isAuthPage = pathname === '/login' || pathname === '/register';
      
      if (!isAuthenticated && !isAuthPage) {
          router.push('/login');
      } else if (isAuthenticated && isAuthPage) {
          router.push(isAdmin ? '/admin/users' : '/dashboard');
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
