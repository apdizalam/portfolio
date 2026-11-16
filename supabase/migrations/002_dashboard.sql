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
