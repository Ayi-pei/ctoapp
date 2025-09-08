-- Allow any authenticated user to insert into the activities table.
-- This is necessary to allow the client-side seeding logic to work.
-- Note: This is a temporary, less secure policy to get the app running.
-- A more robust solution would be to create a server-side seeding function.
CREATE POLICY "Allow authenticated users to insert activities" ON public.activities FOR INSERT TO authenticated WITH CHECK (true);
