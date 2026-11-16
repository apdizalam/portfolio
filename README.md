# Abdisalam Mohamed Muhumed — Portfolio

Full-stack portfolio: **Next.js 15 (App Router, TypeScript)** + **Supabase** (Postgres, Auth, Storage), deployed on **Vercel**.

## Stack
- **Frontend:** Next.js / React 19, plain CSS (`app/globals.css`), Framer Motion (`motion/react`)
- **Database:** Supabase Postgres — `profile`, `education`, `skills`, `projects`, `messages` (Row Level Security: public read, admin write)
- **Auth:** Supabase Auth (email + password) for `/admin`; admins listed in the `admins` table
- **Storage:** Supabase Storage bucket `portfolio` for uploaded images
- **Email:** contact form saves to `messages` and emails via Resend
- **GitHub:** live contribution calendar (GraphQL) and project READMEs

## Local development
```bash
npm install
npm run dev
```
Create `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...        # publishable key
SUPABASE_SERVICE_ROLE_KEY=...            # secret key (server only)
RESEND_API_KEY=...                       # optional: contact emails
GITHUB_TOKEN=...                         # optional: live contribution graph
```

## Database setup
Run `supabase/setup.sql` once in the Supabase SQL Editor, then create your admin user in
Authentication → Users (email must be in the `admins` table).
