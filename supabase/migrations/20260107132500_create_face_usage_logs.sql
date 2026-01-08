-- Migration: Create face_usage_logs table
-- Created at: 2026-01-07

CREATE TABLE IF NOT EXISTS public.face_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    face_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    brand_id UUID NOT NULL REFERENCES public.organization_profiles(id) ON DELETE CASCADE,
    usage_type TEXT NOT NULL, -- e.g., 'image_gen', 'voice_gen', 'video_gen'
    metadata JSONB DEFAULT '{}'::jsonb, -- e.g., { "model": "flux-pro", "prompt": "...", "duration": 15 }
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.face_usage_logs ENABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS face_usage_logs_face_id_idx ON public.face_usage_logs(face_id);
CREATE INDEX IF NOT EXISTS face_usage_logs_brand_id_idx ON public.face_usage_logs(brand_id);
CREATE INDEX IF NOT EXISTS face_usage_logs_created_at_idx ON public.face_usage_logs(created_at);

-- Policy: Agencies can view logs for their talent
-- This assumes talent are linked to agencies via some relationship. 
-- In likelee, a face_id is a profile. If that profile is managed by an agency, the agency's users should see it.
-- For now, let's implement a policy that allows the agency that 'owns' or is linked to the talent to see these logs.

CREATE POLICY "Agencies can view logs for their faces" ON public.face_usage_logs
    FOR SELECT USING (
        EXISTS (
            -- Check if the current user belongs to the same agency that manages the talent (face_id)
            -- This logic might need refinement based on how 'managed talent' is stored.
            -- Using basic agency membership for now.
            SELECT 1 FROM public.agency_users au
            WHERE au.user_id = auth.uid()
            AND au.agency_id IN (
                SELECT agency_id FROM public.agency_users WHERE user_id = face_usage_logs.face_id
            )
        )
    );

-- Policy: Brands can view logs they initiated
CREATE POLICY "Brands can view their own usage logs" ON public.face_usage_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.organization_profiles op
            WHERE op.id = face_usage_logs.brand_id
            AND op.owner_user_id = auth.uid()
        )
    );
