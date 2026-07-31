import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { campaigns } from "@/db/schema";

export async function getConfiguredCampaign() {
  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.isActive, true), eq(campaigns.isVisible, true)))
    .limit(1);
  return campaign ?? null;
}

export function campaignConfigurationError(campaign: typeof campaigns.$inferSelect | null): string | null {
  if (!campaign) return "Najpierw skonfiguruj jedyną zbiórkę w panelu administratora.";
  if (!campaign.beneficiaryName?.trim()) return "Uzupełnij publiczne imię beneficjenta.";
  if (!campaign.externalUrl?.startsWith("https://")) return "Uzupełnij oficjalny adres zbiórki Siepomaga.";
  if (!campaign.piggyBankUrl?.startsWith("https://")) return "Uzupełnij bezpośredni adres zbiórki lub Skarbonki Siepomaga.";
  return null;
}

export function assertCampaignConfigured(campaign: typeof campaigns.$inferSelect | null) {
  const error = campaignConfigurationError(campaign);
  if (error) throw new Error(error);
  return campaign!;
}
