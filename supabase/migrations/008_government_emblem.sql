-- =====================================================================
-- Somaliland national emblem for the government roles (run once in Supabase → SQL Editor,
-- with "Database" selected, not "Logs"). Safe to run more than once.
-- =====================================================================
update public.experience
set logo_url = '/assets/logos/somaliland-national-emblem.png', updated_at = now()
where (company ilike '%Ministry of Trade%' or company ilike '%Electoral Commission%')
  and logo_url = '';
