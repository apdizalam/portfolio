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
