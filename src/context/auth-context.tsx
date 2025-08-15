
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
          return null; // User profile not found, this is handled in onAuthStateChange
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
        setSession(session);
        
        if (session?.user) {
            let userProfile = await fetchUserProfile(session.user);

            // If admin logs in and has no profile, create it on-the-fly.
            if (!userProfile && session.user.email?.startsWith('admin666')) {
                console.log("Admin user profile not found, attempting to create...");
                 try {
                    const { data: adminUserData, error: adminUserError } = await supabaseAdmin
                        .from('users')
                        .insert({
                            id: session.user.id,
                            username: 'admin666',
                            is_admin: true,
                            email: session.user.email,
                            // invitation_code and inviter_id can be defaults or specific values
                            invitation_code: `ADMIN${session.user.id.substring(0, 4)}`, 
                            is_test_user: true, // Or false depending on desired default
                        })
                        .select()
                        .single();

                    if (adminUserError) throw adminUserError;
                    userProfile = adminUserData as User;
                    console.log("Admin user profile created successfully on login.");
                } catch (e: any) {
                    console.error("Failed to create admin profile on-the-fly during login:", e.message);
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
    const isAdminRegistration = invitationCode === 'admin8888';

     try {
        // Step 1: Create the auth user first. This will fail if the user already exists.
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
        });
      
        if (authError) {
             if (authError.message.includes("User already registered")) {
                toast({ variant: 'destructive', title: '注册失败', description: '该用户名已被使用，请更换一个。'});
                return false;
            }
            throw authError; // For other auth errors
        }
        
        if (!authData.user) {
             throw new Error("Registration succeeded but no user object was returned.");
        }

        // Step 2: Create the public user profile with admin client to bypass RLS.
        const newUserProfileData: Partial<User> = {
            id: authData.user.id,
            username: username,
            email: email,
            is_admin: isAdminRegistration,
        };

        if (!isAdminRegistration) {
             const { data: inviterData, error: inviterError } = await supabase
                .from('users')
                .select('id')
                .eq('invitation_code', invitationCode)
                .single();

            if (inviterError || !inviterData) {
                // If inviter not found, we should clean up the created auth user.
                await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
                toast({ variant: 'destructive', title: '注册失败', description: '无效的邀请码。'});
                return false;
            }
            newUserProfileData.inviter_id = inviterData.id;
        }

        const { error: profileError } = await supabaseAdmin
            .from('users')
            .insert(newUserProfileData as User);

        if (profileError) {
            // If profile creation fails, clean up the created auth user to allow retries.
            await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
            throw profileError;
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
