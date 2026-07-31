import "server-only";
import { db } from "@/db";
import { auctions, bids, campaigns, listings, transactions } from "@/db/schema";
import { and, eq, lte } from "drizzle-orm";
import { generateDonationCode } from "@/lib/auction-logic";
import { logAudit, notify } from "@/lib/audit";
import { enqueueUserNotification } from "@/lib/notification-outbox";

export async function endDueAuctions() {
  const due = await db.select({ id: auctions.id }).from(auctions).where(and(eq(auctions.status, "AKTYWNA"), lte(auctions.endAt, new Date())));
  for (const auction of due) await endOneAuction(auction.id);
  return due.length;
}

export async function endOneAuction(auctionId: string) {
  const now = new Date();
  const result = await db.transaction(async (tx) => {
    const [auction] = await tx.select().from(auctions).where(eq(auctions.id, auctionId)).for("update");
    if (!auction || auction.status !== "AKTYWNA" || !auction.endAt || auction.endAt > now) return null;
    const [listing] = await tx.select().from(listings).where(eq(listings.id, auction.listingId)).limit(1);
    if (!listing) return null;

    await tx.update(auctions).set({ status: "ZAKONCZONA", updatedAt: now }).where(eq(auctions.id, auctionId));
    await tx.update(listings).set({ status: "ZAKONCZONA", updatedAt: now }).where(eq(listings.id, listing.id));
    if (!auction.winnerId || auction.bidCount === 0) return { kind: "empty" as const, listing, auction };

    const [existing] = await tx.select().from(transactions).where(eq(transactions.auctionId, auctionId)).limit(1);
    if (existing) return { kind: "existing" as const, listing, auction, transaction: existing };
    const [campaign] = auction.campaignId
      ? await tx.select().from(campaigns).where(eq(campaigns.id, auction.campaignId)).limit(1)
      : await tx.select().from(campaigns).where(eq(campaigns.isActive, true)).limit(1);
    if (!campaign) throw new Error("Nie można utworzyć transakcji bez aktywnej zbiórki Siepomaga.");
    const [transaction] = await tx.insert(transactions).values({
      auctionId,
      listingId: listing.id,
      winnerId: auction.winnerId,
      sellerId: listing.userId,
      amount: auction.currentPrice,
      plannedDonationAmount: auction.currentPrice,
      campaignId: campaign.id,
      campaignNameSnapshot: campaign.name,
      campaignUrlSnapshot: campaign.externalUrl,
      piggyBankUrlSnapshot: campaign.piggyBankUrl,
      terminalUrlSnapshot: null,
      campaignProviderSnapshot: campaign.provider,
      paymentMethod: "SIEPOMAGA_DIRECT",
      status: "UMAWIANIE_SPOTKANIA",
      winnerConfirmDeadline: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      donationCode: generateDonationCode(),
    }).returning();
    return { kind: "winner" as const, listing, auction, transaction };
  });

  if (!result) return null;
  if (result.kind === "empty") {
    const isFixedDonation = result.auction.mode === "FIXED_DONATION";
    await Promise.allSettled([
      notify({
        userId: result.listing.userId,
        type: "PRZEGRANA",
        title: isFixedDonation
          ? "Okres rezerwacji zakończony"
          : "Aukcja zakończona bez ofert",
        body: isFixedDonation
          ? `Przedmiot „${result.listing.title}” nie został zarezerwowany w wyznaczonym czasie.`
          : `Aukcja „${result.listing.title}” zakończyła się bez ofert.`,
        relatedEntityType: "listing",
        relatedEntityId: result.listing.id,
      }),
      logAudit({
        actorType: "SYSTEM",
        action: isFixedDonation
          ? "STALA_WPLATA_ZAKONCZONA_BEZ_REZERWACJI"
          : "AUKCJA_ZAKONCZONA_BEZ_OFERT",
        entityType: "auction",
        entityId: auctionId,
      }),
    ]);
    return null;
  }
  if (result.kind === "winner") {
    const bidderRows = await db.select({ userId: bids.userId }).from(bids).where(and(eq(bids.auctionId, auctionId), eq(bids.isCancelled, false)));
    const losingUserIds = [...new Set(bidderRows.map((row) => row.userId).filter((userId) => userId !== result.auction.winnerId))];
    const publicAuctionUrl = `${(process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "")}/aukcje/${result.listing.id}`;
    await Promise.allSettled([
      logAudit({ actorType: "SYSTEM", action: "AUKCJA_ZAKONCZONA", entityType: "auction", entityId: auctionId, metadata: { winnerId: result.auction.winnerId } }),
      notify({ userId: result.auction.winnerId!, type: "WYGRANA", title: "Wygrałeś aukcję!", body: `Wygrałeś „${result.listing.title}” za ${Number(result.auction.currentPrice).toFixed(2).replace(".", ",")} zł. Wpłać zadeklarowaną kwotę bezpośrednio na zbiórkę i skontaktuj się z wystawiającym, aby ustalić odbiór osobisty.`, relatedEntityType: "transaction", relatedEntityId: result.transaction.id }),
      notify({ userId: result.listing.userId, type: "WYGRANA", title: "Aukcja zakończona", body: `Najwyższa oferta za „${result.listing.title}” wyniosła ${Number(result.auction.currentPrice).toFixed(2).replace(".", ",")} zł.`, relatedEntityType: "transaction", relatedEntityId: result.transaction.id }),
      enqueueUserNotification({ userId: result.auction.winnerId!, template: "AUCTION_WON", subject: "Wygrałeś aukcję dla Adasia", body: `Wygrałeś „${result.listing.title}” za ${Number(result.auction.currentPrice).toFixed(2).replace(".", ",")} zł. Wpłać bezpośrednio na zbiórkę i ustal z wystawiającym odbiór osobisty. LicytujDobro nie przyjmuje ani nie weryfikuje wpłat.`, actionUrl: `${(process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "")}/transakcje/${result.transaction.id}`, channels: ["EMAIL", "SMS"], dedupeBase: `auction-won-${result.transaction.id}` }),
      ...losingUserIds.map((userId) => notify({ userId, type: "PRZEGRANA", title: "Aukcja zakończona", body: `Tym razem nie wygrałeś „${result.listing.title}”, ale nadal możesz pomóc Adasiowi bezpośrednio albo wybrać inną aukcję.`, relatedEntityType: "listing", relatedEntityId: result.listing.id })),
      ...losingUserIds.map((userId) => enqueueUserNotification({ userId, template: "AUCTION_LOST", subject: "Nadal możesz pomóc Adasiowi", body: `Aukcja „${result.listing.title}” została zakończona. Możesz wesprzeć Adasia bezpośrednio albo zobaczyć kolejne aukcje.`, actionUrl: publicAuctionUrl, channels: ["EMAIL"], dedupeBase: `auction-lost-${auctionId}-${userId}` })),
    ]);
  }
  return result.kind === "winner" || result.kind === "existing" ? result.transaction : null;
}
