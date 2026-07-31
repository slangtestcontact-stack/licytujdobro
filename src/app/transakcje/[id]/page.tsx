import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { ReportForm } from "@/components/action-widgets";
import { DirectHandoverPanel } from "@/components/direct-handover-panel";
import {
  CheckIcon,
  HandHeartIcon,
  MailIcon,
  MapPinIcon,
  ShieldIcon,
  UserIcon,
} from "@/components/icons";
import { Badge } from "@/components/ui";
import { db } from "@/db";
import {
  campaigns,
  listingPhotos,
  listings,
  transactionEvents,
  transactions,
  users,
} from "@/db/schema";
import { formatMoney } from "@/lib/auction-logic";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function TransactionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/logowanie");

  const { id } = await params;
  const [transaction] = await db
    .select()
    .from(transactions)
    .where(eq(transactions.id, id))
    .limit(1);
  if (!transaction) notFound();

  const role =
    user.id === transaction.winnerId
      ? "buyer"
      : user.id === transaction.sellerId
        ? "seller"
        : null;
  if (!role && user.role !== "admin") notFound();

  const [[listing], [photo], [buyer], [seller], [campaign], events] =
    await Promise.all([
      db.select().from(listings).where(eq(listings.id, transaction.listingId)).limit(1),
      db
        .select()
        .from(listingPhotos)
        .where(eq(listingPhotos.listingId, transaction.listingId))
        .orderBy(listingPhotos.position)
        .limit(1),
      db.select().from(users).where(eq(users.id, transaction.winnerId)).limit(1),
      db.select().from(users).where(eq(users.id, transaction.sellerId)).limit(1),
      transaction.campaignId
        ? db.select().from(campaigns).where(eq(campaigns.id, transaction.campaignId)).limit(1)
        : db.select().from(campaigns).where(eq(campaigns.isActive, true)).limit(1),
      db
        .select()
        .from(transactionEvents)
        .where(eq(transactionEvents.transactionId, id))
        .orderBy(transactionEvents.createdAt),
    ]);

  if (!listing || !buyer || !seller) notFound();

  const amount = Number(transaction.plannedDonationAmount ?? transaction.amount);
  const fundraiserUrl = transaction.piggyBankUrlSnapshot ?? campaign?.piggyBankUrl ?? "#";
  const counterpart = role === "buyer" ? seller : role === "seller" ? buyer : seller;
  const counterpartLabel = role === "buyer" ? "wystawiającym" : "zwycięzcą";
  const completed = transaction.status === "ZAKONCZONA_POMYSLNIE";

  return (
    <main className="page-shell max-w-6xl py-8 sm:py-10">
      <Link href="/dashboard" className="text-sm font-semibold text-brand-700">
        ← Wróć do konta
      </Link>

      <div className="mt-5 grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(16,40,32,.05)] sm:p-6">
          <p className="text-lg font-bold text-ink">
            {role === "buyer"
              ? "Twoja wygrana"
              : role === "seller"
                ? "Twój przekazany przedmiot"
                : "Podgląd przekazania"}
          </p>
          <div className="mt-5 grid gap-5 sm:grid-cols-[180px_1fr]">
            <div className="relative aspect-square overflow-hidden rounded-lg bg-slate-100">
              {photo?.url ? (
                <Image
                  src={photo.url}
                  alt={listing.title}
                  fill
                  sizes="180px"
                  className="object-cover"
                />
              ) : null}
            </div>
            <div>
              <Badge tone={completed ? "success" : "warning"}>
                {completed ? "Przedmiot odebrany" : "Ustalanie odbioru"}
              </Badge>
              <h1 className="text-balance mt-4 text-2xl font-bold tracking-[-.03em] text-ink">
                {listing.title}
              </h1>
              <p className="mt-5 text-sm text-slate-500">Zadeklarowana kwota wsparcia</p>
              <p className="mt-1 text-3xl font-bold tracking-[-.03em] text-brand-800">
                {formatMoney(amount)}
              </p>
              <p className="mt-4 inline-flex items-center gap-2 text-sm text-slate-600">
                <MapPinIcon size={16} className="text-brand-700" />
                Odbiór osobisty: {listing.city}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-brand-200 bg-brand-50/70 p-6 shadow-[0_5px_18px_rgba(16,40,32,.06)]">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-800 text-white">
              {completed ? <CheckIcon size={22} /> : <HandHeartIcon size={22} />}
            </span>
            <div>
              <p className="text-2xl font-bold tracking-[-.03em] text-brand-800">
                {completed
                  ? "Dziękujemy — przedmiot został odebrany"
                  : role === "buyer"
                    ? "Gratulacje, wygrałeś tę licytację"
                    : "Licytacja została zakończona"}
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-700">
                {completed
                  ? "Obie strony potwierdziły osobisty odbiór."
                  : role === "buyer"
                    ? `Wpłać ${formatMoney(amount)} bezpośrednio na oficjalną zbiórkę, a następnie napisz do wystawiającego i umów odbiór w miejscowości ${listing.city}.`
                    : role === "seller"
                      ? `Napisz do zwycięzcy i ustalcie osobisty odbiór w miejscowości ${listing.city}. LicytujDobro nie przyjmuje ani nie sprawdza wpłat.`
                      : "Administrator ma podgląd procesu, ale nie ustala odbioru za użytkowników."}
              </p>
            </div>
          </div>

          {!completed ? (
            <div className="mt-6 grid gap-3">
              {fundraiserUrl !== "#" ? (
                <a
                  href={fundraiserUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-brand-800 px-5 text-sm font-bold text-white hover:bg-brand-700"
                >
                  <HandHeartIcon size={17} />
                  {role === "buyer"
                    ? `Wpłać ${formatMoney(amount)} na zbiórkę ↗`
                    : "Otwórz oficjalną zbiórkę ↗"}
                </a>
              ) : null}
              <Link
                href={`/wiadomosci/${id}`}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-brand-200 bg-white px-5 text-sm font-bold text-brand-800 hover:bg-brand-50"
              >
                <MailIcon size={17} />
                {role
                  ? `Napisz do ${counterpartLabel}`
                  : "Podejrzyj rozmowę"}
              </Link>
            </div>
          ) : (
            <Link
              href={`/wiadomosci/${id}`}
              className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-brand-200 bg-white px-5 text-sm font-bold text-brand-800 hover:bg-brand-50"
            >
              <MailIcon size={17} /> Zobacz rozmowę
            </Link>
          )}

          <div className="mt-5 rounded-lg border border-brand-100 bg-white/80 p-4 text-sm leading-6 text-slate-700">
            <strong className="text-ink">Rola LicytujDobro:</strong> udostępniamy licytację i prywatną rozmowę między stronami. Nie pobieramy pieniędzy, nie weryfikujemy wpłat i nie pośredniczymy w odbiorze.
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="text-lg font-bold text-ink">Co teraz?</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <Step number="1" title="Wpłata na zbiórkę">
            Zwycięzca wpłaca zadeklarowaną kwotę bezpośrednio w serwisie Siepomaga.
          </Step>
          <Step number="2" title="Wiadomość w serwisie">
            Zwycięzca i wystawiający ustalają w prywatnej rozmowie termin oraz publiczne miejsce spotkania.
          </Step>
          <Step number="3" title="Odbiór osobisty">
            Po przekazaniu przedmiotu obie strony mogą potwierdzić zakończenie procesu.
          </Step>
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_.85fr]">
        <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-800">
              <MailIcon size={18} />
            </span>
            <div>
              <h2 className="text-lg font-bold text-ink">Prywatna rozmowa</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {role
                  ? `Rozmawiasz z użytkownikiem ${counterpart.nickname}. Ustalcie dogodny termin i publiczne miejsce osobistego odbioru.`
                  : "Administrator może podejrzeć rozmowę wyłącznie przy obsłudze zgłoszenia."}
              </p>
            </div>
          </div>
          <div className="mt-5 rounded-lg border border-slate-100 bg-slate-50/70 p-4">
            <div className="flex items-center gap-3">
              <UserIcon size={18} className="text-brand-700" />
              <div>
                <p className="text-xs text-slate-500">Druga strona</p>
                <p className="mt-0.5 text-sm font-bold text-ink">{counterpart.nickname}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <MapPinIcon size={18} className="text-brand-700" />
              <div>
                <p className="text-xs text-slate-500">Miejscowość odbioru</p>
                <p className="mt-0.5 text-sm font-bold text-ink">{listing.city}</p>
              </div>
            </div>
          </div>
          <Link
            href={`/wiadomosci/${id}`}
            className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-800 px-4 text-sm font-bold text-white hover:bg-brand-700"
          >
            <MailIcon size={17} />
            {role ? `Otwórz rozmowę z ${counterpartLabel}` : "Podejrzyj rozmowę"}
          </Link>
        </section>

        {role ? (
          <DirectHandoverPanel
            transactionId={id}
            role={role}
            buyerConfirmed={Boolean(transaction.buyerConfirmedHandoverAt)}
            sellerConfirmed={Boolean(transaction.sellerConfirmedHandoverAt)}
          />
        ) : (
          <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
            <h2 className="font-bold text-ink">Podgląd administratora</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Administrator nie weryfikuje wpłaty, nie odpowiada za użytkowników i nie potwierdza odbioru za żadną ze stron.
            </p>
          </section>
        )}
      </div>

      <section className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5">
        <div className="flex gap-3">
          <ShieldIcon size={21} className="mt-0.5 shrink-0 text-amber-800" />
          <div>
            <h2 className="font-bold text-amber-950">Bezpieczny odbiór osobisty</h2>
            <p className="mt-1 text-sm leading-6 text-amber-900">
              Spotkajcie się w publicznym miejscu. Nie przesyłajcie w wiadomościach kodów BLIK, haseł ani danych karty. Wystawiający może przed przekazaniem poprosić o pokazanie potwierdzenia wpłaty bezpośrednio podczas spotkania.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-7 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-bold text-ink">Historia procesu</h2>
        <ol className="mt-5 space-y-4 border-l border-slate-200 pl-5">
          {events.length ? (
            events.map((event) => (
              <li key={event.id} className="relative">
                <span className="absolute -left-[25px] top-1.5 h-2 w-2 rounded-full bg-brand-700" />
                <p className="text-sm font-semibold text-ink">{event.title}</p>
                {event.details ? (
                  <p className="mt-1 text-sm text-slate-600">{event.details}</p>
                ) : null}
                <time className="mt-1 block text-xs text-slate-400">
                  {event.createdAt.toLocaleString("pl-PL", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </time>
              </li>
            ))
          ) : (
            <li className="text-sm text-slate-500">
              Proces rozpoczął się po zakończeniu licytacji.
            </li>
          )}
        </ol>
      </section>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <Link href="/bezpieczenstwo" className="text-sm font-semibold text-brand-700">
          Zasady bezpiecznego odbioru →
        </Link>
        <ReportForm targetType="TRANSACTION" targetId={id} />
      </div>
    </main>
  );
}

function Step({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 rounded-lg border border-slate-200 bg-slate-50/60 p-4">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-800 text-sm font-bold text-white">
        {number}
      </span>
      <div>
        <h3 className="font-bold text-ink">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-slate-600">{children}</p>
      </div>
    </div>
  );
}
