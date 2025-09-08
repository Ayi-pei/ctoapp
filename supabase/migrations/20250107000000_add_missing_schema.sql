-- Helper function to check for admin role
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    is_admin_user BOOLEAN;
BEGIN
    SELECT u.is_admin INTO is_admin_user
    FROM public.users u
    WHERE u.id = p_user_id;
    RETURN COALESCE(is_admin_user, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the investment_settings table
CREATE TABLE public.investment_settings (
    id INT PRIMARY KEY DEFAULT 1, -- Singleton table
    is_investment_enabled BOOLEAN DEFAULT TRUE,
    global_min_investment NUMERIC(30, 10),
    global_max_investment NUMERIC(30, 10),
    CONSTRAINT investment_settings_singleton CHECK (id = 1)
);
COMMENT ON TABLE public.investment_settings IS 'Global settings for the investment feature.';

-- RLS Policies
ALTER TABLE public.investment_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow admin full access on investment_settings" ON public.investment_settings FOR ALL USING (public.is_admin(auth.uid()));

CREATE POLICY "Allow users to view investment settings" ON public.investment_settings FOR SELECT USING (true);
