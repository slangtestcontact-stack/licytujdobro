import Image from "next/image";
import Link from "next/link";
import { db } from "@/db";
import { auctions, backupRuns, campaigns, listingPhotos, listings, reports, transactionCancellations, transactions, users } from "@/db/schema";
import { and, desc, eq, count, isNull, lt } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { Badge, Card, EmptyState } from "@/components/ui";
import { CancellationControls, ModerationControls, SiepomagaCampaignControls, SpecialListingControls, UserStatusControls } from "@/components/admin-controls";
import { ClockIcon, FlagIcon, GavelIcon, ShieldIcon, UsersIcon } from "@/components/icons";
import { formatMoney } from "@/lib/auction-logic";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireAdmin();
  const [pending,activeListingsRows,userRows,reportRows,transactionRows,[{activeCount}],[{userCount}],[activeCampaign],cancellationRows,[lastBackup]] = await Promise.all([
    db.select({ listing:listings,auction:auctions,owner:users }).from(listings).innerJoin(users,eq(users.id,listings.userId)).leftJoin(auctions,eq(auctions.listingId,listings.id)).where(eq(listings.status,"OCZEKUJE_NA_MODERACJE")).orderBy(listings.submittedAt),
    db.select({ listing:listings, auction:auctions }).from(listings).innerJoin(auctions,eq(auctions.listingId,listings.id)).where(eq(listings.status,"AKTYWNA")).orderBy(desc(auctions.startAt)).limit(20),
    db.select().from(users).orderBy(desc(users.createdAt)).limit(30),
    db.select().from(reports).orderBy(desc(reports.createdAt)).limit(20),
    db.select().from(transactions).orderBy(desc(transactions.updatedAt)).limit(20),
    db.select({activeCount:count()}).from(auctions).where(eq(auctions.status,"AKTYWNA")),
    db.select({userCount:count()}).from(users),
    db.select().from(campaigns).where(eq(campaigns.isActive,true)).limit(1),
    db.select().from(transactionCancellations).where(isNull(transactionCancellations.resolvedAt)).orderBy(desc(transactionCancellations.createdAt)).limit(30),
    db.select().from(backupRuns).where(eq(backupRuns.status,"SUCCESS")).orderBy(desc(backupRuns.finishedAt)).limit(1),
  ]);
  const openReports=reportRows.filter((r)=>r.status==="NOWE").length;
  const openTransactions=transactionRows.filter((t)=>!["ZAKONCZONA_POMYSLNIE","ANULOWANA"].includes(t.status)).length;
  const handoverIssues=transactionRows.filter((t)=>["SPOR","ODMOWA_PRZEKAZANIA","NIEOBECNOSC_KUPUJACEGO","NIEOBECNOSC_WYSTAWIAJACEGO"].includes(t.status)).length;
  // eslint-disable-next-line react-hooks/purity -- zapytanie serwerowe wymaga ruchomej granicy czasu.
  const noBidCutoff=new Date(Date.now()-5*24*60*60*1000);
  const [{oldNoBidCount}]=await db.select({oldNoBidCount:count()}).from(auctions).where(and(eq(auctions.status,"AKTYWNA"),eq(auctions.bidCount,0),lt(auctions.startAt,noBidCutoff)));

  return <main className="page-shell py-10">
    <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
      <aside className="lg:sticky lg:top-24 lg:self-start"><p className="text-xs font-bold uppercase tracking-[.14em] text-brand-600">Administracja</p><h1 className="mt-2 text-2xl font-bold tracking-[-.025em] text-ink">Panel operatora</h1><nav className="mt-6 divide-y divide-slate-200 border-y border-slate-200 text-sm"><AdminLink href="#moderacja" label="Moderacja"/><AdminLink href="#aukcje-specjalne" label="Aukcje specjalne"/><AdminLink href="#zgloszenia" label="Zgłoszenia"/><AdminLink href="#uzytkownicy" label="Użytkownicy"/><AdminLink href="#transakcje" label="Transakcje"/><AdminLink href="/admin/spolecznosc" label="Społeczność i promocja"/><AdminLink href="#siepomaga" label="Siepomaga"/><AdminLink href="/admin/system" label="Stan systemu i eksport"/></nav><div className="mt-6 rounded-lg border border-brand-200 bg-brand-50 p-4"><ShieldIcon size={20} className="text-brand-700"/><p className="mt-3 text-xs leading-5 text-slate-600">Każda decyzja moderatora powinna zawierać uzasadnienie i pozostawać w dzienniku audytowym.</p></div></aside>

      <div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4"><Metric icon={ClockIcon} label="Do moderacji" value={pending.length}/><Metric icon={GavelIcon} label="Aktywne aukcje" value={Number(activeCount)}/><Metric icon={FlagIcon} label="Nowe zgłoszenia" value={openReports}/><Metric icon={UsersIcon} label="Użytkownicy" value={Number(userCount)}/></div>

        <section className="mt-8 rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-bold text-ink">Wymagają działania</h2><p className="mt-1 text-sm text-slate-500">Kolejka jest uporządkowana według moderacji, zgłoszeń i problemów z odbiorem.</p></div><Link href="/admin/system" className="text-sm font-semibold text-brand-700">Stan systemu →</Link></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Task priority="Krytyczne" value={openReports+cancellationRows.length} text="zgłoszenia i anulowania" href="#zgloszenia" tone="danger"/>
            <Task priority="Pilne" value={handoverIssues} text="problemy z odbiorem do wyjaśnienia" href="#transakcje" tone="warning"/>
            <Task priority="Normalne" value={pending.length} text="aukcje do moderacji" href="#moderacja" tone="brand"/>
            <Task priority="Informacyjne" value={Number(oldNoBidCount)} text="aukcje bez ofert od 5 dni" href="/aukcje?noBids=1" tone="neutral"/>
          </div>
          <p className="mt-4 text-xs text-slate-500">Ostatnia poprawna kopia: {lastBackup?.finishedAt ? lastBackup.finishedAt.toLocaleString("pl-PL") : "brak zarejestrowanej kopii"}.</p>
        </section>

        <section id="moderacja" className="mt-10 scroll-mt-24">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-ink">Kolejka moderacyjna</h2>
              <p className="mt-1 text-sm text-slate-500">
                Sprawdź zgodność opisu, lokalizację oraz co najmniej jedno prawdziwe zdjęcie przedmiotu.
              </p>
            </div>
            <Badge tone={pending.length ? "warning" : "success"}>{pending.length} oczekuje</Badge>
          </div>

          {pending.length ? (
            <div className="mt-5 grid gap-5 xl:grid-cols-2">
              {await Promise.all(
                pending.map(async ({ listing, auction, owner }) => {
                  const photos = await db
                    .select()
                    .from(listingPhotos)
                    .where(eq(listingPhotos.listingId, listing.id))
                    .orderBy(listingPhotos.position);

                  return (
                    <Card key={listing.id} className="overflow-hidden">
                      <div className="grid grid-cols-2 gap-1 bg-slate-100 sm:grid-cols-4">
                        {photos.slice(0, 4).map((photo) => (
                          <div key={photo.id} className="relative aspect-square">
                            <Image
                              src={photo.url}
                              alt={`Zdjęcie przedmiotu: ${listing.title}`}
                              fill
                             
                              className="object-cover"
                            />
                          </div>
                        ))}
                      </div>

                      <div className="p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-semibold text-ink">{listing.title}</h3>
                            <p className="mt-1 text-xs text-slate-500">
                              {owner.nickname} · {listing.city}
                            </p>
                          </div>
                          <Badge tone="warning">Do sprawdzenia</Badge>
                        </div>

                        <dl className="mt-4 divide-y divide-slate-100 text-sm">
                          <AdminRow label="Zdjęcia" value={String(photos.length)} />
                          <AdminRow label="Wartość" value={formatMoney(listing.estimatedValue)} />
                          <AdminRow label="Cena startowa" value={auction ? formatMoney(auction.startPrice) : "brak"} />
                          <AdminRow label="Wady" value={listing.knownDefects || "nie wskazano"} />
                        </dl>

                        <p className="mt-4 text-sm leading-6 text-slate-600">
                          {listing.fullDescription || listing.shortDescription}
                        </p>
                        <ModerationControls listingId={listing.id} ownerId={owner.id} />
                      </div>
                    </Card>
                  );
                }),
              )}
            </div>
          ) : (
            <div className="mt-5">
              <EmptyState title="Kolejka jest pusta" description="Nie ma ofert oczekujących na moderację." />
            </div>
          )}
        </section>

        <section id="aukcje-specjalne" className="mt-12 scroll-mt-24"><div className="flex items-end justify-between gap-4"><div><h2 className="text-xl font-bold text-ink">Aukcje specjalne</h2><p className="mt-1 text-sm text-slate-500">Wyróżniaj tylko rzeczy wyjątkowe, które mogą przyciągnąć większą liczbę wpłat.</p></div><Badge tone="warning">{activeListingsRows.filter(({listing})=>listing.isSpecial).length} wyróżnionych</Badge></div><div className="mt-5 grid gap-3 lg:grid-cols-2">{activeListingsRows.map(({listing,auction})=><Card key={listing.id} className="p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-ink">{listing.title}</p><p className="mt-1 text-xs text-slate-500">{auction.bidCount} ofert · {formatMoney(auction.currentPrice)}</p></div><Link href={`/aukcje/${listing.id}`} className="text-xs font-semibold text-brand-700">Podgląd</Link></div><div className="mt-3"><SpecialListingControls listingId={listing.id} isSpecial={listing.isSpecial} label={listing.specialLabel}/></div></Card>)}</div></section>

        <section id="zgloszenia" className="mt-12 scroll-mt-24"><div className="flex items-center justify-between"><div><h2 className="text-xl font-bold text-ink">Najnowsze zgłoszenia</h2><p className="mt-1 text-sm text-slate-500">Najpierw zgłoszenia dotyczące bezpieczeństwa, kontaktu i przekazania przedmiotu.</p></div><Badge tone={openReports?"danger":"neutral"}>{openReports} nowych</Badge></div>{reportRows.length?<div className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white"><div className="divide-y divide-slate-100">{reportRows.map((r)=><div key={r.id} className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center"><div><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold text-ink">{r.reason}</p><Badge tone={r.status==="NOWE"?"warning":"neutral"}>{r.status}</Badge></div><p className="mt-1 text-xs text-slate-500">{r.targetType} · {r.targetId.slice(0,10)}</p><p className="mt-2 text-sm text-slate-600">{r.comment||"Brak komentarza"}</p></div><button className="text-sm font-semibold text-brand-700">Otwórz</button></div>)}</div></div>:<p className="mt-4 text-sm text-slate-500">Brak zgłoszeń.</p>}</section>

        {cancellationRows.length>0&&<section className="mt-8"><h3 className="text-lg font-bold text-ink">Decyzje dotyczące anulowania i braku realizacji</h3><div className="mt-4 grid gap-4">{cancellationRows.map((item)=><Card key={item.id} className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-bold text-ink">{human(item.reason)}</p><p className="mt-1 text-xs text-slate-500">Sprawa {item.id.slice(0,8)} · {item.createdAt.toLocaleString("pl-PL")}</p></div><Badge tone="danger">Wymaga decyzji</Badge></div><p className="mt-3 text-sm leading-6 text-slate-600">{item.details||"Brak dodatkowych informacji."}</p><CancellationControls cancellationId={item.id}/></Card>)}</div></section>}

        <section id="uzytkownicy" className="mt-12 scroll-mt-24"><h2 className="text-xl font-bold text-ink">Użytkownicy</h2><div className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white"><div className="divide-y divide-slate-100">{userRows.map((u)=><div key={u.id} className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center"><div><div className="flex items-center gap-2"><p className="font-semibold text-ink">{u.nickname}</p>{u.role==="admin"&&<Badge tone="brand">admin</Badge>}<Badge tone={u.status==="aktywne"?"success":u.status==="zablokowane"?"danger":"warning"}>{u.status}</Badge></div><p className="mt-1 text-xs text-slate-500">{u.email} · konto od {u.createdAt.toLocaleDateString("pl-PL")}</p></div>{u.role!=="admin"&&<UserStatusControls userId={u.id} currentStatus={u.status}/>}</div>)}</div></div></section>


        <section id="siepomaga" className="mt-12 scroll-mt-24">
          <div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-xl font-bold text-ink">Konfiguracja Siepomaga</h2><p className="mt-1 text-sm text-slate-500">Jedna aktywna zbiórka i bezpośredni link do wpłat w Siepomaga.</p></div>{activeCampaign?.isActive&&<Badge tone="success">AKTYWNA</Badge>}</div>
          <SiepomagaCampaignControls campaign={activeCampaign ? {name:activeCampaign.name,beneficiaryName:activeCampaign.beneficiaryName,description:activeCampaign.description,imageUrl:activeCampaign.imageUrl,externalUrl:activeCampaign.externalUrl,piggyBankUrl:activeCampaign.piggyBankUrl,targetAmount:activeCampaign.targetAmount} : null}/>
        </section>
        <section id="transakcje" className="mt-12 scroll-mt-24"><div className="flex items-center justify-between"><h2 className="text-xl font-bold text-ink">Ostatnie transakcje</h2><Badge tone={openTransactions?"warning":"neutral"}>{openTransactions} w toku</Badge></div><div className="mt-5 overflow-x-auto rounded-xl border border-slate-200 bg-white"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-[.06em] text-slate-500"><tr><th className="px-4 py-3">ID</th><th>Status</th><th>Kwota</th><th>Aktualizacja</th><th></th></tr></thead><tbody>{transactionRows.map((t)=><tr key={t.id} className="border-t border-slate-100"><td className="px-4 py-3 font-mono text-xs">{t.id.slice(0,8)}</td><td><Badge tone={t.status==="ZAKONCZONA_POMYSLNIE"?"success":t.status==="SPOR"?"danger":"neutral"}>{human(t.status)}</Badge></td><td>{formatMoney(t.plannedDonationAmount ?? t.amount)}</td><td className="text-slate-500">{t.updatedAt.toLocaleString("pl-PL")}</td><td className="pr-4 text-right"><Link href={`/transakcje/${t.id}`} className="font-semibold text-brand-700">Otwórz</Link></td></tr>)}</tbody></table></div></section>
      </div>
    </div>
  </main>;
}

function AdminLink({href,label}:{href:string;label:string}){return <Link href={href} className="block py-3 font-medium text-slate-600 hover:text-brand-700">{label}</Link>;}
function Metric({icon:Icon,label,value}:{icon:typeof ShieldIcon;label:string;value:number}){return <div className="rounded-xl border border-slate-200 bg-white p-4"><Icon size={18} className="text-brand-700"/><p className="mt-3 text-2xl font-bold text-ink">{value}</p><p className="mt-1 text-xs text-slate-500">{label}</p></div>;}
function AdminRow({label,value}:{label:string;value:string}){return <div className="grid grid-cols-[110px_1fr] gap-3 py-2"><dt className="text-slate-500">{label}</dt><dd className="font-medium text-ink">{value}</dd></div>;}
function human(value:string){return value.toLowerCase().replaceAll("_"," ").replace(/^./,(m)=>m.toUpperCase());}
function Task({priority,value,text,href,tone}:{priority:string;value:number;text:string;href:string;tone:"danger"|"warning"|"brand"|"neutral"}){
  return <Link href={href} className="rounded-lg border border-slate-200 p-4 transition hover:border-brand-300 hover:bg-brand-50/30"><div className="flex items-center justify-between gap-2"><Badge tone={tone}>{priority}</Badge><strong className="text-2xl text-ink">{value}</strong></div><p className="mt-3 text-sm text-slate-600">{text}</p></Link>;
}
