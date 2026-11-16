import type { Metadata } from "next";
import "./admin.css";
import AdminShell from "@/components/admin/AdminShell";
import { supabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = {
  title: "Portfolio Admin",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell configured={supabaseConfigured}>{children}</AdminShell>;
}
