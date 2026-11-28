-- =====================================================================
-- Education logos + Meta Full Stack Developer (run once in Supabase → SQL Editor,
-- with "Database" selected, not "Logs"). Safe to run more than once.
-- =====================================================================

-- 1. Education entries can have a logo (existing rows get '' = no logo)
alter table public.education add column if not exists logo_url text not null default '';

-- 2. Authentic logos (files served from the portfolio: /public/assets/logos)
--    Amoud University seal: from amouduniversity.org (the university's site icon)
update public.education
set logo_url = '/assets/logos/amoud-university-seal.png'
where school ilike 'Amoud University%' and logo_url = '';

update public.experience
set logo_url = '/assets/logos/amoud-university-seal.png', updated_at = now()
where company ilike 'Amoud University%' and logo_url = '';

-- 3. Meta Full Stack Developer (no dates or credential details added — none were provided)
insert into public.education (school, degree, dates, place, logo_url, sort)
select 'Meta', 'Meta Full Stack Developer', '', '', '/assets/logos/meta-symbol.svg',
       coalesce((select max(sort) + 1 from public.education), 0)
where not exists (
  select 1 from public.education
  where school ilike 'Meta' or degree ilike '%Meta Full Stack%'
);
