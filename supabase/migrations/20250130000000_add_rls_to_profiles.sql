-- 1. Enable RLS on the profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to start fresh
DROP POLICY IF EXISTS "Allow users to read their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow admin to read all profiles" ON public.profiles;

-- 3. Create SELECT (read) policy
-- Allows any authenticated user to read all profiles. 
-- This is often needed for features like leaderboards, user search, etc.
-- Sensitive columns should be handled by column-level security or views if necessary.
CREATE POLICY "Allow users to read all profiles" ON public.profiles
FOR SELECT TO authenticated USING (true);

-- 4. Create UPDATE (write) policy
-- Allows a user to update ONLY their own profile.
CREATE POLICY "Allow users to update their own profile" ON public.profiles
FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Note: There is NO policy for INSERT or DELETE. This means, by default, no one can create or delete profiles directly from the client-side API.
-- This is a good security practice. Creation should happen via a trusted server-side process (like the initial signup function).
-- Deletion should be handled by a secure, admin-only server-side function.

-- Also, there is no explicit admin UPDATE policy. This is INTENTIONAL.
-- The `/api/auth/update` route uses the SERVICE_ROLE_KEY, which bypasses RLS.
-- By not having an admin policy, we force all admin updates to go through our secure, validated API endpoint, creating a single, controllable point of entry for modifications.
