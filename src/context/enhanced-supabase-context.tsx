"use client";

import React, { createContext, useContext, ReactNode, useCallback } from 'react';
import { useSimpleAuth } from './simple-custom-auth';
import { createAuthenticatedSupabaseClient, setCurrentUserContext } from '@/lib/supabase-auth-helper';
import { supabase, isSupabaseEnabled } from '@/lib/supabaseClient';

interface EnhancedSupabaseContextType {
  authenticatedClient: ReturnType<typeof createAuthenticatedSupabaseClient> | null;
  setUserContext: (userId: string | null) => Promise<void>;
  isEnabled: boolean;
}

const EnhancedSupabaseContext = createContext<EnhancedSupabaseContextType | undefined>(undefined);

export function EnhancedSupabaseProvider({ children }: { children: ReactNode }) {
  const { user } = useSimpleAuth();

  const authenticatedClient = user ? createAuthenticatedSupabaseClient(user.id) : null;

  const setUserContext = async (userId: string | null) => {
    await setCurrentUserContext(userId);
  };

  const value: EnhancedSupabaseContextType = {
    authenticatedClient,
    setUserContext,
    isEnabled: isSupabaseEnabled,
  };

  return (
    <EnhancedSupabaseContext.Provider value={value}>
      {children}
    </EnhancedSupabaseContext.Provider>
  );
}

export function useEnhancedSupabase() {
  const context = useContext(EnhancedSupabaseContext);
  if (context === undefined) {
    throw new Error('useEnhancedSupabase must be used within an EnhancedSupabaseProvider');
  }
  return context;
}

// 便捷 Hook：自动设置用户上下文的 Supabase 操作
export function useAuthenticatedSupabase() {
  const { user } = useSimpleAuth();
  const { setUserContext } = useEnhancedSupabase();

  // 在每次操作前自动设置用户上下文
  const withUserContext = useCallback(async <T>(operation: () => Promise<T>): Promise<T> => {
    if (user) {
      await setUserContext(user.id);
    }
    return operation();
  }, [user, setUserContext]);

  return {
    from: (table: string) => ({
      select: async (columns?: string) => 
        withUserContext(() => supabase.from(table).select(columns)),
      insert: async (data: Record<string, any>) => 
        withUserContext(() => supabase.from(table).insert(data)),
      update: async (data: Record<string, any>) => 
        withUserContext(() => supabase.from(table).update(data)),
      delete: async () => 
        withUserContext(() => supabase.from(table).delete()),
      upsert: async (data: Record<string, any>) => 
        withUserContext(() => supabase.from(table).upsert(data)),
    }),
    rpc: async (functionName: string, params?: Record<string, any>) =>
      withUserContext(() => supabase.rpc(functionName, params)),
    isEnabled: isSupabaseEnabled,
    user,
  };
}

