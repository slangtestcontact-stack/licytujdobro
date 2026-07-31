"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveListingAction, rejectListingAction, requestListingChangesAction, resolveCancellationAction, setSpecialListingAction, setUserStatusAction, updateSiepomagaCampaignAction } from "@/actions/admin";
import { Alert, Button, inputClass } from "@/components/ui";
import { ADAS_CAMPAIGN } from "@/lib/adas-campaign";

export function ModerationControls({ listingId, ownerId }: { listingId: string; ownerId: string }) {
  const router = useRouter(); const [pending,startTransition]=useTransition(); const [note,setNote]=useState(""); const [message,setMessage]=useState<string|null>(null);
  const [checks,setChecks]=useState({ ownPhotos:false, allowedItem:false, defectsDisclosed:false, startPriceReasonable:false, regionCorrect:false, noPersonalData:false, noDocumentsVisible:false }); const [isSpecial,setIsSpecial]=useState(false); const [specialLabel,setSpecialLabel]=useState("Aukcja specjalna");
  const complete=Object.values(checks).every(Boolean);
  const run=(fn:()=>Promise<{ok:boolean;error?:string}>)=>startTransition(async()=>{const r=await fn();setMessage(r.ok?"Operacja zapisana.":r.error??"Błąd");if(r.ok)router.refresh();});
  const labels: [keyof typeof checks,string][] = [["ownPhotos","Zdjęcia wyglądają na własne i przedstawiają ten przedmiot."],["allowedItem","Przedmiot należy do dozwolonej kategorii."],["defectsDisclosed","Opis wskazuje wady i kompletność."],["startPriceReasonable","Cena startowa i minimalne przebicie są rozsądne."],["regionCorrect","Odbiór jest w regionie Biłgoraj i okolice."],["noPersonalData","Zdjęcia i opis nie ujawniają danych osobowych."],["noDocumentsVisible","Nie widać dokumentów, adresów ani numerów telefonu."]];
  return <div className="mt-4 space-y-3">{message&&<Alert tone={message==="Operacja zapisana."?"success":"danger"}>{message}</Alert>}<div className="rounded-lg border border-slate-200 bg-slate-50 p-4"><p className="text-sm font-bold text-ink">Checklista moderatora</p><div className="mt-3 grid gap-2">{labels.map(([key,label])=><label key={key} className="flex gap-2 text-xs leading-5 text-slate-700"><input type="checkbox" checked={checks[key]} onChange={(e)=>setChecks((old)=>({...old,[key]:e.target.checked}))} className="mt-1 accent-brand-700"/>{label}</label>)}</div></div><div className="rounded-lg border border-amber-200 bg-amber-50 p-4"><label className="flex gap-2 text-sm font-bold text-amber-950"><input type="checkbox" checked={isSpecial} onChange={(e)=>setIsSpecial(e.target.checked)} className="mt-1 accent-amber-700"/>Oznacz jako aukcję specjalną</label>{isSpecial&&<input value={specialLabel} onChange={(e)=>setSpecialLabel(e.target.value)} className={`${inputClass} mt-3`} maxLength={80} aria-label="Etykieta aukcji specjalnej" placeholder="Np. Przedmiot z autografem"/>}<p className="mt-2 text-xs leading-5 text-amber-900">Wyróżniaj tylko rzeczy wyjątkowe: autografy, rękodzieło, pamiątki sportowe albo dary lokalnych partnerów.</p></div><textarea value={note} onChange={(e)=>setNote(e.target.value)} className={inputClass} rows={3} placeholder="Konkretne uwagi dla użytkownika lub powód odrzucenia"/><div className="flex flex-wrap gap-2"><Button size="sm" disabled={pending||!complete} onClick={()=>run(()=>approveListingAction(listingId,checks,{isSpecial,label:specialLabel}))}>Zatwierdź i uruchom</Button><Button size="sm" variant="outline" disabled={pending||note.length<5} onClick={()=>run(()=>requestListingChangesAction(listingId,note))}>Poproś o poprawę</Button><Button size="sm" variant="danger" disabled={pending||note.length<5} onClick={()=>run(()=>rejectListingAction(listingId,note))}>Odrzuć</Button><Button size="sm" variant="danger" disabled={pending||note.length<5} onClick={()=>run(()=>setUserStatusAction(ownerId,"zablokowane"))}>Zablokuj użytkownika</Button></div></div>;
}

export function SpecialListingControls({ listingId, isSpecial, label }: { listingId: string; isSpecial: boolean; label?: string | null }) {
  const router=useRouter(); const [pending,startTransition]=useTransition(); const [current,setCurrent]=useState(isSpecial); const [value,setValue]=useState(label||"Aukcja specjalna"); const [message,setMessage]=useState<string|null>(null);
  const save=(next:boolean)=>startTransition(async()=>{const r=await setSpecialListingAction(listingId,next,value);setMessage(r.ok?"Zapisano wyróżnienie.":r.error??"Błąd");if(r.ok){setCurrent(next);router.refresh();}});
  return <div className="rounded-lg border border-amber-200 bg-amber-50 p-3"><label className="flex gap-2 text-sm font-semibold text-amber-950"><input type="checkbox" checked={current} onChange={(e)=>save(e.target.checked)} disabled={pending} className="mt-1 accent-amber-700"/>Aukcja specjalna</label>{current&&<div className="mt-2 flex gap-2"><input value={value} onChange={(e)=>setValue(e.target.value)} className={inputClass} maxLength={80}/><Button size="sm" variant="outline" disabled={pending} onClick={()=>save(true)}>Zapisz</Button></div>}{message&&<p className="mt-2 text-xs text-amber-900">{message}</p>}</div>;
}

export function UserStatusControls({ userId, currentStatus }: { userId: string; currentStatus: string }) {
  const router=useRouter(); const [pending,startTransition]=useTransition(); const [message,setMessage]=useState<string|null>(null);
  const run=(status:"aktywne"|"zawieszone"|"zablokowane")=>startTransition(async()=>{const r=await setUserStatusAction(userId,status);setMessage(r.ok?"Zmieniono status.":r.error??"Błąd");if(r.ok)router.refresh();});
  return <div>{message&&<p className="mb-2 text-xs text-slate-500">{message}</p>}<div className="flex flex-wrap gap-1"><Button size="sm" variant="ghost" disabled={pending||currentStatus==="aktywne"} onClick={()=>run("aktywne")}>Aktywuj</Button><Button size="sm" variant="outline" disabled={pending||currentStatus==="zawieszone"} onClick={()=>run("zawieszone")}>Zawieś</Button><Button size="sm" variant="danger" disabled={pending||currentStatus==="zablokowane"} onClick={()=>run("zablokowane")}>Zablokuj</Button></div></div>;
}

type CampaignForm = {
  name: string;
  beneficiaryName: string | null;
  description: string;
  imageUrl: string | null;
  externalUrl: string;
  piggyBankUrl: string | null;
  targetAmount: string | null;
};

const EMPTY: CampaignForm = {
  name: ADAS_CAMPAIGN.campaignName,
  beneficiaryName: ADAS_CAMPAIGN.beneficiaryName,
  description: ADAS_CAMPAIGN.description,
  imageUrl: ADAS_CAMPAIGN.imageUrl,
  externalUrl: ADAS_CAMPAIGN.officialCampaignUrl,
  piggyBankUrl: ADAS_CAMPAIGN.piggyBankUrl,
  targetAmount: null,
};

export function SiepomagaCampaignControls({ campaign }: { campaign: CampaignForm | null }) {
  const initial = campaign ?? EMPTY;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [name, setName] = useState(initial.name);
  const [beneficiaryName, setBeneficiaryName] = useState(initial.beneficiaryName ?? "");
  const [description, setDescription] = useState(initial.description);
  const [imageUrl, setImageUrl] = useState(initial.imageUrl ?? "");
  const [externalUrl, setExternalUrl] = useState(initial.externalUrl);
  const [piggyBankUrl, setPiggyBankUrl] = useState(initial.piggyBankUrl ?? "");
  const [targetAmount, setTargetAmount] = useState(initial.targetAmount ? Number(initial.targetAmount) : 0);

  const save = () => startTransition(async () => {
    const result = await updateSiepomagaCampaignAction({
      name,
      beneficiaryName,
      description,
      imageUrl,
      externalUrl,
      piggyBankUrl,
      targetAmount: targetAmount > 0 ? targetAmount : undefined,
    });
    setMessage(result.ok ? "Konfiguracja Adasia została zapisana i aktywowana." : result.error ?? "Nie udało się zapisać konfiguracji.");
    if (result.ok) router.refresh();
  });

  const complete =
    name.length >= 5 &&
    beneficiaryName.length >= 2 &&
    description.length >= 30 &&
    externalUrl.startsWith("https://") &&
    piggyBankUrl.startsWith("https://");

  return <div className="mt-5 rounded-xl border border-slate-200 bg-white p-5">
    {message && <Alert tone={message.includes("aktywowana") ? "success" : "danger"}>{message}</Alert>}
    {!campaign && <div className="mb-4"><Alert tone="warning" title="Serwis jest zablokowany do czasu konfiguracji">Uruchom npm run db:seed albo zapisz poniższe dane Adasia. Dopiero wtedy można zatwierdzać aukcje.</Alert></div>}
    <div className="mb-5 rounded-lg border border-brand-200 bg-brand-50 p-4 text-sm leading-6 text-brand-800">
      Użytkownicy przechodzą z LicytujDobro bezpośrednio do Siepomaga. Platforma nie pobiera pieniędzy, nie zapisuje danych płatniczych i nie weryfikuje wpłat.
    </div>
    <div className="grid gap-4 lg:grid-cols-2">
      <label className="text-sm font-semibold text-ink">Tytuł zbiórki<input value={name} onChange={(event) => setName(event.target.value)} className={`${inputClass} mt-2`} placeholder="Licytacje dla Adasia Iwanejko" /></label>
      <label className="text-sm font-semibold text-ink">Publiczne imię dziecka<input value={beneficiaryName} onChange={(event) => setBeneficiaryName(event.target.value)} className={`${inputClass} mt-2`} /></label>
      <label className="text-sm font-semibold text-ink lg:col-span-2">Krótka historia<textarea value={description} onChange={(event) => setDescription(event.target.value)} className={`${inputClass} mt-2`} rows={5} placeholder="Opis widoczny na stronie głównej i stronie zbiórki" /></label>
      <label className="text-sm font-semibold text-ink lg:col-span-2">Adres zdjęcia dziecka — opcjonalnie<input type="url" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} className={`${inputClass} mt-2`} placeholder="https://..." /></label>
      <label className="text-sm font-semibold text-ink lg:col-span-2">Oficjalna zbiórka Siepomaga<input type="url" value={externalUrl} onChange={(event) => setExternalUrl(event.target.value)} className={`${inputClass} mt-2`} placeholder="https://www.siepomaga.pl/nazwa-zbiorki" /></label>
      <label className="text-sm font-semibold text-ink lg:col-span-2">Bezpośredni link do wpłaty / Skarbonki<input type="url" value={piggyBankUrl} onChange={(event) => setPiggyBankUrl(event.target.value)} className={`${inputClass} mt-2`} placeholder="https://www.siepomaga.pl/nazwa-skarbonki" /></label>
      <label className="text-sm font-semibold text-ink">Cel zbiórki — opcjonalnie<input type="number" min={1} step={1} value={targetAmount || ""} onChange={(event) => setTargetAmount(Number(event.target.value))} className={`${inputClass} mt-2`} /></label>
    </div>
    <p className="mt-4 text-xs leading-5 text-slate-500">W całym serwisie aktywna jest jedna konfiguracja. Przyciski wpłaty prowadzą bezpośrednio do wskazanego adresu Siepomaga.</p>
    <Button className="mt-4" disabled={pending || !complete} onClick={save}>{pending ? "Zapisywanie…" : "Zapisz konfigurację Adasia"}</Button>
  </div>;
}


export function CancellationControls({ cancellationId }: { cancellationId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const run = (action: "WARNING" | "EXTEND" | "CANCEL" | "RELIST" | "TEMP_BLOCK" | "BLOCK") => startTransition(async () => {
    const result = await resolveCancellationAction(cancellationId, action);
    setMessage(result.ok ? "Decyzja została zapisana." : result.error ?? "Nie udało się zapisać decyzji.");
    if (result.ok) router.refresh();
  });
  return <div className="mt-3">
    {message && <p className="mb-2 text-xs font-medium text-slate-600">{message}</p>}
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" disabled={pending} onClick={() => run("WARNING")}>Ostrzeżenie</Button>
      <Button size="sm" variant="outline" disabled={pending} onClick={() => run("EXTEND")}>Przedłuż 24 h</Button>
      <Button size="sm" variant="outline" disabled={pending} onClick={() => run("RELIST")}>Wystaw ponownie</Button>
      <Button size="sm" variant="danger" disabled={pending} onClick={() => run("CANCEL")}>Anuluj transakcję</Button>
      <Button size="sm" variant="danger" disabled={pending} onClick={() => run("TEMP_BLOCK")}>Blokada 7 dni</Button>
      <Button size="sm" variant="danger" disabled={pending} onClick={() => run("BLOCK")}>Zablokuj konto</Button>
    </div>
  </div>;
}

