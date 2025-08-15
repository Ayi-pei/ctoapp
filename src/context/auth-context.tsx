

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
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();

      if (error) throw error;
      return data as User;

    } catch (error: any) {
      console.error('Error fetching user profile:', error.message);
      toast({
        variant: 'destructive',
        title: '获取用户资料失败',
        description: error.message,
      });
      await supabase.auth.signOut();
      return null;
    }
  };

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
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

    // Initial check on load
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
    const email = `${username.toLowerCase()}@noemail.app`;
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email, 
      password,
    });
    
    if (error || !data.user) {
      console.error('Login failed:', error?.message);
      return false;
    }
    
    toast({ title: '登录成功' });
    return true;
  };
  
  const register = async (username: string, password: string, invitationCode: string): Promise<boolean> => {
    const email = `${username.toLowerCase()}@noemail.app`;
    const isAdminRegistration = invitationCode === 'admin8888';

     try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    username: username,
                    raw_invitation_code: invitationCode,
                    is_admin: isAdminRegistration
                }
            }
        });
      
        if (error) {
            // This is the special fix: if admin already exists in auth but not public.users,
            // we manually create the public profile here.
            if (error.message.includes('User already registered') && username === 'admin666') {
                 toast({ title: '通知', description: '管理员账户已存在，正在尝试修复用户资料...'});
                 const { data: { users }, error: userError } = await supabaseAdmin.auth.admin.listUsers();
                 if (userError) throw userError;

                 const adminAuthUser = users.find(u => u.email === 'admin666@noemail.app');
                 if (adminAuthUser) {
                    const { error: upsertError } = await supabaseAdmin.from('users').upsert({
                        id: adminAuthUser.id,
                        username: 'admin666',
                        email: 'admin666@noemail.app',
                        is_admin: true,
                    }, { onConflict: 'id' });

                    if (upsertError) throw upsertError;

                    toast({ title: '修复成功', description: '管理员资料已创建，请现在登录。'});
                    return true;
                 }
            }
            throw error;
        }
        
        if (!data.user) {
             throw new Error("Registration succeeded but no user object was returned.");
        }
      
        toast({ title: '注册成功', description: '您的账户已创建，请登录。' });
        return true;

    } catch (error: any) {
        console.error("An unexpected error occurred during registration:", error);
        
        let errorMessage = '发生未知错误，请重试。';
        if (error.message) {
            if (error.message.includes('User already registered')) {
                errorMessage = '该用户名已被使用，请更换一个。';
            } else if (error.message.includes('duplicate key value violates unique constraint "users_username_key"')) {
                 errorMessage = '该用户名已被使用，请更换一个。';
            } else {
                errorMessage = error.message;
            }
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
    setUser(null);
    setIsAdmin(false);
    setSession(null);
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
