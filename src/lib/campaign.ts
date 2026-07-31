import "server-only";

import { cache } from "react";
import { unstable_cache } from "next/cache";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { campaigns } from "@/db/schema";
import { ADAS_CAMPAIGN } from "@/lib/adas-campaign";
import { PUBLIC_CACHE_TAGS } from "@/lib/public-cache";

async function loadActiveCampaign() {
  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.isActive, true))
    .limit(1);

  return campaign ?? null;
}

const loadCachedActiveCampaign = unstable_cache(
  loadActiveCampaign,
  ["active-campaign-v3"],
  { revalidate: 60, tags: [PUBLIC_CACHE_TAGS.campaign] },
);

const loadRequestActiveCampaign = cache(loadCachedActiveCampaign);

export async function getActiveCampaign() {
  try {
    return await loadRequestActiveCampaign();
  } catch (error) {
    console.error("[campaign] Nie udało się pobrać aktywnej kampanii:", error);
    return null;
  }
}

export function campaignUrls(campaign: Awaited<ReturnType<typeof getActiveCampaign>>) {
  return {
    main: campaign?.externalUrl || ADAS_CAMPAIGN.officialCampaignUrl,
    piggy: campaign?.piggyBankUrl || ADAS_CAMPAIGN.piggyBankUrl,
    terminal: campaign?.terminalUrl || ADAS_CAMPAIGN.terminalUrl,
  };
}
