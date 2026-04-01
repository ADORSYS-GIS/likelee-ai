-- Add RLS INSERT policies for brands, agencies, and creators tables
-- This allows OAuth users to create their profiles for the first time
-- Previously only SELECT and UPDATE were allowed (or no RLS for creators)

BEGIN;

-- ===== BRANDS TABLE =====
-- Add INSERT policy for brands table
-- Users can insert their own brand profile (id = auth.uid())
DROP POLICY IF EXISTS "Users can insert their own brand profile" ON public.brands;
CREATE POLICY "Users can insert their own brand profile" ON public.brands
    FOR INSERT WITH CHECK (auth.uid() = id);

-- ===== AGENCIES TABLE =====
-- Add INSERT policy for agencies table
-- Users can insert their own agency profile (id = auth.uid())
DROP POLICY IF EXISTS "Users can insert their own agency profile" ON public.agencies;
CREATE POLICY "Users can insert their own agency profile" ON public.agencies
    FOR INSERT WITH CHECK (auth.uid() = id);

-- ===== CREATORS TABLE =====
-- Enable RLS on creators table if not already enabled
ALTER TABLE public.creators ENABLE ROW LEVEL SECURITY;

-- Add SELECT policy for creators table
-- Users can view their own creator profile
DROP POLICY IF EXISTS "Users can view their own creator profile" ON public.creators;
CREATE POLICY "Users can view their own creator profile" ON public.creators
    FOR SELECT USING (auth.uid() = id);

-- Add INSERT policy for creators table
-- Users can insert their own creator profile (id = auth.uid())
DROP POLICY IF EXISTS "Users can insert their own creator profile" ON public.creators;
CREATE POLICY "Users can insert their own creator profile" ON public.creators
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Add UPDATE policy for creators table
-- Users can update their own creator profile
DROP POLICY IF EXISTS "Users can update their own creator profile" ON public.creators;
CREATE POLICY "Users can update their own creator profile" ON public.creators
    FOR UPDATE USING (auth.uid() = id);

COMMIT;
