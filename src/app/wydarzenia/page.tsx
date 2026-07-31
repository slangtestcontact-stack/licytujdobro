import Link from "next/link";
import { and, asc, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { communityEvents } from "@/db/schema";
import { CalendarIcon, MegaphoneIcon } from "@/components/icons";
import { EmptyState, LinkButton, SectionHeading } from "@/components/ui";

const KIND_LABEL: Record<string,string> = { THEME_WEEK:"Tydzień tematyczny", AUCTION_NIGHT:"Wieczór licytacyjny", ITEM_COLLECTION:"Zbiórka przedmiotów", LOCAL_EVENT:"Wydarzenie lokalne" };

export default async function EventsPage() {
  const events = await db.select().from(communityEvents).where(and(eq(communityEvents.isPublished, true), gte(communityEvents.endsAt, new Date()))).orderBy(asc(communityEvents.startsAt));
  return <main className="page-shell py-12"><SectionHeading eyebrow="Kalendarz pomocy" title="Wydarzenia dla Adasia" description="Tygodnie tematyczne, wieczory licytacyjne i lokalne zbiórki przedmiotów w jednym miejscu." action={<LinkButton href="/dodaj-przedmiot" size="sm">Wystaw przedmiot</LinkButton>}/>{events.length ? <div className="mt-8 grid gap-5 lg:grid-cols-2">{events.map((event) => <Link href={`/wydarzenia/${event.slug}`} key={event.id} className="block rounded-xl border border-slate-200 bg-white p-6 hover:border-brand-300"><div className="flex items-start justify-between gap-4"><span className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-50 text-brand-700">{event.kind === "AUCTION_NIGHT" ? <MegaphoneIcon size={21}/> : <CalendarIcon size={21}/>}</span><span className="rounded-md bg-brand-50 px-2 py-1 text-[11px] font-bold uppercase tracking-[.08em] text-brand-700">{KIND_LABEL[event.kind] ?? "Wydarzenie"}</span></div><h2 className="mt-4 text-xl font-bold text-ink">{event.title}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{event.description}</p><div className="mt-5 border-t border-slate-100 pt-4 text-sm font-semibold text-brand-800"><time>{event.startsAt.toLocaleString("pl-PL", { dateStyle:"medium", timeStyle:"short" })}</time><span className="mx-2 text-slate-300">-</span><time>{event.endsAt.toLocaleString("pl-PL", { dateStyle:"medium", timeStyle:"short" })}</time></div></Link>)}</div> : <div className="mt-8"><EmptyState title="Brak zaplanowanych wydarzeń" description="Nowe tygodnie tematyczne i lokalne wydarzenia pojawią się tutaj."/></div>}</main>;
}
