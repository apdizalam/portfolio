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
