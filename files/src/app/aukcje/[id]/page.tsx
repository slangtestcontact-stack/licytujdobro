import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { listings, listingPhotos, auctions, bids, users, userProfiles, categories, watchlists, campaigns, transactions } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { getCurrentUser, isFullyVerified } from "@/lib/auth";
import { getRequiredBid, CONDITION_LABELS } from "@/lib/config";
import { formatMoney, isAuctionOver } from "@/lib/auction-logic";
import { Badge } from "@/components/ui";
import { BidPanel } from "@/components/bidding";
import { WatchButton, ReportForm, ShareButton } from "@/components/action-widgets";
import { AuctionGallery } from "@/components/auction-gallery";
import { ArrowRightIcon, ClockIcon, HandHeartIcon, MapPinIcon, MegaphoneIcon, ShieldIcon, StarIcon } from "@/components/icons";
import { ADAS_CAMPAIGN } from "@/lib/adas-campaign";
import { GuestAuctionReminderForm } from "@/components/growth-widgets";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const [row] = await db.select({ title: listings.title, shortDescription: listings.shortDescription, currentPrice: auctions.currentPrice }).from(listings).leftJoin(auctions, eq(auctions.listingId, listings.id)).where(eq(listings.id, id)).limit(1);
  if (!row) return { title: "Aukcja - LicytujDobro" };
  const [photo] = await db.select().from(listingPhotos).where(and(eq(listingPhotos.listingId, id), eq(listingPhotos.kind, "ogolne"))).orderBy(listingPhotos.position).limit(1);
  const title = `${row.title} - licytacja dla Adasia`;
  const description = `${row.shortDescription} Aktualna oferta: ${row.currentPrice ? formatMoney(row.currentPrice) : "-"}. Cała kwota trafia do Skarbonki Adasia.`;
  return {
    title,
    description,
    openGraph: { title, description, type: "website", locale: "pl_PL", images: photo?.url ? [{ url: photo.url, alt: row.title }] : undefined },
  };
}

function formatBidDate(value: Date) {
  return new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(value);
}

export default async function AuctionDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ bid?: string; confirmBid?: string }> }) {
  const { id } = await params;
  const query = await searchParams;
  const [listing] = await db.select().from(listings).where(eq(listings.id, id)).limit(1);
  if (!listing) notFound();

  const [[category], [seller], [sellerProfile], photos, [auction], user, [campaign]] = await Promise.all([
    db.select().from(categories).where(eq(categories.id, listing.categoryId)).limit(1),
    db.select().from(users).where(eq(users.id, listing.userId)).limit(1),
    db.select().from(userProfiles).where(eq(userProfiles.userId, listing.userId)).limit(1),
    db.select().from(listingPhotos).where(eq(listingPhotos.listingId, id)).orderBy(listingPhotos.position),
    db.select().from(auctions).where(eq(auctions.listingId, id)).limit(1),
    getCurrentUser(),
    db.select().from(campaigns).where(eq(campaigns.isActive, true)).limit(1),
  ]);

  const bidHistory = auction ? await db.select({ amount: bids.amount, createdAt: bids.createdAt, nickname: users.nickname, userId: bids.userId }).from(bids).innerJoin(users, eq(bids.userId, users.id)).where(and(eq(bids.auctionId, auction.id), eq(bids.isCancelled, false))).orderBy(desc(bids.createdAt)).limit(30) : [];
  const [currentUserBid] = user && auction ? await db.select({ amount: bids.amount }).from(bids).where(and(eq(bids.auctionId, auction.id), eq(bids.userId, user.id), eq(bids.isCancelled, false))).orderBy(desc(bids.createdAt)).limit(1) : [];
  const [winnerTransaction] = user && auction?.winnerId === user.id ? await db.select({ id: transactions.id }).from(transactions).where(eq(transactions.auctionId, auction.id)).limit(1) : [];

  let watching = false;
  if (user) { const [w] = await db.select().from(watchlists).where(and(eq(watchlists.userId, user.id), eq(watchlists.listingId, id))).limit(1); watching = Boolean(w); }

  const isOwner = user?.id === listing.userId;
  const isOver = auction?.endAt ? isAuctionOver(auction.endAt) : true;
  const isActive = listing.status === "AKTYWNA" && auction?.status === "AKTYWNA" && !isOver;
  let disabledReason: string | undefined;
  if (!user) disabledReason = "Zaloguj się, aby licytować.";
  else if (!isFullyVerified(user)) disabledReason = "Potwierdź wymagany kontakt, aby licytować.";
  else if (isOwner) disabledReason = "Nie możesz licytować własnej aukcji.";
  else if (!isActive) disabledReason = "Ta aukcja nie przyjmuje już ofert.";

  const currentPrice = auction ? Number(auction.currentPrice) : Number(listing.estimatedValue);
  const minNextBid = auction ? getRequiredBid(Number(auction.startPrice), currentPrice, auction.bidCount) : currentPrice;
  if (listing.status !== "AKTYWNA" && listing.status !== "ZAKONCZONA" && !isOwner && user?.role !== "admin") notFound();
  const initials = seller?.nickname.slice(0,2).toUpperCase() ?? "U";
  const regionLabel = ADAS_CAMPAIGN.regionLabel;
  const campaignName = campaign?.name ?? "Skarbonka Adasia";
  const paymentLimit = campaign?.paymentLimit ?? String(ADAS_CAMPAIGN.paymentLimit);
  const piggyBankUrl = campaign?.piggyBankUrl ?? "#";
  const piggyBankDisplay = piggyBankUrl.startsWith("https://")
    ? `${new URL(piggyBankUrl).hostname}${new URL(piggyBankUrl).pathname}`
    : "Skarbonka wymaga konfiguracji administratora";
  const requestedBid = Number(query.bid);
  const initialBid = Number.isFinite(requestedBid) && requestedBid >= minNextBid ? requestedBid : undefined;
  const openBidConfirmation = query.confirmBid === "1" && Boolean(initialBid) && Boolean(user) && isActive;
  const userLostAuction = Boolean(user && currentUserBid && auction && auction.status === "ZAKONCZONA" && auction.winnerId !== user.id);
  const bidReturnTo = `/aukcje/${listing.id}?bid=${initialBid ?? minNextBid}&confirmBid=1`;
  const verificationUrl = user && isActive && !isOwner && !isFullyVerified(user)
    ? `/weryfikacja?returnTo=${encodeURIComponent(bidReturnTo)}`
    : undefined;

  return (
    <main className="page-shell py-7 sm:py-9">
      <nav className="mb-5 flex flex-wrap items-center gap-2 text-xs text-slate-500"><Link href="/" className="hover:text-brand-700">Strona główna</Link><span>›</span><Link href="/aukcje" className="hover:text-brand-700">Aukcje</Link><span>›</span><span className="line-clamp-1">{listing.title}</span></nav>
      <div className="grid gap-9 lg:grid-cols-[1.35fr_.82fr] xl:gap-12">
        <div>
          <AuctionGallery photos={photos} title={listing.title}/>
          <div className="mt-6 flex flex-wrap items-center gap-2">{listing.isSpecial&&<Badge tone="warning">{listing.specialLabel||"Aukcja specjalna"}</Badge>}<Badge tone="brand">{category?.name}</Badge><Badge>{CONDITION_LABELS[listing.condition]}</Badge>{listing.status === "ZAKONCZONA" && <Badge tone="success">Zakończona</Badge>}</div>
          <h1 className="text-balance mt-4 text-3xl font-bold leading-tight tracking-[-0.035em] text-ink sm:text-4xl">{listing.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-600"><span className="inline-flex items-center gap-1.5"><MapPinIcon size={16}/>{regionLabel}</span><span className="inline-flex items-center gap-1.5"><ClockIcon size={16}/>Odbiór osobisty, szczegóły po wygranej</span></div>

          <div className="mt-9 grid gap-9 lg:grid-cols-[minmax(0,1fr)_240px]">
            <div className="max-w-3xl">
              <Section title="Opis przedmiotu"><p className="whitespace-pre-line text-[15px] leading-7 text-slate-700">{listing.fullDescription}</p></Section>
              <Section title="Stan, wady i kompletność"><dl className="space-y-5 text-sm"><DetailBlock label="Stan" value={CONDITION_LABELS[listing.condition]}/><DetailBlock label="Znane wady" value={listing.knownDefects || "Brak zgłoszonych wad."}/><DetailBlock label="Kompletność" value={listing.completeness || "Brak dodatkowych informacji."}/></dl></Section>
              <Section title="Historia ofert">{bidHistory.length === 0 ? <p className="text-sm text-slate-500">Jeszcze nikt nie złożył oferty.</p> : <ul className="max-w-xl divide-y divide-slate-100 text-sm">{bidHistory.map((b,idx)=>{const label=user?.id===b.userId?"Twoja oferta":b.nickname;const avatar=label.slice(0,2).toUpperCase();return <li key={`${b.userId}-${b.createdAt.toISOString()}-${idx}`} className="flex items-center justify-between gap-4 py-4"><span className="inline-flex min-w-0 items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[11px] font-bold text-brand-800">{avatar}</span><span><span className="block truncate font-semibold text-ink">{label}</span><span className="mt-0.5 block text-xs text-slate-500">{formatBidDate(b.createdAt)}</span></span></span><strong className="shrink-0 text-base text-ink">{formatMoney(b.amount)}</strong></li>})}</ul>}</Section>
            </div>
            <aside className="h-fit border-t border-slate-200 pt-6 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
              <p className="text-xs font-bold uppercase tracking-[.1em] text-slate-500">Wystawiający</p>
              <div className="mt-3 flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-800">{initials}</span><div><Link href={`/profil/${seller?.nickname}`} className="font-semibold text-ink hover:text-brand-700">{seller?.nickname}</Link><p className="mt-0.5 inline-flex items-center gap-1 text-xs text-slate-600"><StarIcon size={13} className="fill-amber-400 text-amber-500"/>{Number(sellerProfile?.ratingAvg ?? 0).toFixed(1)} · {sellerProfile?.completedTransactions ?? 0} transakcji</p></div></div>
              <Link href={`/profil/${seller?.nickname}`} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand-700">Zobacz profil <ArrowRightIcon size={15}/></Link>
            </aside>
          </div>
        </div>

        <aside><div className="lg:sticky lg:top-24">
          {userLostAuction && <AfterAuctionHelpCard piggyBankUrl={piggyBankUrl}/>}
          {winnerTransaction && <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-5"><p className="text-xs font-bold uppercase tracking-[.1em] text-emerald-800">Wygrałeś tę aukcję</p><h2 className="mt-2 text-lg font-bold text-emerald-950">Wybierz planowaną wpłatę dla Adasia</h2><p className="mt-2 text-sm leading-6 text-emerald-900">W centrum przekazania możesz wpłacić wylicytowaną kwotę albo dobrowolnie ją zwiększyć.</p><Link href={`/transakcje/${winnerTransaction.id}`} className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-emerald-700 px-4 text-sm font-bold text-white">Przejdź do wygranej</Link></div>}
          {auction && <BidPanel auctionId={auction.id} listingId={listing.id} listingTitle={listing.title} currentPrice={currentPrice} bidCount={auction.bidCount} minNextBid={minNextBid} initialAmount={initialBid} openOnLoad={openBidConfirmation} endAt={auction.endAt?.toISOString() ?? null} campaignName={campaignName} piggyBankUrl={piggyBankUrl} city={regionLabel} canBid={isActive && !isOwner && Boolean(user) && isFullyVerified(user ?? { emailVerifiedAt:null,phoneVerifiedAt:null })} loginRequired={isActive && !isOwner && !user} verificationUrl={verificationUrl} disabledReason={disabledReason} isLeading={Boolean(user && auction.winnerId === user.id)} requiresTermsAcceptance={Boolean(user && user.biddingTermsVersion !== "2026-07-v1")}/>} 
          {!user && isActive && <div className="mt-3"><GuestAuctionReminderForm listingId={listing.id} title={listing.title}/></div>}

          <div className="mt-3 flex flex-wrap items-center gap-1 border-b border-slate-200 pb-3"><WatchButton listingId={id} initialWatching={watching}/><ShareButton title={listing.title}/><Link href={`/aukcje/${id}/promuj`} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-transparent bg-white px-3 text-sm font-semibold text-brand-700 hover:bg-brand-50"><MegaphoneIcon size={16}/>Promuj</Link><ReportForm targetType="LISTING" targetId={id}/></div>

          <div className="mt-4 rounded-xl border border-brand-300 bg-brand-50 p-5">
            <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.1em] text-brand-700"><HandHeartIcon size={16}/>Najważniejszy efekt tej aukcji</p>
            <h2 className="mt-3 text-xl font-bold tracking-[-.02em] text-ink">Ta aukcja prowadzi do wpłaty dla Adasia</h2>
            <p className="mt-2 text-sm leading-6 text-slate-700">Cała zwycięska kwota trafia bezpośrednio do Skarbonki „{campaignName}” w serwisie Siepomaga.</p>
            <p className="mt-2 text-sm font-semibold text-brand-800">LicytujDobro nie przyjmuje pieniędzy i nie pobiera prowizji.</p>
            <p className="mt-2 break-all text-xs text-slate-500">{piggyBankDisplay}</p>
            {piggyBankUrl !== "#" ? <a href={piggyBankUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-800 px-4 text-sm font-bold text-white hover:bg-brand-700"><HandHeartIcon size={16}/>Wpłać dla Adasia bez licytowania ↗</a> : <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm font-semibold text-amber-900">Administrator musi skonfigurować Skarbonkę.</p>}
            <div className="mt-4 flex flex-wrap gap-3"><Link href="/historia-adasia" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700">Poznaj historię Adasia <ArrowRightIcon size={14}/></Link><Link href="/gdzie-trafiaja-pieniadze" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700">Sprawdź drogę pieniędzy <ArrowRightIcon size={14}/></Link></div>
            <p className="mt-3 text-xs text-slate-500">Limit pojedynczej wpłaty przez Terminal: {formatMoney(paymentLimit)}</p>
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-4 text-slate-700">
            <p className="flex items-center gap-2 text-sm font-bold text-ink"><ShieldIcon size={17}/> Bezpieczny finał aukcji</p>
            <p className="mt-2 text-sm leading-6">Po wygranej spotkaj się z wystawiającym, sprawdź przedmiot i wykonaj wpłatę dla Adasia. Przedmiot zostaje przekazany dopiero po potwierdzeniu wpłaty.</p>
            <Link href="/bezpieczenstwo" className="mt-3 inline-flex text-sm font-semibold text-brand-700">Poznaj zasady bezpieczeństwa <ArrowRightIcon size={14}/></Link>
          </div>
          <p className="mt-5 border-t border-slate-200 pt-4 text-xs leading-5 text-slate-500">Oferta złożona w ostatnich 2 minutach przedłuża aukcję o 2 minuty, maksymalnie o 20 minut łącznie.</p>
        </div></aside>
      </div>
    </main>
  );
}

function AfterAuctionHelpCard({ piggyBankUrl }: { piggyBankUrl: string }) {
  const amounts = [10, 20, 50];
  return <section className="mb-4 rounded-xl border border-brand-200 bg-brand-50 p-5">
    <p className="text-xs font-bold uppercase tracking-[.1em] text-brand-700">Nadal możesz pomóc</p>
    <h2 className="mt-2 text-xl font-bold tracking-[-.02em] text-ink">Tym razem nie udało się wygrać przedmiotu</h2>
    <p className="mt-2 text-sm leading-6 text-slate-700">Możesz zamienić zainteresowanie aukcją w bezpośrednią wpłatę dla Adasia albo wybrać kolejną licytację. Konto w LicytujDobro nie jest potrzebne do wpłaty.</p>
    <div className="mt-4 grid grid-cols-3 gap-2">{amounts.map((amount)=><a key={amount} href={piggyBankUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-brand-300 bg-white px-3 text-sm font-bold text-brand-800 hover:bg-brand-100" title={`Po otwarciu Skarbonki wpisz ${amount} zł`}>{amount} zł ↗</a>)}</div>
    <p className="mt-2 text-center text-[11px] leading-4 text-slate-500">Po otwarciu Skarbonki wpisz wybraną kwotę.</p>
    <Link href="/aukcje" className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-brand-800 px-4 text-sm font-bold text-white">Zobacz inne aukcje</Link>
  </section>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) { return <section className="border-t border-slate-200 py-7 first:border-t-0 first:pt-0"><h2 className="mb-5 text-lg font-semibold tracking-[-0.01em] text-ink">{title}</h2>{children}</section>; }
function DetailBlock({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs font-semibold uppercase tracking-[.08em] text-slate-500">{label}</dt><dd className="mt-1.5 max-w-2xl leading-6 text-ink">{value}</dd></div>; }
