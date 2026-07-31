"use client";

import { useState, useTransition } from "react";
import {
  acceptItemAction,
  choosePaymentFlowAction,
  deferPaymentAction,
  reportTransactionProblemAction,
  chooseMeetingAction,
  confirmAlternativePaymentAction,
  confirmBuyerSiepomagaDonationAction,
  confirmHandoverAction,
  generateHandoverCodeAction,
  confirmPresenceAction,
  confirmSellerSiepomagaDonationAction,
  confirmWinnerAction,
  markNoShowAction,
  markSiepomagaPaymentProblemAction,
  markTerminalOpenedAction,
  markWaitingForBlikAction,
  proposeMeetingAction,
  rateTransactionAction,
  rejectItemAction,
  reportRefusalAfterDonationAction,
  retrySiepomagaPaymentAction,
  startDonationAction,
  saveMeetingReadinessAction,
  setPlannedDonationAmountAction,
} from "@/actions/transactions";
import { Alert, Button, Field, inputClass } from "@/components/ui";
import {
  CalendarIcon,
  CheckIcon,
  EyeIcon,
  HandHeartIcon,
  MapPinIcon,
  PackageIcon,
  ShieldIcon,
  StarIcon,
} from "@/components/icons";
import { formatMoney } from "@/lib/auction-logic";

export type TransactionData = {
  id: string;
  status: string;
  role: "buyer" | "seller";
  amount: string;
  plannedDonationAmount: string;
  donationCode: string;
  campaignUrl: string;
  piggyBankUrl: string | null;
  terminalUrl: string | null;
  campaignName: string;
  campaignProvider: string;
  paymentLimit: string;
  proposals: {
    id: string;
    date: string;
    timeRange: string;
    location: string;
    message: string | null;
    proposedBy: string;
    proposerNickname: string;
  }[];
  currentUserId: string;
  buyerPresence: boolean;
  sellerPresence: boolean;
  buyerDonationConfirmed: boolean;
  sellerDonationConfirmed: boolean;
  buyerHandover: boolean;
  sellerHandover: boolean;
  alreadyRated: boolean;
  readinessConfirmed: boolean;
  otherPartyReady: boolean;
};

type Runner = (fn: () => Promise<{ ok: boolean; error?: string }>) => void;

const FLOW = [
  ["OCZEKUJE_NA_POTWIERDZENIE_ZWYCIEZCY", "Aukcja zakończona"],
  ["SPOTKANIE_ZAPLANOWANE", "Termin spotkania"],
  ["OGLEDZINY", "Przedmiot obejrzany"],
  ["OCZEKUJE_NA_PLATNOSC", "Wpłata dla Adasia"],
  ["WPLATA_POTWIERDZONA_OBUSTRONNIE", "Przedmiot przekazany"],
  ["ZAKONCZONA_POMYSLNIE", "Zakończona"],
] as const;

const PAYMENT_FLOW_STATUSES = [
  "OCZEKIWANIE_NA_OTWARCIE_TERMINALU",
  "TERMINAL_OTWARTY",
  "OCZEKIWANIE_NA_BLIK",
  "WPLATA_ZATWIERDZONA_PRZEZ_KUPUJACEGO",
  "WPLATA_POTWIERDZONA_PRZEZ_SPRZEDAJACEGO",
] as const;

export function TransactionControls({ data }: { data: TransactionData }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run: Runner = (fn) => startTransition(async () => {
    setError(null);
    const result = await fn();
    if (!result.ok) setError(result.error ?? "Nie udało się wykonać operacji.");
  });

  return <div className="space-y-5">
    <Progress status={data.status} />
    {error && <Alert tone="danger">{error}</Alert>}
    {data.role === "buyer" && ["OCZEKUJE_NA_POTWIERDZENIE_ZWYCIEZCY", "UMAWIANIE_SPOTKANIA", "SPOTKANIE_ZAPLANOWANE", "OGLEDZINY", "PRZEDMIOT_ZAAKCEPTOWANY"].includes(data.status) &&
      <DonationBoost data={data} pending={pending} run={run} />}

    {data.status === "OCZEKUJE_NA_POTWIERDZENIE_ZWYCIEZCY" && data.role === "buyer" &&
      <Action icon={CheckIcon} title="Potwierdź wygraną" text="Nie wykonuj jeszcze wpłaty. Najpierw potwierdź udział i ustal spotkanie.">
        <Button disabled={pending} onClick={() => run(() => confirmWinnerAction(data.id))}>Potwierdzam udział</Button>
      </Action>}
    {data.status === "OCZEKUJE_NA_POTWIERDZENIE_ZWYCIEZCY" && data.role === "seller" &&
      <Alert tone="info">Czekasz na potwierdzenie zwycięzcy. Kupujący nie powinien jeszcze dokonywać wpłaty.</Alert>}

    {data.status === "UMAWIANIE_SPOTKANIA" &&
      <MeetingPlanner transactionId={data.id} proposals={data.proposals} currentUserId={data.currentUserId} pending={pending} run={run} />}

    {data.status === "SPOTKANIE_ZAPLANOWANE" && !data.readinessConfirmed && <MeetingReadinessChecklist data={data} pending={pending} run={run}/>} 
    {data.status === "SPOTKANIE_ZAPLANOWANE" && data.readinessConfirmed &&
      <Action icon={MapPinIcon} title="Następne działanie: potwierdź obecność" text={`Twoja checklista jest gotowa. ${data.otherPartyReady ? "Druga strona również potwierdziła przygotowanie." : "Druga strona jeszcze uzupełnia checklistę."} Kliknij dopiero po dotarciu do ustalonego, publicznego miejsca.`}>
        <div className="flex flex-wrap items-center gap-3">
          <Button disabled={pending || (data.role === "buyer" ? data.buyerPresence : data.sellerPresence)} onClick={() => run(() => confirmPresenceAction(data.id))}>Jestem na miejscu</Button>
          <Presence buyer={data.buyerPresence} seller={data.sellerPresence} />
        </div>
        <details className="mt-5 border-t border-slate-200 pt-4">
          <summary className="cursor-pointer text-sm font-semibold text-danger">Druga osoba nie pojawiła się</summary>
          <p className="mt-2 text-sm leading-6 text-slate-600">Odczekaj rozsądny czas i spróbuj się skontaktować. Zgłoszenie zmieni status transakcji i trafi do administratora.</p>
          <Button variant="danger" size="sm" className="mt-3" disabled={pending} onClick={() => run(() => markNoShowAction(data.id))}>Zgłoś nieobecność</Button>
        </details>
      </Action>}

    {data.status === "OGLEDZINY" && data.role === "buyer" && <Inspection transactionId={data.id} pending={pending} run={run} />}
    {data.status === "OGLEDZINY" && data.role === "seller" && <Alert tone="info">Kupujący ogląda przedmiot. Nie proś o wpłatę, dopóki nie zaakceptuje stanu rzeczy.</Alert>}

    {data.status === "PRZEDMIOT_ZAAKCEPTOWANY" && data.role === "buyer" &&
      <PaymentChoice data={data} pending={pending} run={run} />}
    {data.status === "PRZEDMIOT_ZAAKCEPTOWANY" && data.role === "seller" &&
      <Alert tone="info">Przedmiot został zaakceptowany. Kupujący wybiera teraz bezpieczną metodę wpłaty. Nie przekazuj przedmiotu przed potwierdzeniem.</Alert>}

    {["OCZEKUJE_NA_PLATNOSC","OCZEKUJE_NA_WERYFIKACJE","PLATNOSC_ODLOZONA","PONOWNY_ODBIOR_WYMAGANY","PROBLEM_Z_PLATNOSCIA"].includes(data.status) &&
      <AlternativePaymentStatus data={data} pending={pending} run={run} />}

    {PAYMENT_FLOW_STATUSES.includes(data.status as typeof PAYMENT_FLOW_STATUSES[number]) &&
      <SiepomagaPaymentStep data={data} pending={pending} run={run} />}

    {data.status === "WPLATA_NIEUDANA" &&
      <Action icon={HandHeartIcon} title="Wpłata nie powiodła się" text="Nie przekazuj przedmiotu. Możecie bezpiecznie rozpocząć nową próbę przez Terminal Siepomaga.">
        <Button disabled={pending} onClick={() => run(() => retrySiepomagaPaymentAction(data.id))}>Spróbuj ponownie</Button>
      </Action>}

    {data.status === "WPLATA_WYMAGA_WYJASNIENIA" &&
      <Alert tone="danger" title="Sprzeczne potwierdzenia wpłaty">Jedna ze stron potwierdziła wpłatę, a następnie zgłoszono problem. Nie przekazuj przedmiotu. Sprawa wymaga weryfikacji administratora.</Alert>}

    {["WPLATA_POTWIERDZONA_OBUSTRONNIE", "PRZEDMIOT_PRZEKAZANY"].includes(data.status) &&
      <HandoverStep data={data} pending={pending} run={run} />}

    {data.status === "ZAKONCZONA_POMYSLNIE" &&
      <RatingStep transactionId={data.id} alreadyRated={data.alreadyRated} pending={pending} run={run} />}

    {data.status === "PRZEDMIOT_NIEZGODNY_Z_OPISEM" &&
      <Alert tone="danger">Przedmiot został odrzucony jako niezgodny z opisem. Nie wykonuj wpłaty. Sprawa wymaga weryfikacji administratora.</Alert>}
    {["NIEOBECNOSC_KUPUJACEGO", "NIEOBECNOSC_WYSTAWIAJACEGO"].includes(data.status) &&
      <Alert tone="warning">Zgłoszono nieobecność jednej ze stron. Sprawę przejrzy administrator; nie wykonuj kolejnych kroków bez nowego ustalenia.</Alert>}
    {data.status === "WPLATA_NIEPOTWIERDZONA" &&
      <Alert tone="warning">Wpłata nie została potwierdzona. Nie przekazuj przedmiotu. Zgłoszenie trafiło do administratora.</Alert>}
    {data.status === "ODMOWA_PRZEKAZANIA" &&
      <Alert tone="danger">Zgłoszono odmowę przekazania przedmiotu po potwierdzeniu wpłaty. Konto i dokumentacja transakcji wymagają pilnej weryfikacji administratora.</Alert>}
    <ProblemCenter transactionId={data.id} pending={pending} run={run} />
  </div>;
}

function Progress({ status }: { status: string }) {
  const paymentStatuses = new Set<string>([
    "PRZEDMIOT_ZAAKCEPTOWANY",
    "OCZEKIWANIE_NA_OTWARCIE_TERMINALU",
    "TERMINAL_OTWARTY",
    "OCZEKIWANIE_NA_BLIK",
    "WPLATA_ZATWIERDZONA_PRZEZ_KUPUJACEGO",
    "WPLATA_POTWIERDZONA_PRZEZ_SPRZEDAJACEGO",
    "WPLATA_NIEUDANA",
    "WPLATA_WYMAGA_WYJASNIENIA",
    "OCZEKUJE_NA_PLATNOSC",
    "OCZEKUJE_NA_WERYFIKACJE",
    "PLATNOSC_ODLOZONA",
    "PONOWNY_ODBIOR_WYMAGANY",
    "PROBLEM_Z_PLATNOSCIA",
  ]);
  const normalized = paymentStatuses.has(status)
    ? "OCZEKUJE_NA_PLATNOSC"
    : ["WPLATA_POTWIERDZONA_OBUSTRONNIE", "PRZEDMIOT_PRZEKAZANY"].includes(status)
      ? "WPLATA_POTWIERDZONA_OBUSTRONNIE"
      : status;
  const current = Math.max(0, FLOW.findIndex(([key]) => key === normalized));
  return <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-4">
    <ol className="flex min-w-[650px] items-center">
      {FLOW.map(([key, label], index) => <li key={key} className="flex flex-1 items-center last:flex-none">
        <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${index <= current ? "bg-brand-800 text-white" : "bg-slate-100 text-slate-400"}`}>
          {index < current ? <CheckIcon size={14} /> : index + 1}
        </span>
        <span className={`ml-2 text-xs font-semibold ${index <= current ? "text-ink" : "text-slate-400"}`}>{label}</span>
        {index < FLOW.length - 1 && <span className={`mx-3 h-px flex-1 ${index < current ? "bg-brand-200" : "bg-slate-200"}`} />}
      </li>)}
    </ol>
  </div>;
}

function Action({ icon: Icon, title, text, children }: { icon: typeof ShieldIcon; title: string; text: string; children: React.ReactNode }) {
  return <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
    <div className="flex gap-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><Icon size={20} /></span>
      <div><h2 className="text-lg font-bold text-ink">{title}</h2><p className="mt-1 text-sm leading-6 text-slate-600">{text}</p></div>
    </div>
    <div className="mt-5">{children}</div>
  </section>;
}

function DonationBoost({ data, pending, run }: { data: TransactionData; pending: boolean; run: Runner }) {
  const required = Number(data.amount);
  const selected = Number(data.plannedDonationAmount);
  const limit = Number(data.paymentLimit);
  const firstExtra = Math.min(limit, Math.ceil((required + 10) / 10) * 10);
  const secondExtra = Math.min(limit, firstExtra + 20);
  const suggestions = [...new Set([required, firstExtra, secondExtra].filter((value) => value >= required && value <= limit))];
  const [custom, setCustom] = useState(String(selected));
  return <section className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-5 sm:p-6">
    <p className="text-xs font-bold uppercase tracking-[.12em] text-emerald-800">Dobrowolnie zwiększ pomoc</p>
    <h2 className="mt-2 text-lg font-bold text-emerald-950">Wylicytowana kwota to {formatMoney(data.amount)}</h2>
    <p className="mt-2 text-sm leading-6 text-emerald-900">Możesz wpłacić dokładnie tę kwotę albo dobrowolnie więcej. Dodatkowa część w całości trafia na oficjalną zbiórkę Adasia w serwisie Siepomaga.pl. Przedmiot nie zależy od dopłaty.</p>
    <div className="mt-4 flex flex-wrap gap-2">{suggestions.map((value)=><button key={value} type="button" disabled={pending} onClick={()=>run(()=>setPlannedDonationAmountAction(data.id,value))} className={`min-h-11 rounded-lg border px-4 text-sm font-bold ${selected===value?"border-emerald-700 bg-emerald-700 text-white":"border-emerald-300 bg-white text-emerald-900 hover:border-emerald-600"}`}>{formatMoney(value)}</button>)}</div>
    <div className="mt-4 flex max-w-sm gap-2"><input aria-label="Własna planowana kwota wpłaty" type="number" min={required} max={limit} step="1" value={custom} onChange={(event)=>setCustom(event.target.value)} className={inputClass}/><Button variant="outline" disabled={pending || !Number.isFinite(Number(custom)) || Number(custom)<required || Number(custom)>limit} onClick={()=>run(()=>setPlannedDonationAmountAction(data.id,Number(custom)))}>Ustaw</Button></div>
    <p className="mt-3 text-xs leading-5 text-emerald-800">Obowiązkowa pozostaje wyłącznie wylicytowana kwota {formatMoney(data.amount)}. Aktualnie wybrana wpłata: <strong>{formatMoney(data.plannedDonationAmount)}</strong>.</p>
  </section>;
}

function PaymentChoice({ data, pending, run }: { data: TransactionData; pending: boolean; run: Runner }) {
  const [emergencyReason, setEmergencyReason] = useState("BRAK_INTERNETU");
  const reasons: Record<string,string> = { BRAK_INTERNETU: "Brak internetu podczas spotkania", BRAK_BLIKA: "Kupujący nie ma BLIK-a ani dostępnej alternatywy", BANK_NIE_DZIALA: "Bank nie działa", SIEPOMAGA_NIE_DZIALA: "Serwis Siepomaga nie działa", TELEFON_ROZLADOWANY: "Telefon jest rozładowany", INNY: "Inny problem techniczny" };
  return <Action icon={HandHeartIcon} title="Jak chcesz dokonać wpłaty?" text={`Do wpłaty: ${formatMoney(data.plannedDonationAmount)}. Każda opcja prowadzi bezpośrednio do Siepomaga; LicytujDobro nie przyjmuje pieniędzy.`}>
    <div className="grid gap-3 sm:grid-cols-2">
      <Choice title="Terminal Siepomaga - BLIK" text="Najlepszy podczas spotkania. Kupujący zatwierdza operację we własnym banku." onClick={() => run(() => choosePaymentFlowAction(data.id,"TERMINAL_BLIK"))} disabled={pending || !data.terminalUrl} />
      <Choice title="Inna metoda przez Siepomaga" text="Karta, szybki przelew, Apple Pay, Google Pay lub PayPal na oficjalnej stronie." onClick={() => run(() => choosePaymentFlowAction(data.id,"SIEPOMAGA_ONLINE"))} disabled={pending || !data.piggyBankUrl} />
      <Choice title="Przelew tradycyjny" text="Przedmiot pozostaje u wystawiającego do zaksięgowania i weryfikacji wpłaty." onClick={() => run(() => choosePaymentFlowAction(data.id,"TRADITIONAL_TRANSFER"))} disabled={pending || !data.piggyBankUrl} />
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4"><p className="font-bold text-ink">Nie możemy teraz wykonać wpłaty</p><p className="mt-2 text-sm leading-6 text-slate-600">Przedmiot pozostaje u wystawiającego. Termin wpłaty zostanie odłożony o 24 godziny.</p><select value={emergencyReason} onChange={(e)=>setEmergencyReason(e.target.value)} className={`${inputClass} mt-3`}>{Object.entries(reasons).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select><Button variant="danger" className="mt-3 w-full" disabled={pending} onClick={()=>run(()=>deferPaymentAction(data.id,reasons[emergencyReason]))}>Odłóż wpłatę - bez przekazania</Button></div>
    </div>
    {!data.terminalUrl && <div className="mt-4"><Alert tone="warning">Terminal jest wyłączony w środowisku testowym albo nie został skonfigurowany.</Alert></div>}
  </Action>;
}
function Choice({title,text,onClick,disabled,danger=false}:{title:string;text:string;onClick:()=>void;disabled:boolean;danger?:boolean}){return <button type="button" disabled={disabled} onClick={onClick} className={`min-h-28 rounded-xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50 ${danger?'border-amber-300 bg-amber-50':'border-slate-200 bg-white hover:border-brand-300'}`}><span className="block font-bold text-ink">{title}</span><span className="mt-2 block text-sm leading-6 text-slate-600">{text}</span></button>}

function AlternativePaymentStatus({data,pending,run}:{data:TransactionData;pending:boolean;run:Runner}){
  const href=data.piggyBankUrl||data.campaignUrl;
  if(data.status==="PLATNOSC_ODLOZONA") return <Action icon={CalendarIcon} title="Wpłata została odłożona" text="Przedmiot pozostaje u wystawiającego. Termin wpłaty wynosi 24 godziny. Po potwierdzeniu strony umawiają krótki ponowny odbiór.">{href!=="#"&&<a href={href} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center rounded-lg bg-brand-800 px-5 text-sm font-semibold text-white">Otwórz oficjalną stronę Siepomaga</a>}<Alert tone="warning">Bez potwierdzonej wpłaty przedmiot nie może zostać przekazany.</Alert></Action>;
  if(data.status==="PROBLEM_Z_PLATNOSCIA") return <Alert tone="danger" title="Proces płatności został zatrzymany">Nie przekazuj przedmiotu. Zgłoszenie jest zapisane i wymaga wyjaśnienia albo ponownej próby.</Alert>;
  if(data.status==="OCZEKUJE_NA_WERYFIKACJE") return <Action icon={ShieldIcon} title="Oczekiwanie na zaksięgowanie" text="Przelew tradycyjny nie jest potwierdzany natychmiast. Przedmiot zostanie wydany dopiero po weryfikacji wpłaty przez administratora.">{href!=="#"&&<a href={href} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center rounded-lg bg-brand-800 px-5 text-sm font-semibold text-white">Dane wpłaty na Siepomaga</a>}<div className="mt-4 grid gap-2 sm:grid-cols-2"><Confirmation label="Kupujący" done={data.buyerDonationConfirmed}/><Confirmation label="Weryfikacja" done={data.sellerDonationConfirmed}/></div></Action>;
  return <Action icon={HandHeartIcon} title="Wpłata na oficjalnej stronie Siepomaga" text={`Wpłać dokładnie ${formatMoney(data.plannedDonationAmount)}. Kupujący i wystawiający potwierdzają osobno. Sam screenshot nie jest wystarczającym dowodem.`}>{href!=="#"&&<a href={href} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center rounded-lg bg-brand-800 px-5 text-sm font-semibold text-white">Przejdź do Siepomaga</a>}<div className="mt-4 rounded-lg border border-slate-200 p-4"><p className="text-sm font-semibold text-ink">{data.role==="buyer"?"Potwierdzam wykonanie wpłaty":"Potwierdzam, że zobaczyłem poprawny wynik operacji"}</p><p className="mt-1 text-xs leading-5 text-slate-500">Sprawdź dokładną kwotę i domenę siepomaga.pl.</p><Button className="mt-3" disabled={pending || (data.role==="buyer"?data.buyerDonationConfirmed:data.sellerDonationConfirmed)} onClick={()=>run(()=>confirmAlternativePaymentAction(data.id))}>{data.role==="buyer"?"Wpłata została wykonana":"Wynik operacji jest poprawny"}</Button></div><div className="mt-4 grid gap-2 sm:grid-cols-2"><Confirmation label="Kupujący" done={data.buyerDonationConfirmed}/><Confirmation label="Wystawiający" done={data.sellerDonationConfirmed}/></div><Button variant="outline" className="mt-4" disabled={pending} onClick={()=>run(()=>deferPaymentAction(data.id,"Wpłata nie mogła zostać zakończona podczas spotkania"))}>Odłóż wpłatę - bez przekazania</Button></Action>;
}

function ProblemCenter({transactionId,pending,run}:{transactionId:string;pending:boolean;run:Runner}){
  const [type,setType]=useState("BRAK_INTERNETU");
  const [note,setNote]=useState("");
  const options=[
    ["BRAK_BLIKA","Nie mam BLIK-a"],["BRAK_INTERNETU","Nie mamy internetu"],["TELEFON_ROZLADOWANY","Telefon jest rozładowany"],["BANK_LUB_SIEPOMAGA","Bank lub Siepomaga nie działa"],
    ["NIEOBECNOSC","Druga osoba nie przyszła"],["PRZEDMIOT_NIEZGODNY","Przedmiot jest niezgodny z opisem"],["WPLATA_NIEWIDOCZNA","Wpłata została wykonana, ale nie jest widoczna"],
    ["ODMOWA_WYDANIA","Sprzedający nie chce wydać przedmiotu"],["PRZELOZENIE","Chcemy przełożyć spotkanie"],["REZYGNACJA_ZWYCIEZCY","Zwycięzca chce zrezygnować"],
    ["BRAK_WPLATY","Nie wykonano wpłaty w terminie"],["BRAK_KONTAKTU","Brak kontaktu z drugą stroną"],["PROBLEM_BEZPIECZENSTWA","Problem bezpieczeństwa"],["INNY","Inny problem"],
  ];
  return <details className="rounded-xl border border-amber-300 bg-amber-50 p-5"><summary className="cursor-pointer font-bold text-amber-950">Mam problem</summary><p className="mt-2 text-sm leading-6 text-amber-900">Zatrzymaj proces i wybierz sytuację. Nie przekazuj przedmiotu ani nie wykonuj płatności poza Siepomaga.</p><select value={type} onChange={e=>setType(e.target.value)} className={`${inputClass} mt-4`}>{options.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select><textarea value={note} onChange={e=>setNote(e.target.value)} className={`${inputClass} mt-3`} rows={3} placeholder="Krótko opisz sytuację i oczekiwane bezpieczne rozwiązanie"/><Button variant="danger" className="mt-3" disabled={pending||note.trim().length<5} onClick={()=>run(()=>reportTransactionProblemAction(transactionId,type,note))}>Zatrzymaj proces i zgłoś problem</Button></details>;
}

function MeetingReadinessChecklist({ data, pending, run }: { data: TransactionData; pending: boolean; run: Runner }) {
  const [phoneCharged, setPhoneCharged] = useState(false);
  const [internetAvailable, setInternetAvailable] = useState(false);
  const [paymentAvailable, setPaymentAvailable] = useState(false);
  const [exactAmountKnown, setExactAmountKnown] = useState(false);
  const [publicPlaceConfirmed, setPublicPlaceConfirmed] = useState(false);
  const [itemPrepared, setItemPrepared] = useState(false);
  const [preferredPayment, setPreferredPayment] = useState<"TERMINAL_BLIK" | "SIEPOMAGA_ONLINE" | "TRADITIONAL_TRANSFER">("TERMINAL_BLIK");
  const ready = data.role === "buyer"
    ? phoneCharged && internetAvailable && paymentAvailable && exactAmountKnown && publicPlaceConfirmed
    : phoneCharged && internetAvailable && exactAmountKnown && publicPlaceConfirmed && itemPrepared;
  return <Action icon={ShieldIcon} title="Przed spotkaniem sprawdź gotowość" text="Ta checklista ogranicza sytuacje, w których dopiero na miejscu okazuje się, że nie można wykonać wpłaty.">
    <div className="grid gap-3 text-sm">
      <CheckRow label="Telefon jest naładowany" checked={phoneCharged} onChange={setPhoneCharged}/>
      <CheckRow label="Mam dostęp do internetu" checked={internetAvailable} onChange={setInternetAvailable}/>
      {data.role === "buyer" && <CheckRow label="Mogę wykonać wybraną płatność" checked={paymentAvailable} onChange={setPaymentAvailable}/>} 
      <CheckRow label={`Znam dokładną kwotę: ${formatMoney(data.plannedDonationAmount)}`} checked={exactAmountKnown} onChange={setExactAmountKnown}/>
      <CheckRow label="Miejsce spotkania jest publiczne" checked={publicPlaceConfirmed} onChange={setPublicPlaceConfirmed}/>
      {data.role === "seller" && <CheckRow label="Przedmiot jest przygotowany do oględzin" checked={itemPrepared} onChange={setItemPrepared}/>} 
    </div>
    {data.role === "buyer" && <label className="mt-5 block text-sm font-semibold text-ink">Planowana metoda wpłaty<select className={`${inputClass} mt-2`} value={preferredPayment} onChange={(e)=>setPreferredPayment(e.target.value as typeof preferredPayment)}><option value="TERMINAL_BLIK">Mam BLIK - Terminal Siepomaga</option><option value="SIEPOMAGA_ONLINE">Inna płatność przez Siepomaga</option><option value="TRADITIONAL_TRANSFER">Przelew tradycyjny - odbiór po zaksięgowaniu</option></select></label>}
    <Button className="mt-5" disabled={pending || !ready} onClick={()=>run(()=>saveMeetingReadinessAction(data.id,{ phoneCharged, internetAvailable, paymentAvailable: data.role === "buyer" ? paymentAvailable : true, exactAmountKnown, publicPlaceConfirmed, itemPrepared: data.role === "seller" ? itemPrepared : true, preferredPayment }))}>Potwierdź gotowość</Button>
  </Action>;
}

function MeetingPlanner({ transactionId, proposals, currentUserId, pending, run }: { transactionId: string; proposals: TransactionData["proposals"]; currentUserId: string; pending: boolean; run: Runner }) {
  const [date, setDate] = useState("");
  const [start, setStart] = useState("17:00");
  const [end, setEnd] = useState("18:00");
  const [location, setLocation] = useState("");
  const [message, setMessage] = useState("");
  const [dateBounds] = useState(() => {
    const now = Date.now();
    return {
      minDate: new Date(now + 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      maxDate: new Date(now + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    };
  });
  const { minDate, maxDate } = dateBounds;
  return <Action icon={CalendarIcon} title="Ustalcie spotkanie" text="Zaproponujcie kilka terminów w ciągu pięciu dni. Propozycję zatwierdza druga strona.">
    <div className="grid gap-4 sm:grid-cols-3">
      <Field label="Data" htmlFor="meeting-date"><input id="meeting-date" type="date" min={minDate} max={maxDate} value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} /></Field>
      <Field label="Od" htmlFor="meeting-start"><input id="meeting-start" type="time" value={start} onChange={(e) => setStart(e.target.value)} className={inputClass} /></Field>
      <Field label="Do" htmlFor="meeting-end"><input id="meeting-end" type="time" value={end} onChange={(e) => setEnd(e.target.value)} className={inputClass} /></Field>
      <div className="sm:col-span-3"><Field label="Publiczne miejsce" htmlFor="meeting-location"><input id="meeting-location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="np. wejście do biblioteki przy ul. ..." className={inputClass} /></Field></div>
      <div className="sm:col-span-3"><Field label="Krótka wiadomość" htmlFor="meeting-message"><textarea id="meeting-message" value={message} onChange={(e) => setMessage(e.target.value)} className={inputClass} rows={2} /></Field></div>
    </div>
    <Button className="mt-4" disabled={pending || !date || location.length < 5 || end <= start} onClick={() => run(() => proposeMeetingAction(transactionId, { date, timeRange: `${start}–${end}`, location, message }))}>Dodaj propozycję</Button>
    <p className="mt-2 text-xs text-slate-500">Dobrą praktyką są co najmniej trzy różne propozycje.</p>
    {proposals.length > 0 && <div className="mt-6">
      <h3 className="text-sm font-bold text-ink">Propozycje terminów</h3>
      <div className="mt-3 divide-y divide-slate-200 border-y border-slate-200">
        {proposals.map((proposal) => <div key={proposal.id} className="grid gap-3 py-4 sm:grid-cols-[1fr_auto]">
          <div>
            <p className="font-semibold text-ink">{new Date(`${proposal.date}T12:00:00`).toLocaleDateString("pl-PL", { weekday: "long", day: "numeric", month: "long" })}, {proposal.timeRange}</p>
            <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-slate-600"><MapPinIcon size={15} />{proposal.location}</p>
            <p className="mt-1 text-xs text-slate-500">Proponuje: {proposal.proposerNickname}</p>
            {proposal.message && <p className="mt-2 text-sm text-slate-600">{proposal.message}</p>}
          </div>
          {proposal.proposedBy !== currentUserId && <Button size="sm" disabled={pending} onClick={() => run(() => chooseMeetingAction(proposal.id))}>Wybieram</Button>}
        </div>)}
      </div>
    </div>}
  </Action>;
}

function Inspection({ transactionId, pending, run }: { transactionId: string; pending: boolean; run: Runner }) {
  const checks = [
    "To jest właściwy przedmiot.",
    "Stan zgadza się ze zdjęciami i opisem.",
    "Znam wszystkie wskazane wady.",
    "Przedmiot jest kompletny.",
    "Akceptuję stan przedmiotu.",
    "Rozumiem, że cofnięcie wpłaty na zbiórkę może być niemożliwe.",
  ];
  const [accepted, setAccepted] = useState<boolean[]>(checks.map(() => false));
  const [reason, setReason] = useState("OPIS_NIEZGODNY");
  const [comment, setComment] = useState("");
  const all = accepted.every(Boolean);
  return <Action icon={EyeIcon} title="Oględziny przedmiotu" text="Sprawdź rzecz dokładnie. Wpłata pozostaje zablokowana do momentu zaakceptowania wszystkich punktów.">
    <div className="divide-y divide-slate-100 border-y border-slate-100">
      {checks.map((label, index) => <label key={label} className="flex cursor-pointer gap-3 py-3 text-sm leading-6 text-slate-700">
        <input type="checkbox" checked={accepted[index]} onChange={(event) => setAccepted((values) => values.map((value, current) => current === index ? event.target.checked : value))} className="mt-1 h-4 w-4 accent-brand-700" />{label}
      </label>)}
    </div>
    <Button className="mt-5" disabled={pending || !all} onClick={() => run(() => acceptItemAction(transactionId))}>Akceptuję i przechodzę dalej</Button>
    <details className="mt-5 rounded-lg border border-red-200 bg-red-50/40 p-4">
      <summary className="cursor-pointer font-semibold text-danger">Przedmiot jest niezgodny z opisem</summary>
      <select value={reason} onChange={(event) => setReason(event.target.value)} className={`${inputClass} mt-4`}>
        <option value="INNY_PRZEDMIOT">Inny przedmiot</option><option value="USZKODZENIE">Istotne uszkodzenie</option><option value="BRAK_ELEMENTOW">Brak elementów</option><option value="OPIS_NIEZGODNY">Opis niezgodny</option><option value="PODROBKA">Podejrzenie podróbki</option><option value="INNE">Inny problem</option>
      </select>
      <textarea value={comment} onChange={(event) => setComment(event.target.value)} className={`${inputClass} mt-3`} placeholder="Opisz problem" rows={3} />
      <Button variant="danger" className="mt-3" disabled={pending || (reason === "INNE" && comment.trim().length < 10)} onClick={() => run(() => rejectItemAction(transactionId, reason, comment))}>Odrzucam przedmiot - bez wpłaty</Button>
    </details>
  </Action>;
}

function SiepomagaPaymentStep({ data, pending, run }: { data: TransactionData; pending: boolean; run: Runner }) {
  const [sellerOpenedChecks, setSellerOpenedChecks] = useState([false, false]);
  const [sellerChecks, setSellerChecks] = useState([false, false, false, false]);
  const [buyerChecks, setBuyerChecks] = useState([false, false, false]);
  const [problem, setProblem] = useState("");
  const terminalHref = data.terminalUrl || data.piggyBankUrl || data.campaignUrl;

  return <Action icon={HandHeartIcon} title="Wpłata przez Terminal Siepomaga" text="Kod BLIK podajesz wyłącznie w Terminalu Siepomaga. LicytujDobro nie prosi o kod, nie przesyła go i nie zapisuje.">
    <div className="mt-4 grid gap-4 rounded-lg border border-brand-200 bg-brand-50 p-4 sm:grid-cols-3">
      <Info label="Do wpłaty" value={formatMoney(data.plannedDonationAmount)} strong />
      <Info label="Operator" value="Siepomaga" />
      <Info label="Numer transakcji" value={data.donationCode} mono />
    </div>
    <p className="mt-3 text-xs leading-5 text-slate-500">Limit skonfigurowany dla Terminalu: {formatMoney(data.paymentLimit)}. Pieniądze nie trafiają na konto wystawiającego ani LicytujDobro.</p>

    {data.status === "OCZEKIWANIE_NA_OTWARCIE_TERMINALU" && data.role === "seller" && <div className="mt-5">
      <ol className="space-y-3 text-sm leading-6 text-slate-700">
        <li><strong>1.</strong> Otwórz Terminal Siepomaga na swoim urządzeniu.</li>
        <li><strong>2.</strong> Wpisz dokładnie {formatMoney(data.plannedDonationAmount)}.</li>
        <li><strong>3.</strong> Nie wpisuj ani nie zapisuj kodu BLIK w LicytujDobro.</li>
      </ol>
      <a href={terminalHref} target="_blank" rel="noreferrer" className="mt-4 inline-flex min-h-12 items-center justify-center rounded-lg bg-brand-800 px-5 text-sm font-semibold text-white hover:bg-brand-700">Otwórz Terminal Siepomaga</a>
      <div className="mt-4 space-y-2">
        {[
          "Terminal jest otwarty na moim urządzeniu.",
          `Widzę pole kwoty i wpiszę dokładnie ${formatMoney(data.plannedDonationAmount)}.`,
        ].map((label, index) => <CheckRow key={label} label={label} checked={sellerOpenedChecks[index]} onChange={(checked) => setSellerOpenedChecks((values) => values.map((value, current) => current === index ? checked : value))} />)}
      </div>
      <Button className="mt-4" disabled={pending || !sellerOpenedChecks.every(Boolean)} onClick={() => run(() => markTerminalOpenedAction(data.id))}>Terminal został otwarty</Button>
    </div>}

    {data.status === "OCZEKIWANIE_NA_OTWARCIE_TERMINALU" && data.role === "buyer" && <Alert tone="info" title="Poczekaj na wystawiającego">Wystawiający otwiera Terminal Siepomaga i wpisuje zwycięską kwotę. Nie generuj jeszcze kodu BLIK.</Alert>}

    {data.status === "TERMINAL_OTWARTY" && data.role === "seller" && <div className="mt-5">
      <Alert tone="info" title="Wpisz zwycięską kwotę">W Terminalu Siepomaga wpisz dokładnie {formatMoney(data.plannedDonationAmount)}. Następnie poproś kupującego o wygenerowanie kodu BLIK.</Alert>
      <Button className="mt-4" disabled={pending} onClick={() => run(() => markWaitingForBlikAction(data.id))}>Kwota wpisana - czekamy na BLIK</Button>
    </div>}
    {data.status === "TERMINAL_OTWARTY" && data.role === "buyer" && <Alert tone="info">Wystawiający wpisuje kwotę w Terminalu Siepomaga. Kod BLIK generuj dopiero po jego prośbie.</Alert>}

    {["OCZEKIWANIE_NA_BLIK", "WPLATA_ZATWIERDZONA_PRZEZ_KUPUJACEGO", "WPLATA_POTWIERDZONA_PRZEZ_SPRZEDAJACEGO"].includes(data.status) && <div className="mt-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-lg border border-slate-200 p-4">
          <h3 className="font-bold text-ink">Potwierdzenie kupującego</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">Kupujący potwierdza operację wyłącznie po komunikacie banku.</p>
          <div className="mt-3 space-y-2">
            {[
              `Zatwierdziłem wpłatę ${formatMoney(data.plannedDonationAmount)} w aplikacji bankowej.`,
              "W aplikacji bankowej odbiorcą było Siepomaga.pl.",
              "Bank potwierdził przyjęcie płatności.",
            ].map((label, index) => <CheckRow key={label} label={label} checked={buyerChecks[index]} disabled={data.role !== "buyer" || data.buyerDonationConfirmed} onChange={(checked) => setBuyerChecks((values) => values.map((value, current) => current === index ? checked : value))} />)}
          </div>
          {data.role === "buyer" && <Button className="mt-4" disabled={pending || data.buyerDonationConfirmed || !buyerChecks.every(Boolean)} onClick={() => run(() => confirmBuyerSiepomagaDonationAction(data.id))}>{data.buyerDonationConfirmed ? "Potwierdzenie zapisane" : "Potwierdzam wpłatę w banku"}</Button>}
          <div className="mt-3"><Confirmation label="Kupujący" done={data.buyerDonationConfirmed} /></div>
        </section>

        <section className="rounded-lg border border-slate-200 p-4">
          <h3 className="font-bold text-ink">Potwierdzenie wystawiającego</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">Wystawiający potwierdza wyłącznie komunikat widoczny bezpośrednio w Terminalu Siepomaga.</p>
          <div className="mt-3 space-y-2">
            {[
              "Terminal Siepomaga pokazał powodzenie transakcji.",
              `Kwota w Terminalu wynosiła dokładnie ${formatMoney(data.plannedDonationAmount)}.`,
              "Kupujący zatwierdził operację na swoim telefonie.",
              "Nie korzystam ze screenshotu ani PDF jako dowodu.",
            ].map((label, index) => <CheckRow key={label} label={label} checked={sellerChecks[index]} disabled={data.role !== "seller" || data.sellerDonationConfirmed} onChange={(checked) => setSellerChecks((values) => values.map((value, current) => current === index ? checked : value))} />)}
          </div>
          {data.role === "seller" && <Button className="mt-4" disabled={pending || data.sellerDonationConfirmed || !sellerChecks.every(Boolean)} onClick={() => run(() => confirmSellerSiepomagaDonationAction(data.id))}>{data.sellerDonationConfirmed ? "Potwierdzenie zapisane" : "Terminal pokazał powodzenie"}</Button>}
          <div className="mt-3"><Confirmation label="Wystawiający" done={data.sellerDonationConfirmed} /></div>
        </section>
      </div>
      <Alert tone="warning" title="Przedmiot nadal jest zablokowany">Kod przekazania powstanie dopiero wtedy, gdy kupujący i wystawiający niezależnie potwierdzą powodzenie wpłaty.</Alert>
    </div>}

    <details className="mt-5 border-t border-slate-200 pt-4">
      <summary className="cursor-pointer text-sm font-semibold text-danger">Płatność nie powiodła się lub komunikaty są sprzeczne</summary>
      <p className="mt-2 text-sm leading-6 text-slate-600">Nie przekazuj przedmiotu. Opisz problem. Jeśli jedna ze stron zdążyła już potwierdzić wpłatę, sprawa zostanie skierowana do administratora.</p>
      <textarea value={problem} onChange={(event) => setProblem(event.target.value)} className={`${inputClass} mt-3`} rows={3} placeholder="Np. bank odrzucił płatność albo Terminal nie pokazał powodzenia" />
      <Button variant="danger" size="sm" className="mt-3" disabled={pending || problem.trim().length < 5} onClick={() => run(() => markSiepomagaPaymentProblemAction(data.id, problem))}>Zapisz problem - bez przekazania</Button>
    </details>
  </Action>;
}

function HandoverStep({ data, pending, run }: { data: TransactionData; pending: boolean; run: Runner }) {
  const [enteredCode, setEnteredCode] = useState("");
  const [shownCode, setShownCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [generating, startGenerating] = useTransition();
  const mine = data.role === "buyer" ? data.buyerHandover : data.sellerHandover;

  const generate = () => startGenerating(async () => {
    setLocalError(null);
    const result = await generateHandoverCodeAction(data.id);
    if (!result.ok || !result.code) {
      setLocalError(result.error ?? "Nie udało się wygenerować kodu.");
      return;
    }
    setShownCode(result.code);
    setExpiresAt(result.expiresAt ?? null);
  });

  return <Action icon={PackageIcon} title="Przekazanie przedmiotu" text="Po wpłacie wystawiający generuje jednorazowy kod. Kupujący wpisuje go na swoim urządzeniu, a wystawiający potwierdza fizyczne wydanie rzeczy.">
    <div className="mb-4 grid gap-2 text-sm sm:grid-cols-2"><Confirmation label="Wpłata - kupujący" done={data.buyerDonationConfirmed} /><Confirmation label="Wpłata - wystawiający" done={data.sellerDonationConfirmed} /></div>
    {localError && <div className="mb-4"><Alert tone="danger">{localError}</Alert></div>}

    {data.role === "seller" && !data.buyerHandover && <section className="rounded-lg border border-brand-200 bg-brand-50 p-4">
      <h3 className="font-bold text-ink">Jednorazowy kod dla kupującego</h3>
      <p className="mt-1 text-sm leading-6 text-slate-600">Wygeneruj kod dopiero wtedy, gdy trzymasz przedmiot i jesteście gotowi do natychmiastowego przekazania. Kod działa przez 15 minut i nie jest zapisywany jawnie.</p>
      <Button className="mt-4" disabled={pending || generating} onClick={generate}>{generating ? "Generowanie…" : shownCode ? "Wygeneruj nowy kod" : "Wygeneruj kod przekazania"}</Button>
      {shownCode && <div className="mt-4 rounded-lg border border-brand-200 bg-white p-4 text-center"><p className="text-xs font-bold uppercase tracking-[.1em] text-slate-500">Pokaż kupującemu</p><p className="mt-2 font-mono text-3xl font-bold tracking-[.22em] text-brand-800">{shownCode.slice(0,3)} {shownCode.slice(3)}</p>{expiresAt && <p className="mt-2 text-xs text-slate-500">Ważny do {new Date(expiresAt).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}</p>}</div>}
    </section>}

    {data.role === "buyer" && !data.buyerHandover && <section className="rounded-lg border border-slate-200 p-4">
      <h3 className="font-bold text-ink">Potwierdź odbiór kodem</h3>
      <p className="mt-1 text-sm leading-6 text-slate-600">Wpisz sześciocyfrowy kod pokazany przez wystawiającego dopiero w chwili fizycznego odbioru przedmiotu.</p>
      <input inputMode="numeric" maxLength={7} value={enteredCode} onChange={(event) => setEnteredCode(event.target.value.replace(/[^0-9 ]/g, ""))} className={`${inputClass} mt-4 font-mono text-lg tracking-widest`} placeholder="000 000" />
      <Button className="mt-4" disabled={pending || enteredCode.replace(/\s/g, "").length !== 6} onClick={() => run(() => confirmHandoverAction(data.id, enteredCode))}>Otrzymałem przedmiot</Button>
    </section>}

    {data.role === "seller" && data.buyerHandover && !data.sellerHandover && <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
      <h3 className="font-bold text-emerald-950">Kupujący potwierdził odbiór kodem</h3>
      <p className="mt-1 text-sm leading-6 text-emerald-900">Potwierdź, że przedmiot został faktycznie wydany kupującemu.</p>
      <Button className="mt-4" disabled={pending} onClick={() => run(() => confirmHandoverAction(data.id))}>Potwierdzam wydanie przedmiotu</Button>
    </section>}

    <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2"><Confirmation label="Odbiór kupującego" done={data.buyerHandover} /><Confirmation label="Wydanie wystawiającego" done={data.sellerHandover} /></div>
    {data.role === "buyer" && !data.buyerHandover && <details className="mt-5 border-t border-red-200 pt-4">
      <summary className="cursor-pointer text-sm font-semibold text-danger">Wpłaciłem, ale nie otrzymałem przedmiotu</summary>
      <p className="mt-2 text-sm leading-6 text-slate-600">Użyj tej opcji tylko wtedy, gdy wpłata została obustronnie potwierdzona, a wystawiający odmawia przekazania rzeczy.</p>
      <Button variant="danger" size="sm" className="mt-3" disabled={pending} onClick={() => run(() => reportRefusalAfterDonationAction(data.id))}>Zgłoś krytyczny problem</Button>
    </details>}
  </Action>;
}

function RatingStep({ transactionId, alreadyRated, pending, run }: { transactionId: string; alreadyRated: boolean; pending: boolean; run: Runner }) {
  const [stars, setStars] = useState(5);
  const [preset, setPreset] = useState("Wszystko przebiegło sprawnie");
  const presets=["Wszystko przebiegło sprawnie","Dobry kontakt","Punktualne spotkanie","Przedmiot zgodny z opisem","Proces wymagał pomocy administratora"];
  if (alreadyRated) return <Alert tone="success">Transakcja zakończona, a Twoja ocena została zapisana.</Alert>;
  return <Action icon={CheckIcon} title="Transakcja zakończona" text="Oceń przebieg za pomocą gwiazdek i jednego gotowego określenia. Nie publikujemy swobodnych komentarzy bez moderacji.">
    <div className="flex gap-2">{[1, 2, 3, 4, 5].map((value) => <button type="button" key={value} onClick={() => setStars(value)} className={`flex h-10 w-10 items-center justify-center rounded-lg border ${value <= stars ? "border-amber-300 bg-amber-50 text-amber-600" : "border-slate-200 text-slate-300"}`} aria-label={`Ocena ${value}`}><StarIcon size={18} className={value <= stars ? "fill-amber-400" : ""} /></button>)}</div>
    <label className="mt-4 block text-sm font-semibold text-ink">Krótkie podsumowanie<select value={preset} onChange={(event)=>setPreset(event.target.value)} className={`${inputClass} mt-2`}>{presets.map((value)=><option key={value}>{value}</option>)}</select></label>
    <Button className="mt-4" disabled={pending} onClick={() => run(() => rateTransactionAction(transactionId, stars, preset))}>Zapisz ocenę</Button>
  </Action>;
}

function CheckRow({ label, checked, disabled = false, onChange }: { label: string; checked: boolean; disabled?: boolean; onChange: (checked: boolean) => void }) {
  return <label className={`flex gap-3 text-sm leading-6 ${disabled ? "text-slate-400" : "text-slate-700"}`}>
    <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} className="mt-1 h-4 w-4 accent-brand-700" />{label}
  </label>;
}

function Info({ label, value, strong = false, mono = false }: { label: string; value: string; strong?: boolean; mono?: boolean }) {
  return <div><p className="text-xs uppercase tracking-[.08em] text-slate-500">{label}</p><p className={`mt-1 text-brand-800 ${strong ? "text-2xl font-bold" : "text-sm font-semibold"} ${mono ? "font-mono" : ""}`}>{value}</p></div>;
}

function Presence({ buyer, seller }: { buyer: boolean; seller: boolean }) {
  return <div className="flex gap-2 text-xs"><Confirmation label="Kupujący" done={buyer} /><Confirmation label="Wystawiający" done={seller} /></div>;
}

function Confirmation({ label, done }: { label: string; done: boolean }) {
  return <span className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 ${done ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-slate-50 text-slate-500"}`}>{done && <CheckIcon size={13} />} {label}: {done ? "potwierdzone" : "oczekuje"}</span>;
}
