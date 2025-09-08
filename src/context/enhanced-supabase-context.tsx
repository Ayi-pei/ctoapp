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

// Custom hook for Supabase operations with automatic user context setting
export function useAuthenticatedSupabase() {
  const { user } = useSimpleAuth();
  const { setUserContext } = useEnhancedSupabase();

  const withUserContext = useCallback(async <T,>(operation: () => Promise<T>): Promise<T> => {
    if (user?.id) {
      await setUserContext(user.id);
    }
    return operation();
  }, [user, setUserContext]);

  return {
    from: (table: string) => ({
      select: (columns?: string) => 
        withUserContext(async () => supabase.from(table).select(columns)),
      insert: (data: Record<string, any>) => 
        withUserContext(async () => supabase.from(table).insert(data)),
      update: (data: Record<string, any>) => 
        withUserContext(async () => supabase.from(table).update(data)),
      'delete': () => 
        withUserContext(async () => supabase.from(table).delete()),
      upsert: (data: Record<string, any>) => 
        withUserContext(async () => supabase.from(table).upsert(data)),
    }),
    rpc: (functionName: string, params?: Record<string, any>) =>
      withUserContext(async () => supabase.rpc(functionName, params)),
    isEnabled: isSupabaseEnabled,
    user,
  };
}
