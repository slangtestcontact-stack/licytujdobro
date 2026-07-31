"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export function AuctionGallery({ photos, title }: { photos: { url: string; kind: string }[]; title: string }) {
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const current = photos[active];

  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
      if (event.key === "ArrowRight") setActive((value) => (value + 1) % photos.length);
      if (event.key === "ArrowLeft") setActive((value) => (value - 1 + photos.length) % photos.length);
    };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", handler); document.body.style.overflow = ""; };
  }, [open, photos.length]);

  if (!current) return <div className="aspect-[4/3] rounded-xl bg-slate-100" />;

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-[72px_1fr]">
        {photos.length > 1 && <div className="order-2 flex gap-2 overflow-x-auto sm:order-1 sm:flex-col">
          {photos.map((photo,index)=><button key={`${photo.url}-${index}`} onClick={()=>setActive(index)} className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border bg-slate-100 ${active===index?"border-brand-700 ring-2 ring-brand-100":"border-slate-200 hover:border-brand-400"}`} aria-label={`Pokaż zdjęcie ${index+1}`}><Image src={photo.url} alt="" fill className="object-cover"/></button>)}
        </div>}
        <button onClick={()=>setOpen(true)} className="relative order-1 aspect-[4/3] overflow-hidden rounded-xl border border-slate-200 bg-slate-100 sm:order-2" aria-label="Powiększ zdjęcie">
          <Image src={current.url} alt={`${title} - zdjęcie ${active+1}`} fill preload className="object-cover" />
          <span className="absolute bottom-3 right-3 rounded-md bg-black/65 px-2.5 py-1.5 text-xs font-semibold text-white">{active+1} / {photos.length}</span>
        </button>
      </div>
      {open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" role="dialog" aria-modal="true" aria-label="Galeria zdjęć"><button onClick={()=>setOpen(false)} className="absolute right-4 top-4 rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20">Zamknij</button><button onClick={()=>setActive((active-1+photos.length)%photos.length)} className="absolute left-3 rounded-full bg-white/10 p-4 text-2xl text-white hover:bg-white/20" aria-label="Poprzednie zdjęcie">‹</button><div className="relative h-[80vh] w-[85vw]"><Image src={current.url} alt={`${title} - powiększone zdjęcie`} fill className="object-contain"/></div><button onClick={()=>setActive((active+1)%photos.length)} className="absolute right-3 rounded-full bg-white/10 p-4 text-2xl text-white hover:bg-white/20" aria-label="Następne zdjęcie">›</button></div>}
    </>
  );
}
