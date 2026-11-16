"use client";
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./env";

let client: SupabaseClient | undefined;

// Browser client for the admin dashboard (keeps the login session in cookies).
export function browserClient(): SupabaseClient {
  if (!client) client = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY) as unknown as SupabaseClient;
  return client;
}
