"use client";

import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  joinTeamAction,
  recordShareAction,
  subscribeGuestAuctionReminderAction,
  subscribeNewsletterAction,
  updateCategoryInterestsAction,
  type GrowthResult,
} from "@/actions/growth";
import { Alert, Button, inputClass } from "@/components/ui";
import { CheckIcon, CopyIcon, DownloadIcon, MailIcon, MegaphoneIcon, ShareIcon, UsersIcon } from "@/components/icons";

const initialState: GrowthResult = { ok: false };

export function NewsletterForm({ source = "website" }: { source?: string }) {
  const [state, action, pending] = useActionState(subscribeNewsletterAction, initialState);
  return (
    <div>
      {state.ok ? <Alert tone="success">{state.message}</Alert> : (
        <form action={action} className="flex flex-col gap-3 sm:flex-row">
          <input type="hidden" name="source" value={source} />
          <label className="sr-only" htmlFor={`newsletter-${source}`}>Adres e-mail</label>
          <input id={`newsletter-${source}`} type="email" name="email" required placeholder="Twój e-mail" className={`${inputClass} min-w-0 flex-1`} />
          <Button type="submit" disabled={pending}><MailIcon size={16}/>{pending ? "Zapisywanie…" : "Zapisz mnie"}</Button>
          {state.error && <p className="text-sm font-medium text-red-700 sm:basis-full">{state.error}</p>}
        </form>
      )}
    </div>
  );
}

export function GuestAuctionReminderForm({ listingId, title }: { listingId: string; title: string }) {
  const [state, action, pending] = useActionState(subscribeGuestAuctionReminderAction, initialState);
  if (state.ok) return <Alert tone="success">{state.message}</Alert>;
  return (
    <form action={action} className="rounded-xl border border-slate-200 bg-white p-4">
      <input type="hidden" name="listingId" value={listingId} />
      <p className="flex items-center gap-2 text-sm font-bold text-ink"><MailIcon size={16}/>Przypomnij mi przed końcem</p>
      <p className="mt-1 text-xs leading-5 text-slate-600">Bez zakładania konta. Wyślemy jedną wiadomość około godzinę przed końcem aukcji „{title}”.</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
        <label className="sr-only" htmlFor={`guest-reminder-${listingId}`}>Adres e-mail</label>
        <input id={`guest-reminder-${listingId}`} type="email" name="email" required autoComplete="email" placeholder="Twój e-mail" className={`${inputClass} min-w-0 flex-1`} />
        <Button type="submit" size="sm" disabled={pending}>{pending ? "Zapisywanie…" : "Ustaw przypomnienie"}</Button>
      </div>
      {state.error && <p className="mt-2 text-xs font-semibold text-red-700">{state.error}</p>}
      <p className="mt-2 text-[11px] leading-4 text-slate-500">Adres służy tylko do tego jednego przypomnienia. W wiadomości znajdzie się link rezygnacji.</p>
    </form>
  );
}

export function InterestPreferences({ categories, selectedIds }: { categories: { id: string; name: string }[]; selectedIds: string[] }) {
  const [state, action, pending] = useActionState(updateCategoryInterestsAction, initialState);
  return (
    <form action={action}>
      <div className="grid gap-2 sm:grid-cols-2">
        {categories.map((category) => (
          <label key={category.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5 text-sm hover:border-brand-300 hover:bg-brand-50/40">
            <input type="checkbox" name="categoryId" value={category.id} defaultChecked={selectedIds.includes(category.id)} className="h-4 w-4 accent-brand-700" />
            <span>{category.name}</span>
          </label>
        ))}
      </div>
      {state.ok && <p className="mt-3 text-sm font-medium text-emerald-700">{state.message}</p>}
      {state.error && <p className="mt-3 text-sm font-medium text-red-700">{state.error}</p>}
      <Button type="submit" size="sm" className="mt-4" disabled={pending}>{pending ? "Zapisywanie…" : "Zapisz zainteresowania"}</Button>
    </form>
  );
}

export function JoinTeamForm({ currentTeamName }: { currentTeamName?: string | null }) {
  const [state, action, pending] = useActionState(joinTeamAction, initialState);
  return (
    <div>
      {currentTeamName && <p className="mb-3 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">Obecna drużyna: <strong>{currentTeamName}</strong></p>}
      <form action={action} className="flex flex-col gap-3 sm:flex-row">
        <label className="sr-only" htmlFor="join-code">Kod drużyny</label>
        <input id="join-code" name="joinCode" required placeholder="Kod od szkoły, firmy lub organizatora" className={`${inputClass} uppercase`} />
        <Button type="submit" disabled={pending}><UsersIcon size={16}/>{pending ? "Dołączanie…" : "Dołącz"}</Button>
      </form>
      {state.ok && <p className="mt-3 text-sm font-medium text-emerald-700">{state.message}</p>}
      {state.error && <p className="mt-3 text-sm font-medium text-red-700">{state.error}</p>}
    </div>
  );
}

export type ShareStudioData = {
  listingId: string;
  title: string;
  price: string;
  endLabel: string;
  photoUrl: string;
  publicUrl: string;
  category: string;
  region: string;
  bidCount: number;
  auctionStatus: string;
  specialLabel?: string | null;
};

type GraphicFormat = "post" | "story" | "facebook";
type GraphicType = "new" | "standard" | "today" | "last-hour" | "no-bids" | "ended";

const formatSizes: Record<GraphicFormat, { width: number; height: number; label: string }> = {
  post: { width: 1080, height: 1350, label: "Post 1080 × 1350" },
  story: { width: 1080, height: 1920, label: "Relacja 1080 × 1920" },
  facebook: { width: 1200, height: 630, label: "Facebook / Open Graph 1200 × 630" },
};

const graphicLabels: Record<GraphicType, string> = {
  new: "Nowa aukcja",
  standard: "Aktualna oferta",
  today: "Kończy się dzisiaj",
  "last-hour": "Ostatnia godzina",
  "no-bids": "Czeka na pierwszą ofertę",
  ended: "Zakończona - dziękujemy",
};

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth) current = test;
    else {
      if (current) lines.push(current);
      current = word;
      if (lines.length === maxLines - 1) break;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  if (lines.join(" ").length < text.length && lines.length) lines[lines.length - 1] = `${lines[lines.length - 1].replace(/[.,;:]?$/, "")}…`;
  return lines;
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + width - r, y); ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r); ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height); ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}

function drawCover(ctx: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, w: number, h: number, cropY: number) {
  const scale = Math.max(w / image.width, h / image.height);
  const dw = image.width * scale; const dh = image.height * scale;
  const available = Math.max(0, dh - h);
  const dy = y - available * (cropY / 100);
  ctx.save(); roundedRect(ctx, x, y, w, h, 34); ctx.clip(); ctx.drawImage(image, x + (w - dw) / 2, dy, dw, dh); ctx.restore();
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image(); image.crossOrigin = "anonymous"; image.onload = () => resolve(image); image.onerror = reject; image.src = src;
  });
}

export function ShareStudio({ data }: { data: ShareStudioData }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [pending, startTransition] = useTransition();
  const [format, setFormat] = useState<GraphicFormat>("post");
  const [type, setType] = useState<GraphicType>(data.auctionStatus === "ZAKONCZONA" ? "ended" : data.bidCount === 0 ? "no-bids" : "standard");
  const [showQr, setShowQr] = useState(true);
  const [showRegion, setShowRegion] = useState(true);
  const [showBidCount, setShowBidCount] = useState(true);
  const [cropY, setCropY] = useState(50);
  const post = useMemo(() => `${data.specialLabel ? `${data.specialLabel} dla Adasia!` : "Ta aukcja pomaga Adasiowi!"}\n\n${data.title}\n${graphicLabels[type]}: ${data.price}\n${data.endLabel}\n\nZwycięska kwota zostanie wpłacona bezpośrednio na oficjalną zbiórkę Adasia w serwisie Siepomaga.pl. Możesz też pomóc bez licytowania.\n\n${data.publicUrl}`, [data, type]);

  async function tracked(channel: "native" | "facebook" | "messenger" | "whatsapp" | "copy" | "graphic" | "post") {
    startTransition(async () => { await recordShareAction(data.listingId, channel); });
  }
  async function copy(text: string, key: string) { await navigator.clipboard.writeText(text); setCopied(key); window.setTimeout(() => setCopied(null), 1800); await tracked(key === "link" ? "copy" : "post"); }
  async function nativeShare() { if (navigator.share) { try { await navigator.share({ title: data.title, text: post, url: data.publicUrl }); await tracked("native"); } catch {} } else await copy(data.publicUrl, "link"); }

  useEffect(() => {
    const timer = window.setTimeout(() => { void renderGraphic(false); }, 120);
    return () => window.clearTimeout(timer);
    // renderGraphic korzysta z aktualnych wartości poniższych ustawień.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [format, type, showQr, showRegion, showBidCount, cropY, data.photoUrl, data.title, data.price, data.endLabel, data.publicUrl]);

  async function renderGraphic(download = false) {
    setGenerating(true);
    try {
      const canvas = canvasRef.current; if (!canvas) return;
      const ctx = canvas.getContext("2d"); if (!ctx) return;
      const size = formatSizes[format]; canvas.width = size.width; canvas.height = size.height;
      const w = size.width, h = size.height;
      const horizontal = format === "facebook";
      ctx.fillStyle = "#f7f2e8"; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#0d493d"; ctx.fillRect(0, 0, w, horizontal ? 116 : 176);
      ctx.fillStyle = "#fff"; ctx.font = `800 ${horizontal ? 42 : 48}px Arial`; ctx.fillText("♡  LicytujDobro", 56, horizontal ? 73 : 102);
      ctx.font = `600 ${horizontal ? 24 : 27}px Arial`; ctx.fillStyle = "#e8d29b"; ctx.textAlign = "right"; ctx.fillText("Ta aukcja pomaga Adasiowi", w - 56, horizontal ? 72 : 101); ctx.textAlign = "left";

      const margin = horizontal ? 48 : 58;
      const imageX = margin; const imageY = horizontal ? 144 : 216;
      const imageW = horizontal ? 560 : w - margin * 2;
      const imageH = horizontal ? 390 : format === "story" ? 820 : 610;
      ctx.fillStyle = "#dbe9e4"; roundedRect(ctx, imageX, imageY, imageW, imageH, 34); ctx.fill();
      try { const image = await loadImage(data.photoUrl); drawCover(ctx, image, imageX, imageY, imageW, imageH, cropY); } catch {}
      ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 12; roundedRect(ctx, imageX, imageY, imageW, imageH, 34); ctx.stroke();

      ctx.fillStyle = data.specialLabel ? "#b7791f" : "#0d493d"; roundedRect(ctx, imageX + 24, imageY + 24, Math.min(data.specialLabel ? 430 : 300, imageW - 48), 64, 26); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.font = `700 ${horizontal ? 23 : 27}px Arial`; ctx.fillText(data.specialLabel || data.category, imageX + 50, imageY + 65);

      const priceW = horizontal ? 300 : 360; const priceH = horizontal ? 150 : 176;
      const priceX = horizontal ? imageX + imageW + 34 : imageX + imageW - priceW - 22;
      const priceY = horizontal ? imageY + 5 : imageY + imageH - priceH + 22;
      ctx.shadowColor = "rgba(5,45,36,.22)"; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8;
      ctx.fillStyle = "#0b5b49"; roundedRect(ctx, priceX, priceY, priceW, priceH, 30); ctx.fill();
      ctx.shadowColor = "transparent"; ctx.strokeStyle = "#d8b96b"; ctx.lineWidth = 4; roundedRect(ctx, priceX, priceY, priceW, priceH, 30); ctx.stroke();
      ctx.fillStyle = "#f2d990"; ctx.font = `800 ${horizontal ? 19 : 22}px Arial`; ctx.fillText(graphicLabels[type].toUpperCase(), priceX + 28, priceY + 43);
      ctx.fillStyle = "#fff"; ctx.font = `800 ${horizontal ? 62 : 78}px Arial`; ctx.fillText(data.price, priceX + 28, priceY + (horizontal ? 116 : 133));

      const contentX = horizontal ? imageX + imageW + 34 : margin;
      const contentY = horizontal ? imageY + 190 : imageY + imageH + 68;
      const contentW = horizontal ? w - contentX - margin : w - margin * 2;
      ctx.fillStyle = "#12372f"; ctx.font = `800 ${horizontal ? 43 : format === "story" ? 61 : 52}px Georgia`;
      const titleLines = wrapText(ctx, data.title, contentW, horizontal ? 4 : 3);
      titleLines.forEach((line, index) => ctx.fillText(line, contentX, contentY + index * (horizontal ? 52 : format === "story" ? 72 : 64)));
      let cursor = contentY + titleLines.length * (horizontal ? 52 : format === "story" ? 72 : 64) + 20;
      ctx.fillStyle = "#5c6d67"; ctx.font = `500 ${horizontal ? 23 : 29}px Arial`; ctx.fillText(data.endLabel, contentX, cursor); cursor += horizontal ? 45 : 62;
      if (showRegion) { ctx.fillStyle = "#0d6b57"; ctx.font = `700 ${horizontal ? 21 : 26}px Arial`; ctx.fillText(`⌖  ${data.region}`, contentX, cursor); cursor += horizontal ? 40 : 52; }
      if (showBidCount) { ctx.fillStyle = "#5c6d67"; ctx.font = `500 ${horizontal ? 20 : 24}px Arial`; ctx.fillText(`${data.bidCount} ${data.bidCount === 1 ? "oferta" : "ofert"}`, contentX, cursor); }

      if (!horizontal) {
        const stripY = format === "story" ? h - 360 : h - 274;
        ctx.fillStyle = "#e6ecdb"; roundedRect(ctx, margin, stripY, w - margin * 2, 122, 24); ctx.fill();
        ctx.fillStyle = "#12372f"; ctx.font = "700 30px Arial"; ctx.fillText("Zwycięska kwota pomaga Adasiowi", margin + 34, stripY + 49);
        ctx.font = "500 23px Arial"; ctx.fillText("Wpłata bezpośrednio na Siepomaga", margin + 34, stripY + 86);
        const footerY = stripY + 146; ctx.fillStyle = "#0d493d"; roundedRect(ctx, margin, footerY, w - margin * 2, 120, 24); ctx.fill();
        ctx.fillStyle = "#f6e1a8"; ctx.font = "700 24px Arial"; ctx.fillText("Licytuj i pomóż", margin + (showQr ? 170 : 34), footerY + 43);
        ctx.fillStyle = "#fff"; ctx.font = "600 22px Arial"; const short = data.publicUrl.replace(/^https?:\/\//, ""); ctx.fillText(short, margin + (showQr ? 170 : 34), footerY + 80);
        if (showQr) {
          const QRCode = (await import("qrcode")).default;
          const qrData = await QRCode.toDataURL(data.publicUrl, { width: 150, margin: 1, color: { dark: "#0d493d", light: "#ffffff" } });
          const qr = await loadImage(qrData); ctx.drawImage(qr, margin + 12, footerY - 15, 140, 140);
        }
      } else {
        ctx.fillStyle = "#e6ecdb"; roundedRect(ctx, contentX, h - 118, contentW, 78, 20); ctx.fill();
        ctx.fillStyle = "#12372f"; ctx.font = "700 22px Arial"; ctx.fillText("Zwycięska kwota pomaga Adasiowi", contentX + 24, h - 72);
      }

      if (download) {
        const link = document.createElement("a"); link.download = `licytujdobro-${data.listingId.slice(0, 8)}-${format}-${type}.png`; link.href = canvas.toDataURL("image/png"); link.click(); await tracked("graphic");
      }
    } finally { setGenerating(false); }
  }

  return <div className="grid gap-7 xl:grid-cols-[.82fr_1.18fr]">
    <section className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="text-lg font-bold text-ink">Ustawienia grafiki</h2>{data.publicUrl.includes("localhost")&&<div className="mt-4"><Alert tone="warning">Grafika zawiera adres lokalny. Przed publikacją ustaw NEXT_PUBLIC_APP_URL na prawdziwą domenę, np. https://licytujdobro.pl.</Alert></div>}
        <label className="mt-4 block text-sm font-semibold">Format<select value={format} onChange={(e)=>setFormat(e.target.value as GraphicFormat)} className={`${inputClass} mt-2`}>{Object.entries(formatSizes).map(([key,value])=><option key={key} value={key}>{value.label}</option>)}</select></label>
        <label className="mt-4 block text-sm font-semibold">Komunikat<select value={type} onChange={(e)=>setType(e.target.value as GraphicType)} className={`${inputClass} mt-2`}>{Object.entries(graphicLabels).map(([key,value])=><option key={key} value={key}>{value}</option>)}</select></label>
        <label className="mt-4 block text-sm font-semibold">Kadr zdjęcia<input type="range" min="0" max="100" value={cropY} onChange={(e)=>setCropY(Number(e.target.value))} className="mt-3 w-full accent-brand-700"/><span className="mt-1 block text-xs font-normal text-slate-500">Przesuń punkt skupienia zdjęcia w pionie.</span></label>
        <div className="mt-5 grid gap-2 text-sm"><label className="flex items-center gap-2"><input type="checkbox" checked={showQr} onChange={(e)=>setShowQr(e.target.checked)} className="accent-brand-700"/>Pokaż kod QR</label><label className="flex items-center gap-2"><input type="checkbox" checked={showRegion} onChange={(e)=>setShowRegion(e.target.checked)} className="accent-brand-700"/>Pokaż lokalizację</label><label className="flex items-center gap-2"><input type="checkbox" checked={showBidCount} onChange={(e)=>setShowBidCount(e.target.checked)} className="accent-brand-700"/>Pokaż liczbę ofert</label></div>
        <div className="mt-5 grid grid-cols-2 gap-2"><Button variant="outline" disabled={generating} onClick={()=>renderGraphic(false)}>{generating?"Tworzenie…":"Podgląd"}</Button><Button disabled={generating || pending} onClick={()=>renderGraphic(true)}><DownloadIcon size={16}/>Pobierz PNG</Button></div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="flex items-center gap-2 text-lg font-bold"><MegaphoneIcon size={19} className="text-brand-700"/>Gotowy post</h2><pre className="mt-4 whitespace-pre-wrap rounded-lg bg-slate-50 p-4 font-sans text-sm leading-6 text-slate-700">{post}</pre><Button className="mt-4" size="sm" variant="outline" onClick={()=>copy(post,"post")}><CopyIcon size={15}/>{copied === "post" ? "Skopiowano" : "Kopiuj post"}</Button></div>
    </section>
    <aside className="space-y-5"><div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100 p-3"><canvas ref={canvasRef} className="mx-auto block h-auto max-h-[720px] w-full object-contain" aria-label="Podgląd grafiki aukcji"/></div><div className="rounded-xl border border-brand-200 bg-brand-50/60 p-5"><h2 className="text-lg font-bold">Udostępnij aukcję</h2><div className="mt-4 grid gap-2 sm:grid-cols-2"><Button onClick={nativeShare}><ShareIcon size={16}/>Udostępnij</Button><a onClick={()=>tracked("facebook")} target="_blank" rel="noreferrer" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(data.publicUrl)}`} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-ink hover:border-brand-500">Facebook</a><a onClick={()=>tracked("whatsapp")} target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(post)}`} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-ink hover:border-brand-500">WhatsApp</a><Button variant="outline" onClick={()=>copy(data.publicUrl,"link")}><CopyIcon size={16}/>{copied === "link" ? "Link skopiowany" : "Kopiuj krótki link"}</Button></div></div></aside>
  </div>;
}
