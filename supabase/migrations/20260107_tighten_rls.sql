-- Tighten RLS policies for profiles and royalty_ledger
-- Date: 2026-01-07

BEGIN;

-- 1. Tighten profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing permissive policies
DROP POLICY IF EXISTS "profiles anon insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles anon update" ON public.profiles;
DROP POLICY IF EXISTS "profiles anon select" ON public.profiles;

-- New strict policies
-- Allow authenticated users to view their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Allow authenticated users to update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow anonymous users to insert (for signup)
-- Note: In a production app, you might want to restrict this further
CREATE POLICY "Allow anonymous insert for signup"
  ON public.profiles
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 2. Tighten royalty_ledger table
ALTER TABLE public.royalty_ledger ENABLE ROW LEVEL SECURITY;

-- Drop existing permissive policies
DROP POLICY IF EXISTS "royalty_ledger anon select" ON public.royalty_ledger;

-- New strict policies
-- Allow creators to view their own ledger entries
CREATE POLICY "Creators can view own ledger"
  ON public.royalty_ledger
  FOR SELECT
  TO authenticated
  USING (auth.uid() = face_id);

COMMIT;
