import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";

import { TransactionMessages } from "@/components/transaction-messages";
import { Badge } from "@/components/ui";
import { HandHeartIcon, MapPinIcon, ShieldIcon } from "@/components/icons";
import { db } from "@/db";
import {
  listingPhotos,
  listings,
  transactionMessages,
  transactions,
  users,
} from "@/db/schema";
import { formatMoney } from "@/lib/auction-logic";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function TransactionMessagesPage({
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
    transaction.winnerId === user.id
      ? "buyer"
      : transaction.sellerId === user.id
        ? "seller"
        : null;
  if (!role && user.role !== "admin") notFound();

  const [[listing], [photo], [buyer], [seller], messageRows] = await Promise.all([
    db.select().from(listings).where(eq(listings.id, transaction.listingId)).limit(1),
    db
      .select()
      .from(listingPhotos)
      .where(eq(listingPhotos.listingId, transaction.listingId))
      .orderBy(listingPhotos.position)
      .limit(1),
    db.select().from(users).where(eq(users.id, transaction.winnerId)).limit(1),
    db.select().from(users).where(eq(users.id, transaction.sellerId)).limit(1),
    db
      .select({
        id: transactionMessages.id,
        senderId: transactionMessages.senderId,
        senderNickname: users.nickname,
        body: transactionMessages.body,
        createdAt: transactionMessages.createdAt,
      })
      .from(transactionMessages)
      .innerJoin(users, eq(users.id, transactionMessages.senderId))
      .where(eq(transactionMessages.transactionId, id))
      .orderBy(asc(transactionMessages.createdAt))
      .limit(200),
  ]);

  if (!listing || !buyer || !seller) notFound();

  const counterpart = role === "buyer" ? seller : role === "seller" ? buyer : seller;
  const amount = Number(transaction.plannedDonationAmount ?? transaction.amount);
  const completed = transaction.status === "ZAKONCZONA_POMYSLNIE";

  return (
    <main className="page-shell max-w-6xl py-8 sm:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href={`/transakcje/${id}`} className="text-sm font-semibold text-brand-700">
          ← Wróć do szczegółów
        </Link>
        <Link href="/wiadomosci" className="text-sm font-semibold text-brand-700">
          Wszystkie rozmowy
        </Link>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[340px_1fr]">
        <aside className="space-y-5">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(16,40,32,.05)]">
            <div className="grid gap-4 sm:grid-cols-[110px_1fr] lg:grid-cols-1">
              <div className="relative aspect-square overflow-hidden rounded-lg bg-slate-100">
                {photo?.url ? (
                  <Image
                    src={photo.url}
                    alt={listing.title}
                    fill
                    sizes="340px"
                    className="object-cover"
                  />
                ) : null}
              </div>
              <div>
                <Badge tone={completed ? "success" : "warning"}>
                  {completed ? "Przedmiot odebrany" : "Ustalanie odbioru"}
                </Badge>
                <h2 className="mt-3 text-lg font-bold leading-7 text-ink">
                  {listing.title}
                </h2>
                <p className="mt-4 text-xs text-slate-500">Zadeklarowana wpłata</p>
                <p className="mt-1 text-2xl font-bold text-brand-800">
                  {formatMoney(amount)}
                </p>
                <p className="mt-4 inline-flex items-start gap-2 text-sm leading-6 text-slate-600">
                  <MapPinIcon size={16} className="mt-1 shrink-0 text-brand-700" />
                  Odbiór osobisty: {listing.city}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-brand-100 bg-brand-50/70 p-5">
            <div className="flex gap-3">
              <HandHeartIcon size={20} className="mt-0.5 shrink-0 text-brand-700" />
              <div>
                <h2 className="font-bold text-ink">Pamiętaj o zbiórce</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Zwycięzca wpłaca zadeklarowaną kwotę bezpośrednio na oficjalną zbiórkę Adasia.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex gap-3">
              <ShieldIcon size={20} className="mt-0.5 shrink-0 text-amber-800" />
              <div>
                <h2 className="font-bold text-amber-950">Bezpieczna rozmowa</h2>
                <p className="mt-1 text-sm leading-6 text-amber-900">
                  Ustalcie publiczne miejsce spotkania. Nie przesyłaj kodów BLIK, haseł ani danych karty.
                </p>
              </div>
            </div>
          </section>
        </aside>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_5px_18px_rgba(16,40,32,.06)] sm:p-6">
          <TransactionMessages
            transactionId={id}
            currentUserId={user.id}
            counterpartNickname={role ? counterpart.nickname : "uczestnikami"}
            initialMessages={messageRows.map((message) => ({
              ...message,
              createdAt: message.createdAt.toISOString(),
            }))}
            readOnly={!role}
          />
        </section>
      </div>

      <p className="mt-5 text-center text-xs leading-5 text-slate-500">
        Rozmowa jest prywatna i dotyczy wyłącznie tej zakończonej licytacji. LicytujDobro nie przyjmuje pieniędzy i nie uczestniczy w przekazaniu przedmiotu.
      </p>
    </main>
  );
}
