"use server";

import { z } from "zod";
import { db } from "@/db";
import { contactMessages, pilotFeedback, watchlists, reports, notifications } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function toggleWatchAction(listingId: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Zaloguj się, aby obserwować aukcje." };

  const [existing] = await db
    .select()
    .from(watchlists)
    .where(and(eq(watchlists.userId, user.id), eq(watchlists.listingId, listingId)))
    .limit(1);

  if (existing) {
    await db.delete(watchlists).where(eq(watchlists.id, existing.id));
    revalidatePath(`/aukcje/${listingId}`);
    revalidatePath("/dashboard");
    return { ok: true, watching: false };
  }
  await db.insert(watchlists).values({ userId: user.id, listingId });
  revalidatePath(`/aukcje/${listingId}`);
  revalidatePath("/dashboard");
  return { ok: true, watching: true };
}

const reportSchema = z.object({
  targetType: z.enum(["LISTING", "USER", "BID", "TRANSACTION"]),
  targetId: z.string().min(1),
  reason: z.string().min(1, "Wybierz przyczynę zgłoszenia."),
  comment: z.string().max(1000).optional().default(""),
});

export type MiscResult = { ok: boolean; error?: string };

export async function createReportAction(_prev: MiscResult, formData: FormData): Promise<MiscResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Musisz być zalogowany, aby zgłosić problem." };
  const parsed = reportSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Błąd walidacji." };

  await db.insert(reports).values({ reporterId: user.id, ...parsed.data });
  await logAudit({ actorId: user.id, action: "UTWORZONO_ZGLOSZENIE", entityType: parsed.data.targetType, entityId: parsed.data.targetId });
  return { ok: true };
}

export async function markNotificationReadAction(notificationId: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false };
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, user.id)));
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function markAllNotificationsReadAction() {
  const user = await getCurrentUser();
  if (!user) return { ok: false };
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, user.id));
  revalidatePath("/dashboard");
  return { ok: true };
}


const contactSchema = z.object({
  name: z.string().trim().min(2).max(160),
  email: z.string().trim().email(),
  subject: z.string().trim().min(3).max(180),
  message: z.string().trim().min(10).max(5000),
});

export async function sendContactMessageAction(_prev: MiscResult, formData: FormData): Promise<MiscResult> {
  const parsed = contactSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Uzupełnij formularz." };
  await db.insert(contactMessages).values(parsed.data);
  return { ok: true };
}

const feedbackSchema = z.object({
  transactionId: z.string().optional(),
  unclear: z.string().trim().min(2).max(2000),
  tooSlow: z.string().trim().min(2).max(2000),
  missing: z.string().trim().min(2).max(2000),
});

export async function submitPilotFeedbackAction(_prev: MiscResult, formData: FormData): Promise<MiscResult> {
  const user = await getCurrentUser();
  const parsed = feedbackSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, error: "Odpowiedz na trzy krótkie pytania." };
  await db.insert(pilotFeedback).values({ userId: user?.id ?? null, transactionId: parsed.data.transactionId || null, unclear: parsed.data.unclear, tooSlow: parsed.data.tooSlow, missing: parsed.data.missing });
  return { ok: true };
}
