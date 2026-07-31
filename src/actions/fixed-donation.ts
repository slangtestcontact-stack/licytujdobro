"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { auctions, campaigns, listings, transactions } from "@/db/schema";
import { getCurrentUser, isFullyVerified } from "@/lib/auth";
import { generateDonationCode } from "@/lib/auction-logic";
import { logAudit, notify } from "@/lib/audit";
import { consumeRateLimit } from "@/lib/rate-limit";

export type FixedDonationResult = {
  ok: boolean;
  error?: string;
  transactionId?: string;
};

export async function reserveFixedDonationAction(
  _previous: FixedDonationResult,
  formData: FormData,
): Promise<FixedDonationResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Zaloguj się, aby zarezerwować przedmiot." };
  if (!isFullyVerified(user)) {
    return { ok: false, error: "Potwierdź wymagany kontakt przed rezerwacją." };
  }
  if (!user.isAdultConfirmed || !user.acceptedTermsAt || !user.acceptedPrivacyAt || !user.onboardingCompletedAt) {
    return { ok: false, error: "Dokończ profil przed rezerwacją przedmiotu." };
  }
  if (user.status !== "aktywne") {
    return { ok: false, error: "Twoje konto nie może obecnie rezerwować przedmiotów." };
  }

  const auctionId = String(formData.get("auctionId") ?? "");
  const accepted = formData.get("acceptCommitment") === "on";
  if (!auctionId || !accepted) {
    return { ok: false, error: "Potwierdź zobowiązanie dotyczące wpłaty i odbioru." };
  }

  const rate = await consumeRateLimit(`fixed-donation:${user.id}`, 8, 60 * 60 * 1000);
  if (!rate.ok) {
    return {
      ok: false,
      error: `Zbyt wiele prób. Spróbuj ponownie za ${rate.retryAfterSeconds} s.`,
    };
  }

  try {
    const result = await db.transaction(async (tx) => {
      const [auction] = await tx
        .select()
        .from(auctions)
        .where(eq(auctions.id, auctionId))
        .for("update");

      if (!auction) throw new Error("Nie znaleziono przedmiotu.");
      const normalizedMode =
        auction.mode === "INTEREST_THEN_AUCTION"
          ? "FIXED_DONATION"
          : auction.mode;
      if (normalizedMode !== "FIXED_DONATION") {
        throw new Error("Ten przedmiot jest dostępny w licytacji.");
      }
      if (!['AKTYWNA', 'ZBIERANIE_ZAINTERESOWANIA'].includes(auction.status)) {
        throw new Error("Ten przedmiot nie jest już dostępny.");
      }
      if (auction.endAt && auction.endAt <= new Date()) {
        throw new Error("Czas dostępności przedmiotu już minął.");
      }
      if (auction.winnerId) {
        throw new Error("Ten przedmiot został już zarezerwowany.");
      }

      const [listing] = await tx
        .select()
        .from(listings)
        .where(eq(listings.id, auction.listingId))
        .limit(1);
      if (!listing || listing.status !== "AKTYWNA") {
        throw new Error("Ogłoszenie nie jest aktywne.");
      }
      if (listing.userId === user.id) {
        throw new Error("Nie możesz zarezerwować własnego przedmiotu.");
      }

      const [existing] = await tx
        .select({ id: transactions.id })
        .from(transactions)
        .where(eq(transactions.auctionId, auctionId))
        .limit(1);
      if (existing) {
        throw new Error("Ten przedmiot został już zarezerwowany.");
      }

      const [campaign] = auction.campaignId
        ? await tx
            .select()
            .from(campaigns)
            .where(eq(campaigns.id, auction.campaignId))
            .limit(1)
        : await tx
            .select()
            .from(campaigns)
            .where(and(eq(campaigns.isActive, true), eq(campaigns.isVisible, true)))
            .limit(1);
      if (!campaign) throw new Error("Brak aktywnej zbiórki.");

      const now = new Date();
      const amount = auction.startPrice;
      await tx
        .update(auctions)
        .set({
          mode: "FIXED_DONATION",
          status: "ZAKONCZONA",
          winnerId: user.id,
          currentPrice: amount,
          bidderCount: 1,
          endAt: now,
          updatedAt: now,
        })
        .where(eq(auctions.id, auctionId));
      await tx
        .update(listings)
        .set({ status: "ZAKONCZONA", updatedAt: now })
        .where(eq(listings.id, listing.id));

      const [transaction] = await tx
        .insert(transactions)
        .values({
          auctionId,
          listingId: listing.id,
          winnerId: user.id,
          sellerId: listing.userId,
          amount,
          plannedDonationAmount: amount,
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
        })
        .returning({ id: transactions.id });

      return { listing, transaction };
    });

    await Promise.allSettled([
      logAudit({
        actorId: user.id,
        action: "ZAREZERWOWANO_ZA_STALA_WPLATE",
        entityType: "auction",
        entityId: auctionId,
      }),
      notify({
        userId: user.id,
        type: "WYGRANA",
        title: "Przedmiot został zarezerwowany",
        body: `Zarezerwowałeś przedmiot „${result.listing.title}”. Wpłać zadeklarowaną kwotę bezpośrednio na zbiórkę i skontaktuj się z wystawiającym, aby ustalić odbiór osobisty.`,
        relatedEntityType: "transaction",
        relatedEntityId: result.transaction.id,
      }),
      notify({
        userId: result.listing.userId,
        type: "INFO",
        title: "Przedmiot został zarezerwowany",
        body: `Użytkownik zarezerwował „${result.listing.title}” za stałą wpłatę. Skontaktujcie się i ustalcie odbiór osobisty.`,
        relatedEntityType: "transaction",
        relatedEntityId: result.transaction.id,
      }),
    ]);

    revalidatePath(`/aukcje/${result.listing.id}`);
    revalidatePath("/aukcje");
    revalidatePath("/dashboard");
    return { ok: true, transactionId: result.transaction.id };
  } catch (error) {
    return {
      ok: false,
      error: (error as Error).message || "Nie udało się zarezerwować przedmiotu.",
    };
  }
}
