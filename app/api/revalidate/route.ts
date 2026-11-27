import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isAdminRequest } from "@/lib/supabase/server";

// Called by the admin dashboard after a change: rebuild the public pages now.
export async function POST(req: Request) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  }
  // the whole site: homepage, /projects, every project page (published or just unpublished)
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true, revalidated: true });
}
