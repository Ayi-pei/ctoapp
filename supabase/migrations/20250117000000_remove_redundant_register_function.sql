-- This migration removes the redundant and misleading register_new_user function.
-- The application's API has its own unified logic for user registration,
-- and this database function is not used and conflicts with the current auth flow.

DROP FUNCTION IF EXISTS public.register_new_user(text, text, text, text);
