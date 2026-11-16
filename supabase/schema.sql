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
