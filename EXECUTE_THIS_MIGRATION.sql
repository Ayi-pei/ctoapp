-- Create the investment_products table
CREATE TABLE public.investment_products (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    min_amount NUMERIC(30, 10),
    max_amount NUMERIC(30, 10),
    profit_rate NUMERIC(5, 4),
    period INT, -- in days
    is_active BOOLEAN DEFAULT TRUE
);
COMMENT ON TABLE public.investment_products IS 'Stores the available investment products.';

-- Create the investment_settings table
CREATE TABLE public.investment_settings (
    id INT PRIMARY KEY DEFAULT 1, -- Singleton table
    is_investment_enabled BOOLEAN DEFAULT TRUE,
    global_min_investment NUMERIC(30, 10),
    global_max_investment NUMERIC(30, 10),
    CONSTRAINT investment_settings_singleton CHECK (id = 1)
);
COMMENT ON TABLE public.investment_settings IS 'Global settings for the investment feature.';

-- RLS Policies for new tables
ALTER TABLE public.investment_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investment_settings ENABLE ROW LEVEL SECURITY;

-- Admins can do anything
CREATE POLICY "Allow admin full access on investment_products" ON public.investment_products FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Allow admin full access on investment_settings" ON public.investment_settings FOR ALL USING (public.is_admin(auth.uid()));

-- Users can view products and settings
CREATE POLICY "Allow users to view investment products" ON public.investment_products FOR SELECT USING (true);
CREATE POLICY "Allow users to view investment settings" ON public.investment_settings FOR SELECT USING (true);
