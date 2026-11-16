"use client";
import { useEffect } from "react";
import { supabaseConfigured } from "@/lib/supabase/env";
import { publicClient } from "@/lib/supabase/public";

// Counts one view per project per browser session.
export default function ViewCounter({ slug }: { slug: string }) {
  useEffect(() => {
    if (!supabaseConfigured) return;
    const key = `viewed:${slug}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {}
    publicClient().rpc("increment_project_views", { p_slug: slug }).then(() => {}, () => {});
  }, [slug]);
  return null;
}
