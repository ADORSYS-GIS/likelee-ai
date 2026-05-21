-- 009_bookings.sql
-- Consolidated migration for bookings domain
-- Source files: 0006_bookings.sql, 0003_assets_storage_moderation.sql (booking_files),
-- 0007_booking_notifications.sql, 0022_bookings_add_client_id.sql,
-- 0033_booking_notifications_book_outs.sql, 0035_bookings_campaigns.sql,
-- 2026-03-08_booking_deliverables.sql, 2026-03-08_booking_files_creator_access.sql,
-- 2026-04-08_03_add_agency_id_to_bookings.sql, 2026-04-15_agency_creator_identity_compat.sql

BEGIN;

-- ============================================================================
-- 1. ENUM TYPES
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'booking_type' AND n.nspname = 'public'
    ) THEN
        CREATE TYPE public.booking_type AS ENUM ('casting', 'option', 'confirmed', 'test-shoot', 'fitting', 'rehearsal');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'booking_status' AND n.nspname = 'public'
    ) THEN
        CREATE TYPE public.booking_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'booking_rate_type' AND n.nspname = 'public'
    ) THEN
        CREATE TYPE public.booking_rate_type AS ENUM ('day', 'hourly', 'flat', 'tbd');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'book_out_reason' AND n.nspname = 'public'
    ) THEN
        CREATE TYPE public.book_out_reason AS ENUM ('personal', 'medical', 'vacation', 'other_booking', 'other');
    END IF;
END $$;

-- ============================================================================
-- 2. BOOKINGS TABLE (with all final columns inline)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.bookings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    agency_id uuid REFERENCES public.agencies(id) ON DELETE SET NULL,
    
    -- Talent (multiple identity support)
    talent_id uuid REFERENCES public.agency_users(id) ON DELETE SET NULL,
    creator_id uuid REFERENCES public.creators(id) ON DELETE SET NULL,
    relationship_id uuid REFERENCES public.agency_talent_relationships(id) ON DELETE SET NULL,
    talent_name text,
    
    -- Client
    client_id uuid REFERENCES public.agency_clients(id) ON DELETE SET NULL,
    client_name text,
    
    -- Campaign Link
    campaign_id uuid,
    
    -- Booking Details
    type public.booking_type NOT NULL DEFAULT 'confirmed',
    status public.booking_status NOT NULL DEFAULT 'pending',
    date date NOT NULL,
    all_day boolean NOT NULL DEFAULT false,
    call_time text,
    wrap_time text,
    location text,
    location_notes text,
    industries text[],
    
    -- Rate
    rate_cents integer,
    currency text NOT NULL DEFAULT 'USD',
    rate_type public.booking_rate_type,
    
    -- Usage
    usage_terms text,
    usage_duration text,
    exclusive boolean NOT NULL DEFAULT false,
    
    -- Notifications
    notify_email boolean NOT NULL DEFAULT true,
    notify_sms boolean NOT NULL DEFAULT false,
    notify_push boolean NOT NULL DEFAULT false,
    notify_calendar boolean NOT NULL DEFAULT true,
    
    notes text,
    
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bookings_agency_user_id ON public.bookings(agency_user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_agency_id ON public.bookings(agency_id);
CREATE INDEX IF NOT EXISTS idx_bookings_client_id ON public.bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_talent_id ON public.bookings(talent_id);
CREATE INDEX IF NOT EXISTS idx_bookings_creator_id ON public.bookings(creator_id);
CREATE INDEX IF NOT EXISTS idx_bookings_relationship_id ON public.bookings(relationship_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON public.bookings(date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_campaign_id ON public.bookings(campaign_id);
CREATE INDEX IF NOT EXISTS idx_bookings_type_status ON public.bookings(type, status);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bookings select own" ON public.bookings;
CREATE POLICY "bookings select own" ON public.bookings
    FOR SELECT USING (auth.uid() = agency_user_id);

DROP POLICY IF EXISTS "bookings insert own" ON public.bookings;
CREATE POLICY "bookings insert own" ON public.bookings
    FOR INSERT WITH CHECK (auth.uid() = agency_user_id);

DROP POLICY IF EXISTS "bookings update own" ON public.bookings;
CREATE POLICY "bookings update own" ON public.bookings
    FOR UPDATE USING (auth.uid() = agency_user_id);

-- ============================================================================
-- 3. BOOK-OUTS (Talent Availability)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.book_outs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Talent (multiple identity support)
    talent_id uuid NOT NULL REFERENCES public.agency_users(id) ON DELETE CASCADE,
    creator_id uuid REFERENCES public.creators(id) ON DELETE SET NULL,
    relationship_id uuid REFERENCES public.agency_talent_relationships(id) ON DELETE SET NULL,
    
    -- Date Range
    start_date date NOT NULL,
    end_date date NOT NULL,
    
    -- Reason
    reason public.book_out_reason NOT NULL DEFAULT 'personal',
    notes text,
    
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_book_outs_agency_user_id ON public.book_outs(agency_user_id);
CREATE INDEX IF NOT EXISTS idx_book_outs_talent_id ON public.book_outs(talent_id);
CREATE INDEX IF NOT EXISTS idx_book_outs_creator_id ON public.book_outs(creator_id);
CREATE INDEX IF NOT EXISTS idx_book_outs_relationship_id ON public.book_outs(relationship_id);
CREATE INDEX IF NOT EXISTS idx_book_outs_date_range ON public.book_outs(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_book_outs_talent_dates ON public.book_outs(talent_id, start_date, end_date);

ALTER TABLE public.book_outs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "book_outs select own" ON public.book_outs;
CREATE POLICY "book_outs select own" ON public.book_outs
    FOR SELECT USING (agency_user_id = auth.uid());

DROP POLICY IF EXISTS "book_outs insert own" ON public.book_outs;
CREATE POLICY "book_outs insert own" ON public.book_outs
    FOR INSERT WITH CHECK (agency_user_id = auth.uid());

DROP POLICY IF EXISTS "book_outs update own" ON public.book_outs;
CREATE POLICY "book_outs update own" ON public.book_outs
    FOR UPDATE USING (agency_user_id = auth.uid());

DROP POLICY IF EXISTS "book_outs delete own" ON public.book_outs;
CREATE POLICY "book_outs delete own" ON public.book_outs
    FOR DELETE USING (agency_user_id = auth.uid());

-- ============================================================================
-- 4. BOOKING FILES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.booking_files (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    
    file_name text NOT NULL,
    storage_bucket text NOT NULL,
    storage_path text NOT NULL,
    public_url text,
    
    -- Optional link to deliverable
    deliverable_id uuid,
    
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_files_booking_id ON public.booking_files(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_files_deliverable ON public.booking_files(deliverable_id);

ALTER TABLE public.booking_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "booking_files select own" ON public.booking_files;
CREATE POLICY "booking_files select own" ON public.booking_files
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.bookings b
            WHERE b.id = booking_id AND b.agency_user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "booking_files insert own" ON public.booking_files;
CREATE POLICY "booking_files insert own" ON public.booking_files
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.bookings b
            WHERE b.id = booking_id AND b.agency_user_id = auth.uid()
        )
    );

-- Talent access to booking files
DROP POLICY IF EXISTS "booking_files select talent" ON public.booking_files;
CREATE POLICY "booking_files select talent" ON public.booking_files
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.bookings b
            LEFT JOIN public.agency_users au ON b.talent_id = au.id
            WHERE b.id = booking_id
                AND (
                    b.creator_id = auth.uid()
                    OR au.creator_id = auth.uid()
                )
        )
    );

-- ============================================================================
-- 5. BOOKING DELIVERABLES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.booking_deliverables (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    
    -- Deliverable Details
    title text NOT NULL,
    description text,
    deliverable_type text NOT NULL DEFAULT 'file', -- 'file', 'link', 'text'
    
    -- Status
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'submitted', 'approved', 'rejected', 'revision_requested')),
    
    -- Due Date
    due_date date,
    
    -- Submission
    submitted_at timestamptz,
    submitted_by uuid,
    submission_notes text,
    
    -- Review
    reviewed_at timestamptz,
    reviewed_by uuid,
    review_notes text,
    
    -- Revision
    revision_count integer DEFAULT 0,
    
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_deliverables_booking ON public.booking_deliverables(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_deliverables_agency ON public.booking_deliverables(agency_id);
CREATE INDEX IF NOT EXISTS idx_booking_deliverables_status ON public.booking_deliverables(status);
CREATE INDEX IF NOT EXISTS idx_booking_deliverables_due_date ON public.booking_deliverables(due_date);

ALTER TABLE public.booking_deliverables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agencies can view own booking deliverables" ON public.booking_deliverables;
CREATE POLICY "Agencies can view own booking deliverables" ON public.booking_deliverables
    FOR SELECT USING (agency_id = auth.uid());

DROP POLICY IF EXISTS "Agencies can manage own booking deliverables" ON public.booking_deliverables;
CREATE POLICY "Agencies can manage own booking deliverables" ON public.booking_deliverables
    FOR ALL USING (agency_id = auth.uid());

-- ============================================================================
-- 6. BOOKING NOTIFICATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.booking_notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    book_out_id uuid REFERENCES public.book_outs(id) ON DELETE CASCADE,
    
    -- Notification Details
    channel text NOT NULL DEFAULT 'email', -- 'email', 'sms', 'push'
    recipient_type text NOT NULL DEFAULT 'talent', -- 'talent', 'client', 'agency'
    to_email text,
    subject text,
    message text NOT NULL,
    
    -- Metadata
    meta_json jsonb DEFAULT '{}'::jsonb,
    
    -- Status
    sent_at timestamptz,
    delivered_at timestamptz,
    failed_at timestamptz,
    failure_reason text,
    
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_notifications_agency ON public.booking_notifications(agency_user_id);
CREATE INDEX IF NOT EXISTS idx_booking_notifications_booking ON public.booking_notifications(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_notifications_book_out ON public.booking_notifications(book_out_id);
CREATE INDEX IF NOT EXISTS idx_booking_notifications_created_at ON public.booking_notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_booking_notifications_sent ON public.booking_notifications(sent_at);

ALTER TABLE public.booking_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "booking_notifications_rls" ON public.booking_notifications;
CREATE POLICY "booking_notifications_rls" ON public.booking_notifications
    USING (agency_user_id = auth.uid())
    WITH CHECK (agency_user_id = auth.uid());

-- ============================================================================
-- 7. BOOKINGS-CAMPAIGNS LINK
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.bookings_campaigns (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.agencies(id) ON DELETE CASCADE,
    name text NOT NULL,
    status text NOT NULL DEFAULT 'created',
    duration_days integer,
    start_date date,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'bookings_campaigns'
          AND column_name = 'booking_id'
    ) THEN
        ALTER TABLE public.bookings_campaigns
            ALTER COLUMN booking_id DROP NOT NULL;
    END IF;
END $$;

ALTER TABLE public.bookings
    ADD COLUMN IF NOT EXISTS campaign_id uuid REFERENCES public.bookings_campaigns(id) ON DELETE CASCADE;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_schema = 'public'
          AND table_name = 'bookings'
          AND constraint_name = 'bookings_campaign_id_fkey'
    ) THEN
        ALTER TABLE public.bookings
            ADD CONSTRAINT bookings_campaign_id_fkey
            FOREIGN KEY (campaign_id) REFERENCES public.bookings_campaigns(id) ON DELETE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_bookings_campaign_id ON public.bookings(campaign_id);
CREATE INDEX IF NOT EXISTS idx_bookings_campaigns_agency_id ON public.bookings_campaigns(agency_id);

ALTER TABLE public.bookings_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agencies can view own bookings-campaigns" ON public.bookings_campaigns;
CREATE POLICY "Agencies can view own bookings-campaigns" ON public.bookings_campaigns
    FOR SELECT USING (
        agency_id = auth.uid()
        OR public.is_agency_team_member(agency_id)
    );

DROP POLICY IF EXISTS "Agencies can insert own bookings-campaigns" ON public.bookings_campaigns;
CREATE POLICY "Agencies can insert own bookings-campaigns" ON public.bookings_campaigns
    FOR INSERT WITH CHECK (
        agency_id = auth.uid()
        OR public.is_agency_team_member(agency_id)
    );

DROP POLICY IF EXISTS "Agencies can update own bookings-campaigns" ON public.bookings_campaigns;
CREATE POLICY "Agencies can update own bookings-campaigns" ON public.bookings_campaigns
    FOR UPDATE USING (
        agency_id = auth.uid()
        OR public.is_agency_team_member(agency_id)
    )
    WITH CHECK (
        agency_id = auth.uid()
        OR public.is_agency_team_member(agency_id)
    );

DROP POLICY IF EXISTS "Agencies can delete own bookings-campaigns" ON public.bookings_campaigns;
CREATE POLICY "Agencies can delete own bookings-campaigns" ON public.bookings_campaigns
    FOR DELETE USING (
        agency_id = auth.uid()
        OR public.is_agency_team_member(agency_id)
    );

-- ============================================================================
-- 8. ROTATION TRIGGER (auto-cleanup old notifications)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.rotate_booking_notifications()
RETURNS trigger AS $$
BEGIN
    DELETE FROM public.booking_notifications
    WHERE created_at < (now() - interval '2 days');
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS booking_notifications_rotation ON public.booking_notifications;
CREATE TRIGGER booking_notifications_rotation
    AFTER INSERT ON public.booking_notifications
    FOR EACH STATEMENT EXECUTE FUNCTION public.rotate_booking_notifications();

-- Fix: Drop the legacy NOT NULL constraint on bookings_campaigns.campaign_id
-- This column is a relic from an older schema; the backend never populates it,
-- causing a 23502 violation on every campaign creation.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'bookings_campaigns'
          AND column_name = 'campaign_id'
          AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE public.bookings_campaigns ALTER COLUMN campaign_id DROP NOT NULL;
    END IF;
END $$;

ALTER TABLE public.bookings_campaigns
    DROP CONSTRAINT IF EXISTS bookings_campaigns_campaign_id_fkey;

COMMIT;
