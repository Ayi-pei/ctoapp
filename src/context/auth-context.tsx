
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

      if (error) {
        if (error.code === 'PGRST116') {
          console.warn(`User profile for ${supabaseUser.id} not found. This might be a new user or an admin that needs their profile created.`);
          return null;
        }
        throw error;
      }
      return data as User;

    } catch (error: any) {
      console.error('Error fetching user profile:', error.message);
      if (error.code !== 'PGRST116') {
        toast({
            variant: 'destructive',
            title: '获取用户资料失败',
            description: error.message,
        });
      }
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
            let userProfile = await fetchUserProfile(session.user);
            
            // If admin logs in and has no profile, create it.
            if (!userProfile && session.user.email?.startsWith('admin666')) {
                console.log("Admin user has no profile, attempting to create one...");
                 try {
                    const { data: adminUserData, error: adminUserError } = await supabaseAdmin
                        .from('users')
                        .insert({
                            id: session.user.id,
                            username: 'admin666',
                            email: session.user.email,
                            is_admin: true
                        })
                        .select()
                        .single();

                    if(adminUserError) throw adminUserError;
                    userProfile = adminUserData as User;
                    console.log("Admin user profile created successfully.");

                } catch (e: any) {
                    console.error("Failed to create admin profile on-the-fly:", e.message);
                }
            }
            
            setUser(userProfile);
            setIsAdmin(userProfile?.is_admin || false);
        } else {
            setUser(null);
            setIsAdmin(false);
        }
        setIsLoading(false);
      }
    );

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    const isAdminRegistration = invitationCode === 'admin8888';

     try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    username: username,
                    email: email,
                    raw_invitation_code: invitationCode,
                    is_admin: isAdminRegistration
                }
            }
        });
      
        if (error) {
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
        if (error?.message) {
            if (error.message.includes('User already registered')) {
                errorMessage = '该用户名已被使用，请更换一个。';
            } else if (error.message.includes('Database error saving new user')) {
                errorMessage = '创建用户资料时发生数据库错误，请联系管理员或检查邀请码是否有效。';
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
