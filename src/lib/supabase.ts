

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// The RPC function `register_new_user` handles new user creation.
// It's a SECURITY DEFINER function, running with the service_role privileges.
// It atomically:
// 1. Checks if the provided invitation code is valid.
// 2. Creates a new user in the `auth.users` table.
// 3. Creates a corresponding profile in the `public.users` table, linking the inviter.
//
// Parameters:
// p_email: The new user's email (e.g., 'newuser@rsf.app').
// p_password: The new user's password.
// p_username: The unique username for the new user.
// p_invitation_code: The invitation code from an existing user.
    
