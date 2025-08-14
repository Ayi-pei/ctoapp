
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// The RPC function `register_new_user` expects the following parameters:
// p_email: the email for the new user (e.g., 'newuser@rsf.app')
// p_password: the new user's password
// p_username: the desired unique username for the new user
// p_invitation_code: the invitation code from an existing user.
    