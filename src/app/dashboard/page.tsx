import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { auctions, categories, categoryInterests, listings, notifications, supportTeams, teamMemberships, transactions, watchlists } from "@/db/schema";
import { desc, eq, or } from "drizzle-orm";
import { getCurrentUser, isFullyVerified } from "@/lib/auth";
import { Alert, Badge, Card, EmptyState, LinkButton } from "@/components/ui";
import { BellIcon, CheckIcon, ClockIcon, GavelIcon, MailIcon, PackageIcon, PlusIcon, ShieldIcon } from "@/components/icons";
import { formatMoney } from "@/lib/auction-logic";
import { markAllNotificationsReadAction } from "@/actions/misc";
import { updateWatchPreferencesAction } from "@/actions/growth";
import { InterestPreferences, JoinTeamForm } from "@/components/growth-widgets";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/logowanie");
  const [myListings,myTransactions,notes,watched,allCategories,interestRows,currentTeamRows] = await Promise.all([
    db.select({ listing:listings,auction:auctions }).from(listings).leftJoin(auctions,eq(auctions.listingId,listings.id)).where(eq(listings.userId,user.id)).orderBy(desc(listings.updatedAt)),
    db.select().from(transactions).where(or(eq(transactions.winnerId,user.id),eq(transactions.sellerId,user.id))).orderBy(desc(transactions.updatedAt)),
    db.select().from(notifications).where(eq(notifications.userId,user.id)).orderBy(desc(notifications.createdAt)).limit(20),
    db.select({ listingId:watchlists.listingId,title:listings.title,notifyNewBid:watchlists.notifyNewBid,notify24h:watchlists.notify24h,notify1h:watchlists.notify1h }).from(watchlists).innerJoin(listings,eq(listings.id,watchlists.listingId)).where(eq(watchlists.userId,user.id)),
    db.select({ id:categories.id,name:categories.name }).from(categories).where(eq(categories.isAllowed,true)).orderBy(categories.name),
    db.select({ categoryId:categoryInterests.categoryId }).from(categoryInterests).where(eq(categoryInterests.userId,user.id)),
    db.select({ team:supportTeams }).from(teamMemberships).innerJoin(supportTeams,eq(supportTeams.id,teamMemberships.teamId)).where(eq(teamMemberships.userId,user.id)).limit(1),
  ]);
  const attention=myTransactions.filter((t)=>!["ZAKONCZONA_POMYSLNIE","ANULOWANA"].includes(t.status));
  const activeListings=myListings.filter(({listing})=>listing.status==="AKTYWNA").length;
  const completed=myTransactions.filter((t)=>t.status==="ZAKONCZONA_POMYSLNIE").length;
  const unread=notes.filter((n)=>!n.isRead).length;

  return <main className="page-shell py-10">
    <div className="flex flex-wrap items-end justify-between gap-5 border-b border-slate-200 pb-7">
      <div><p className="text-xs font-bold uppercase tracking-[.14em] text-brand-600">Twoje konto</p><h1 className="mt-2 text-3xl font-bold tracking-[-.03em] text-ink">Dzień dobry, {user.firstName}</h1><p className="mt-2 text-sm text-slate-600">Najważniejsze aukcje, wiadomości i osobiste odbiory w jednym miejscu.</p></div>
      <div className="flex flex-wrap gap-2"><LinkButton href="/wiadomosci" variant="outline"><MailIcon size={16}/> Wiadomości</LinkButton><LinkButton href="/dodaj-przedmiot"><PlusIcon size={16}/> Wystaw przedmiot</LinkButton></div>
    </div>

    {!isFullyVerified(user)&&<div className="mt-6"><Alert tone="warning" title="Dokończ weryfikację">Potwierdź wymagany kontakt przed pierwszą ofertą lub wystawieniem przedmiotu. <Link href="/weryfikacja" className="font-bold underline">Przejdź do weryfikacji</Link>.</Alert></div>}

    <section className="mt-7 grid grid-cols-2 gap-4 border-b border-slate-200 pb-7 lg:grid-cols-4">
      <Summary icon={PackageIcon} label="Aktywne aukcje" value={activeListings}/><Summary icon={GavelIcon} label="Odbiory w toku" value={attention.length}/><Summary icon={CheckIcon} label="Zakończone" value={completed}/><Summary icon={BellIcon} label="Nieprzeczytane" value={unread}/>
    </section>

    <section className="mt-9">
      <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-800"><ClockIcon size={18}/></span><div><h2 className="text-xl font-bold text-ink">Moje wygrane i odbiory</h2><p className="text-sm text-slate-500">Po zakończeniu licytacji wpłacasz bezpośrednio na zbiórkę i kontaktujesz się z drugą stroną.</p></div></div>
      {attention.length?<div className="mt-5 divide-y divide-slate-200 border-y border-slate-200">{attention.map((t)=><div key={t.id} className="grid gap-4 py-5 sm:grid-cols-[1fr_auto] sm:items-center"><div><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-ink">{t.winnerId === user.id ? "Wygrany przedmiot" : "Przedmiot do przekazania"}</p><Badge tone={t.status === "ZAKONCZONA_POMYSLNIE" ? "success" : "warning"}>{simpleTransferStatus(t.status)}</Badge></div><p className="mt-1 text-sm text-slate-600">Zadeklarowana kwota: {formatMoney(t.plannedDonationAmount ?? t.amount)} · zaktualizowano {t.updatedAt.toLocaleString("pl-PL")}</p></div><div className="flex flex-wrap gap-2"><LinkButton href={`/wiadomosci/${t.id}`} size="sm" variant="outline"><MailIcon size={15}/> Wiadomości</LinkButton><LinkButton href={`/transakcje/${t.id}`} size="sm">Zobacz szczegóły</LinkButton></div></div>)}</div>:<div className="mt-5"><EmptyState title="Wszystko załatwione" description="Nie masz teraz transakcji wymagających działania."/></div>}
    </section>

    <section className="mt-11">
      <div className="flex items-center justify-between"><h2 className="text-xl font-bold text-ink">Moje ogłoszenia</h2><Link href="/dodaj-przedmiot" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700"><PlusIcon size={15}/> Dodaj nowe</Link></div>
      {myListings.length?<div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white"><div className="divide-y divide-slate-100">{myListings.map(({listing,auction})=><div key={listing.id} className="grid gap-4 p-4 sm:grid-cols-[1fr_auto] sm:items-center"><div><Link href={["AKTYWNA","ZAKONCZONA"].includes(listing.status)?`/aukcje/${listing.id}`:`/dodaj-przedmiot?listingId=${listing.id}`} className="font-semibold text-ink hover:text-brand-700">{listing.title}</Link><p className="mt-1 text-sm text-slate-500">{humanStatus(listing.status)}{auction?` · ${formatMoney(auction.currentPrice)}`:""}</p>{listing.moderationNote&&<p className="mt-2 text-sm text-amber-800">Uwaga moderatora: {listing.moderationNote}</p>}</div><div className="flex items-center gap-2"><Badge tone={listing.status==="AKTYWNA"?"success":listing.status==="WYMAGA_POPRAWY"?"warning":"neutral"}>{humanStatus(listing.status)}</Badge>{["SZKIC","WYMAGA_POPRAWY"].includes(listing.status)&&<LinkButton href={`/dodaj-przedmiot?listingId=${listing.id}`} size="sm" variant="outline">Edytuj</LinkButton>}</div></div>)}</div></div>:<div className="mt-4"><EmptyState title="Nie masz ogłoszeń" description="Wystaw prosty przedmiot i przekaż wartość jego licytacji na zbiórkę." action={<LinkButton href="/dodaj-przedmiot">Wystaw przedmiot</LinkButton>}/></div>}
    </section>

    <section className="mt-11 grid gap-6 lg:grid-cols-2">
      <Card className="p-5"><div className="flex items-center gap-3"><PackageIcon size={19} className="text-brand-700"/><h2 className="text-lg font-bold">Obserwowane aukcje</h2></div>{watched.length?<ul className="mt-4 divide-y divide-slate-100">{watched.map((w)=><li key={w.listingId} className="py-4"><Link href={`/aukcje/${w.listingId}`} className="text-sm font-semibold text-ink hover:text-brand-700">{w.title}</Link><form action={updateWatchPreferencesAction.bind(null,w.listingId)} className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-3"><label className="flex items-center gap-2"><input type="checkbox" name="notifyNewBid" defaultChecked={w.notifyNewBid} className="accent-brand-700"/>nowa oferta</label><label className="flex items-center gap-2"><input type="checkbox" name="notify24h" defaultChecked={w.notify24h} className="accent-brand-700"/>24 h przed końcem</label><label className="flex items-center gap-2"><input type="checkbox" name="notify1h" defaultChecked={w.notify1h} className="accent-brand-700"/>1 h przed końcem</label><button className="mt-1 justify-self-start text-xs font-semibold text-brand-700 sm:col-span-3">Zapisz przypomnienia</button></form></li>)}</ul>:<p className="mt-4 text-sm text-slate-500">Brak obserwowanych aukcji.</p>}</Card>
      <Card className="p-5"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><BellIcon size={19} className="text-brand-700"/><h2 className="text-lg font-bold">Powiadomienia</h2></div>{notes.some((n)=>!n.isRead)&&<form action={async () => { "use server"; await markAllNotificationsReadAction(); }}><button className="text-xs font-semibold text-brand-700">Oznacz przeczytane</button></form>}</div>{notes.length?<ul className="mt-4 max-h-96 divide-y divide-slate-100 overflow-auto">{notes.map((n)=><li key={n.id} className={`py-3 text-sm ${n.isRead?"":"font-medium"}`}><p className="text-ink">{n.title}</p><p className="mt-1 text-xs leading-5 text-slate-500">{n.body}</p></li>)}</ul>:<p className="mt-4 text-sm text-slate-500">Brak powiadomień.</p>}</Card>
    </section>

    <section className="mt-11 grid gap-6 lg:grid-cols-2"><Card className="p-5"><h2 className="text-lg font-bold text-ink">Kategorie, które Cię interesują</h2><p className="mt-2 text-sm leading-6 text-slate-600">Po publikacji nowej aukcji w wybranej kategorii zobaczysz powiadomienie.</p><div className="mt-4"><InterestPreferences categories={allCategories} selectedIds={interestRows.map((row)=>row.categoryId)}/></div></Card><Card className="p-5"><h2 className="text-lg font-bold text-ink">Twoja drużyna</h2><p className="mt-2 text-sm leading-6 text-slate-600">Dołącz do szkoły, firmy, klubu lub grupy znajomych i budujcie wspólny wynik dla Adasia.</p><div className="mt-4"><JoinTeamForm currentTeamName={currentTeamRows[0]?.team.name}/></div><Link href="/druzyny" className="mt-4 inline-flex text-sm font-semibold text-brand-700">Zobacz wszystkie drużyny →</Link></Card></section>

    <section className="mt-11 rounded-xl border border-brand-200 bg-brand-50/60 p-5"><div className="flex gap-3"><ShieldIcon size={20} className="mt-0.5 shrink-0 text-brand-700"/><div><h2 className="font-bold text-ink">Jak wygląda finał licytacji?</h2><p className="mt-1 text-sm leading-6 text-slate-600">Zwycięzca wpłaca zadeklarowaną kwotę bezpośrednio na oficjalną zbiórkę, kontaktuje się z wystawiającym i ustala osobisty odbiór. LicytujDobro nie przyjmuje ani nie weryfikuje wpłat.</p></div></div></section>
  </main>;
}

function Summary({ icon:Icon,label,value }: { icon:typeof PackageIcon;label:string;value:number }) { return <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><Icon size={19}/></span><div><p className="text-xl font-bold text-ink">{value}</p><p className="text-xs text-slate-500">{label}</p></div></div>; }
function humanStatus(value:string){return value.toLowerCase().replaceAll("_"," ").replace(/^./,(m)=>m.toUpperCase());}
function simpleTransferStatus(value:string){
  if(value==="ZAKONCZONA_POMYSLNIE") return "Odebrany";
  if(value==="ANULOWANA") return "Anulowany";
  if(value==="SPOR") return "Zgłoszono problem";
  return "Ustalanie odbioru";
}
