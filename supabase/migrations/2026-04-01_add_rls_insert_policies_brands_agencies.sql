-- Add RLS INSERT policies for brands and agencies tables
-- This allows OAuth users to create their profiles for the first time
-- Previously only SELECT and UPDATE were allowed

BEGIN;

-- Add INSERT policy for brands table
-- Users can insert their own brand profile (id = auth.uid())
DROP POLICY IF EXISTS "Users can insert their own brand profile" ON public.brands;
CREATE POLICY "Users can insert their own brand profile" ON public.brands
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Add INSERT policy for agencies table
-- Users can insert their own agency profile (id = auth.uid())
DROP POLICY IF EXISTS "Users can insert their own agency profile" ON public.agencies;
CREATE POLICY "Users can insert their own agency profile" ON public.agencies
    FOR INSERT WITH CHECK (auth.uid() = id);

COMMIT;
