import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { auctions, categories, listingPhotos, listings } from "@/db/schema";
import { ShareStudio } from "@/components/growth-widgets";
import { ArrowRightIcon } from "@/components/icons";
import { formatCountdown, formatMoney } from "@/lib/auction-logic";
import { publicAuctionUrl } from "@/lib/public-code";

export const dynamic = "force-dynamic";

export default async function PromoteAuctionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [row] = await db.select({ listing: listings, auction: auctions, category: categories }).from(listings).leftJoin(auctions, eq(auctions.listingId, listings.id)).leftJoin(categories, eq(categories.id, listings.categoryId)).where(eq(listings.id, id)).limit(1);
  if (!row?.auction || !["AKTYWNA", "ZAKONCZONA"].includes(row.listing.status)) notFound();
  const [photo] = await db.select().from(listingPhotos).where(and(eq(listingPhotos.listingId, id), eq(listingPhotos.kind, "ogolne"))).orderBy(listingPhotos.position).limit(1);
  const publicUrl = publicAuctionUrl(row.listing.shortCode || id.slice(0, 8));
  const endLabel = row.auction.status === "ZAKONCZONA" ? "Aukcja zakończona" : `Kończy się ${row.auction.endAt ? formatCountdown(row.auction.endAt) : "wkrótce"}`;

  return <main className="page-shell py-10">
    <nav className="mb-6 flex flex-wrap items-center gap-2 text-xs text-slate-500"><Link href="/aukcje" className="hover:text-brand-700">Aukcje</Link><span>›</span><Link href={`/aukcje/${id}`} className="hover:text-brand-700">{row.listing.title}</Link><span>›</span><span>Promuj</span></nav>
    <div className="grid gap-6 border-b border-slate-200 pb-8 sm:grid-cols-[150px_1fr] sm:items-center">
      <div className="relative aspect-[5/4] overflow-hidden rounded-xl bg-slate-100"><Image src={photo?.url ?? "/images/item-placeholder.svg"} alt={row.listing.title} fill className="object-cover"/></div>
      <div><p className="text-xs font-bold uppercase tracking-[.14em] text-brand-600">Centrum promocji</p><h1 className="mt-2 text-3xl font-bold tracking-[-.03em] text-ink">Pomóż tej aukcji dotrzeć dalej</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">Gotowy post, grafika do Facebooka i szybkie udostępnianie. Każde dotarcie może przynieść kolejną ofertę dla Adasia.</p><Link href={`/aukcje/${id}`} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand-700">Wróć do aukcji <ArrowRightIcon size={15}/></Link></div>
    </div>
    <div className="mt-8"><ShareStudio data={{ listingId: id, title: row.listing.title, price: formatMoney(row.auction.currentPrice), endLabel, photoUrl: photo?.url ?? "/images/item-placeholder.svg", publicUrl, category: row.category?.name ?? "Aukcja", region: "Biłgoraj i okolice", bidCount: row.auction.bidCount, auctionStatus: row.auction.status, specialLabel: row.listing.isSpecial ? (row.listing.specialLabel || "Aukcja specjalna") : null }}/></div>
  </main>;
}
