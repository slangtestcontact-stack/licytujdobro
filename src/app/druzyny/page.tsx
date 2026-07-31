import Link from "next/link";
import { eq, sql } from "drizzle-orm";

import { JoinTeamForm } from "@/components/growth-widgets";
import { ArrowRightIcon, TrophyIcon, UsersIcon } from "@/components/icons";
import { Card, EmptyState, SectionHeading } from "@/components/ui";
import { db } from "@/db";
import { supportTeams, teamMemberships } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { formatMoney } from "@/lib/auction-logic";

export const dynamic = "force-dynamic";

type TeamStatsRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  image_url: string | null;
  members: string;
  auctions: string;
  amount: string;
};

export default async function TeamsPage() {
  const user = await getCurrentUser();
  const [statsResult, currentMembership] = await Promise.all([
    db.execute<TeamStatsRow>(sql`
      select
        st.id,
        st.slug,
        st.name,
        st.description,
        st.image_url,
        (select count(*)::text from team_memberships tm where tm.team_id = st.id) as members,
        (
          select count(*)::text
          from listings l
          where l.user_id in (select tm.user_id from team_memberships tm where tm.team_id = st.id)
        ) as auctions,
        (
          select coalesce(sum(coalesce(t.planned_donation_amount, t.amount)), 0)::text
          from transactions t
          join listings l on l.id = t.listing_id
          where t.status = 'ZAKONCZONA_POMYSLNIE'
            and l.user_id in (select tm.user_id from team_memberships tm where tm.team_id = st.id)
        ) as amount
      from support_teams st
      where st.is_active = true
      order by st.created_at asc
    `),
    user
      ? db
          .select({ team: supportTeams })
          .from(teamMemberships)
          .innerJoin(supportTeams, eq(supportTeams.id, teamMemberships.teamId))
          .where(eq(teamMemberships.userId, user.id))
          .limit(1)
          .then((rows) => rows[0])
      : Promise.resolve(undefined),
  ]);

  const stats = statsResult.rows;

  return (
    <main className="page-shell py-12">
      <SectionHeading eyebrow="Społeczność" title="Drużyny wspierające Adasia" description="Szkoły, firmy, kluby i grupy znajomych mogą wspólnie wystawiać przedmioty i mierzyć efekt swojej pomocy." />
      <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px]">
        <div>
          {stats.length ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {stats.map((team) => (
                <Card key={team.id} className="p-5">
                  <div className="flex items-start justify-between gap-4"><span className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><UsersIcon size={21}/></span><span className="text-xs font-bold uppercase tracking-[.08em] text-slate-400">Drużyna</span></div>
                  <h2 className="mt-4 text-lg font-bold text-ink">{team.name}</h2>
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{team.description || "Wspólna drużyna lokalnej społeczności."}</p>
                  <div className="mt-5 grid grid-cols-3 gap-3 border-y border-slate-100 py-4 text-center"><Metric value={Number(team.members)} label="osób"/><Metric value={Number(team.auctions)} label="przedmiotów"/><Metric value={formatMoney(team.amount)} label="wpłat"/></div>
                  <Link href={`/druzyny/${team.slug}`} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand-700">Zobacz drużynę <ArrowRightIcon size={14}/></Link>
                </Card>
              ))}
            </div>
          ) : <EmptyState title="Pierwsze drużyny już wkrótce" description="Administrator może utworzyć drużynę dla szkoły, firmy, klubu lub grupy wolontariuszy." />}
        </div>
        <aside className="h-fit rounded-xl border border-brand-200 bg-brand-50/60 p-6 lg:sticky lg:top-24"><TrophyIcon size={25} className="text-brand-700"/><h2 className="mt-4 text-xl font-bold text-ink">Dołącz kodem drużyny</h2><p className="mt-2 text-sm leading-6 text-slate-600">Kod otrzymasz od szkoły, firmy lub organizatora. Twoje przyszłe aukcje będą liczone do wspólnego wyniku.</p>{user ? <div className="mt-5"><JoinTeamForm currentTeamName={currentMembership?.team.name}/></div> : <Link href="/logowanie" className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-brand-700 px-4 text-sm font-semibold text-white">Zaloguj się, aby dołączyć</Link>}</aside>
      </section>
    </main>
  );
}

function Metric({ value, label }: { value: string | number; label: string }) {
  return <div><p className="font-bold text-brand-800">{value}</p><p className="mt-1 text-[11px] text-slate-500">{label}</p></div>;
}
