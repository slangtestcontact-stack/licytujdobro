"use server";

import { and, eq, count } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { auctions, listingInterests, listings } from "@/db/schema";
import { getCurrentUser, isFullyVerified } from "@/lib/auth";
import { consumeRateLimit } from "@/lib/rate-limit";
import { logAudit, notify } from "@/lib/audit";

export type InterestResult = { ok: boolean; error?: string; count?: number };

export async function declareInterestAction(_prev: InterestResult, formData: FormData): Promise<InterestResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Zaloguj się, aby zgłosić zainteresowanie." };
  if (!isFullyVerified(user)) return { ok: false, error: "Potwierdź adres e-mail przed zgłoszeniem zainteresowania." };
  if (user.status !== "aktywne") return { ok: false, error: "Twoje konto nie może teraz zgłaszać zainteresowania." };
  const auctionId = String(formData.get("auctionId") ?? "");
  const accept = formData.get("acceptCommitment") === "on";
  if (!auctionId || !accept) return { ok: false, error: "Potwierdź zobowiązanie dotyczące wpłaty i odbioru." };
  const rate = await consumeRateLimit(`interest:${user.id}`, 15, 60 * 60 * 1000);
  if (!rate.ok) return { ok: false, error: `Zbyt wiele prób. Spróbuj za ${rate.retryAfterSeconds} s.` };

  try {
    const result = await db.transaction(async (tx) => {
      const [auction] = await tx.select().from(auctions).where(eq(auctions.id, auctionId)).for("update");
      if (!auction || auction.status !== "ZBIERANIE_ZAINTERESOWANIA") throw new Error("Zapisy na ten przedmiot nie są aktywne.");
      if (!auction.interestDeadline || auction.interestDeadline <= new Date()) throw new Error("Czas zgłoszeń już minął.");
      const [listing] = await tx.select().from(listings).where(eq(listings.id, auction.listingId)).limit(1);
      if (!listing) throw new Error("Nie znaleziono przedmiotu.");
      if (listing.userId === user.id) throw new Error("Nie możesz zgłosić zainteresowania własnym przedmiotem.");
      await tx.insert(listingInterests).values({ listingId: listing.id, auctionId, userId: user.id, status: "ACTIVE" }).onConflictDoUpdate({
        target: [listingInterests.auctionId, listingInterests.userId],
        set: { status: "ACTIVE", withdrawnAt: null, confirmedAt: new Date(), updatedAt: new Date() },
      });
      const [{ total }] = await tx.select({ total: count() }).from(listingInterests).where(and(eq(listingInterests.auctionId, auctionId), eq(listingInterests.status, "ACTIVE")));
      return { listing, total: Number(total) };
    });
    await Promise.allSettled([
      logAudit({ actorId: user.id, action: "ZGLOSZONO_ZAINTERESOWANIE", entityType: "auction", entityId: auctionId }),
      notify({ userId: user.id, type: "INFO", title: "Zgłoszenie zapisane", body: `Zgłosiłeś zainteresowanie przedmiotem „${result.listing.title}”. Jeżeli będziesz jedyną osobą, przedmiot zostanie przypisany Tobie za ustaloną kwotę.`, relatedEntityType: "listing", relatedEntityId: result.listing.id }),
    ]);
    revalidatePath(`/aukcje/${result.listing.id}`);
    return { ok: true, count: result.total };
  } catch (error) {
    return { ok: false, error: (error as Error).message || "Nie udało się zapisać zgłoszenia." };
  }
}

export async function withdrawInterestAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  const auctionId = String(formData.get("auctionId") ?? "");
  const [auction] = await db.select().from(auctions).where(eq(auctions.id, auctionId)).limit(1);
  if (!auction || auction.status !== "ZBIERANIE_ZAINTERESOWANIA") return;
  await db.update(listingInterests).set({ status: "WITHDRAWN", withdrawnAt: new Date(), updatedAt: new Date() }).where(and(eq(listingInterests.auctionId, auctionId), eq(listingInterests.userId, user.id)));
  revalidatePath(`/aukcje/${auction.listingId}`);
}
