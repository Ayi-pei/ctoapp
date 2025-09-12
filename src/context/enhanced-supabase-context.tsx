"use client";

import React, {
  createContext,
  useContext,
  ReactNode,
  useCallback,
  useMemo,
} from "react";
import { useSimpleAuth } from "./simple-custom-auth";
import {
  createAuthenticatedSupabaseClient,
  setCurrentUserContext,
} from "@/lib/supabase-auth-helper";
import { supabase, isSupabaseEnabled } from "@/lib/supabaseClient";

interface EnhancedSupabaseContextType {
  authenticatedClient: ReturnType<
    typeof createAuthenticatedSupabaseClient
  > | null;
  setUserContext: (userId: string | null) => Promise<void>;
  isEnabled: boolean;
}

const EnhancedSupabaseContext = createContext<
  EnhancedSupabaseContextType | undefined
>(undefined);

export function EnhancedSupabaseProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { user } = useSimpleAuth();

  const authenticatedClient = user
    ? createAuthenticatedSupabaseClient(user.id)
    : null;

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
    // Provide a safe fallback to avoid runtime crash if provider is not mounted yet
    return {
      authenticatedClient: null,
      setUserContext: async () => {},
      isEnabled: isSupabaseEnabled,
    } as EnhancedSupabaseContextType;
  }
  return context;
}

// Custom hook for Supabase operations with automatic user context setting
export function useAuthenticatedSupabase() {
  const { user } = useSimpleAuth();
  const { setUserContext } = useEnhancedSupabase();

  // Helper that ensures user context is set, then passes through the raw supabase client for full chaining
  const withUserContext = useCallback(
    async (
      operation: (sb: typeof supabase) => Promise<any> | any
    ): Promise<any> => {
      if (user) {
        await setUserContext(user.id);
      }
      return operation(supabase);
    },
    [user, setUserContext]
  );

  // Use useMemo to stabilize the returned object and prevent unnecessary re-renders
  return useMemo(
    () => ({
      withContext: withUserContext,
      rpc: async (functionName: string, params?: Record<string, any>) =>
        withUserContext((sb) => sb.rpc(functionName, params)),
      isEnabled: isSupabaseEnabled,
      user,
    }),
    [withUserContext, user]
  );
}
