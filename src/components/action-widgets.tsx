"use client";

import { useActionState, useState, useTransition } from "react";
import { toggleWatchAction, createReportAction, type MiscResult } from "@/actions/misc";
import { Button, Alert, inputClass } from "@/components/ui";
import { FlagIcon, HeartIcon, ShareIcon } from "@/components/icons";

export function WatchButton({ listingId, initialWatching }: { listingId: string; initialWatching: boolean }) {
  const [watching, setWatching] = useState(initialWatching);
  const [pending, startTransition] = useTransition();
  return <button type="button" disabled={pending} onClick={()=>startTransition(async()=>{const res=await toggleWatchAction(listingId);if(res.ok)setWatching(Boolean(res.watching));})} aria-pressed={watching} className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-semibold ${watching?"border-brand-200 bg-brand-50 text-brand-800":"border-slate-300 bg-white text-slate-700 hover:border-brand-500"}`}><HeartIcon size={16} className={watching?"fill-brand-700 text-brand-700":""}/>{watching?"Obserwujesz":"Obserwuj"}</button>;
}

const initial: MiscResult = { ok: false };
const REASONS = [
  { value: "OPIS_NIEZGODNY", label: "Opis niezgodny z rzeczywistością" },
  { value: "PODEJRZANY_PRZEDMIOT", label: "Podejrzany lub niedozwolony przedmiot" },
  { value: "NEKULTURALNE_ZACHOWANIE", label: "Nieodpowiednie zachowanie użytkownika" },
  { value: "OMIJANIE_PLATFORMY", label: "Próba przeniesienia transakcji poza platformę" },
  { value: "POMYLKA_OFERTY", label: "Oczywista pomyłka w ofercie" },
  { value: "INNE", label: "Inny problem" },
];

export function ReportForm({ targetType, targetId }: { targetType: "LISTING" | "USER" | "BID" | "TRANSACTION"; targetId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createReportAction, initial);
  if (!open) return <button type="button" onClick={()=>setOpen(true)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-transparent bg-white px-3 text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-danger"><FlagIcon size={16}/> Zgłoś</button>;
  return <div className="w-full rounded-xl border border-slate-200 bg-white p-4"><h3 className="text-sm font-bold text-ink">Zgłoś problem</h3>{state.ok?<div className="mt-3"><Alert tone="success">Zgłoszenie przekazano administratorowi.</Alert></div>:<form action={formAction} className="mt-3 flex flex-col gap-3"><input type="hidden" name="targetType" value={targetType}/><input type="hidden" name="targetId" value={targetId}/>{state.error&&<Alert tone="danger">{state.error}</Alert>}<select name="reason" required defaultValue="" className={inputClass}><option value="" disabled>Wybierz przyczynę</option>{REASONS.map((r)=><option key={r.value} value={r.value}>{r.label}</option>)}</select><textarea name="comment" placeholder="Dodatkowy komentarz" rows={3} className={inputClass}/><div className="flex gap-2"><Button type="submit" size="sm" disabled={pending}>{pending?"Wysyłanie…":"Wyślij zgłoszenie"}</Button><Button type="button" size="sm" variant="ghost" onClick={()=>setOpen(false)}>Anuluj</Button></div></form>}</div>;
}

export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);
  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title, url });
      else { await navigator.clipboard.writeText(url); setCopied(true); window.setTimeout(() => setCopied(false), 1800); }
    } catch {
      // Użytkownik może anulować natywny panel udostępniania.
    }
  }
  return <button type="button" onClick={share} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-transparent bg-white px-3 text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-brand-700"><ShareIcon size={16}/>{copied ? "Skopiowano" : "Udostępnij"}</button>;
}
