import { NextResponse } from "next/server";
import { desc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { backupRuns } from "@/db/schema";
import { getLegalConfiguration } from "@/lib/legal-config";
import { campaignConfigurationError, getConfiguredCampaign } from "@/lib/single-campaign";

export async function GET() {
  try {
    await db.execute(sql`select 1 as ready`);
    const campaign = await getConfiguredCampaign();
    const legal = getLegalConfiguration();
    const issues: string[] = [];

    const campaignError = campaignConfigurationError(campaign);
    if (campaignError) issues.push(campaignError);

    const handoverSecret = process.env.HANDOVER_CODE_SECRET ?? "";
    if (handoverSecret.length < 32 || /change-me/i.test(handoverSecret)) {
      issues.push("HANDOVER_CODE_SECRET nie jest skonfigurowany.");
    }

    const emailProvider = (process.env.EMAIL_PROVIDER || process.env.EMAIL_MODE || "dev").toLowerCase();
    const contactVerificationMode = (process.env.CONTACT_VERIFICATION_MODE || "email").toLowerCase();
    if (
      process.env.NODE_ENV === "production"
      && ["email", "both", "either"].includes(contactVerificationMode)
      && emailProvider === "dev"
    ) {
      issues.push("EMAIL_PROVIDER nadal działa w trybie dev.");
    }

    const storageDriver = (process.env.OBJECT_STORAGE_DRIVER || "local").toLowerCase();
    if (process.env.NODE_ENV === "production" && storageDriver !== "r2") {
      issues.push("OBJECT_STORAGE_DRIVER nie używa R2; pliki mogą zniknąć po wdrożeniu.");
    }
    if (storageDriver === "r2") {
      const r2Values = [
        process.env.R2_ACCOUNT_ID,
        process.env.R2_ACCESS_KEY_ID,
        process.env.R2_SECRET_ACCESS_KEY,
        process.env.R2_PUBLIC_BUCKET,
        process.env.R2_PRIVATE_BUCKET,
        process.env.R2_PUBLIC_URL,
      ];
      if (r2Values.some((value) => !value)) issues.push("Konfiguracja Cloudflare R2 jest niepełna.");
    }

    if (!legal.isComplete) {
      issues.push(`Brak wymaganych publicznych danych operatora: ${legal.missingRequiredFields.join(", ")}.`);
    }
    if (process.env.NODE_ENV === "production" && process.env.LEGAL_PUBLISH_READY !== "true") {
      issues.push("LEGAL_PUBLISH_READY nie ma wartości true. Dokumenty i dane operatora wymagają końcowej akceptacji przed publikacją.");
    }
    if (process.env.NODE_ENV === "production" && !process.env.DSA_CONTACT_EMAIL?.trim()) {
      issues.push("DSA_CONTACT_EMAIL nie jest ustawiony; zostanie użyty ogólny e-mail operatora, ale zalecany jest osobny punkt kontaktowy.");
    }
    if (process.env.NODE_ENV === "production" && !process.env.PRIVACY_EMAIL?.trim()) {
      issues.push("PRIVACY_EMAIL nie jest ustawiony; zostanie użyty ogólny e-mail operatora.");
    }

    const [lastBackup] = await db
      .select()
      .from(backupRuns)
      .where(eq(backupRuns.status, "SUCCESS"))
      .orderBy(desc(backupRuns.finishedAt))
      .limit(1);
    const backupMaxAgeHours = Number(process.env.BACKUP_MAX_AGE_HOURS || 36);
    const lastBackupAt = lastBackup?.finishedAt ?? lastBackup?.startedAt;
    if (process.env.NODE_ENV === "production") {
      if (!lastBackupAt) {
        issues.push("Brak zarejestrowanej udanej kopii zapasowej.");
      } else if (Date.now() - lastBackupAt.getTime() > backupMaxAgeHours * 60 * 60 * 1000) {
        issues.push(`Ostatnia udana kopia zapasowa jest starsza niż ${backupMaxAgeHours} h.`);
      }
    }

    const productionBlocked = process.env.NODE_ENV === "production" && issues.length > 0;
    return NextResponse.json({
      status: productionBlocked ? "not_ready" : issues.length ? "ready_with_warnings" : "ready",
      database: "ok",
      campaignConfigured: !campaignError,
      legal: {
        configured: legal.isComplete,
        version: legal.legalVersion,
        effectiveDate: legal.effectiveDate,
        publishApproved: process.env.LEGAL_PUBLISH_READY === "true",
        missingRequiredFields: legal.missingRequiredFields,
      },
      storageDriver: process.env.OBJECT_STORAGE_DRIVER || "local",
      contactVerificationMode: process.env.CONTACT_VERIFICATION_MODE || "email",
      backup: {
        lastSuccessfulAt: lastBackupAt?.toISOString() ?? null,
        maxAgeHours: backupMaxAgeHours,
      },
      issues,
      timestamp: new Date().toISOString(),
    }, { status: productionBlocked ? 503 : 200 });
  } catch (error) {
    console.error("Readiness check failed", error);
    return NextResponse.json({ status: "not_ready", database: "error" }, { status: 503 });
  }
}
