-- ================================================================
-- ONE-TIME SETUP: copy ALL of this into Supabase -> SQL Editor -> Run
-- (tables + security rules + image storage + your current content)
-- ================================================================

-- =====================================================================
-- Portfolio database (run once in Supabase → SQL Editor → New query)
-- Public visitors can READ the portfolio. Only admins can WRITE.
-- Contact messages are written by the server (service role) and only
-- admins can read them.
-- =====================================================================

-- ---------- Admins ----------------------------------------------------
create table if not exists public.admins (
  email text primary key
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- ---------- Content tables -------------------------------------------
create table if not exists public.profile (
  id          int primary key default 1 check (id = 1),  -- single row
  name        text not null default '',
  name_accent text not null default '',
  title       text not null default '',
  tagline     text not null default '',
  photo_url   text not null default '',
  about       text not null default '',
  github      text not null default '',
  linkedin    text not null default '',
  updated_at  timestamptz not null default now()
);

create table if not exists public.education (
  id         bigint generated always as identity primary key,
  school     text not null,
  degree     text not null default '',
  dates      text not null default '',
  place      text not null default '',
  sort       int  not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.skills (
  id         bigint generated always as identity primary key,
  name       text not null,
  icon       text not null default '',
  sort       int  not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id         bigint generated always as identity primary key,
  slug       text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title      text not null,
  summary    text not null default '',
  repo       text not null default '',
  live       text not null default '',
  image_url  text not null default '',
  tags       text[] not null default '{}',
  categories text[] not null default '{}',
  date       text not null default '',
  app_link   text not null default '',
  app_note   text not null default '',
  sort       int  not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id         bigint generated always as identity primary key,
  name       text not null check (char_length(name) between 1 and 100),
  email      text not null check (char_length(email) between 3 and 150),
  message    text not null check (char_length(message) between 1 and 5000),
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- Row Level Security ---------------------------------------
alter table public.admins    enable row level security;
alter table public.profile   enable row level security;
alter table public.education enable row level security;
alter table public.skills    enable row level security;
alter table public.projects  enable row level security;
alter table public.messages  enable row level security;

-- admins: an admin can see the admin list (nobody can change it from the app)
drop policy if exists "admins read" on public.admins;
create policy "admins read" on public.admins for select using (public.is_admin());

-- content: everyone reads, admins write
do $$
declare t text;
begin
  foreach t in array array['profile','education','skills','projects'] loop
    execute format('drop policy if exists "public read" on public.%I', t);
    execute format('create policy "public read" on public.%I for select using (true)', t);
    execute format('drop policy if exists "admin write" on public.%I', t);
    execute format('create policy "admin write" on public.%I for all using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

-- messages: only admins can read / update / delete (inserts come from the server)
drop policy if exists "admin read messages" on public.messages;
create policy "admin read messages" on public.messages for select using (public.is_admin());
drop policy if exists "admin update messages" on public.messages;
create policy "admin update messages" on public.messages for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin delete messages" on public.messages;
create policy "admin delete messages" on public.messages for delete using (public.is_admin());

-- ---------- Image storage --------------------------------------------
insert into storage.buckets (id, name, public)
values ('portfolio', 'portfolio', true)
on conflict (id) do update set public = true;

drop policy if exists "portfolio public read" on storage.objects;
create policy "portfolio public read" on storage.objects
  for select using (bucket_id = 'portfolio');

drop policy if exists "portfolio admin insert" on storage.objects;
create policy "portfolio admin insert" on storage.objects
  for insert with check (bucket_id = 'portfolio' and public.is_admin());

drop policy if exists "portfolio admin update" on storage.objects;
create policy "portfolio admin update" on storage.objects
  for update using (bucket_id = 'portfolio' and public.is_admin());

drop policy if exists "portfolio admin delete" on storage.objects;
create policy "portfolio admin delete" on storage.objects
  for delete using (bucket_id = 'portfolio' and public.is_admin());

-- Seed data: your current portfolio content (run AFTER schema.sql)
-- Change the admin email below if you will log in with a different email.
insert into public.admins (email) values ('abdisalammoh8@gmail.com') on conflict do nothing;

insert into public.profile (id, name, name_accent, title, tagline, photo_url, about, github, linkedin)
values (1, $q$Abdisalam Mohamed$q$, $q$Muhumed$q$, $q$Full-Stack Software Engineer & AI Enthusiast$q$, $q$Let's build
something great!$q$, $q$/assets/profile/photo-mwjbzfjf.webp$q$, $q$I'm a **full-stack software engineer** and AI enthusiast based in Borama, Somaliland. I build web and mobile products end to end, from database and APIs to polished interfaces, and I integrate large language models into real products for teachers, businesses and health organizations..$q$, $q$https://github.com/apdizalam$q$, $q$https://www.linkedin.com/in/abdisalam-m-muhumed-4b6351307$q$)
on conflict (id) do update set name = excluded.name, name_accent = excluded.name_accent, title = excluded.title,
  tagline = excluded.tagline, photo_url = excluded.photo_url, about = excluded.about, github = excluded.github, linkedin = excluded.linkedin;

delete from public.education;
insert into public.education (school, degree, dates, place, sort) values ($q$Amoud University$q$, $q$Bachelor's Degree in Software Engineering$q$, $q$Jul 2022 – Sep 2026$q$, $q$Borama$q$, 0);

delete from public.skills;
insert into public.skills (name, icon, sort) values ($q$React.js$q$, $q$react$q$, 0);
insert into public.skills (name, icon, sort) values ($q$Node.js$q$, $q$nodejs$q$, 1);
insert into public.skills (name, icon, sort) values ($q$MongoDB$q$, $q$mongodb$q$, 2);
insert into public.skills (name, icon, sort) values ($q$JavaScript$q$, $q$javascript$q$, 3);
insert into public.skills (name, icon, sort) values ($q$HTML$q$, $q$html5$q$, 4);
insert into public.skills (name, icon, sort) values ($q$CSS$q$, $q$css3$q$, 5);
insert into public.skills (name, icon, sort) values ($q$Git$q$, $q$git$q$, 6);

insert into public.projects (slug, title, summary, repo, live, image_url, tags, categories, date, app_link, app_note, sort)
values ($q$shaba-billing-system$q$, $q$Shaba Water Billing System$q$, $q$Water billing management system with mobile app for Shaba Water.$q$, $q$shaba-billing-system$q$, $q$https://shaba-billing-system.vercel.app$q$, $q$/assets/shaba.png$q$, array[$q$JavaScript$q$,$q$React$q$,$q$Node.js$q$,$q$MongoDB$q$]::text[], array[$q$Web App$q$,$q$Mobile App$q$]::text[], $q$Jun 2026$q$, $q$https://expo.dev/accounts/abdisalam-mohamed/projects/forntend/builds/4cbbbf48-9d18-4ffe-b126-681b5a2d51f2$q$, $q$Open this link on your Android phone (or scan the QR code on the page with your phone camera).
Tap Install to download the app file (APK).
Open the downloaded file. If Android asks, allow installing apps from this source.
Tap Install, then open the Shaba app and sign in.$q$, 0)
on conflict (slug) do update set title = excluded.title, summary = excluded.summary, repo = excluded.repo, live = excluded.live,
  image_url = excluded.image_url, tags = excluded.tags, categories = excluded.categories, date = excluded.date,
  app_link = excluded.app_link, app_note = excluded.app_note, sort = excluded.sort;
insert into public.projects (slug, title, summary, repo, live, image_url, tags, categories, date, app_link, app_note, sort)
values ($q$tayonx$q$, $q$Tayonx$q$, $q$Cargo marketplace: buy from abroad and ship with verified cargo companies.$q$, $q$Tayonx$q$, $q$https://tayonx.vercel.app$q$, $q$/assets/tayonx.webp$q$, array[$q$React$q$,$q$Node.js$q$,$q$Express$q$,$q$MongoDB$q$,$q$Socket.IO$q$]::text[], array[$q$Website$q$,$q$Marketplace$q$]::text[], $q$Nov 2026$q$, $q$$q$, $q$$q$, 1)
on conflict (slug) do update set title = excluded.title, summary = excluded.summary, repo = excluded.repo, live = excluded.live,
  image_url = excluded.image_url, tags = excluded.tags, categories = excluded.categories, date = excluded.date,
  app_link = excluded.app_link, app_note = excluded.app_note, sort = excluded.sort;

-- ---------------- dashboard update ----------------
-- =====================================================================
-- Dashboard update (run once in Supabase → SQL Editor → Run)
-- Adds: featured / published / views on projects, more profile fields,
-- and a safe "count a view" function. Safe to run more than once.
-- =====================================================================

alter table public.projects add column if not exists featured  boolean not null default true;
alter table public.projects add column if not exists published boolean not null default true;
alter table public.projects add column if not exists views     integer not null default 0;

alter table public.profile add column if not exists initials     text not null default '';
alter table public.profile add column if not exists location     text not null default '';
alter table public.profile add column if not exists location_url text not null default '';
alter table public.profile add column if not exists public_email text not null default '';
alter table public.profile add column if not exists phone        text not null default '';
alter table public.profile add column if not exists resume_url   text not null default '';

-- Visitors only see published projects (admins see everything)
drop policy if exists "public read" on public.projects;
create policy "public read" on public.projects
  for select using (published or public.is_admin());

-- Count a project view (visitors can call this, but can't change anything else)
create or replace function public.increment_project_views(p_slug text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.projects set views = views + 1
  where slug = p_slug and published;
$$;

revoke all on function public.increment_project_views(text) from public;
grant execute on function public.increment_project_views(text) to anon, authenticated;

-- Fill the new profile fields with sensible starting values
update public.profile set
  initials     = case when initials = '' then 'AM' else initials end,
  location     = case when location = '' then 'Borama, Somaliland' else location end,
  location_url = case when location_url = '' then 'https://www.google.com/maps/place/Borama' else location_url end
where id = 1;

-- ---------------- experience ----------------
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

-- ---------------- project showcase + KOBANIQ ----------------
-- =====================================================================
-- Project showcase fields + KOBANIQ (run once in Supabase → SQL Editor)
-- Make sure the dropdown next to Run says your database, NOT "Logs".
-- =====================================================================

alter table public.projects add column if not exists subtitle     text not null default '';  -- e.g. "AI career intelligence for job seekers"
alter table public.projects add column if not exists problem      text not null default '';
alter table public.projects add column if not exists solution     text not null default '';
alter table public.projects add column if not exists features     text not null default '';  -- one per line: "Title: description"
alter table public.projects add column if not exists showcase_url text not null default '';  -- full image shown uncropped on the project page

-- KOBANIQ — added once, as the first featured project.
do $$
begin
  if not exists (select 1 from public.projects where slug = 'kobaniq') then
    update public.projects set sort = sort + 1;

    insert into public.projects (
      slug, title, subtitle, summary, repo, live, image_url, showcase_url,
      tags, categories, date, app_link, app_note, problem, solution, features,
      featured, published, sort
    ) values (
      'kobaniq',
      'KOBANIQ',
      'AI career intelligence for job seekers',
      'KOBANIQ is an AI-powered career intelligence platform that helps job seekers in Somalia and Somaliland evaluate their skills, discover relevant job opportunities, prepare for interviews and build tailored CVs.',
      'koobanIQ',
      'https://kooban-iq.vercel.app',
      '/assets/projects/kobaniq-showcase.webp',
      '/assets/projects/kobaniq-showcase.webp',
      array['React Native', 'Expo', 'TypeScript', 'Node.js', 'Express', 'MongoDB', 'Google Gemini AI', 'REST API', 'Zod', 'Vite', 'i18next']::text[],
      array['Full-stack', 'AI', 'Mobile App']::text[],
      'Nov 2026',
      'https://expo.dev/accounts/abdisalam-mohamed/projects/app-frontend/builds/e4ddb97f-2c81-4b52-bbfd-3414494e0734',   -- Android test APK (Expo build)
      E'Open the download link on your Android phone.\nDownload the KOBANIQ test APK.\nOpen the downloaded file. If Android asks, allow installing apps from this source.\nTap Install, then open KOBANIQ and create your profile.',
      E'Job seekers in Somalia and Somaliland often struggle to identify jobs that genuinely match their skills, understand what different positions require, evaluate their actual technical abilities and prepare competitive CVs and interviews.\n\nExisting job-search approaches offer little guidance on skill gaps, career readiness or personalised preparation, leaving job seekers unsure what to improve and how to approach the right opportunities.',
      E'KOBANIQ brings AI-powered skill assessment, job intelligence, personalised CV generation and interview preparation together in one mobile app. It verifies skills with adaptive quizzes, explains why each job matches a profile, highlights the skills that are missing, writes job-specific CVs only from the user''s own profile and lets users practise interviews with feedback on every answer.',
      E'AI Skill Assessment: Adaptive quizzes check the skills users claim and return an assessed level with strengths, weaknesses and recommendations.\nJob Intelligence: Researches jobs from configured sources and explains every match with a score and the skill gaps to close.\nAI-Powered CV Builder: Generates job-specific CVs from the job description and the user''s own profile, ready to export as a PDF.\nInterview Preparation: Practise technical and behavioural interviews with AI-generated questions and feedback on each answer.\nCareer Insights: One place to see skills, assessments, progress and recommendations for improving career readiness.\nNotifications: Relevant job alerts and application-related updates, delivered to the phone.',
      true, true, 0
    );
  end if;
end $$;

-- ---------------- shaba details ----------------
-- =====================================================================
-- Shaba Water Billing System: full project write-up
-- Run once in Supabase → SQL Editor, with "Database" selected (not Logs).
-- Facts come from the shaba-billing-system README.
-- =====================================================================
update public.projects set
  subtitle = 'Water-utility billing and customer management',
  summary = 'Shaba Water Billing System is a full-stack water-utility platform for managing customers, meter readings, bills and payments, with a mobile app for customers and a web dashboard for administrators and managers.',
  categories = array['Full-stack', 'Web App', 'Mobile App']::text[],
  tags = array['React Native', 'Expo', 'React', 'Vite', 'Node.js', 'Express', 'MongoDB', 'Mongoose', 'React Navigation', 'React Router', 'Axios', 'AsyncStorage']::text[],
  problem = E'A water utility has to keep track of many customers, their meters, monthly readings, bills and payments. When that information is spread across paper records and separate files, billing is slow, mistakes are easy to make and it is hard to see who has paid and who still owes.\n\nCustomers also have no simple way to check their own bills, see what is unpaid or look back at their payment history.',
  solution = E'Shaba Water Billing System brings everything into one connected platform. Administrators and managers use a web dashboard to manage customers, meters, billing, reports and manager accounts, while customers use a mobile app to sign in and see their bills, unpaid amounts, payments and payment history.\n\nBoth apps talk to the same Express REST API, which stores customers, managers, meters, bills and payments in MongoDB, so staff and customers always see the same up-to-date information.',
  features = E'Customer Mobile App: Customers sign in from their phone to see their bills, profile and account details in one place.\nBills & Unpaid Balances: Shows each customer''s bills and highlights what is still unpaid.\nPayments & History: Records payments and lets customers look back at their full payment history.\nAdmin Dashboard: A web dashboard for managing customers, meters and billing, with dashboard statistics and transactions.\nMeters & Billing: Track meters and readings and turn them into bills for each customer.\nReports & Manager Accounts: Billing reports for the utility, plus separate administrator and manager accounts with token-based sign-in.',
  updated_at = now()
where slug = 'shaba-billing-system';
