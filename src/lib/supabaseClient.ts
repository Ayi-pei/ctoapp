
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseEnabled = !!(supabaseUrl && supabaseAnonKey);

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
  } as any;
}

export { supabase };
