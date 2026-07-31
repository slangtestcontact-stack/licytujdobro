import { NextRequest } from "next/server";

import { endDueAuctions } from "@/lib/end-auction";
import { processDueInterestWindows } from "@/lib/process-interests";
import { reportOperationalError } from "@/lib/operational-errors";
import { revalidatePublicContent } from "@/lib/public-cache";

export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const interestsProcessed = await processDueInterestWindows();
    const ended = await endDueAuctions();
    if (ended > 0) revalidatePublicContent({ sitemap: true });
    return Response.json({ ok: true, interestsProcessed, ended });
  } catch (error) {
    await reportOperationalError(error, { source: "cron.end-auctions" });
    return Response.json({ ok: false, error: "Auction ending failed" }, { status: 500 });
  }
}
