import { asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { transactionMessages, transactions, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Brak autoryzacji." }, { status: 401 });
  }

  const { id } = await context.params;
  const [transaction] = await db
    .select({
      winnerId: transactions.winnerId,
      sellerId: transactions.sellerId,
    })
    .from(transactions)
    .where(eq(transactions.id, id))
    .limit(1);

  if (!transaction) {
    return Response.json({ ok: false, error: "Nie znaleziono rozmowy." }, { status: 404 });
  }

  const isParticipant =
    transaction.winnerId === user.id || transaction.sellerId === user.id;
  if (!isParticipant && user.role !== "admin") {
    return Response.json({ ok: false, error: "Brak dostępu." }, { status: 403 });
  }

  const messages = await db
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
    .limit(200);

  return Response.json({
    ok: true,
    messages: messages.map((message) => ({
      ...message,
      createdAt: message.createdAt.toISOString(),
    })),
  });
}
