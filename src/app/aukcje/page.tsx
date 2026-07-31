import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/db";
import { auctions, listings, users, userProfiles, categories } from "@/db/schema";
import { eq, and, asc, desc, gte, lte, SQL, ilike, count, sql, inArray } from "drizzle-orm";
import { AuctionCard } from "@/components/auction-card";
import { EmptyState, SectionHeading, inputClass } from "@/components/ui";
import { SearchIcon } from "@/components/icons";
import { ADAS_CAMPAIGN } from "@/lib/adas-campaign";
import { getRequiredBid } from "@/lib/config";
import { getAllowedCategories } from "@/lib/public-data";


export const metadata: Metadata = {
  title: 'Przedmioty dla Adasia — LicytujDobro',
  description: 'Rezerwuj przedmioty za stałą wpłatę albo licytuj je dla Adasia. Wpłaty trafiają bezpośrednio na oficjalną zbiórkę w Siepomaga.pl.',
  openGraph: { title: 'Przedmioty dla Adasia — LicytujDobro', description: 'Rezerwuj przedmioty za stałą wpłatę albo licytuj je dla Adasia. Wpłaty trafiają bezpośrednio na oficjalną zbiórkę w Siepomaga.pl.' },
};


const SORT_OPTIONS: Record<string, { label: string }> = {
  konczace: { label: "Kończące się najwcześniej" },
  najnowsze: { label: "Najnowsze" },
  najwyzsza: { label: "Najwyższa oferta" },
  najnizsza: { label: "Najniższa oferta" },
  najwiecej: { label: "Najwięcej ofert" },
};

export default async function CatalogPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const status = params.status === "zakonczone" ? "ZAKONCZONA" : "AKTYWNA";
  const sort = params.sort && SORT_OPTIONS[params.sort] ? params.sort : "konczace";
  const categoryId = params.kategoria;
  const district = params.dzielnica;
  const condition = params.stan;
  const query = params.q?.trim().slice(0, 80) ?? "";
  const noBids = params.bezOfert === "1";
  const specialOnly = params.specjalne === "1";
  const rawMin = params.cenaOd ? Number(params.cenaOd) : undefined;
  const rawMax = params.cenaDo ? Number(params.cenaDo) : undefined;
  const minPrice = rawMin !== undefined && Number.isFinite(rawMin) && rawMin >= 0 ? rawMin : undefined;
  const maxPrice = rawMax !== undefined && Number.isFinite(rawMax) && rawMax >= 0 ? rawMax : undefined;
  const page = Math.max(1, Number.parseInt(params.strona ?? "1", 10) || 1);
  const pageSize = 24;

  const allCategories = await getAllowedCategories();
  const conditions: SQL[] = [status === "AKTYWNA" ? inArray(auctions.status, ["AKTYWNA", "ZBIERANIE_ZAINTERESOWANIA"]) : eq(auctions.status, status)];
  if (categoryId) conditions.push(eq(listings.categoryId, categoryId));
  if (district && district !== ADAS_CAMPAIGN.regionLabel) conditions.push(eq(listings.district, district));
  const allowedConditions = listings.condition.enumValues;
  if (condition && allowedConditions.includes(condition as (typeof allowedConditions)[number])) conditions.push(eq(listings.condition, condition as (typeof allowedConditions)[number]));
  if (minPrice !== undefined) conditions.push(gte(auctions.currentPrice, String(minPrice)));
  if (maxPrice !== undefined) conditions.push(lte(auctions.currentPrice, String(maxPrice)));
  if (query) conditions.push(ilike(listings.title, `%${query}%`));
  if (status === "AKTYWNA" && noBids) {
    conditions.push(eq(auctions.mode, "AUCTION"));
    conditions.push(eq(auctions.bidCount, 0));
  }
  if (specialOnly) conditions.push(eq(listings.isSpecial, true));

  const orderMap: Record<string, SQL> = {
    konczace: asc(auctions.endAt),
    najnowsze: desc(listings.createdAt),
    najwyzsza: desc(auctions.currentPrice),
    najnizsza: asc(auctions.currentPrice),
    najwiecej: desc(auctions.bidCount),
  };

  const [{ total }] = await db.select({ total: count() }).from(auctions).innerJoin(listings, eq(auctions.listingId, listings.id)).where(and(...conditions));
  const rows = await db
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
      isSpecial: listings.isSpecial,
      specialLabel: listings.specialLabel,
      photoUrl: sql<string | null>`(
        select lp.url
        from listing_photos lp
        where lp.listing_id = ${listings.id}
          and lp.kind = 'ogolne'
        order by lp.position asc, lp.created_at asc
        limit 1
      )`,
    })
    .from(auctions)
    .innerJoin(listings, eq(auctions.listingId, listings.id))
    .innerJoin(categories, eq(listings.categoryId, categories.id))
    .innerJoin(users, eq(listings.userId, users.id))
    .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
    .where(and(...conditions))
    .orderBy(orderMap[sort])
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const items = rows.map((row) => ({
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

  const districts = [ADAS_CAMPAIGN.regionLabel];
  const pages = Math.max(1, Math.ceil(Number(total) / pageSize));
  const urlForPage = (nextPage: number) => { const qs = new URLSearchParams(); Object.entries(params).forEach(([key,value])=>{ if(value && key !== "strona") qs.set(key,value); }); qs.set("strona",String(nextPage)); return `/aukcje?${qs.toString()}`; };

  return (
    <main className="page-shell py-12">
      <SectionHeading eyebrow="Katalog" title="Przedmioty dla Adasia" description="Wybierz stałą wpłatę albo dołącz do licytacji z przebijaniem ofert." />

      <form className="mt-8 rounded-xl border border-slate-200 bg-white p-4" method="GET">
        <div className="grid gap-3 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
          <label className="relative"><span className="sr-only">Szukaj przedmiotu</span><SearchIcon size={17} className="pointer-events-none absolute left-3 top-3 text-slate-400"/><input name="q" defaultValue={query} placeholder="Szukaj przedmiotu..." className={`${inputClass} pl-10`} /></label>
          <select name="status" defaultValue={params.status ?? "aktywne"} className={inputClass}><option value="aktywne">Aktywne</option><option value="zakonczone">Zakończone</option></select>
          <select name="kategoria" defaultValue={categoryId ?? ""} className={inputClass}><option value="">Wszystkie kategorie</option>{allCategories.map((c)=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
          <select name="dzielnica" defaultValue={district ?? ""} className={inputClass}><option value="">Wszystkie dzielnice</option>{districts.map((d)=><option key={d} value={d}>{d}</option>)}</select>
          <select name="sort" defaultValue={sort} className={inputClass}>{Object.entries(SORT_OPTIONS).map(([key,val])=><option key={key} value={key}>{val.label}</option>)}</select>
        </div>
        <details className="mt-3" open={noBids||specialOnly}><summary className="cursor-pointer text-sm font-semibold text-brand-700">Więcej filtrów</summary><div className="mt-3 grid gap-3 sm:grid-cols-4"><select name="stan" defaultValue={condition ?? ""} className={inputClass}><option value="">Dowolny stan</option><option value="nowy">Nowy</option><option value="jak_nowy">Jak nowy</option><option value="bardzo_dobry">Bardzo dobry</option><option value="dobry">Dobry</option><option value="uzywany">Używany</option><option value="widoczne_slady">Widoczne ślady</option></select><input name="cenaOd" defaultValue={params.cenaOd ?? ""} placeholder="Cena od" type="number" min={0} className={inputClass}/><input name="cenaDo" defaultValue={params.cenaDo ?? ""} placeholder="Cena do" type="number" min={0} className={inputClass}/><label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-slate-300 bg-white px-3.5 text-sm text-ink"><input type="checkbox" name="bezOfert" value="1" defaultChecked={noBids} className="h-4 w-4 accent-brand-700"/>Tylko bez ofert</label><label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-3.5 text-sm font-semibold text-amber-950"><input type="checkbox" name="specjalne" value="1" defaultChecked={specialOnly} className="h-4 w-4 accent-amber-700"/>Aukcje specjalne</label></div></details>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-slate-500">Znaleziono: <strong className="text-ink">{Number(total)}</strong></p><div className="flex gap-2"><Link href="/aukcje" className="inline-flex min-h-10 items-center rounded-lg px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50">Wyczyść filtry</Link><button type="submit" className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-brand-800 px-5 text-sm font-semibold text-white hover:bg-brand-700"><SearchIcon size={16}/> Pokaż wyniki</button></div></div>
      </form>

      <div className="mt-8">
        {items.length === 0 ? <EmptyState title={status === "AKTYWNA" ? "Brak aukcji spełniających kryteria" : "Brak zakończonych aukcji"} description="Zmień filtry albo wróć później — nowe aukcje pojawiają się po moderacji." /> : <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{items.map((item)=><AuctionCard key={item.listingId} data={item}/>)}</div>}
      </div>

      {pages > 1 && <nav className="mt-10 flex items-center justify-center gap-3" aria-label="Paginacja"><Link aria-disabled={page===1} href={page>1?urlForPage(page-1):"#"} className={`rounded-lg border px-4 py-2 text-sm font-semibold ${page===1?"pointer-events-none border-slate-200 text-slate-300":"border-slate-300 bg-white text-ink hover:border-brand-500"}`}>Poprzednia</Link><span className="text-sm text-slate-600">Strona {page} z {pages}</span><Link aria-disabled={page===pages} href={page<pages?urlForPage(page+1):"#"} className={`rounded-lg border px-4 py-2 text-sm font-semibold ${page===pages?"pointer-events-none border-slate-200 text-slate-300":"border-slate-300 bg-white text-ink hover:border-brand-500"}`}>Następna</Link></nav>}
    </main>
  );
}
