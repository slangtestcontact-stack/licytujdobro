import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { getConfiguredCampaign, campaignConfigurationError } from "@/lib/single-campaign";

export async function GET() {
  try {
    await db.execute(sql`select 1 as ready`);
    const campaign = await getConfiguredCampaign();
    const issues: string[] = [];
    const campaignError = campaignConfigurationError(campaign);
    if (campaignError) issues.push(campaignError);
    const handoverSecret = process.env.HANDOVER_CODE_SECRET ?? "";
    if (handoverSecret.length < 32 || /change-me/i.test(handoverSecret)) issues.push("HANDOVER_CODE_SECRET nie jest skonfigurowany.");
    const emailProvider = (process.env.EMAIL_PROVIDER || process.env.EMAIL_MODE || "dev").toLowerCase();
    const smsProvider = (process.env.SMS_PROVIDER || process.env.SMS_MODE || "dev").toLowerCase();
    if (process.env.NODE_ENV === "production" && emailProvider === "dev") {
      issues.push("EMAIL_PROVIDER nadal działa w trybie dev.");
    }
    if (process.env.NODE_ENV === "production" && smsProvider === "dev") {
      issues.push("SMS_PROVIDER nadal działa w trybie dev.");
    }

    const productionBlocked = process.env.NODE_ENV === "production" && issues.length > 0;
    return NextResponse.json({
      status: productionBlocked ? "not_ready" : issues.length ? "ready_with_warnings" : "ready",
      database: "ok",
      campaignConfigured: !campaignError,
      issues,
      timestamp: new Date().toISOString(),
    }, { status: productionBlocked ? 503 : 200 });
  } catch (error) {
    console.error("Readiness check failed", error);
    return NextResponse.json({ status: "not_ready", database: "error" }, { status: 503 });
  }
}
