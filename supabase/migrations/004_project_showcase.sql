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
      'https://kooban-iq-umber.vercel.app',
      '/assets/projects/kobaniq-showcase.webp',
      '/assets/projects/kobaniq-showcase.webp',
      array['React Native', 'Expo', 'TypeScript', 'Node.js', 'Express', 'MongoDB', 'Google Gemini AI', 'REST API', 'Zod', 'Vite', 'i18next']::text[],
      array['Full-stack', 'AI', 'Mobile App']::text[],
      'Nov 2026',
      '',   -- Android test APK link: add it in Admin → Projects → KOBANIQ → "Mobile app download link"
      E'Open the download link on your Android phone.\nDownload the KOBANIQ test APK.\nOpen the downloaded file. If Android asks, allow installing apps from this source.\nTap Install, then open KOBANIQ and create your profile.',
      E'Job seekers in Somalia and Somaliland often struggle to identify jobs that genuinely match their skills, understand what different positions require, evaluate their actual technical abilities and prepare competitive CVs and interviews.\n\nExisting job-search approaches offer little guidance on skill gaps, career readiness or personalised preparation, leaving job seekers unsure what to improve and how to approach the right opportunities.',
      E'KOBANIQ brings AI-powered skill assessment, job intelligence, personalised CV generation and interview preparation together in one mobile app. It verifies skills with adaptive quizzes, explains why each job matches a profile, highlights the skills that are missing, writes job-specific CVs only from the user''s own profile and lets users practise interviews with feedback on every answer.',
      E'AI Skill Assessment: Adaptive quizzes check the skills users claim and return an assessed level with strengths, weaknesses and recommendations.\nJob Intelligence: Researches jobs from configured sources and explains every match with a score and the skill gaps to close.\nAI-Powered CV Builder: Generates job-specific CVs from the job description and the user''s own profile, ready to export as a PDF.\nInterview Preparation: Practise technical and behavioural interviews with AI-generated questions and feedback on each answer.\nCareer Insights: One place to see skills, assessments, progress and recommendations for improving career readiness.\nNotifications: Relevant job alerts and application-related updates, delivered to the phone.',
      true, true, 0
    );
  end if;
end $$;
