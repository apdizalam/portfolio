import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./env";
import { checkAdmin } from "../auth";

// Server client that sees the logged-in admin's session (route handlers, server actions).
export async function sessionClient() {
  const store = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          /* called from a server component: cookies are read-only there */
        }
      },
    },
  });
}

// Service-role client: bypasses RLS. Server only — never import from client code.
export function serviceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createClient(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function tokenClient(token: string) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

// True when the request belongs to a logged-in admin. The dashboard sends its access token
// as "Authorization: Bearer …" (works even when cookies are not passed); the cookie is a fallback.
export async function isAdminRequest(req?: Request) {
  return checkAdmin(req?.headers.get("authorization"), {
    userFromToken: async (token) => (await tokenClient(token).auth.getUser(token)).data.user?.id ?? null,
    isAdminWithToken: async (token) => (await tokenClient(token).rpc("is_admin")).data === true,
    isAdminFromCookies: async () => {
      const supabase = await sessionClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return false;
      const { data } = await supabase.rpc("is_admin");
      return data === true;
    },
  });
}
