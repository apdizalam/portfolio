-- =====================================================================
-- Experience section (run once in Supabase → SQL Editor → Run)
-- Make sure the dropdown next to Run says your database, NOT "Logs".
-- =====================================================================

create table if not exists public.experience (
  id              bigint generated always as identity primary key,
  role            text not null,
  company         text not null default '',
  employment_type text not null default '',   -- Part-time, Internship, Full-time…
  period          text not null default '',   -- e.g. "Jul 2025 – Sep 2025 · 3 mos"
  location        text not null default '',
  work_mode       text not null default '',   -- On-site, Remote, Hybrid
  description     text not null default '',
  skills          text[] not null default '{}',
  logo_url        text not null default '',
  sort            int  not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.experience enable row level security;

drop policy if exists "public read" on public.experience;
create policy "public read" on public.experience for select using (true);

drop policy if exists "admin write" on public.experience;
create policy "admin write" on public.experience
  for all using (public.is_admin()) with check (public.is_admin());

-- Your experience (from LinkedIn). Only added if the table is empty.
insert into public.experience (role, company, employment_type, period, location, work_mode, description, skills, sort)
select * from (values
  ('Data Collection Volunteer', 'Amoud University (Jaamacadda Camuud)', 'Part-time', 'May 2026 · 1 mo',
   'Borama, Somaliland', 'On-site',
   'Volunteered in a data collection project with Amoud University, supporting the gathering and organization of information for research purposes.',
   array['Data Collection', 'Data Entry']::text[], 0),
  ('ICT Intern', 'Somaliland Ministry of Trade and Tourism', 'Internship', 'Jul 2025 – Sep 2025 · 3 mos',
   'Borama, Somaliland', 'On-site',
   'Completed a three-month internship with the ICT Department at the Ministry of Trade and Tourism, Somaliland, in Borama.',
   array['Technical Support', 'AI for IT Support']::text[], 1),
  ('Polling Station Chairman', 'Somaliland Electoral Commission (NEC)', 'Part-time', 'Nov 2024 · 1 mo',
   'Borama, Somaliland', 'On-site',
   'Served as a Polling Station Chairman during the November 2024 Somaliland elections, supervising polling station activities and working closely with election staff.',
   array['Team Management', 'Election Administration']::text[], 2)
) as v(role, company, employment_type, period, location, work_mode, description, skills, sort)
where not exists (select 1 from public.experience);
