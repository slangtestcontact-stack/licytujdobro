"use server";

import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { db } from "@/db";
import {
  auctions,
  categories,
  categoryInterests,
  guestAuctionReminders,
  listings,
  newsletterSubscriptions,
  shareEvents,
  supportTeams,
  teamMemberships,
  watchlists,
} from "@/db/schema";
import { getCurrentUser, requireUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { getEmailProvider } from "@/lib/email";
import { getPublicBaseUrl, publicAuctionUrl } from "@/lib/public-code";
import { consumeRateLimit } from "@/lib/rate-limit";
import { revalidatePublicContent } from "@/lib/public-cache";

export type GrowthResult = { ok: boolean; error?: string; message?: string };

const newsletterSchema = z.object({
  email: z.string().trim().toLowerCase().email("Podaj poprawny adres e-mail."),
  firstName: z.string().trim().max(120).optional().default(""),
  source: z.string().trim().max(80).optional().default("website"),
});

export async function subscribeNewsletterAction(_prev: GrowthResult, formData: FormData): Promise<GrowthResult> {
  const parsed = newsletterSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Nieprawidłowe dane." };
  await db.insert(newsletterSubscriptions).values({
    email: parsed.data.email,
    firstName: parsed.data.firstName || null,
    source: parsed.data.source,
    isActive: true,
  }).onConflictDoUpdate({
    target: newsletterSubscriptions.email,
    set: { firstName: parsed.data.firstName || null, source: parsed.data.source, isActive: true, updatedAt: new Date() },
  });
  return { ok: true, message: "Zapisano. Raz w tygodniu otrzymasz najważniejsze aukcje i aktualności." };
}

export async function updateWatchPreferencesAction(listingId: string, formData: FormData): Promise<void> {
  const user = await requireUser();
  const [watch] = await db.select().from(watchlists).where(and(eq(watchlists.userId, user.id), eq(watchlists.listingId, listingId))).limit(1);
  if (!watch) return;
  await db.update(watchlists).set({
    notifyNewBid: formData.get("notifyNewBid") === "on",
    notify24h: formData.get("notify24h") === "on",
    notify1h: formData.get("notify1h") === "on",
  }).where(eq(watchlists.id, watch.id));
  revalidatePath("/dashboard");
  revalidatePath(`/aukcje/${listingId}`);
}

export async function updateCategoryInterestsAction(_prev: GrowthResult, formData: FormData): Promise<GrowthResult> {
  const user = await requireUser();
  const ids = [...new Set(formData.getAll("categoryId").map(String).filter(Boolean))].slice(0, 20);
  const allowed = ids.length ? await db.select({ id: categories.id }).from(categories).where(and(inArray(categories.id, ids), eq(categories.isAllowed, true))) : [];
  await db.transaction(async (tx) => {
    await tx.delete(categoryInterests).where(eq(categoryInterests.userId, user.id));
    if (allowed.length) await tx.insert(categoryInterests).values(allowed.map((item) => ({ userId: user.id, categoryId: item.id })));
  });
  revalidatePath("/dashboard");
  return { ok: true, message: allowed.length ? "Zapisaliśmy Twoje zainteresowania." : "Usunięto zapisane zainteresowania." };
}

const joinTeamSchema = z.object({ joinCode: z.string().trim().min(4).max(32).transform((value) => value.toUpperCase()) });

export async function joinTeamAction(_prev: GrowthResult, formData: FormData): Promise<GrowthResult> {
  const user = await requireUser();
  const parsed = joinTeamSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, error: "Podaj prawidłowy kod drużyny." };
  const [team] = await db.select().from(supportTeams).where(and(eq(supportTeams.joinCode, parsed.data.joinCode), eq(supportTeams.isActive, true))).limit(1);
  if (!team) return { ok: false, error: "Nie znaleziono aktywnej drużyny o takim kodzie." };
  await db.transaction(async (tx) => {
    await tx.delete(teamMemberships).where(eq(teamMemberships.userId, user.id));
    await tx.insert(teamMemberships).values({ teamId: team.id, userId: user.id });
  });
  await logAudit({ actorId: user.id, action: "DOLACZONO_DO_DRUZYNY", entityType: "team", entityId: team.id });
  revalidatePath("/dashboard");
  revalidatePath(`/druzyny/${team.slug}`);
  revalidatePublicContent({ teams: true });
  return { ok: true, message: `Dołączono do drużyny „${team.name}”.` };
}

export async function leaveTeamAction(): Promise<GrowthResult> {
  const user = await requireUser();
  await db.delete(teamMemberships).where(eq(teamMemberships.userId, user.id));
  revalidatePath("/dashboard");
  revalidatePublicContent({ teams: true });
  return { ok: true, message: "Opuściłeś drużynę." };
}

const shareSchema = z.object({
  listingId: z.string().min(1),
  channel: z.enum(["native", "facebook", "messenger", "whatsapp", "copy", "graphic", "post"]),
});

export async function recordShareAction(listingId: string, channel: string): Promise<void> {
  const parsed = shareSchema.safeParse({ listingId, channel });
  if (!parsed.success) return;
  const user = await getCurrentUser();
  await db.insert(shareEvents).values({ listingId, channel: parsed.data.channel, userId: user?.id ?? null });
}

const guestReminderSchema = z.object({
  listingId: z.string().trim().min(1),
  email: z.string().trim().toLowerCase().email("Podaj poprawny adres e-mail."),
});

export async function subscribeGuestAuctionReminderAction(_prev: GrowthResult, formData: FormData): Promise<GrowthResult> {
  const parsed = guestReminderSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Nieprawidłowe dane." };
  const requestHeaders = await headers();
  const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || requestHeaders.get("x-real-ip") || "unknown";
  const emailKey = createHash("sha256").update(parsed.data.email).digest("hex").slice(0, 24);
  const ipLimit = await consumeRateLimit(`guest-reminder-ip:${ip}`, 5, 15 * 60 * 1000);
  const emailLimit = await consumeRateLimit(`guest-reminder-email:${emailKey}`, 4, 24 * 60 * 60 * 1000);
  if (!ipLimit.ok || !emailLimit.ok) return { ok: false, error: "Zbyt wiele prób. Spróbuj ponownie później." };

  const [row] = await db.select({
    listingId: listings.id,
    title: listings.title,
    shortCode: listings.shortCode,
    status: auctions.status,
    endAt: auctions.endAt,
  }).from(listings).innerJoin(auctions, eq(auctions.listingId, listings.id))
    .where(eq(listings.id, parsed.data.listingId)).limit(1);

  const now = new Date();
  if (!row || row.status !== "AKTYWNA" || !row.endAt || row.endAt <= now) {
    return { ok: false, error: "Ta aukcja nie przyjmuje już zapisów na przypomnienie." };
  }

  if (row.endAt.getTime() <= now.getTime() + 75 * 60 * 1000) {
    await getEmailProvider().send({
      to: parsed.data.email,
      subject: `Aukcja „${row.title}” kończy się wkrótce`,
      text: `Aukcja „${row.title}” kończy się ${row.endAt.toLocaleString("pl-PL")}.\n\nWróć do aukcji: ${(row.shortCode ? publicAuctionUrl(row.shortCode) : `${getPublicBaseUrl()}/aukcje/${row.listingId}`)}\n\nTo jednorazowa wiadomość zamówiona na stronie LicytujDobro. Adres nie został zapisany do newslettera.`,
    });
    return { ok: true, message: "Aukcja kończy się już wkrótce, dlatego przypomnienie wysłaliśmy od razu." };
  }

  await db.insert(guestAuctionReminders).values({
    listingId: parsed.data.listingId,
    email: parsed.data.email,
    unsubscribeToken: randomBytes(30).toString("hex"),
    isActive: true,
    remindedAt: null,
  }).onConflictDoUpdate({
    target: [guestAuctionReminders.listingId, guestAuctionReminders.email],
    set: {
      isActive: true,
      remindedAt: null,
      unsubscribeToken: randomBytes(30).toString("hex"),
      updatedAt: new Date(),
    },
  });

  return { ok: true, message: `Gotowe. Wyślemy jedno przypomnienie około godzinę przed końcem aukcji „${row.title}”.` };
}
