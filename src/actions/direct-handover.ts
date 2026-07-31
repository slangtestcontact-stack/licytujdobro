"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { notifications, transactionEvents, transactions } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

export type DirectHandoverResult = {
  ok: boolean;
  error?: string;
  completed?: boolean;
};

export async function confirmDirectHandoverAction(
  transactionId: string,
  _previous: DirectHandoverResult,
  _formData: FormData,
): Promise<DirectHandoverResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Zaloguj się, aby potwierdzić przekazanie." };

  try {
    const result = await db.transaction(async (tx) => {
      const [transaction] = await tx
        .select()
        .from(transactions)
        .where(eq(transactions.id, transactionId))
        .for("update");

      if (!transaction) throw new Error("Nie znaleziono przekazania.");
      const role =
        transaction.winnerId === user.id
          ? "buyer"
          : transaction.sellerId === user.id
            ? "seller"
            : null;
      if (!role) throw new Error("Nie masz dostępu do tego przekazania.");
      if (["ANULOWANA", "SPOR"].includes(transaction.status)) {
        throw new Error("Tego przekazania nie można teraz potwierdzić.");
      }

      const alreadyConfirmed =
        role === "buyer"
          ? Boolean(transaction.buyerConfirmedHandoverAt)
          : Boolean(transaction.sellerConfirmedHandoverAt);
      const alreadyCompleted =
        Boolean(transaction.buyerConfirmedHandoverAt) &&
        Boolean(transaction.sellerConfirmedHandoverAt);
      if (alreadyConfirmed) return { completed: alreadyCompleted };

      const now = new Date();
      const buyerConfirmed = Boolean(transaction.buyerConfirmedHandoverAt) || role === "buyer";
      const sellerConfirmed = Boolean(transaction.sellerConfirmedHandoverAt) || role === "seller";
      const completed = buyerConfirmed && sellerConfirmed;

      await tx
        .update(transactions)
        .set({
          buyerConfirmedHandoverAt:
            role === "buyer" ? now : transaction.buyerConfirmedHandoverAt,
          sellerConfirmedHandoverAt:
            role === "seller" ? now : transaction.sellerConfirmedHandoverAt,
          status: completed ? "ZAKONCZONA_POMYSLNIE" : "UMAWIANIE_SPOTKANIA",
          updatedAt: now,
        })
        .where(eq(transactions.id, transactionId));

      await tx.insert(transactionEvents).values({
        transactionId,
        actorId: user.id,
        eventType: role === "buyer" ? "DIRECT_PICKUP_CONFIRMED_BY_BUYER" : "DIRECT_PICKUP_CONFIRMED_BY_SELLER",
        title:
          role === "buyer"
            ? "Zwycięzca potwierdził odbiór przedmiotu"
            : "Wystawiający potwierdził przekazanie przedmiotu",
        details: completed
          ? "Obie strony potwierdziły osobisty odbiór. Proces został zakończony."
          : "Oczekiwanie na potwierdzenie drugiej strony.",
      });

      if (completed) {
        await tx.insert(notifications).values([
          {
            userId: transaction.winnerId,
            type: "PRZEDMIOT_PRZEKAZANY",
            title: "Przekazanie zakończone",
            body: "Obie strony potwierdziły osobisty odbiór przedmiotu. Dziękujemy za pomoc Adasiowi.",
            relatedEntityType: "transaction",
            relatedEntityId: transactionId,
          },
          {
            userId: transaction.sellerId,
            type: "PRZEDMIOT_PRZEKAZANY",
            title: "Przekazanie zakończone",
            body: "Obie strony potwierdziły osobisty odbiór przedmiotu. Dziękujemy za przekazanie rzeczy.",
            relatedEntityType: "transaction",
            relatedEntityId: transactionId,
          },
        ]);
      }

      return { completed };
    });

    revalidatePath(`/transakcje/${transactionId}`);
    revalidatePath("/dashboard");
    return { ok: true, completed: result.completed };
  } catch (error) {
    return {
      ok: false,
      error: (error as Error).message || "Nie udało się zapisać potwierdzenia.",
    };
  }
}
