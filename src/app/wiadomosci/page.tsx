import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq, inArray, or } from "drizzle-orm";

import { MailIcon, ShieldIcon } from "@/components/icons";
import { Badge, EmptyState, LinkButton } from "@/components/ui";
import { db } from "@/db";
import {
  listings,
  transactionMessages,
  transactions,
} from "@/db/schema";
import { formatMoney } from "@/lib/auction-logic";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/logowanie");

  const threads = await db
    .select({
      transaction: transactions,
      listingTitle: listings.title,
      city: listings.city,
    })
    .from(transactions)
    .innerJoin(listings, eq(listings.id, transactions.listingId))
    .where(or(eq(transactions.winnerId, user.id), eq(transactions.sellerId, user.id)))
    .orderBy(desc(transactions.updatedAt));

  const transactionIds = threads.map((thread) => thread.transaction.id);
  const messages = transactionIds.length
    ? await db
        .select()
        .from(transactionMessages)
        .where(inArray(transactionMessages.transactionId, transactionIds))
        .orderBy(desc(transactionMessages.createdAt))
    : [];

  const latestByTransaction = new Map<string, (typeof messages)[number]>();
  for (const message of messages) {
    if (!latestByTransaction.has(message.transactionId)) {
      latestByTransaction.set(message.transactionId, message);
    }
  }

  return (
    <main className="page-shell max-w-5xl py-9 sm:py-12">
      <div className="flex flex-wrap items-end justify-between gap-5 border-b border-slate-200 pb-7">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.14em] text-brand-600">Twoje konto</p>
          <h1 className="mt-2 text-3xl font-bold tracking-[-.03em] text-ink">Wiadomości</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Prywatne rozmowy ze zwycięzcą lub wystawiającym. Wiadomości są dostępne dopiero po zakończeniu licytacji.
          </p>
        </div>
        <LinkButton href="/dashboard" variant="outline">Wróć do konta</LinkButton>
      </div>

      {threads.length ? (
        <section className="mt-7 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="divide-y divide-slate-100">
            {threads.map(({ transaction, listingTitle, city }) => {
              const latest = latestByTransaction.get(transaction.id);
              const completed = transaction.status === "ZAKONCZONA_POMYSLNIE";
              const roleLabel = transaction.winnerId === user.id ? "Rozmowa z wystawiającym" : "Rozmowa ze zwycięzcą";
              return (
                <Link
                  key={transaction.id}
                  href={`/wiadomosci/${transaction.id}`}
                  className="grid gap-4 p-5 hover:bg-brand-50/40 sm:grid-cols-[auto_1fr_auto] sm:items-center"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-100 text-brand-800">
                    <MailIcon size={19} />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-bold text-ink">{listingTitle}</h2>
                      <Badge tone={completed ? "success" : "warning"}>
                        {completed ? "Odebrany" : "Ustalanie odbioru"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs font-semibold text-brand-700">{roleLabel}</p>
                    <p className="mt-2 truncate text-sm text-slate-600">
                      {latest ? latest.body : "Nie ma jeszcze wiadomości — rozpocznij rozmowę."}
                    </p>
                    <p className="mt-2 text-xs text-slate-400">
                      {city} · {formatMoney(transaction.plannedDonationAmount ?? transaction.amount)}
                      {latest ? ` · ${latest.createdAt.toLocaleString("pl-PL", { dateStyle: "short", timeStyle: "short" })}` : ""}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-brand-700">Otwórz →</span>
                </Link>
              );
            })}
          </div>
        </section>
      ) : (
        <div className="mt-8">
          <EmptyState
            title="Nie masz jeszcze rozmów"
            description="Rozmowa pojawi się tutaj po wygraniu licytacji albo po zakończeniu aukcji wystawionego przez Ciebie przedmiotu."
          />
        </div>
      )}

      <section className="mt-7 rounded-xl border border-brand-100 bg-brand-50/60 p-5">
        <div className="flex gap-3">
          <ShieldIcon size={20} className="mt-0.5 shrink-0 text-brand-700" />
          <div>
            <h2 className="font-bold text-ink">Wiadomości tylko między stronami</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Rozmowę widzą zwycięzca i wystawiający. Administrator ma techniczny podgląd przeznaczony do obsługi zgłoszeń i bezpieczeństwa.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
