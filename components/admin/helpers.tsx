"use client";
import { browserClient } from "@/lib/supabase/browser";

export const db = () => browserClient();

/** Tell Next.js to rebuild public pages after a change. */
export async function refreshSite() {
  try {
    await fetch("/api/revalidate", { method: "POST" });
  } catch {}
}

/** Resize + convert an image to WebP in the browser. */
export function compressImage(file: File, maxWidth = 1600): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      c.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Couldn't convert image"))),
        "image/webp",
        0.82
      );
    };
    img.onerror = () => reject(new Error("Couldn't read that image"));
    img.src = URL.createObjectURL(file);
  });
}

/** Upload to the public "portfolio" storage bucket and return its URL. */
export async function uploadImage(file: File, folder: "projects" | "profile", name: string, maxWidth?: number) {
  const blob = await compressImage(file, maxWidth);
  const path = `${folder}/${name}-${Date.now().toString(36)}.webp`;
  const { error } = await db().storage.from("portfolio").upload(path, blob, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return db().storage.from("portfolio").getPublicUrl(path).data.publicUrl;
}

export const splitList = (s: string) => s.split(",").map((t) => t.trim()).filter(Boolean);

export type Status = { text: string; kind?: "error" | "success" } | null;

export function StatusLine({ status }: { status: Status }) {
  return (
    <p className={`form-status${status?.kind ? " is-" + status.kind : ""}`} role="status" aria-live="polite">
      {status?.text || ""}
    </p>
  );
}
