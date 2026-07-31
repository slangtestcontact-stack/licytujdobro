"use client";

import { useActionState } from "react";
import {
  createCampaignUpdateAction,
  createCommunityEventAction,
  createSupportTeamAction,
  type AdminResult,
} from "@/actions/admin";
import { Alert, Button, inputClass } from "@/components/ui";

const initial: AdminResult = { ok: false };

function Result({ state }: { state: AdminResult }) {
  if (state.ok) return <Alert tone="success">Zapisano. Element jest już widoczny w serwisie.</Alert>;
  if (state.error) return <Alert tone="danger">{state.error}</Alert>;
  return null;
}

export function CreateTeamForm() {
  const [state, action, pending] = useActionState(createSupportTeamAction, initial);
  return <form action={action} className="space-y-3"><Result state={state}/><input name="name" required placeholder="Np. Szkoła Podstawowa nr 1" className={inputClass}/><textarea name="description" rows={3} placeholder="Krótki opis drużyny" className={inputClass}/><Button type="submit" size="sm" disabled={pending}>{pending?"Tworzenie…":"Utwórz drużynę"}</Button></form>;
}

export function CreateCampaignUpdateForm() {
  const [state, action, pending] = useActionState(createCampaignUpdateAction, initial);
  return <form action={action} className="space-y-3"><Result state={state}/><input name="title" required placeholder="Tytuł aktualności" className={inputClass}/><textarea name="body" required rows={4} placeholder="Co nowego u Adasia lub w akcji?" className={inputClass}/><Button type="submit" size="sm" disabled={pending}>{pending?"Publikowanie…":"Opublikuj aktualność"}</Button></form>;
}

export function CreateCommunityEventForm() {
  const [state, action, pending] = useActionState(createCommunityEventAction, initial);
  return <form action={action} className="space-y-3"><Result state={state}/><input name="title" required placeholder="Np. Tydzień książek dla Adasia" className={inputClass}/><textarea name="description" required rows={3} placeholder="Opis wydarzenia" className={inputClass}/><select name="kind" className={inputClass} defaultValue="THEME_WEEK"><option value="THEME_WEEK">Tydzień tematyczny</option><option value="AUCTION_NIGHT">Wieczór licytacyjny</option><option value="ITEM_COLLECTION">Zbiórka przedmiotów</option><option value="LOCAL_EVENT">Wydarzenie lokalne</option></select><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold text-slate-600">Rozpoczęcie<input name="startsAt" type="datetime-local" required className={`${inputClass} mt-1`}/></label><label className="text-xs font-semibold text-slate-600">Zakończenie<input name="endsAt" type="datetime-local" required className={`${inputClass} mt-1`}/></label></div><Button type="submit" size="sm" disabled={pending}>{pending?"Tworzenie…":"Dodaj wydarzenie"}</Button></form>;
}
