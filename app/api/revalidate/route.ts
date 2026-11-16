import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isAdminRequest } from "@/lib/supabase/server";

// Called by the admin dashboard after a change: rebuild the public pages now.
export async function POST() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  }
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true });
}
