"use server";

import { z } from "zod";
import { db } from "@/db";
import { auctions, bids, campaigns, listings, auctionExtensions, watchlists, users } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { getCurrentUser, isFullyVerified } from "@/lib/auth";
import { getMinNextBid, getRequiredBid } from "@/lib/config";
import { computeAntiSnipeExtension, isAuctionOver } from "@/lib/auction-logic";
import { assertNotSelfBid } from "@/lib/state-machine";
import { logAudit, notify } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { consumeRateLimit } from "@/lib/rate-limit";
import { enqueueUserNotification } from "@/lib/notification-outbox";
import { publicAuctionUrl } from "@/lib/public-code";
import { safeSideEffect } from "@/lib/operational-errors";

export type BidResult = { ok: boolean; error?: string; newPrice?: number; minNextBid?: number };

const bidSchema = z.object({
  auctionId: z.string().min(1),
  amount: z.coerce.number().finite().positive("Podaj kwotę większą od zera."),
  idempotencyKey: z.string().uuid(),
  acceptCurrentBiddingTerms: z.string().optional(),
});

export async function placeBidAction(_prev: BidResult, formData: FormData): Promise<BidResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Musisz być zalogowany, aby licytować." };
  if (!isFullyVerified(user)) return { ok: false, error: "Potwierdź wymagany kontakt, aby licytować." };
  if (user.status !== "aktywne") return { ok: false, error: "Twoje konto nie może obecnie licytować." };
  if (user.biddingSuspendedUntil && user.biddingSuspendedUntil > new Date()) return { ok: false, error: "Twoje konto ma czasowo zablokowaną możliwość licytowania." };
  const rate = await consumeRateLimit(`bid:${user.id}`, 30, 60 * 1000);
  if (!rate.ok) return { ok: false, error: `Zbyt wiele ofert w krótkim czasie. Spróbuj za ${rate.retryAfterSeconds} s.` };

  const parsed = bidSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, error: "Nieprawidłowa kwota lub dane oferty." };
  const { auctionId, amount, idempotencyKey } = parsed.data;
  const currentTermsVersion = "2026-07-v1";
  if (user.biddingTermsVersion !== currentTermsVersion) {
    if (parsed.data.acceptCurrentBiddingTerms !== "on") return { ok: false, error: "Przed pierwszą ofertą zaakceptuj aktualne zasady licytacji." };
    await db.update(users).set({ acceptedBiddingRulesAt: new Date(), biddingTermsVersion: currentTermsVersion, biddingTermsAcceptedAt: new Date(), updatedAt: new Date() }).where(eq(users.id, user.id));
  }

  const [duplicate] = await db.select().from(bids).where(and(eq(bids.auctionId, auctionId), eq(bids.userId, user.id), eq(bids.idempotencyKey, idempotencyKey))).limit(1);
  if (duplicate) return { ok: true, newPrice: Number(duplicate.amount), minNextBid: getMinNextBid(Number(duplicate.amount)) };

  try {
    const result = await db.transaction(async (tx) => {
      const [auction] = await tx.select().from(auctions).where(eq(auctions.id, auctionId)).for("update");
      if (!auction) throw new Error("Nie znaleziono aukcji.");
      if (auction.status !== "AKTYWNA") throw new Error("Ta aukcja nie jest aktywna.");
      if (!auction.endAt || isAuctionOver(auction.endAt)) throw new Error("Czas licytacji już upłynął.");

      const [listing] = await tx.select().from(listings).where(eq(listings.id, auction.listingId)).limit(1);
      if (!listing) throw new Error("Nie znaleziono przedmiotu.");
      assertNotSelfBid(listing.userId, user.id);

      const [campaign] = auction.campaignId ? await tx.select().from(campaigns).where(eq(campaigns.id, auction.campaignId)).limit(1) : [];
      const paymentLimit = campaign ? Number(campaign.paymentLimit) : 500;
      if (amount > paymentLimit) throw new Error(`Maksymalna oferta dla Terminalu Siepomaga wynosi ${paymentLimit.toFixed(2).replace(".", ",")} zł.`);

      const currentPrice = Number(auction.currentPrice);
      const minimum = getRequiredBid(Number(auction.startPrice), currentPrice, auction.bidCount);
      if (!Number.isFinite(amount) || amount < minimum) throw new Error(`Minimalna oferta to ${minimum.toFixed(2).replace(".", ",")} zł.`);

      const [previousLeaderBid] = auction.winnerId
        ? await tx.select().from(bids).where(and(eq(bids.auctionId, auctionId), eq(bids.userId, auction.winnerId), eq(bids.isCancelled, false))).orderBy(desc(bids.createdAt)).limit(1)
        : [];

      const extension = computeAntiSnipeExtension({ now: new Date(), currentEndAt: auction.endAt, totalExtensionSecondsSoFar: auction.totalExtensionSeconds });
      const [createdBid] = await tx.insert(bids).values({
        auctionId,
        userId: user.id,
        amount: String(amount),
        auctionStateSnapshot: { currentPriceBefore: currentPrice, endAtBefore: auction.endAt.toISOString(), bidCountBefore: auction.bidCount },
        idempotencyKey,
      }).returning({ id: bids.id });

      const activeBidders = await tx.select({ userId: bids.userId }).from(bids).where(and(eq(bids.auctionId, auctionId), eq(bids.isCancelled, false)));
      const distinctBidders = new Set(activeBidders.map((b) => b.userId)).size;

      await tx.update(auctions).set({
        currentPrice: String(amount), winnerId: user.id, bidCount: auction.bidCount + 1, bidderCount: distinctBidders,
        endAt: extension.newEndAt, totalExtensionSeconds: extension.newTotalExtensionSeconds,
        lockVersion: auction.lockVersion + 1, updatedAt: new Date(),
      }).where(eq(auctions.id, auctionId));

      if (extension.extended) await tx.insert(auctionExtensions).values({ auctionId, extendedBySeconds: extension.appliedSeconds, reason: "Oferta złożona w końcowym oknie licytacji." });
      return { previousLeaderBid, listingId: listing.id, listingShortCode: listing.shortCode, listingTitle: listing.title, extended: extension.extended, bidId: createdBid.id };
    });

    await safeSideEffect(
      () => logAudit({ actorId: user.id, action: "ZLOZONO_OFERTE", entityType: "auction", entityId: auctionId, metadata: { amount } }),
      { source: "bidding.audit", entityType: "auction", entityId: auctionId, metadata: { userId: user.id } },
    );
    await safeSideEffect(
      () => notify({ userId: user.id, type: "NOWA_OFERTA", title: "Oferta przyjęta", body: `Twoja wiążąca oferta ${amount.toFixed(2).replace(".", ",")} zł na „${result.listingTitle}” została zapisana.`, relatedEntityType: "auction", relatedEntityId: auctionId }),
      { source: "bidding.notify.bidder", entityType: "auction", entityId: auctionId, metadata: { userId: user.id } },
    );
    if (result.previousLeaderBid && result.previousLeaderBid.userId !== user.id) {
      await safeSideEffect(
        () => notify({ userId: result.previousLeaderBid!.userId, type: "PRZEBITY", title: "Zostałeś przebity", body: `Aktualna oferta za „${result.listingTitle}” wynosi ${amount.toFixed(2).replace(".", ",")} zł.`, relatedEntityType: "auction", relatedEntityId: auctionId }),
        { source: "bidding.notify.outbid", entityType: "auction", entityId: auctionId, metadata: { userId: result.previousLeaderBid.userId } },
      );
    }
    if (result.previousLeaderBid && result.previousLeaderBid.userId !== user.id) {
      await safeSideEffect(
        () => enqueueUserNotification({ userId: result.previousLeaderBid!.userId, template: "OUTBID", subject: "Twoja oferta została przebita", body: `Aktualna oferta za „${result.listingTitle}” wynosi ${amount.toFixed(2).replace(".", ",")} zł.`, actionUrl: publicAuctionUrl(result.listingShortCode || result.listingId.slice(0, 8)), dedupeBase: `outbid-${result.bidId}-${result.previousLeaderBid!.userId}` }),
        { source: "bidding.outbox.outbid", entityType: "auction", entityId: auctionId, metadata: { userId: result.previousLeaderBid.userId } },
      );
    }
    const watchers = await db.select().from(watchlists).where(and(eq(watchlists.listingId, result.listingId), eq(watchlists.notifyNewBid, true)));
    for (const watcher of watchers) {
      if (watcher.userId === user.id || watcher.userId === result.previousLeaderBid?.userId) continue;
      await safeSideEffect(
        () => notify({ userId: watcher.userId, type: "NOWA_OFERTA", title: "Nowa oferta w obserwowanej aukcji", body: `Aktualna oferta za „${result.listingTitle}” wynosi ${amount.toFixed(2).replace(".", ",")} zł.`, relatedEntityType: "listing", relatedEntityId: result.listingId, dedupeKey: `watch-bid-${result.bidId}-${watcher.userId}` }),
        { source: "bidding.notify.watcher", entityType: "listing", entityId: result.listingId, metadata: { userId: watcher.userId } },
      );
    }

    revalidatePath("/");
    revalidatePath("/aukcje");
    revalidatePath(`/aukcje/${result.listingId}`);
    return { ok: true, newPrice: amount, minNextBid: getMinNextBid(amount) };
  } catch (error) {
    const message = (error as Error).message;
    if (message === "SELF_BID_FORBIDDEN") return { ok: false, error: "Nie możesz licytować własnej aukcji." };
    if (message.includes("bids_idempotency_unique")) return { ok: false, error: "Ta operacja została już przetworzona. Odśwież stronę." };
    return { ok: false, error: message || "Nie udało się złożyć oferty." };
  }
}
