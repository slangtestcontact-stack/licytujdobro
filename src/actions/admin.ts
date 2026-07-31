"use server";

import { db } from "@/db";
import { auctions, campaigns, campaignUpdates, categoryInterests, communityEvents, listings, moderationActions, supportTeams, transactionCancellations, transactionEvents, transactions, userPenalties, users } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { assertCampaignConfigured } from "@/lib/single-campaign";
import { requireAdmin } from "@/lib/auth";
import { logAudit, notify } from "@/lib/audit";
import { enqueueUserNotification } from "@/lib/notification-outbox";
import { publicAuctionUrl } from "@/lib/public-code";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { revalidatePublicContent } from "@/lib/public-cache";

export type AdminResult = { ok: boolean; error?: string };

async function getOwnedListingForModeration(listingId: string) {
  const [listing] = await db.select().from(listings).where(eq(listings.id, listingId)).limit(1);
  if (!listing) throw new Error("Nie znaleziono ogłoszenia.");
  return listing;
}

const moderationChecklistSchema = z.object({
  ownPhotos: z.boolean(), allowedItem: z.boolean(), defectsDisclosed: z.boolean(), startPriceReasonable: z.boolean(), regionCorrect: z.boolean(), noPersonalData: z.boolean(), noDocumentsVisible: z.boolean(),
}).refine((value) => Object.values(value).every(Boolean), "Potwierdź wszystkie punkty checklisty moderacyjnej.");

export async function approveListingAction(listingId: string, checklist: z.infer<typeof moderationChecklistSchema>, special?: { isSpecial: boolean; label?: string }): Promise<AdminResult> {
  const admin = await requireAdmin();
  try {
    const listing = await getOwnedListingForModeration(listingId);
    const parsedChecklist = moderationChecklistSchema.safeParse(checklist);
    if (!parsedChecklist.success) throw new Error("Potwierdź wszystkie punkty checklisty moderacyjnej.");
    if (listing.status !== "OCZEKUJE_NA_MODERACJE") throw new Error("Ogłoszenie nie oczekuje na moderację.");
    const [auction] = await db.select().from(auctions).where(eq(auctions.listingId, listingId)).limit(1);
    if (!auction) throw new Error("Brak parametrów aukcji.");
    const [activeCampaign] = await db.select().from(campaigns).where(and(eq(campaigns.isActive, true), eq(campaigns.isVisible, true))).limit(1);
    const configuredCampaign = assertCampaignConfigured(activeCampaign ?? null);
    const now = new Date();
    const endAt = new Date(now.getTime() + auction.durationDays * 24 * 60 * 60 * 1000);
    const normalizedMode =
      auction.mode === "INTEREST_THEN_AUCTION"
        ? "FIXED_DONATION"
        : auction.mode;
    await db.transaction(async (tx) => {
      await tx.update(listings).set({ status: "AKTYWNA", moderationNote: null, moderationChecklist: parsedChecklist.data, isSpecial: Boolean(special?.isSpecial), specialLabel: special?.isSpecial ? (special.label?.trim().slice(0, 80) || "Aukcja specjalna") : null, updatedAt: now }).where(eq(listings.id, listingId));
      await tx.update(auctions).set({
        campaignId: configuredCampaign.id,
        mode: normalizedMode,
        status: "AKTYWNA",
        startAt: now,
        interestDeadline: null,
        endAt,
        originalEndAt: endAt,
        currentPrice: auction.startPrice,
        bidCount: 0,
        bidderCount: 0,
        winnerId: null,
        totalExtensionSeconds: 0,
        updatedAt: now,
      }).where(eq(auctions.id, auction.id));
      await tx.insert(moderationActions).values({ adminId: admin.id, listingId, action: "ZATWIERDZONO_I_URUCHOMIONO" });
    });
    await notify({
      userId: listing.userId,
      type: "AUKCJA_ZATWIERDZONA",
      title: normalizedMode === "AUCTION"
        ? "Licytacja została opublikowana"
        : "Przedmiot został opublikowany",
      body: `Ogłoszenie „${listing.title}” przeszło moderację i jest już aktywne.`,
      relatedEntityType: "listing",
      relatedEntityId: listingId,
    });
    await enqueueUserNotification({ userId: listing.userId, template: "LISTING_APPROVED", subject: "Twoja aukcja została zatwierdzona", body: `Aukcja „${listing.title}” jest już publiczna.`, actionUrl: publicAuctionUrl(listing.shortCode || listing.id.slice(0, 8)), dedupeBase: `listing-approved-${listing.id}` });
    const interestedUsers = await db.select({ userId: categoryInterests.userId }).from(categoryInterests).where(eq(categoryInterests.categoryId, listing.categoryId));
    for (const interested of interestedUsers) {
      if (interested.userId === listing.userId) continue;
      await notify({ userId: interested.userId, type: "INFO", title: "Nowa aukcja w obserwowanej kategorii", body: `Pojawiła się nowa aukcja: „${listing.title}”.`, relatedEntityType: "listing", relatedEntityId: listingId, dedupeKey: `category-new-${listingId}-${interested.userId}` });
    }
    await logAudit({ actorId: admin.id, actorType: "ADMIN", action: "ZATWIERDZONO_OGLOSZENIE", entityType: "listing", entityId: listingId });
    revalidatePath("/admin"); revalidatePath("/dashboard"); revalidatePublicContent({ sitemap: true });
    return { ok: true };
  } catch (error) { return { ok: false, error: (error as Error).message }; }
}

const noteSchema = z.string().trim().min(5).max(2000);

export async function requestListingChangesAction(listingId: string, note: string): Promise<AdminResult> {
  const admin = await requireAdmin();
  const parsed = noteSchema.safeParse(note);
  if (!parsed.success) return { ok: false, error: "Podaj konkretne uwagi (minimum 5 znaków)." };
  try {
    const listing = await getOwnedListingForModeration(listingId);
    if (listing.status !== "OCZEKUJE_NA_MODERACJE") throw new Error("Ogłoszenie nie oczekuje na moderację.");
    await db.transaction(async (tx) => {
      await tx.update(listings).set({ status: "WYMAGA_POPRAWY", moderationNote: parsed.data, updatedAt: new Date() }).where(eq(listings.id, listingId));
      await tx.insert(moderationActions).values({ adminId: admin.id, listingId, action: "PROSBA_O_POPRAWE", reason: parsed.data });
    });
    await notify({ userId: listing.userId, type: "PROSBA_O_POPRAWE", title: "Ogłoszenie wymaga poprawy", body: parsed.data, relatedEntityType: "listing", relatedEntityId: listingId });
    revalidatePath("/admin"); revalidatePath("/dashboard");
    return { ok: true };
  } catch (error) { return { ok: false, error: (error as Error).message }; }
}

export async function rejectListingAction(listingId: string, note: string): Promise<AdminResult> {
  const admin = await requireAdmin();
  const parsed = noteSchema.safeParse(note);
  if (!parsed.success) return { ok: false, error: "Podaj powód odrzucenia." };
  try {
    const listing = await getOwnedListingForModeration(listingId);
    if (!["OCZEKUJE_NA_MODERACJE", "WYMAGA_POPRAWY"].includes(listing.status)) throw new Error("Nie można odrzucić tego ogłoszenia.");
    await db.transaction(async (tx) => {
      await tx.update(listings).set({ status: "ANULOWANA_PRZEZ_ADMINISTRATORA", moderationNote: parsed.data, updatedAt: new Date() }).where(eq(listings.id, listingId));
      await tx.insert(moderationActions).values({ adminId: admin.id, listingId, action: "ODRZUCONO", reason: parsed.data });
    });
    await notify({ userId: listing.userId, type: "AUKCJA_ODRZUCONA", title: "Ogłoszenie zostało odrzucone", body: parsed.data, relatedEntityType: "listing", relatedEntityId: listingId });
    revalidatePath("/admin"); revalidatePath("/dashboard");
    return { ok: true };
  } catch (error) { return { ok: false, error: (error as Error).message }; }
}

export async function setSpecialListingAction(listingId: string, isSpecial: boolean, label = "Aukcja specjalna"): Promise<AdminResult> {
  const admin = await requireAdmin();
  const [listing] = await db.select().from(listings).where(eq(listings.id, listingId)).limit(1);
  if (!listing) return { ok: false, error: "Nie znaleziono aukcji." };
  if (!["AKTYWNA", "ZAKONCZONA"].includes(listing.status)) return { ok: false, error: "Wyróżnić można aktywną albo zakończoną aukcję." };
  const cleanLabel = isSpecial ? (label.trim().slice(0, 80) || "Aukcja specjalna") : null;
  await db.update(listings).set({ isSpecial, specialLabel: cleanLabel, updatedAt: new Date() }).where(eq(listings.id, listingId));
  await logAudit({ actorId: admin.id, actorType: "ADMIN", action: isSpecial ? "OZNACZONO_AUKCJE_SPECJALNA" : "USUNIETO_OZNACZENIE_SPECJALNE", entityType: "listing", entityId: listingId, metadata: { label: cleanLabel } });
  revalidatePath("/admin"); revalidatePublicContent({ listingId, sitemap: true });
  return { ok: true };
}

export async function setUserStatusAction(userId: string, status: "aktywne" | "zawieszone" | "zablokowane"): Promise<AdminResult> {
  const admin = await requireAdmin();
  if (userId === admin.id) return { ok: false, error: "Nie możesz zmienić statusu własnego konta." };
  const [target] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!target) return { ok: false, error: "Nie znaleziono użytkownika." };
  await db.update(users).set({ status, updatedAt: new Date() }).where(eq(users.id, userId));
  await logAudit({ actorId: admin.id, actorType: "ADMIN", action: "ZMIANA_STATUSU_UZYTKOWNIKA", entityType: "user", entityId: userId, metadata: { status } });
  revalidatePath("/admin");
  return { ok: true };
}

const siepomagaCampaignSchema = z.object({
  name: z.string().trim().min(5).max(200),
  beneficiaryName: z.string().trim().min(2).max(200),
  description: z.string().trim().min(30).max(5000),
  imageUrl: z.string().trim().max(2000).optional().default(""),
  externalUrl: z.string().url(),
  piggyBankUrl: z.string().url(),
  targetAmount: z.coerce.number().finite().positive().optional(),
});

function assertSiepomagaUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== "https:" || !(url.hostname === "siepomaga.pl" || url.hostname.endsWith(".siepomaga.pl"))) {
    throw new Error("Adresy zbiórki muszą prowadzić do domeny siepomaga.pl i używać HTTPS.");
  }
}

export async function updateSiepomagaCampaignAction(input: {
  name: string;
  beneficiaryName: string;
  description: string;
  imageUrl?: string;
  externalUrl: string;
  piggyBankUrl: string;
  targetAmount?: number;
}): Promise<AdminResult> {
  const admin = await requireAdmin();
  const parsed = siepomagaCampaignSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Nieprawidłowe dane zbiórki." };
  try {
    assertSiepomagaUrl(parsed.data.externalUrl);
    assertSiepomagaUrl(parsed.data.piggyBankUrl);
    const slug = new URL(parsed.data.piggyBankUrl).pathname.split("/").filter(Boolean)[0] ?? null;
    let campaignId = "";
    await db.transaction(async (tx) => {
      const [current] = await tx.select().from(campaigns).where(eq(campaigns.isActive, true)).limit(1);
      await tx.update(campaigns).set({ isActive: false, isVisible: false, updatedAt: new Date() });
      const values = {
        name: parsed.data.name,
        beneficiaryName: parsed.data.beneficiaryName,
        description: parsed.data.description,
        imageUrl: parsed.data.imageUrl || null,
        externalUrl: parsed.data.externalUrl,
        piggyBankUrl: parsed.data.piggyBankUrl,
        terminalUrl: null,
        provider: "SIEPOMAGA",
        externalSlug: slug,
        verificationMode: "EXTERNAL_DIRECT_NO_PLATFORM_VERIFICATION",
        organizerName: "Fundacja Siepomaga",
        verificationInfo: "Użytkownik wpłaca bezpośrednio w serwisie Siepomaga. LicytujDobro nie przyjmuje pieniędzy i nie weryfikuje wpłat.",
        targetAmount: parsed.data.targetAmount ? String(parsed.data.targetAmount) : null,
        isDemo: false,
        isVisible: true,
        isActive: true,
        updatedAt: new Date(),
      } as const;
      if (current) {
        campaignId = current.id;
        await tx.update(campaigns).set(values).where(eq(campaigns.id, current.id));
      } else {
        const [created] = await tx.insert(campaigns).values({ ...values, currentAmount: "0", updatesJson: [] }).returning();
        campaignId = created.id;
      }
      await tx.update(auctions).set({ campaignId, updatedAt: new Date() }).where(inArray(auctions.status, ["ZATWIERDZONA", "AKTYWNA"]));
    });
    await logAudit({ actorId: admin.id, actorType: "ADMIN", action: "SKONFIGUROWANO_JEDYNA_ZBIORKE", entityType: "campaign", entityId: campaignId, metadata: { beneficiaryName: parsed.data.beneficiaryName, flow: "direct-no-verification" } });
    revalidatePath("/admin");
    revalidatePublicContent({ campaign: true });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}


function slugifyCommunity(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100);
}

const teamSchema = z.object({
  name: z.string().trim().min(3).max(160),
  description: z.string().trim().max(2000).optional().default(""),
});

export async function createSupportTeamAction(_prev: AdminResult, formData: FormData): Promise<AdminResult> {
  const admin = await requireAdmin();
  const parsed = teamSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Nieprawidłowe dane drużyny." };
  const base = slugifyCommunity(parsed.data.name) || "druzyna";
  const slug = `${base}-${randomBytes(2).toString("hex")}`;
  const joinCode = randomBytes(4).toString("hex").toUpperCase();
  const [team] = await db.insert(supportTeams).values({ slug, joinCode, name: parsed.data.name, description: parsed.data.description }).returning();
  await logAudit({ actorId: admin.id, actorType: "ADMIN", action: "UTWORZONO_DRUZYNE", entityType: "team", entityId: team.id });
  revalidatePath("/admin"); revalidatePublicContent({ teams: true });
  return { ok: true };
}

const updateSchema = z.object({
  title: z.string().trim().min(3).max(180),
  body: z.string().trim().min(10).max(5000),
});

export async function createCampaignUpdateAction(_prev: AdminResult, formData: FormData): Promise<AdminResult> {
  const admin = await requireAdmin();
  const parsed = updateSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Nieprawidłowa aktualność." };
  const [campaign] = await db.select().from(campaigns).where(eq(campaigns.isActive, true)).limit(1);
  if (!campaign) return { ok: false, error: "Najpierw skonfiguruj aktywną zbiórkę." };
  const [created] = await db.insert(campaignUpdates).values({ campaignId: campaign.id, ...parsed.data }).returning();
  await logAudit({ actorId: admin.id, actorType: "ADMIN", action: "DODANO_AKTUALNOSC", entityType: "campaign_update", entityId: created.id });
  revalidatePath("/admin"); revalidatePublicContent({ campaign: true });
  return { ok: true };
}

const eventSchema = z.object({
  title: z.string().trim().min(3).max(180),
  description: z.string().trim().min(10).max(3000),
  kind: z.enum(["THEME_WEEK", "AUCTION_NIGHT", "ITEM_COLLECTION", "LOCAL_EVENT"]),
  startsAt: z.string().min(1),
  endsAt: z.string().min(1),
});

export async function createCommunityEventAction(_prev: AdminResult, formData: FormData): Promise<AdminResult> {
  const admin = await requireAdmin();
  const parsed = eventSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Nieprawidłowe dane wydarzenia." };
  const startsAt = new Date(parsed.data.startsAt);
  const endsAt = new Date(parsed.data.endsAt);
  if (!Number.isFinite(startsAt.getTime()) || !Number.isFinite(endsAt.getTime()) || endsAt <= startsAt) return { ok: false, error: "Data zakończenia musi być późniejsza niż rozpoczęcia." };
  const [created] = await db.insert(communityEvents).values({ title: parsed.data.title, description: parsed.data.description, kind: parsed.data.kind, startsAt, endsAt }).returning();
  await logAudit({ actorId: admin.id, actorType: "ADMIN", action: "DODANO_WYDARZENIE", entityType: "community_event", entityId: created.id });
  revalidatePath("/wydarzenia"); revalidatePath("/admin"); revalidatePublicContent({ sitemap: true });
  return { ok: true };
}


export async function markTerminalTestedAction(result: "WORKS" | "FAILED", note: string): Promise<AdminResult> {
  const admin = await requireAdmin();
  if (!note.trim() || note.trim().length < 5) return { ok: false, error: "Dodaj krótką notatkę z przebiegu testu." };
  const [campaign] = await db.select().from(campaigns).where(eq(campaigns.isActive, true)).limit(1);
  if (!campaign) return { ok: false, error: "Brak aktywnej kampanii." };
  await db.update(campaigns).set({ terminalTestedAt: new Date(), terminalTestedBy: admin.id, terminalTestResult: result, terminalTestNote: note.trim().slice(0, 1000), updatedAt: new Date() }).where(eq(campaigns.id, campaign.id));
  await logAudit({ actorId: admin.id, actorType: "ADMIN", action: "TEST_TERMINALU_SIEPOMAGA", entityType: "campaign", entityId: campaign.id, metadata: { result, note: note.trim().slice(0, 1000) } });
  revalidatePath("/admin"); revalidatePath("/admin/system");
  return { ok: true };
}


export async function resolveCancellationAction(cancellationId: string, action: "WARNING" | "EXTEND" | "CANCEL" | "RELIST" | "TEMP_BLOCK" | "BLOCK"): Promise<AdminResult> {
  const admin = await requireAdmin();
  const [record] = await db.select().from(transactionCancellations).where(eq(transactionCancellations.id, cancellationId)).limit(1);
  if (!record || record.resolvedAt) return { ok: false, error: "Sprawa nie istnieje albo jest już zamknięta." };
  const [transaction] = record.transactionId ? await db.select().from(transactions).where(eq(transactions.id, record.transactionId)).limit(1) : [];
  const now = new Date();
  await db.transaction(async (tx) => {
    if (action === "EXTEND" && transaction) await tx.update(transactions).set({ winnerConfirmDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000), updatedAt: now }).where(eq(transactions.id, transaction.id));
    if (action === "CANCEL" && transaction) await tx.update(transactions).set({ status: "ANULOWANA", updatedAt: now }).where(eq(transactions.id, transaction.id));
    if (action === "RELIST" && transaction) {
      await tx.update(listings).set({ status: "ZATWIERDZONA", updatedAt: now }).where(eq(listings.id, transaction.listingId));
      await tx.update(auctions).set({ status: "ZATWIERDZONA", winnerId: null, bidCount: 0, bidderCount: 0, startAt: null, endAt: null, originalEndAt: null, totalExtensionSeconds: 0, updatedAt: now }).where(eq(auctions.id, transaction.auctionId));
      await tx.update(transactions).set({ status: "ANULOWANA", updatedAt: now }).where(eq(transactions.id, transaction.id));
    }
    const targetUserId = transaction?.winnerId;
    if ((action === "TEMP_BLOCK" || action === "BLOCK") && targetUserId) {
      if (action === "TEMP_BLOCK") {
        const until = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await tx.update(users).set({ biddingSuspendedUntil: until, updatedAt: now }).where(eq(users.id, targetUserId));
        await tx.insert(userPenalties).values({ userId: targetUserId, type: "BIDDING_SUSPENSION", reason: record.reason, issuedBy: admin.id, expiresAt: until });
      } else await tx.update(users).set({ status: "zablokowane", updatedAt: now }).where(eq(users.id, targetUserId));
    }
    await tx.update(transactionCancellations).set({ adminAction: action, adminId: admin.id, resolvedAt: now, updatedAt: now }).where(eq(transactionCancellations.id, cancellationId));
  });
  await logAudit({ actorId: admin.id, actorType: "ADMIN", action: `ROZSTRZYGNIETO_ANULOWANIE_${action}`, entityType: "transaction_cancellation", entityId: cancellationId });
  revalidatePath("/admin"); if (transaction) revalidatePath(`/transakcje/${transaction.id}`);
  return { ok: true };
}

export async function verifyTraditionalPaymentAction(transactionId: string, note: string): Promise<AdminResult> {
  const admin = await requireAdmin();
  if (note.trim().length < 5) return { ok: false, error: "Dodaj informację, jak zweryfikowano zaksięgowanie wpłaty." };
  const [transaction] = await db.select().from(transactions).where(eq(transactions.id, transactionId)).limit(1);
  if (!transaction || transaction.status !== "OCZEKUJE_NA_WERYFIKACJE") return { ok: false, error: "Transakcja nie oczekuje na weryfikację przelewu." };
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.update(transactions).set({ status: "WPLATA_POTWIERDZONA_OBUSTRONNIE", buyerDonationConfirmedAt: transaction.buyerDonationConfirmedAt || now, sellerDonationConfirmedAt: now, adminPaymentVerifiedAt: now, updatedAt: now }).where(eq(transactions.id, transactionId));
    await tx.insert(transactionEvents).values({ transactionId, actorId: admin.id, eventType: "ADMIN_PAYMENT_VERIFIED", title: "Administrator potwierdził zaksięgowanie wpłaty", details: note.trim().slice(0, 1000) });
  });
  await logAudit({ actorId: admin.id, actorType: "ADMIN", action: "ZWERYFIKOWANO_PRZELEW_TRADYCYJNY", entityType: "transaction", entityId: transactionId, metadata: { note: note.trim().slice(0, 1000) } });
  revalidatePath(`/transakcje/${transactionId}`); revalidatePath("/admin");
  return { ok: true };
}
