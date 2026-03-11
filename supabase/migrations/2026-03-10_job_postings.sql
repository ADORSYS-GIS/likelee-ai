-- Job postings and applications for internal Jobs board.
create table if not exists public.job_postings (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands (id) on delete cascade,

  -- Step 1: Basic Information
  job_title text,
  company_name text,
  contact_email text,
  category text,
  call_type text,
  work_types text[],
  status text not null default 'open',

  -- Step 2: Project Overview
  location text,
  job_type text,
  about_role text,
  goals text[],
  deliverables text,
  start_date date,
  end_date date,

  -- Step 3: Talent Requirements
  talent_types text[],
  region text,
  language text,
  required_skills text[],
  needs_licensing boolean,

  -- Step 4: Licensing Details (only when needs_licensing = true)
  usage_type text,
  license_duration text,
  territories text,
  exclusivity boolean,
  royalty_option boolean,

  -- Step 5: Budget & Compensation
  budget numeric,
  payment_type text,
  currency text default 'USD',

  -- Step 6: Collaboration Preferences
  work_with_agency boolean,
  invite_creator boolean,
  invited_agency_ids uuid[],
  invited_creator_ids uuid[],
  declined_agency_ids uuid[] default '{}',
  declined_creator_ids uuid[] default '{}',
  brand_assets jsonb,
  confidential boolean,
  
  -- Step 7: Preview & Publish (no additional fields)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint job_postings_call_type_check check (
    status = 'draft' or call_type in ('creator','agency','athlete','ai_artist')
  ),
  constraint job_postings_required_fields_check check (
    status = 'draft' or (
      job_title is not null and job_title <> '' and
      about_role is not null and about_role <> '' and
      call_type is not null and call_type <> ''
    )
  ),
  constraint job_postings_status_check check (status in ('open','closed','draft'))

-- Track declined job invites for confidential postings.
  declined_agency_ids uuid[] default '{}',
  declined_creator_ids uuid[] default '{}'
);



create table if not exists public.job_applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.job_postings (id) on delete cascade,
  applicant_id uuid not null,
  applicant_role text not null,
  message text,
  resume_name text,
  resume_url text,
  resume_path text,
  resume_mime text,
  resume_size bigint,
  status text not null default 'submitted',
  created_at timestamptz not null default now(),
  constraint job_applications_status_check check (status in ('submitted','shortlisted','rejected','withdrawn'))
);

create index if not exists idx_job_postings_brand_id on public.job_postings (brand_id);
create index if not exists idx_job_postings_status on public.job_postings (status);
create index if not exists idx_job_postings_call_type on public.job_postings (call_type);
create index if not exists idx_job_postings_created_at on public.job_postings (created_at desc);
create index if not exists idx_job_applications_job_id on public.job_applications (job_id);
create index if not exists idx_job_applications_applicant_id on public.job_applications (applicant_id);
create index if not exists idx_job_applications_status on public.job_applications (status);
create index if not exists idx_job_applications_resume_name on public.job_applications (resume_name);
create index if not exists idx_job_applications_resume_url on public.job_applications (resume_url);
create index if not exists idx_job_applications_resume_path on public.job_applications (resume_path);
create index if not exists idx_job_applications_resume_mime on public.job_applications (resume_mime);
create index if not exists idx_job_applications_resume_size on public.job_applications (resume_size);

-- RLS policies
alter table public.job_postings enable row level security;
alter table public.job_applications enable row level security;

drop policy if exists "job_postings_select" on public.job_postings;
create policy "job_postings_select"
  on public.job_postings
  for select
  to authenticated
  using (true);

drop policy if exists "job_postings_insert" on public.job_postings;
create policy "job_postings_insert"
  on public.job_postings
  for insert
  to authenticated
  with check (brand_id = auth.uid());

drop policy if exists "job_postings_update" on public.job_postings;
create policy "job_postings_update"
  on public.job_postings
  for update
  to authenticated
  using (brand_id = auth.uid())
  with check (brand_id = auth.uid());

drop policy if exists "job_postings_delete" on public.job_postings;
create policy "job_postings_delete"
  on public.job_postings
  for delete
  to authenticated
  using (brand_id = auth.uid());

drop policy if exists "job_applications_insert" on public.job_applications;
create policy "job_applications_insert"
  on public.job_applications
  for insert
  to authenticated
  with check (true);

drop policy if exists "job_applications_select" on public.job_applications;
create policy "job_applications_select"
  on public.job_applications
  for select
  to authenticated
  using (
    applicant_id = auth.uid()
    or job_id in (select id from public.job_postings where brand_id = auth.uid())
  );

drop policy if exists "job_applications_update" on public.job_applications;
create policy "job_applications_update"
  on public.job_applications
  for update
  to authenticated
  using (
    job_id in (select id from public.job_postings where brand_id = auth.uid())
  )
  with check (
    job_id in (select id from public.job_postings where brand_id = auth.uid())
  );
