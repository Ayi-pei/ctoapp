DO $$
    BEGIN
        IF EXISTS (
            SELECT 1
            FROM pg_policies
            WHERE schemaname = 'public'
              AND tablename = 'profiles'
              AND policyname = 'Allow public read access to profiles'
        ) THEN
            EXECUTE 'DROP POLICY "Allow public read access to profiles" ON public.profiles';
        END IF;
    END
$$;
