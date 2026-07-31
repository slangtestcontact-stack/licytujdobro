import { NextRequest } from "next/server";

import { processNotificationOutbox } from "@/lib/notification-outbox";
import { reportOperationalError } from "@/lib/operational-errors";

export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processNotificationOutbox(100);
    return Response.json({ ok: true, ...result });
  } catch (error) {
    await reportOperationalError(error, { source: "cron.notifications" });
    return Response.json({ ok: false, error: "Notification processing failed" }, { status: 500 });
  }
}
