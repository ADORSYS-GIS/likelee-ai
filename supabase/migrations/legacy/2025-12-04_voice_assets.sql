-- Voice assets and brand delivery tables
-- Links brand_org_id to public.organization_profiles (existing)

BEGIN;

create extension if not exists pgcrypto;

-- 1) Voice recordings (stored in private bucket)
create table if not exists public.voice_recordings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  storage_bucket text not null,
  storage_path text not null,
  public_url text,
  duration_sec integer,
  mime_type text,
  emotion_tag text,
  accessible boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_voice_recordings_user on public.voice_recordings(user_id);
create unique index if not exists uq_voice_recordings_path on public.voice_recordings(storage_bucket, storage_path);

alter table public.voice_recordings enable row level security;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='voice_recordings' AND policyname='voice_recordings owner select'
  ) THEN
    create policy "voice_recordings owner select" on public.voice_recordings for select using (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='voice_recordings' AND policyname='voice_recordings owner insert'
  ) THEN
    create policy "voice_recordings owner insert" on public.voice_recordings for insert with check (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='voice_recordings' AND policyname='voice_recordings owner update'
  ) THEN
    create policy "voice_recordings owner update" on public.voice_recordings for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='voice_recordings' AND policyname='voice_recordings owner delete'
  ) THEN
    create policy "voice_recordings owner delete" on public.voice_recordings for delete using (auth.uid() = user_id);
  END IF;
END$$;

-- 2) Cloned voice models (e.g., ElevenLabs)
create table if not exists public.voice_models (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null,
  provider_voice_id text not null,
  status text not null default 'ready', -- creating|ready|failed
  source_recording_id uuid references public.voice_recordings(id) on delete set null,
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_voice_models_user on public.voice_models(user_id);

alter table public.voice_models enable row level security;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='voice_models' AND policyname='voice_models owner select'
  ) THEN
    create policy "voice_models owner select" on public.voice_models for select using (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='voice_models' AND policyname='voice_models owner insert'
  ) THEN
    create policy "voice_models owner insert" on public.voice_models for insert with check (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='voice_models' AND policyname='voice_models owner update'
  ) THEN
    create policy "voice_models owner update" on public.voice_models for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  END IF;
END$$;

-- 3) Brand-side licensing and delivery
create table if not exists public.brand_licenses (
  id uuid primary key default gen_random_uuid(),
  brand_org_id uuid not null references public.organization_profiles(id) on delete cascade,
  face_user_id uuid not null references public.profiles(id) on delete cascade,
  type text,
  status text not null default 'active', -- pending|active|expired|revoked
  start_at timestamptz,
  end_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_brand_licenses_brand on public.brand_licenses(brand_org_id);
create index if not exists idx_brand_licenses_face on public.brand_licenses(face_user_id);

-- brand voice folders
create table if not exists public.brand_voice_folders (
  id uuid primary key default gen_random_uuid(),
  brand_org_id uuid not null references public.organization_profiles(id) on delete cascade,
  face_user_id uuid not null references public.profiles(id) on delete cascade,
  license_id uuid not null references public.brand_licenses(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (brand_org_id, face_user_id, license_id)
);
create index if not exists idx_brand_voice_folders_brand on public.brand_voice_folders(brand_org_id);

-- brand voice assets map to either a recording or a model
create table if not exists public.brand_voice_assets (
  id uuid primary key default gen_random_uuid(),
  folder_id uuid not null references public.brand_voice_folders(id) on delete cascade,
  asset_type text not null, -- recording|model
  recording_id uuid references public.voice_recordings(id) on delete set null,
  model_id uuid references public.voice_models(id) on delete set null,
  storage_bucket text,
  storage_path text,
  public_url text,
  created_at timestamptz not null default now()
);
create index if not exists idx_brand_voice_assets_folder on public.brand_voice_assets(folder_id);

-- RLS for brand tables: allow brand members via agency_users membership or owner_user_id to read
alter table public.brand_licenses enable row level security;
alter table public.brand_voice_folders enable row level security;
alter table public.brand_voice_assets enable row level security;

-- Simple read policy for brand members; writes go via service key (server)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='brand_voice_folders' AND policyname='brand members select folders'
  ) THEN
    create policy "brand members select folders" on public.brand_voice_folders for select using (
      exists (
        select 1 from public.organization_profiles p
        where p.id = brand_org_id and (p.owner_user_id = auth.uid() or exists (
          select 1 from public.agency_users au where au.agency_id = p.id and au.user_id = auth.uid()
        ))
      )
    );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='brand_voice_assets' AND policyname='brand members select assets'
  ) THEN
    create policy "brand members select assets" on public.brand_voice_assets for select using (
      exists (
        select 1 from public.brand_voice_folders f
        join public.organization_profiles p on p.id = f.brand_org_id
        where f.id = folder_id and (p.owner_user_id = auth.uid() or exists (
          select 1 from public.agency_users au where au.agency_id = p.id and au.user_id = auth.uid()
        ))
      )
    );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='brand_licenses' AND policyname='brand members select licenses'
  ) THEN
    create policy "brand members select licenses" on public.brand_licenses for select using (
      exists (
        select 1 from public.organization_profiles p where p.id = brand_org_id and (p.owner_user_id = auth.uid() or exists (
          select 1 from public.agency_users au where au.agency_id = p.id and au.user_id = auth.uid()
        ))
      )
    );
  END IF;
END$$;

COMMIT;
