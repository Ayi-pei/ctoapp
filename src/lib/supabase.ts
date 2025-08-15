

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// The RPC function `register_new_user` handles new user creation.
// It is a SECURITY DEFINER function, running with elevated privileges.
//
// Parameters:
// p_email: The new user's email (e.g., 'newuser@noemail.app').
// p_password: The new user's password.
// p_username: The unique username for the new user.
// p_invitation_code: The invitation code from an existing user or the special admin code.
//
// Logic:
// 1.  Check if username or email already exists. If so, return an error.
// 2.  Check the `p_invitation_code`.
// 3.  IF `p_invitation_code` IS 'admin8888':
//     a. Set `is_admin` to TRUE.
//     b. Set `inviter_id` to NULL.
// 4.  ELSE (for regular invitation codes):
//     a. Find the `inviter` in the `users` table where their `invitation_code` matches `p_invitation_code`.
//     b. If no `inviter` is found, return an error 'Invalid invitation code'.
//     c. Set `is_admin` to FALSE.
//     d. Set `inviter_id` to the found `inviter.id`.
// 5.  Create a new user in the `auth.users` table using `auth.uid()` and the provided credentials.
// 6.  Create a corresponding profile in the `public.users` table with all the details (id, username, email, is_admin, inviter_id).
// 7.  Return a JSON object with a success status and message.
//
// Example function signature in SQL:
// CREATE OR REPLACE FUNCTION register_new_user(p_email TEXT, p_password TEXT, p_username TEXT, p_invitation_code TEXT)
// RETURNS JSON
// AS $$
// -- function body here
// $$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;
    