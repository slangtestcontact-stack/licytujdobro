import Link from "next/link";
import { count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { campaignUpdates, communityEvents, newsletterSubscriptions, shareEvents, supportTeams, teamMemberships } from "@/db/schema";
import { CreateCampaignUpdateForm, CreateCommunityEventForm, CreateTeamForm } from "@/components/admin-growth-controls";
import { Badge, Card } from "@/components/ui";
import { CalendarIcon, MailIcon, MegaphoneIcon, TrophyIcon, UsersIcon } from "@/components/icons";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function CommunityAdminPage() {
  await requireAdmin();
  const [teams, updates, events, [{ subscribers }], [{ shares }]] = await Promise.all([
    db.select().from(supportTeams).orderBy(desc(supportTeams.createdAt)),
    db.select().from(campaignUpdates).orderBy(desc(campaignUpdates.publishedAt)).limit(10),
    db.select().from(communityEvents).orderBy(desc(communityEvents.startsAt)).limit(10),
    db.select({ subscribers: count() }).from(newsletterSubscriptions).where(eq(newsletterSubscriptions.isActive, true)),
    db.select({ shares: count() }).from(shareEvents),
  ]);
  const teamRows = await Promise.all(teams.map(async (team) => {
    const [{ members }] = await db.select({ members: count() }).from(teamMemberships).where(eq(teamMemberships.teamId, team.id));
    return { ...team, members: Number(members) };
  }));

  return <main className="page-shell py-10">
    <nav className="mb-6 text-xs text-slate-500"><Link href="/admin" className="hover:text-brand-700">Panel administratora</Link><span className="mx-2">›</span>Społeczność i promocja</nav>
    <div className="flex flex-wrap items-end justify-between gap-5 border-b border-slate-200 pb-7"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-brand-600">Rozwój akcji</p><h1 className="mt-2 text-3xl font-bold tracking-[-.03em] text-ink">Społeczność i promocja</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Zarządzaj drużynami, aktualnościami, tygodniami tematycznymi i ruchem z udostępnień.</p></div><Link href="/druzyny" className="text-sm font-semibold text-brand-700">Widok publiczny →</Link></div>
    <section className="mt-7 grid grid-cols-2 gap-4 lg:grid-cols-4"><Metric icon={TrophyIcon} label="Drużyny" value={teams.length}/><Metric icon={UsersIcon} label="Członkostwa" value={teamRows.reduce((sum,item)=>sum+item.members,0)}/><Metric icon={MailIcon} label="Newsletter" value={Number(subscribers)}/><Metric icon={MegaphoneIcon} label="Udostępnienia" value={Number(shares)}/></section>

    <section className="mt-10 grid gap-6 xl:grid-cols-3">
      <Card className="p-5"><h2 className="text-lg font-bold text-ink">Nowa drużyna</h2><p className="mt-2 text-sm leading-6 text-slate-600">Dla szkoły, firmy, klubu, koła lub grupy znajomych. Po utworzeniu przekaż organizatorowi kod dołączenia.</p><div className="mt-4"><CreateTeamForm/></div></Card>
      <Card className="p-5"><h2 className="text-lg font-bold text-ink">Aktualność o Adasiu</h2><p className="mt-2 text-sm leading-6 text-slate-600">Krótka informacja widoczna na stronie głównej i stronie Adasia.</p><div className="mt-4"><CreateCampaignUpdateForm/></div></Card>
      <Card className="p-5"><h2 className="text-lg font-bold text-ink">Wydarzenie</h2><p className="mt-2 text-sm leading-6 text-slate-600">Tydzień tematyczny, wieczór licytacyjny albo lokalna zbiórka przedmiotów.</p><div className="mt-4"><CreateCommunityEventForm/></div></Card>
    </section>

    <section className="mt-12 grid gap-8 lg:grid-cols-2">
      <div><h2 className="text-xl font-bold text-ink">Drużyny i kody</h2><div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white"><div className="divide-y divide-slate-100">{teamRows.map((team)=><div key={team.id} className="p-4"><div className="flex items-start justify-between gap-4"><div><Link href={`/druzyny/${team.slug}`} className="font-semibold text-ink hover:text-brand-700">{team.name}</Link><p className="mt-1 text-xs text-slate-500">{team.members} członków</p></div><Badge tone={team.isActive?"success":"neutral"}>{team.isActive?"aktywna":"wyłączona"}</Badge></div><p className="mt-3 rounded-md bg-slate-50 px-3 py-2 font-mono text-sm font-bold tracking-[.12em] text-brand-800">Kod: {team.joinCode}</p></div>)}</div></div></div>
      <div><h2 className="text-xl font-bold text-ink">Ostatnie aktualności</h2><div className="mt-4 space-y-3">{updates.map((update)=><article key={update.id} className="rounded-xl border border-slate-200 bg-white p-4"><time className="text-xs text-slate-500">{update.publishedAt.toLocaleString("pl-PL")}</time><h3 className="mt-1 font-semibold text-ink">{update.title}</h3><p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{update.body}</p></article>)}</div></div>
    </section>

    <section className="mt-12"><h2 className="flex items-center gap-2 text-xl font-bold text-ink"><CalendarIcon size={20} className="text-brand-700"/>Kalendarz wydarzeń</h2><div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-[.06em] text-slate-500"><tr><th className="px-4 py-3">Nazwa</th><th>Rodzaj</th><th>Rozpoczęcie</th><th>Zakończenie</th><th>Status</th></tr></thead><tbody>{events.map((event)=><tr key={event.id} className="border-t border-slate-100"><td className="px-4 py-3 font-semibold text-ink">{event.title}</td><td>{event.kind}</td><td>{event.startsAt.toLocaleString("pl-PL")}</td><td>{event.endsAt.toLocaleString("pl-PL")}</td><td><Badge tone={event.isPublished?"success":"neutral"}>{event.isPublished?"widoczne":"ukryte"}</Badge></td></tr>)}</tbody></table></div></section>
  </main>;
}

function Metric({icon:Icon,label,value}:{icon:typeof TrophyIcon;label:string;value:number}){return <div className="rounded-xl border border-slate-200 bg-white p-4"><Icon size={18} className="text-brand-700"/><p className="mt-3 text-2xl font-bold text-ink">{value}</p><p className="mt-1 text-xs text-slate-500">{label}</p></div>;}
