-- 2026-03-08_booking_files_creator_access.sql
BEGIN;

-- 1. Ensure creators can view their own connection record in agency_users
-- Crucial because subqueries in other policies are subject to RLS on agency_users
DROP POLICY IF EXISTS "Agency members can view their own connection" ON public.agency_users;
CREATE POLICY "Agency members can view their own connection"
  ON public.agency_users
  FOR SELECT
  TO authenticated
  USING (creator_id = auth.uid());

-- 2. Allow creators to see their own bookings via RLS
DROP POLICY IF EXISTS "bookings select talent" ON public.bookings;
CREATE POLICY "bookings select talent" ON public.bookings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.agency_users au
      WHERE au.id = talent_id
        AND au.creator_id = auth.uid()
    )
  );

-- 3. Allow creators to see metadata for files attached to their bookings
DROP POLICY IF EXISTS "booking_files select talent" ON public.booking_files;
CREATE POLICY "booking_files select talent" ON public.booking_files
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      JOIN public.agency_users au ON b.talent_id = au.id
      WHERE b.id = booking_id
        AND au.creator_id = auth.uid()
    )
  );

-- 4. Allow creators to read/download their booking files from the private storage bucket
DROP POLICY IF EXISTS "storage_booking_files_select_talent" ON storage.objects;
CREATE POLICY "storage_booking_files_select_talent" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'likelee-private' AND
    (EXISTS (
      SELECT 1 FROM public.booking_files bf
      JOIN public.bookings b ON bf.booking_id = b.id
      JOIN public.agency_users au ON b.talent_id = au.id
      WHERE bf.storage_path = storage.objects.name
        AND au.creator_id = auth.uid()
    ))
  );

COMMIT;
