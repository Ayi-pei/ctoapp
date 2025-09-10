
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabaseDisabled = String(process.env.NEXT_PUBLIC_SUPABASE_DISABLED).toLowerCase() === 'true';
export const isSupabaseEnabled = !!(supabaseUrl && supabaseAnonKey) && !supabaseDisabled;
export const isRealtimeEnabled = isSupabaseEnabled && String(process.env.NEXT_PUBLIC_SUPABASE_REALTIME ?? 'true').toLowerCase() !== 'false';
export const isMarketDbPersistEnabled = isSupabaseEnabled && String(process.env.NEXT_PUBLIC_MARKET_DB_PERSIST ?? 'true').toLowerCase() !== 'false';

let supabase: SupabaseClient;

if (isSupabaseEnabled) {
  supabase = createClient(supabaseUrl!, supabaseAnonKey!);
} else {
  console.warn("Supabase is not configured. Database features will be disabled.");
  // Provide a mock object if Supabase is disabled to prevent runtime errors
  supabase = {
    from: () => ({
      select: async () => ({ data: null, error: new Error('Supabase not enabled') }),
      insert: async () => ({ data: null, error: new Error('Supabase not enabled') }),
      update: async () => ({ data: null, error: new Error('Supabase not enabled') }),
      delete: async () => ({ data: null, error: new Error('Supabase not enabled') }),
      upsert: async () => ({ data: null, error: new Error('Supabase not enabled') }),
    }),
    rpc: async () => ({ data: null, error: new Error('Supabase not enabled') }),
    auth: {
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signInWithPassword: async () => ({ data: { user: null }, error: new Error('Supabase not enabled') }),
        signUp: async () => ({ data: { user: null }, error: new Error('Supabase not enabled') }),
        signOut: async () => ({ error: null }),
        admin: {
             updateUserById: async () => ({ data: { user: null }, error: new Error('Supabase not enabled') })
        }
    },
    channel: () => ({
        on: () => ({
            subscribe: () => ({
                unsubscribe: () => {}
            })
        })
    }),
    removeChannel: () => {}
  } as any;
}

export { supabase };
