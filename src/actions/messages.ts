"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import {
  notifications,
  transactionMessages,
  transactions,
} from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { consumeRateLimit } from "@/lib/rate-limit";

export type TransactionMessageDto = {
  id: string;
  senderId: string;
  senderNickname: string;
  body: string;
  createdAt: string;
};

export type MessageActionResult = {
  ok: boolean;
  error?: string;
  message?: TransactionMessageDto;
};

const messageSchema = z.object({
  transactionId: z.string().trim().min(1).max(100),
  body: z
    .string()
    .trim()
    .min(1, "Napisz wiadomość.")
    .max(1000, "Wiadomość może mieć maksymalnie 1000 znaków."),
});

export async function sendTransactionMessageAction(
  _previous: MessageActionResult,
  formData: FormData,
): Promise<MessageActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Zaloguj się, aby wysłać wiadomość." };

  const parsed = messageSchema.safeParse({
    transactionId: formData.get("transactionId"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Nieprawidłowa wiadomość.",
    };
  }

  const rate = await consumeRateLimit(
    `transaction-message:${user.id}`,
    20,
    60 * 1000,
  );
  if (!rate.ok) {
    return {
      ok: false,
      error: `Wysyłasz wiadomości zbyt szybko. Spróbuj ponownie za ${rate.retryAfterSeconds} s.`,
    };
  }

  try {
    const result = await db.transaction(async (tx) => {
      const [transaction] = await tx
        .select()
        .from(transactions)
        .where(eq(transactions.id, parsed.data.transactionId))
        .limit(1);

      if (!transaction) throw new Error("Nie znaleziono rozmowy.");

      const recipientId =
        transaction.winnerId === user.id
          ? transaction.sellerId
          : transaction.sellerId === user.id
            ? transaction.winnerId
            : null;

      if (!recipientId) {
        throw new Error("Tylko zwycięzca i wystawiający mogą pisać w tej rozmowie.");
      }
      if (transaction.status === "ANULOWANA") {
        throw new Error("Ta rozmowa została zamknięta.");
      }

      const messageId = crypto.randomUUID();
      const now = new Date();

      const [created] = await tx
        .insert(transactionMessages)
        .values({
          id: messageId,
          transactionId: transaction.id,
          senderId: user.id,
          recipientId,
          body: parsed.data.body,
          createdAt: now,
        })
        .returning({
          id: transactionMessages.id,
          senderId: transactionMessages.senderId,
          body: transactionMessages.body,
          createdAt: transactionMessages.createdAt,
        });

      if (!created) throw new Error("Nie udało się zapisać wiadomości.");

      await tx
        .update(transactions)
        .set({ updatedAt: now })
        .where(eq(transactions.id, transaction.id));

      await tx.insert(notifications).values({
        userId: recipientId,
        type: "INFO",
        title: `Nowa wiadomość od ${user.nickname}`,
        body:
          parsed.data.body.length > 180
            ? `${parsed.data.body.slice(0, 177)}…`
            : parsed.data.body,
        relatedEntityType: "transaction",
        relatedEntityId: transaction.id,
        dedupeKey: `transaction-message:${messageId}`,
      });

      return {
        id: created.id,
        senderId: created.senderId,
        senderNickname: user.nickname,
        body: created.body,
        createdAt: created.createdAt.toISOString(),
      } satisfies TransactionMessageDto;
    });

    revalidatePath(`/wiadomosci/${parsed.data.transactionId}`);
    revalidatePath("/wiadomosci");
    revalidatePath("/dashboard");

    return { ok: true, message: result };
  } catch (error) {
    return {
      ok: false,
      error: (error as Error).message || "Nie udało się wysłać wiadomości.",
    };
  }
}
