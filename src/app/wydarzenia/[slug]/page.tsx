import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { auctions, communityEvents, eventListings, listings } from "@/db/schema";
import { formatMoney } from "@/lib/auction-logic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const [event] = await db.select().from(communityEvents).where(eq(communityEvents.slug, slug)).limit(1);
  if (!event || !event.isPublished) return { title: "Wydarzenie - LicytujDobro" };
  const title = `${event.title} - LicytujDobro`;
  const description = event.description.slice(0, 200);
  return {
    title,
    description,
    alternates: { canonical: `/wydarzenia/${slug}` },
    openGraph: { title, description, type: "website", url: `/wydarzenia/${slug}`, locale: "pl_PL" },
  };
}

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [event] = await db.select().from(communityEvents).where(eq(communityEvents.slug, slug)).limit(1);
  if (!event || !event.isPublished) notFound();

  const [linked, paid] = await Promise.all([
    db
      .select({ id: listings.id, title: listings.title, status: listings.status, currentPrice: auctions.currentPrice })
      .from(eventListings)
      .innerJoin(listings, eq(eventListings.listingId, listings.id))
      .leftJoin(auctions, eq(auctions.listingId, listings.id))
      .where(eq(eventListings.eventId, event.id)),
    db.execute<{ sum: string }>(sql`
      select coalesce(sum(coalesce(t.planned_donation_amount, t.amount)), 0)::text as sum
      from transactions t
      join event_listings el on el.listing_id = t.listing_id
      where el.event_id = ${event.id} and t.status = 'ZAKONCZONA_POMYSLNIE'
    `),
  ]);

  const baseUrl = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const eventJsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.description,
    startDate: event.startsAt.toISOString(),
    endDate: event.endsAt.toISOString(),
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location: {
      "@type": "Place",
      name: process.env.NEXT_PUBLIC_PILOT_CITY || "Biłgoraj i okolice",
    },
    organizer: {
      "@type": "Organization",
      name: process.env.ORGANIZER_NAME?.trim() || "LicytujDobro",
      url: baseUrl,
    },
    url: `${baseUrl}/wydarzenia/${slug}`,
  };

  return (
    <main className="page-shell max-w-5xl py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(eventJsonLd).replace(/</g, "\\u003c") }} />
      <p className="text-xs font-bold uppercase tracking-[.14em] text-brand-600">Wydarzenie społecznościowe</p>
      <h1 className="mt-3 text-4xl font-bold tracking-[-.035em] text-ink">{event.title}</h1>
      <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">{event.description}</p>
      <div className="mt-7 grid gap-4 sm:grid-cols-3">
        <Stat label="Start" value={event.startsAt.toLocaleString("pl-PL", { dateStyle: "medium", timeStyle: "short" })}/>
        <Stat label="Koniec" value={event.endsAt.toLocaleString("pl-PL", { dateStyle: "medium", timeStyle: "short" })}/>
        <Stat label="Potwierdzone wpłaty" value={formatMoney(paid.rows[0]?.sum ?? 0)}/>
      </div>
      <section className="mt-12">
        <div className="flex items-center justify-between"><h2 className="text-2xl font-bold text-ink">Aukcje wydarzenia</h2></div>
        {linked.length ? (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {linked.map((auction) => <Link key={auction.id} href={`/aukcje/${auction.id}`} className="rounded-xl border border-slate-200 bg-white p-5 hover:border-brand-300"><h3 className="font-bold text-ink">{auction.title}</h3><p className="mt-3 text-sm text-slate-600">{auction.currentPrice ? formatMoney(auction.currentPrice) : "Oczekuje na start"}</p></Link>)}
          </div>
        ) : <p className="mt-5 rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">Aukcje zostaną przypisane przez administratora.</p>}
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-2 font-bold text-ink">{value}</p></div>;
}
