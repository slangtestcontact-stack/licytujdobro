import Link from "next/link";
import { desc, eq, isNull, sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/db";
import { backupRuns, campaigns, notificationOutbox, operationalErrors } from "@/db/schema";
import { Badge, Card } from "@/components/ui";
import { getAppEnvironment } from "@/lib/environment";

export const dynamic = "force-dynamic";

export default async function SystemPage() {
  await requireAdmin();
  let database = true;
  try { await db.execute(sql`select 1`); } catch { database = false; }
  const [[campaign], [lastBackup], [{ failedNotifications }], [{ unresolvedErrors }]] = await Promise.all([
    db.select().from(campaigns).where(eq(campaigns.isActive, true)).limit(1),
    db.select().from(backupRuns).orderBy(desc(backupRuns.startedAt)).limit(1),
    db.select({ failedNotifications: sql<number>`count(*)` }).from(notificationOutbox).where(eq(notificationOutbox.status, "FAILED")),
    db.select({ unresolvedErrors: sql<number>`count(*)` }).from(operationalErrors).where(isNull(operationalErrors.resolvedAt)),
  ]);
  const checks = [
    { name: "Baza danych", ok: database, detail: database ? "Połączenie działa" : "Brak połączenia" },
    { name: "Konfiguracja kampanii", ok: Boolean(campaign?.piggyBankUrl && campaign?.terminalUrl), detail: campaign?.name || "Brak aktywnej kampanii" },
    { name: "Terminal - test administratora", ok: campaign?.terminalTestResult === "WORKS", detail: campaign?.terminalTestedAt ? `${campaign.terminalTestResult === "WORKS" ? "działa" : "problem"}, ${campaign.terminalTestedAt.toLocaleString("pl-PL")}` : "niesprawdzony" },
    { name: "Google OAuth", ok: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET), detail: process.env.GOOGLE_CLIENT_ID ? "skonfigurowany" : "brak danych aplikacji" },
    { name: "Facebook OAuth", ok: Boolean(process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET), detail: process.env.FACEBOOK_CLIENT_ID ? "skonfigurowany" : "brak danych aplikacji" },
    { name: "Apple OAuth", ok: Boolean(process.env.APPLE_CLIENT_ID && process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID && process.env.APPLE_PRIVATE_KEY), detail: process.env.APPLE_CLIENT_ID ? "skonfigurowany" : "brak Services ID lub klucza .p8" },
    { name: "E-mail", ok: (process.env.EMAIL_PROVIDER || "dev") !== "dev", detail: (process.env.EMAIL_PROVIDER || "dev") === "dev" ? "tryb deweloperski - wiadomości w konsoli" : "zewnętrzny dostawca" },
    { name: "SMS", ok: (process.env.SMS_PROVIDER || "dev") !== "dev", detail: (process.env.SMS_PROVIDER || "dev") === "dev" ? "tryb deweloperski - wiadomości w konsoli" : "zewnętrzny dostawca" },
    { name: "Nieudane powiadomienia", ok: Number(failedNotifications) === 0, detail: `${Number(failedNotifications)} zadań ze statusem FAILED` },
    { name: "Błędy efektów ubocznych", ok: Number(unresolvedErrors) === 0, detail: `${Number(unresolvedErrors)} nierozwiązanych błędów zapisanych w monitoringu` },
    { name: "Ostatnia kopia", ok: lastBackup?.status === "SUCCESS", detail: lastBackup ? `${lastBackup.status} · ${lastBackup.finishedAt?.toLocaleString("pl-PL") || lastBackup.startedAt.toLocaleString("pl-PL")}` : "brak zarejestrowanej kopii" },
    { name: "Test odtworzenia", ok: Boolean(lastBackup?.restoreTestedAt), detail: lastBackup?.restoreTestedAt?.toLocaleString("pl-PL") || "jeszcze niewykonany" },
    { name: "Publiczny kontakt", ok: Boolean(process.env.ORGANIZER_NAME && process.env.ORGANIZER_EMAIL && !process.env.ORGANIZER_EMAIL.includes("example")), detail: process.env.ORGANIZER_EMAIL || "brak prawdziwego adresu e-mail" },
    { name: "Zgody rodziny", ok: [process.env.FAMILY_NAME_CONSENT_CONFIRMED, process.env.FAMILY_PHOTO_CONSENT_CONFIRMED, process.env.FAMILY_STORY_CONSENT_CONFIRMED].every((value) => value === "true"), detail: "imię i nazwisko · zdjęcia · historia" },
  ];
  const readyCount = checks.filter((check) => check.ok).length;
  const allReady = readyCount === checks.length;
  return <main className="page-shell max-w-5xl py-12">
    <p className="text-xs font-bold uppercase tracking-[.14em] text-brand-600">Administracja</p>
    <div className="mt-2 flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-bold text-ink">Gotowość do publikacji</h1><p className="mt-3 text-slate-600">Najważniejsze kontrole techniczne, organizacyjne i bezpieczeństwa przed pokazaniem strony publicznie.</p></div><Badge tone={getAppEnvironment() === "production" ? "success" : "warning"}>{getAppEnvironment().toUpperCase()}</Badge></div>

    <div className={`mt-7 rounded-xl border p-5 ${allReady ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
      <p className="text-sm font-bold text-ink">{allReady ? "System spełnia wszystkie kontrolowane warunki" : `Gotowe ${readyCount} z ${checks.length} punktów`}</p>
      <p className="mt-1 text-sm leading-6 text-slate-600">{allReady ? "Przed publikacją wykonaj jeszcze zamknięty pilotaż i końcową akceptację rodziny." : "Pozycje oznaczone jako wymagające działania trzeba uzupełnić przed publicznym uruchomieniem."}</p>
    </div>

    <div className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white">{checks.map((check)=><div key={check.name} className="grid gap-2 border-b border-slate-100 p-4 last:border-0 sm:grid-cols-[220px_1fr_auto] sm:items-center"><span className="font-medium text-ink">{check.name}</span><span className="text-sm text-slate-500">{check.detail}</span><Badge tone={check.ok ? "success" : "warning"}>{check.ok ? "Gotowe" : "Wymaga działania"}</Badge></div>)}</div>

    <div className="mt-8 grid gap-6 lg:grid-cols-2">
      <Card className="p-5"><h2 className="text-lg font-bold text-ink">Kopie zapasowe</h2><p className="mt-2 text-sm leading-6 text-slate-600">Polecenie tworzy zrzut PostgreSQL, a w trybie lokalnym także kopię <code>public/uploads</code>. Obiekty Cloudflare R2 trzeba chronić osobno; baza zawiera ich adresy, ale nie zawartość plików. Kopię przechowuj poza serwerem aplikacji.</p><pre className="mt-4 overflow-x-auto rounded-lg bg-slate-950 p-4 text-xs text-white">npm run backup</pre><pre className="mt-3 overflow-x-auto rounded-lg bg-slate-950 p-4 text-xs text-white">npm run backup:verify -- backups/.../database.dump</pre><p className="mt-3 text-xs leading-5 text-slate-500">Do weryfikacji ustaw osobną zmienną RESTORE_TEST_DATABASE_URL. Nigdy nie odtwarzaj testowo na produkcji.</p></Card>
      <Card className="p-5"><h2 className="text-lg font-bold text-ink">Eksport CSV</h2><p className="mt-2 text-sm leading-6 text-slate-600">Pliki administracyjne zawierają dane osobowe. Przechowuj je bezpiecznie i usuń po użyciu.</p><div className="mt-4 grid grid-cols-2 gap-2">{[["users","Użytkownicy"],["auctions","Aukcje"],["transactions","Transakcje"],["reports","Zgłoszenia"],["teams","Drużyny"]].map(([type,label])=><a key={type} href={`/api/admin/export/${type}`} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 px-3 text-sm font-semibold text-brand-800 hover:border-brand-500">{label}</a>)}</div></Card>
    </div>

    <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950"><strong>Harmonogram produkcyjny:</strong> wywołuj <code>/api/cron/end-auctions</code>, <code>/api/cron/reminders</code> i <code>/api/cron/notifications</code> z nagłówkiem Bearer CRON_SECRET. Samo istnienie endpointów nie oznacza, że harmonogram działa.</div>
    <Link href="/admin" className="mt-6 inline-block text-sm font-semibold text-brand-700">← Wróć do panelu</Link>
  </main>;
}
