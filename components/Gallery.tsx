"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { GalleryGroup } from "@/lib/readme";

export default function Gallery({ groups }: { groups: GalleryGroup[] }) {
  const all = groups.flatMap((g) => g.images);
  const [open, setOpen] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  const show = (i: number) => { setOpen(i); dialog.current?.showModal(); };
  const close = () => { dialog.current?.close(); setOpen(null); };
  const step = useCallback((d: number) => setOpen((i) => (i === null ? i : (i + d + all.length) % all.length)), [all.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (open === null) return;
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, step]);

  let index = -1;
  const current = open !== null ? all[open] : null;

  return (
    <>
      {groups.map((g) => (
        <div key={g.title} className="gallery-group">
          {groups.length > 1 && <h3 className="gallery-group__title">{g.title}</h3>}
          <div className="gallery">
            {g.images.map((img) => {
              index += 1;
              const i = index;
              return (
                <button key={img.src} type="button" className="gallery__item" onClick={() => show(i)} aria-label={`Enlarge: ${img.alt || "screenshot"}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.src} alt={img.alt} loading="lazy" decoding="async" />
                  {img.alt && <span className="gallery__caption">{img.alt}</span>}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <dialog ref={dialog} className="lightbox" onClose={() => setOpen(null)} onClick={(e) => { if (e.target === dialog.current) close(); }}>
        {current && (
          <figure className="lightbox__figure">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={current.src} alt={current.alt} />
            <figcaption>
              <span>{current.alt}</span>
              <span className="lightbox__count">{(open ?? 0) + 1} / {all.length}</span>
            </figcaption>
          </figure>
        )}
        {all.length > 1 && (
          <>
            <button type="button" className="lightbox__nav lightbox__nav--prev" onClick={() => step(-1)} aria-label="Previous screenshot">‹</button>
            <button type="button" className="lightbox__nav lightbox__nav--next" onClick={() => step(1)} aria-label="Next screenshot">›</button>
          </>
        )}
        <button type="button" className="lightbox__close" onClick={close} aria-label="Close">×</button>
      </dialog>
    </>
  );
}
