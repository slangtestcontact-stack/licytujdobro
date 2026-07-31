import { NextRequest } from "next/server";
import { and, eq, gte, isNull, lte } from "drizzle-orm";
import { db } from "@/db";
import { auctions, guestAuctionReminders, listings, meetings, transactions, watchlists } from "@/db/schema";
import { notify } from "@/lib/audit";
import { enqueueUserNotification } from "@/lib/notification-outbox";
import { publicAuctionUrl, getPublicBaseUrl } from "@/lib/public-code";
import { getEmailProvider } from "@/lib/email";

import { reportOperationalError } from "@/lib/operational-errors";
async function dispatchAuctionWindow(kind: "24h" | "1h", from: Date, to: Date) {
  const rows = await db.select({ auctionId: auctions.id, listingId: listings.id, title: listings.title, shortCode: listings.shortCode, endAt: auctions.endAt, userId: watchlists.userId, notify24h: watchlists.notify24h, notify1h: watchlists.notify1h })
    .from(auctions).innerJoin(listings, eq(listings.id, auctions.listingId)).innerJoin(watchlists, eq(watchlists.listingId, listings.id))
    .where(and(eq(auctions.status, "AKTYWNA"), gte(auctions.endAt, from), lte(auctions.endAt, to)));
  let sent = 0;
  for (const row of rows) {
    if ((kind === "24h" && !row.notify24h) || (kind === "1h" && !row.notify1h)) continue;
    const title = kind === "24h" ? "Obserwowana aukcja kończy się jutro" : "Obserwowana aukcja kończy się za około godzinę";
    const body = `Aukcja „${row.title}” kończy się ${row.endAt?.toLocaleString("pl-PL") ?? "wkrótce"}.`;
    await notify({ userId: row.userId, type: kind === "24h" ? "KONCZY_SIE_24H" : "KONCZY_SIE_1H", title, body, relatedEntityType: "listing", relatedEntityId: row.listingId, dedupeKey: `watch-${kind}-${row.auctionId}-${row.userId}` });
    await enqueueUserNotification({ userId: row.userId, template: kind === "24h" ? "AUCTION_ENDS_24H" : "AUCTION_ENDS_1H", subject: title, body, actionUrl: publicAuctionUrl(row.shortCode || row.listingId.slice(0, 8)), dedupeBase: `watch-mail-${kind}-${row.auctionId}-${row.userId}` });
    sent += 1;
  }
  return sent;
}

async function dispatchGuestAuctionReminders(from: Date, to: Date) {
  const rows = await db.select({
    reminderId: guestAuctionReminders.id,
    email: guestAuctionReminders.email,
    token: guestAuctionReminders.unsubscribeToken,
    listingId: listings.id,
    shortCode: listings.shortCode,
    title: listings.title,
    endAt: auctions.endAt,
  }).from(guestAuctionReminders)
    .innerJoin(listings, eq(listings.id, guestAuctionReminders.listingId))
    .innerJoin(auctions, eq(auctions.listingId, listings.id))
    .where(and(
      eq(guestAuctionReminders.isActive, true),
      isNull(guestAuctionReminders.remindedAt),
      eq(auctions.status, "AKTYWNA"),
      gte(auctions.endAt, from),
      lte(auctions.endAt, to),
    ));

  let sent = 0;
  let failed = 0;
  const baseUrl = getPublicBaseUrl();
  const provider = getEmailProvider();
  for (const row of rows) {
    try {
      const auctionUrl = row.shortCode ? publicAuctionUrl(row.shortCode) : `${baseUrl}/aukcje/${row.listingId}`;
      const unsubscribeUrl = `${baseUrl}/api/przypomnienia/rezygnacja/${row.token}`;
      await provider.send({
        to: row.email,
        subject: `Aukcja „${row.title}” kończy się za około godzinę`,
        text: [
          `Aukcja „${row.title}” kończy się ${row.endAt?.toLocaleString("pl-PL") ?? "wkrótce"}.`,
          "Możesz wrócić do licytacji albo bez logowania wesprzeć Adasia bezpośrednio na oficjalną zbiórkę Adasia w serwisie Siepomaga.pl.",
          "",
          `Otwórz aukcję: ${auctionUrl}`,
          "",
          `Rezygnacja z tego jednorazowego przypomnienia: ${unsubscribeUrl}`,
        ].join("\n"),
      });
      await db.update(guestAuctionReminders).set({ remindedAt: new Date(), isActive: false, updatedAt: new Date() }).where(eq(guestAuctionReminders.id, row.reminderId));
      sent += 1;
    } catch (error) {
      console.error("Nie udało się wysłać przypomnienia gościa", row.reminderId, error);
      await reportOperationalError(error, { source: "cron.reminders", entityId: row.reminderId });
      failed += 1;
    }
  }
  return { found: rows.length, sent, failed };
}

function meetingDateTime(date: string, timeRange: string) {
  const start = timeRange.match(/\d{1,2}:\d{2}/)?.[0] || "12:00";
  return new Date(`${date}T${start}:00`);
}

async function dispatchMeetingWindow(kind: "24h" | "1h", from: Date, to: Date) {
  const rows = await db.select({ meeting: meetings, transaction: transactions, title: listings.title })
    .from(meetings).innerJoin(transactions, eq(transactions.id, meetings.transactionId)).innerJoin(listings, eq(listings.id, transactions.listingId))
    .where(eq(meetings.status, "ZAPLANOWANE"));
  let sent = 0;
  for (const row of rows) {
    const at = meetingDateTime(row.meeting.date, row.meeting.timeRange);
    if (at < from || at > to) continue;
    const subject = kind === "24h" ? "Spotkanie dotyczące aukcji jest jutro" : "Spotkanie dotyczące aukcji jest za około godzinę";
    const body = `${row.title}: ${row.meeting.date}, ${row.meeting.timeRange}. Dokładne miejsce sprawdź po zalogowaniu.`;
    const actionUrl = `${getPublicBaseUrl()}/transakcje/${row.transaction.id}`;
    for (const userId of [row.transaction.winnerId, row.transaction.sellerId]) {
      await enqueueUserNotification({ userId, template: kind === "24h" ? "MEETING_TOMORROW" : "MEETING_1H", subject, body, actionUrl, channels: kind === "1h" ? ["EMAIL", "SMS"] : ["EMAIL"], dedupeBase: `meeting-${kind}-${row.meeting.id}-${userId}` });
      sent += 1;
    }
  }
  return sent;
}

export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const now = new Date();
  const around24From = new Date(now.getTime() + 23.75 * 60 * 60 * 1000);
  const around24To = new Date(now.getTime() + 24.25 * 60 * 60 * 1000);
  const around1From = new Date(now.getTime() + 45 * 60 * 1000);
  const around1To = new Date(now.getTime() + 75 * 60 * 1000);
  const [auction24h, auction1h, guestAuction1h, meeting24h, meeting1h] = await Promise.all([
    dispatchAuctionWindow("24h", around24From, around24To), dispatchAuctionWindow("1h", around1From, around1To),
    dispatchGuestAuctionReminders(around1From, around1To),
    dispatchMeetingWindow("24h", around24From, around24To), dispatchMeetingWindow("1h", around1From, around1To),
  ]);
  const cleanupBefore = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const removedGuestReminders = await db.delete(guestAuctionReminders)
    .where(and(eq(guestAuctionReminders.isActive, false), lte(guestAuctionReminders.updatedAt, cleanupBefore)))
    .returning({ id: guestAuctionReminders.id });
  return Response.json({ ok: true, auction24h, auction1h, guestAuction1h, meeting24h, meeting1h, removedGuestReminders: removedGuestReminders.length });
}
