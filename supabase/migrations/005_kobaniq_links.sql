-- KOBANIQ links (run once in Supabase → SQL Editor, with "Database" selected)
update public.projects
set live = 'https://kooban-iq.vercel.app',
    app_link = 'https://expo.dev/accounts/abdisalam-mohamed/projects/app-frontend/builds/e4ddb97f-2c81-4b52-bbfd-3414494e0734',
    app_note = E'Open this link on your Android phone (or scan the QR code on the page with your phone camera).\nTap Install to download the KOBANIQ test app (APK).\nOpen the downloaded file. If Android asks, allow installing apps from this source.\nTap Install, then open KOBANIQ and create your profile.',
    updated_at = now()
where slug = 'kobaniq';
