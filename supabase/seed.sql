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
