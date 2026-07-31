import "server-only";
import { and, count, eq, lte } from "drizzle-orm";
import { db } from "@/db";
import { auctions, campaigns, listingInterests, listings, transactions } from "@/db/schema";
import { generateDonationCode } from "@/lib/auction-logic";
import { notify } from "@/lib/audit";

export async function processDueInterestWindows() {
  const due = await db.select({ id: auctions.id }).from(auctions).where(and(eq(auctions.status, "ZBIERANIE_ZAINTERESOWANIA"), lte(auctions.interestDeadline, new Date())));
  for (const row of due) await processOneInterestWindow(row.id);
  return due.length;
}

export async function processOneInterestWindow(auctionId: string) {
  const now = new Date();
  const result = await db.transaction(async (tx) => {
    const [auction] = await tx.select().from(auctions).where(eq(auctions.id, auctionId)).for("update");
    if (!auction || auction.status !== "ZBIERANIE_ZAINTERESOWANIA" || !auction.interestDeadline || auction.interestDeadline > now) return null;
    const [listing] = await tx.select().from(listings).where(eq(listings.id, auction.listingId)).limit(1);
    if (!listing) return null;
    const interests = await tx.select().from(listingInterests).where(and(eq(listingInterests.auctionId, auctionId), eq(listingInterests.status, "ACTIVE")));
    if (interests.length === 0) {
      await tx.update(auctions).set({ status: "BRAK_ZAINTERESOWANIA", endAt: now, updatedAt: now }).where(eq(auctions.id, auctionId));
      await tx.update(listings).set({ status: "ZAKONCZONA", updatedAt: now }).where(eq(listings.id, listing.id));
      return { kind: "empty" as const, listing };
    }
    if (interests.length === 1) {
      const winnerId = interests[0].userId;
      await tx.update(auctions).set({ status: "ZAKONCZONA", winnerId, bidCount: 0, bidderCount: 1, endAt: now, currentPrice: auction.startPrice, updatedAt: now }).where(eq(auctions.id, auctionId));
      await tx.update(listings).set({ status: "ZAKONCZONA", updatedAt: now }).where(eq(listings.id, listing.id));
      const [campaign] = auction.campaignId ? await tx.select().from(campaigns).where(eq(campaigns.id, auction.campaignId)).limit(1) : await tx.select().from(campaigns).where(eq(campaigns.isActive, true)).limit(1);
      if (!campaign) throw new Error("Brak aktywnej zbiórki.");
      const [transaction] = await tx.insert(transactions).values({
        auctionId, listingId: listing.id, winnerId, sellerId: listing.userId, amount: auction.startPrice, plannedDonationAmount: auction.startPrice,
        campaignId: campaign.id, campaignNameSnapshot: campaign.name, campaignUrlSnapshot: campaign.externalUrl, piggyBankUrlSnapshot: campaign.piggyBankUrl,
        terminalUrlSnapshot: campaign.terminalUrl, campaignProviderSnapshot: campaign.provider, paymentMethod: "SIEPOMAGA_TERMINAL_BLIK",
        status: "OCZEKUJE_NA_POTWIERDZENIE_ZWYCIEZCY", winnerConfirmDeadline: new Date(now.getTime() + 12 * 60 * 60 * 1000), donationCode: generateDonationCode(),
      }).returning();
      return { kind: "single" as const, listing, winnerId, transaction };
    }
    const endAt = new Date(now.getTime() + Math.max(1, auction.auctionDurationHours) * 60 * 60 * 1000);
    await tx.update(auctions).set({ status: "AKTYWNA", startAt: now, endAt, originalEndAt: endAt, currentPrice: auction.startPrice, winnerId: null, bidCount: 0, bidderCount: interests.length, updatedAt: now }).where(eq(auctions.id, auctionId));
    return { kind: "auction" as const, listing, userIds: interests.map(i => i.userId) };
  });
  if (!result) return null;
  if (result.kind === "single") await notify({ userId: result.winnerId, type: "WYGRANA", title: "Przedmiot został przypisany Tobie", body: `Byłeś jedyną zainteresowaną osobą przedmiotem „${result.listing.title}”. Potwierdź udział i umów odbiór.`, relatedEntityType: "transaction", relatedEntityId: result.transaction.id });
  if (result.kind === "auction") await Promise.allSettled(result.userIds.map(userId => notify({ userId, type: "INFO", title: "Rozpoczęła się licytacja", body: `Kilka osób chce przedmiot „${result.listing.title}”. Licytacja potrwa 24 godziny.`, relatedEntityType: "listing", relatedEntityId: result.listing.id })));
  if (result.kind === "empty") await notify({ userId: result.listing.userId, type: "INFO", title: "Brak zainteresowanych", body: `Okno zgłoszeń dla „${result.listing.title}” zakończyło się bez zainteresowanych.`, relatedEntityType: "listing", relatedEntityId: result.listing.id });
  return result;
}
