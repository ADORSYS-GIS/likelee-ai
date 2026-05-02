-- Migration: Enforce single role per user at the database level
-- Date: 2026-04-29
-- Purpose: Prevent a single auth.users id from having profiles in more than
--          one role table (creators, brands, agencies). This is a safety net
--          that protects profile insert/update flows in the backend.

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Helper function: counts how many role-profile rows exist for a given user
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public._count_user_roles(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT
    (SELECT COUNT(*) FROM public.creators WHERE id = _user_id)::int +
    (SELECT COUNT(*) FROM public.brands  WHERE id = _user_id)::int +
    (SELECT COUNT(*) FROM public.agencies WHERE id = _user_id)::int;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Trigger function: raises an exception if the user already has a profile
--    in a *different* role table.
--
--    We allow INSERT/UPDATE on the same table (e.g. updating a creator row),
--    but reject any operation that would result in the user having rows in
--    more than one of {creators, brands, agencies}.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public._enforce_single_role()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_count integer;
  v_table text;
BEGIN
  -- Determine which table fired the trigger
  v_table := TG_TABLE_NAME;

  -- For UPDATE we need to exclude the row being updated from the count
  -- because it already exists and we're just modifying it.
  IF TG_OP = 'UPDATE' THEN
    -- Count profiles in OTHER tables only (the current table row already exists)
    v_count := (
      (CASE WHEN v_table <> 'creators' THEN (SELECT COUNT(*) FROM public.creators WHERE id = NEW.id)::int ELSE 0 END) +
      (CASE WHEN v_table <> 'brands'    THEN (SELECT COUNT(*) FROM public.brands  WHERE id = NEW.id)::int  ELSE 0 END) +
      (CASE WHEN v_table <> 'agencies'  THEN (SELECT COUNT(*) FROM public.agencies WHERE id = NEW.id)::int ELSE 0 END)
    );

    IF v_count > 0 THEN
      RAISE EXCEPTION 'role_mixing_violation: user % already has a profile in another role table', NEW.id
        USING ERRCODE = '23P01',
              DETAIL  = format('A user may only have ONE role profile (creator, brand, or agency). User %s already has a profile in a different role table.', NEW.id);
    END IF;
  END IF;

  -- For INSERT, check total count across all three tables
  IF TG_OP = 'INSERT' THEN
    v_count := public._count_user_roles(NEW.id);

    IF v_count > 0 THEN
      RAISE EXCEPTION 'role_mixing_violation: user % already has a profile in another role table', NEW.id
        USING ERRCODE = '23P01',
              DETAIL  = format('A user may only have ONE role profile (creator, brand, or agency). User %s already has a profile in a different role table.', NEW.id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Attach triggers to all three role tables
-- ─────────────────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_enforce_single_role_creators ON public.creators;
CREATE TRIGGER trg_enforce_single_role_creators
  BEFORE INSERT OR UPDATE ON public.creators
  FOR EACH ROW
  EXECUTE FUNCTION public._enforce_single_role();

DROP TRIGGER IF EXISTS trg_enforce_single_role_brands ON public.brands;
CREATE TRIGGER trg_enforce_single_role_brands
  BEFORE INSERT OR UPDATE ON public.brands
  FOR EACH ROW
  EXECUTE FUNCTION public._enforce_single_role();

DROP TRIGGER IF EXISTS trg_enforce_single_role_agencies ON public.agencies;
CREATE TRIGGER trg_enforce_single_role_agencies
  BEFORE INSERT OR UPDATE ON public.agencies
  FOR EACH ROW
  EXECUTE FUNCTION public._enforce_single_role();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Pre-existing data check (informational only — does not block migration)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_violations record;
  v_count integer := 0;
BEGIN
  FOR v_violations IN
    SELECT id, email
    FROM auth.users u
    WHERE (SELECT COUNT(*) FROM (
      SELECT 1 FROM public.creators c WHERE c.id = u.id
      UNION ALL
      SELECT 1 FROM public.brands b WHERE b.id = u.id
      UNION ALL
      SELECT 1 FROM public.agencies a WHERE a.id = u.id
    ) x) > 1
  LOOP
    RAISE WARNING 'ROLE_MIXING_VIOLATION: user % (%) has profiles in multiple role tables',
      v_violations.id, v_violations.email;
    v_count := v_count + 1;
  END LOOP;

  IF v_count > 0 THEN
    RAISE WARNING 'Found % user(s) with multiple role profiles. These should be resolved manually.', v_count;
  ELSE
    RAISE NOTICE 'No pre-existing role mixing violations found.';
  END IF;
END $$;

COMMIT;
