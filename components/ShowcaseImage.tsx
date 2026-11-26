"use client";
import { useRef } from "react";

// The project's full showcase image (shown uncropped), click to view it large.
export default function ShowcaseImage({ src, alt }: { src: string; alt: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const close = () => dialog.current?.close();
  return (
    <>
      <button type="button" className="showcase" onClick={() => dialog.current?.showModal()} aria-label={`Enlarge: ${alt}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} width={1600} height={2000} decoding="async" />
        <span className="showcase__hint" aria-hidden="true">Click to enlarge</span>
      </button>
      <dialog ref={dialog} className="lightbox lightbox--tall" onClick={(e) => { if (e.target === dialog.current) close(); }}>
        <figure className="lightbox__figure">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={alt} />
          <figcaption><span>{alt}</span></figcaption>
        </figure>
        <button type="button" className="lightbox__close" onClick={close} aria-label="Close">×</button>
      </dialog>
    </>
  );
}
