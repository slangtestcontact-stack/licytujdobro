import { NextRequest } from "next/server";
import { and, asc, desc, eq, isNull, lt, or } from "drizzle-orm";
import { db } from "@/db";
import { auctions, campaignUpdates, listings, newsletterSubscriptions } from "@/db/schema";
import { formatMoney } from "@/lib/auction-logic";
import { getEmailProvider } from "@/lib/email";
import { ADAS_CAMPAIGN } from "@/lib/adas-campaign";

import { reportOperationalError } from "@/lib/operational-errors";
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const cutoff = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
  const appUrl = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");

  const [subscribers, auctionRows, updateRows] = await Promise.all([
    db.select().from(newsletterSubscriptions).where(and(
      eq(newsletterSubscriptions.isActive, true),
      or(isNull(newsletterSubscriptions.lastSentAt), lt(newsletterSubscriptions.lastSentAt, cutoff)),
    )),
    db.select({
      listingId: listings.id,
      title: listings.title,
      currentPrice: auctions.currentPrice,
      endAt: auctions.endAt,
    }).from(auctions)
      .innerJoin(listings, eq(listings.id, auctions.listingId))
      .where(eq(auctions.status, "AKTYWNA"))
      .orderBy(asc(auctions.endAt))
      .limit(6),
    db.select({ title: campaignUpdates.title, body: campaignUpdates.body })
      .from(campaignUpdates)
      .where(eq(campaignUpdates.isPublished, true))
      .orderBy(desc(campaignUpdates.publishedAt))
      .limit(1),
  ]);

  if (!subscribers.length) return Response.json({ ok: true, sent: 0, failed: 0 });

  const auctionText = auctionRows.length
    ? auctionRows.map((auction, index) => `${index + 1}. ${auction.title} - ${formatMoney(auction.currentPrice)}\n${appUrl}/aukcje/${auction.listingId}`).join("\n\n")
    : "W tym tygodniu nie ma jeszcze aktywnych aukcji. Możesz pomóc, wystawiając przedmiot.";
  const latestUpdate = updateRows[0];
  const provider = getEmailProvider();
  let sent = 0;
  let failed = 0;

  for (const subscriber of subscribers) {
    const greeting = subscriber.firstName ? `Cześć ${subscriber.firstName},` : "Cześć,";
    const text = [
      greeting,
      "",
      "Najważniejszy cel to pomoc Adasiowi. Możesz wpłacić bezpośrednio albo zwiększyć wsparcie, biorąc udział w aukcji.",
      latestUpdate ? `\nAktualność: ${latestUpdate.title}\n${latestUpdate.body}` : "",
      "\nAukcje kończące się najwcześniej:",
      auctionText,
      `\nWszystkie aukcje: ${appUrl}/aukcje`,
      `Wpłać bezpośrednio dla Adasia: ${ADAS_CAMPAIGN.piggyBankUrl}`,
      "",
      "Otrzymujesz tę wiadomość, ponieważ zapisano ten adres do newslettera LicytujDobro.",
    ].filter(Boolean).join("\n");

    try {
      const result = await provider.send({
        to: subscriber.email,
        subject: "Pomóż Adasiowi - aukcje i aktualności LicytujDobro",
        text,
      });
      if (!result.ok) throw new Error("Dostawca odrzucił wiadomość.");
      await db.update(newsletterSubscriptions).set({ lastSentAt: now, updatedAt: now }).where(eq(newsletterSubscriptions.id, subscriber.id));
      sent += 1;
    } catch (error) {
      console.error("Newsletter send failed", { subscriptionId: subscriber.id, error });
      await reportOperationalError(error, { source: "cron.newsletter", entityId: subscriber.id });
      failed += 1;
    }
  }

  return Response.json({ ok: failed === 0, sent, failed });
}
