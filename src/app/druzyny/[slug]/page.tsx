import Link from "next/link";
import { notFound } from "next/navigation";
import { and, count, eq, inArray, sql } from "drizzle-orm";

import { AuctionCard, type AuctionCardData } from "@/components/auction-card";
import { ArrowRightIcon, TrophyIcon, UsersIcon } from "@/components/icons";
import { EmptyState, LinkButton } from "@/components/ui";
import { db } from "@/db";
import { auctions, categories, listings, supportTeams, teamMemberships, transactions, userProfiles, users } from "@/db/schema";
import { ADAS_CAMPAIGN } from "@/lib/adas-campaign";
import { formatMoney } from "@/lib/auction-logic";
import { getRequiredBid } from "@/lib/config";

export default async function TeamPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [team] = await db.select().from(supportTeams).where(and(eq(supportTeams.slug, slug), eq(supportTeams.isActive, true))).limit(1);
  if (!team) notFound();

  const members = await db
    .select({ user: users, profile: userProfiles })
    .from(teamMemberships)
    .innerJoin(users, eq(users.id, teamMemberships.userId))
    .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
    .where(eq(teamMemberships.teamId, team.id));

  const memberIds = members.map((item) => item.user.id);
  let auctionCards: AuctionCardData[] = [];
  let completedAmount = 0;
  let activeAuctionCount = 0;

  if (memberIds.length) {
    const [rows, activeRows, finished] = await Promise.all([
      db
        .select({
          listingId: listings.id,
          title: listings.title,
          condition: listings.condition,
          district: listings.district,
          categoryName: categories.name,
          currentPrice: auctions.currentPrice,
          startPrice: auctions.startPrice,
          minBidIncrement: auctions.minBidIncrement,
          mode: auctions.mode,
          bidCount: auctions.bidCount,
          endAt: auctions.endAt,
          sellerNickname: users.nickname,
          sellerEmoji: userProfiles.avatarEmoji,
          sellerRating: userProfiles.ratingAvg,
          photoUrl: sql<string | null>`(
            select lp.url from listing_photos lp
            where lp.listing_id = ${listings.id} and lp.kind = 'ogolne'
            order by lp.position asc, lp.created_at asc
            limit 1
          )`,
        })
        .from(auctions)
        .innerJoin(listings, eq(listings.id, auctions.listingId))
        .innerJoin(categories, eq(categories.id, listings.categoryId))
        .innerJoin(users, eq(users.id, listings.userId))
        .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
        .where(and(eq(auctions.status, "AKTYWNA"), inArray(listings.userId, memberIds)))
        .limit(12),
      db
        .select({ value: count() })
        .from(auctions)
        .innerJoin(listings, eq(listings.id, auctions.listingId))
        .where(and(eq(auctions.status, "AKTYWNA"), inArray(listings.userId, memberIds))),
      db
        .select({ amount: sql<string>`coalesce(${transactions.plannedDonationAmount}, ${transactions.amount})` })
        .from(transactions)
        .innerJoin(listings, eq(listings.id, transactions.listingId))
        .where(and(eq(transactions.status, "ZAKONCZONA_POMYSLNIE"), inArray(listings.userId, memberIds))),
    ]);

    auctionCards = rows.map((row) => ({
      ...row,
      district: ADAS_CAMPAIGN.regionLabel,
      photoUrl: row.photoUrl ?? "/images/item-placeholder.svg",
      minNextBid: getRequiredBid(
        Number(row.startPrice),
        Number(row.currentPrice),
        row.bidCount,
        Number(row.minBidIncrement),
      ),
    }));
    activeAuctionCount = Number(activeRows[0]?.value ?? 0);
    completedAmount = finished.reduce((sum, item) => sum + Number(item.amount), 0);
  }

  return (
    <main className="page-shell py-12">
      <nav className="mb-6 text-xs text-slate-500"><Link href="/druzyny" className="hover:text-brand-700">Drużyny</Link> <span className="mx-2">›</span> {team.name}</nav>
      <section className="rounded-2xl border border-brand-200 bg-brand-50/60 p-7 sm:p-9">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-brand-600">Drużyna dla Adasia</p><h1 className="mt-2 text-3xl font-bold tracking-[-.03em] text-ink sm:text-4xl">{team.name}</h1><p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">{team.description}</p></div><span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white text-brand-700 shadow-sm"><TrophyIcon size={26}/></span></div>
        <div className="mt-7 grid grid-cols-2 gap-5 border-t border-brand-200 pt-6 sm:grid-cols-3"><Stat value={members.length} label="członków"/><Stat value={activeAuctionCount} label="aktywnych aukcji"/><Stat value={formatMoney(completedAmount)} label="zadeklarowanego wsparcia"/></div>
      </section>
      <section className="mt-10"><div className="flex items-end justify-between gap-4"><div><h2 className="text-2xl font-bold text-ink">Aukcje drużyny</h2><p className="mt-1 text-sm text-slate-500">Przedmioty wystawione przez członków drużyny.</p></div><LinkButton href="/dodaj-przedmiot" size="sm">Wystaw przedmiot</LinkButton></div>{auctionCards.length ? <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{auctionCards.map((item) => <AuctionCard key={item.listingId} data={item}/>)}</div> : <div className="mt-6"><EmptyState icon="" title="Brak aktywnych aukcji" description="Członkowie drużyny nie mają obecnie aktywnych aukcji."/></div>}</section>
      <section className="mt-12 border-t border-slate-200 pt-8"><h2 className="flex items-center gap-2 text-xl font-bold text-ink"><UsersIcon size={20} className="text-brand-700"/>Członkowie</h2><div className="mt-5 flex flex-wrap gap-3">{members.map(({ user, profile }) => <Link key={user.id} href={`/profil/${user.nickname}`} className="inline-flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 hover:border-brand-300"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-800">{user.nickname.slice(0,2).toUpperCase()}</span><span><span className="block text-sm font-semibold text-ink">{user.nickname}</span><span className="text-[11px] text-slate-500">{profile?.completedTransactions ?? 0} transakcji</span></span><ArrowRightIcon size={13} className="text-slate-400"/></Link>)}</div></section>
    </main>
  );
}

function Stat({ value, label }: { value: string | number; label: string }) {
  return <div><p className="text-2xl font-bold text-brand-800">{value}</p><p className="mt-1 text-xs text-slate-600">{label}</p></div>;
}
