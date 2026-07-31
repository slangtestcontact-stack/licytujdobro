import "server-only";

import { and, asc, eq, lte } from "drizzle-orm";

import { db } from "@/db";
import { notificationOutbox, users } from "@/db/schema";
import { getEmailProvider } from "@/lib/email";
import { getSmsProvider } from "@/lib/sms";
import { isTechnicalEmail, isTechnicalPhone } from "@/lib/contact-verification";

export type NotificationTemplate =
  | "LISTING_APPROVED"
  | "NEW_BID"
  | "OUTBID"
  | "AUCTION_WON"
  | "AUCTION_LOST"
  | "PLAN_MEETING"
  | "AUCTION_ENDS_24H"
  | "AUCTION_ENDS_1H"
  | "MEETING_TOMORROW"
  | "MEETING_1H"
  | "PAYMENT_CONFIRMATION_REQUIRED"
  | "TRANSACTION_COMPLETED"
  | "SUPPORT_CASE_RESPONSE_REQUIRED";

function isTechnicalRecipient(
  channel: string,
  recipient: string | null | undefined,
) {
  if (channel === "EMAIL") return isTechnicalEmail(recipient);
  if (channel === "SMS") return isTechnicalPhone(recipient);
  return !recipient;
}

export async function enqueueUserNotification(input: {
  userId: string;
  template: NotificationTemplate;
  subject: string;
  body: string;
  actionUrl: string;
  channels?: ("EMAIL" | "SMS")[];
  dedupeBase?: string;
}) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, input.userId))
    .limit(1);
  if (!user) return;

  const channels = input.channels ?? ["EMAIL"];
  for (const channel of channels) {
    const recipient = channel === "EMAIL" ? user.email : user.phone;
    if (isTechnicalRecipient(channel, recipient)) continue;

    await db
      .insert(notificationOutbox)
      .values({
        userId: user.id,
        channel,
        template: input.template,
        recipient,
        subject: channel === "EMAIL" ? input.subject : null,
        body: input.body,
        actionUrl: input.actionUrl,
        dedupeKey: input.dedupeBase
          ? `${input.dedupeBase}:${channel}`
          : null,
      })
      .onConflictDoNothing({ target: notificationOutbox.dedupeKey });
  }
}

export async function processNotificationOutbox(limit = 50) {
  const jobs = await db
    .select()
    .from(notificationOutbox)
    .where(
      and(
        eq(notificationOutbox.status, "PENDING"),
        lte(notificationOutbox.nextAttemptAt, new Date()),
      ),
    )
    .orderBy(asc(notificationOutbox.createdAt))
    .limit(limit);

  let sent = 0;
  let failed = 0;

  for (const job of jobs) {
    if (isTechnicalRecipient(job.channel, job.recipient)) {
      await db
        .update(notificationOutbox)
        .set({
          status: "FAILED",
          attempts: job.attempts + 1,
          lastError: "Pominięto techniczny adres odbiorcy.",
          updatedAt: new Date(),
        })
        .where(eq(notificationOutbox.id, job.id));
      failed += 1;
      continue;
    }

    await db
      .update(notificationOutbox)
      .set({
        status: "PROCESSING",
        attempts: job.attempts + 1,
        updatedAt: new Date(),
      })
      .where(eq(notificationOutbox.id, job.id));

    try {
      if (job.channel === "EMAIL") {
        await getEmailProvider().send({
          to: job.recipient,
          subject: job.subject || "LicytujDobro",
          text: `${job.body}\n\n${
            job.actionUrl ? `Otwórz: ${job.actionUrl}` : ""
          }`.trim(),
        });
      } else if (job.channel === "SMS") {
        await getSmsProvider().send(
          job.recipient,
          `${job.body}${job.actionUrl ? ` ${job.actionUrl}` : ""}`,
        );
      } else {
        throw new Error(`Nieobsługiwany kanał: ${job.channel}`);
      }

      await db
        .update(notificationOutbox)
        .set({
          status: "SENT",
          sentAt: new Date(),
          lastError: null,
          updatedAt: new Date(),
        })
        .where(eq(notificationOutbox.id, job.id));
      sent += 1;
    } catch (error) {
      const attempts = job.attempts + 1;
      const retryMinutes = Math.min(60, 2 ** Math.min(attempts, 5));

      await db
        .update(notificationOutbox)
        .set({
          status: attempts >= 5 ? "FAILED" : "PENDING",
          lastError: (error as Error).message.slice(0, 2000),
          nextAttemptAt: new Date(Date.now() + retryMinutes * 60_000),
          updatedAt: new Date(),
        })
        .where(eq(notificationOutbox.id, job.id));
      failed += 1;
    }
  }

  return { processed: jobs.length, sent, failed };
}
