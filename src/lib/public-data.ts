import "server-only";

import { unstable_cache } from "next/cache";
import { asc, count, desc, eq, sql, inArray } from "drizzle-orm";

import { db } from "@/db";
import {
  auctions,
  campaigns,
  campaignUpdates,
  categories,
  listings,
  supportTeams,
  teamMemberships,
  transactions,
  userProfiles,
  users,
} from "@/db/schema";
import { getRequiredBid } from "@/lib/config";
import { ADAS_CAMPAIGN } from "@/lib/adas-campaign";
import { PUBLIC_CACHE_TAGS } from "@/lib/public-cache";
import type { AuctionCardData } from "@/components/auction-card";

const CACHE_SECONDS = 30;

function toTimestamp(value: Date | string | null | undefined): number {
  if (!value) {
    return Number.MAX_SAFE_INTEGER;
  }

  const timestamp =
    value instanceof Date
      ? value.getTime()
      : new Date(value).getTime();

  return Number.isNaN(timestamp)
    ? Number.MAX_SAFE_INTEGER
    : timestamp;
}

export type HomePublicData = {
  special: AuctionCardData[];
  popular: AuctionCardData[];
  noBids: AuctionCardData[];
  endingSoon: AuctionCardData[];
  campaign: typeof campaigns.$inferSelect | undefined;
  latestUpdate: typeof campaignUpdates.$inferSelect | undefined;
  teams: Array<{
    id: string;
    slug: string;
    name: string;
    description: string;
    imageUrl: string | null;
    members: number;
  }>;
  stats: {
    activeListings: number;
    helpers: number;
    completed: number;
    confirmedAmount: string;
  };
};

function toCard(row: {
  listingId: string;
  title: string;
  condition: string;
  categoryName: string;
  currentPrice: string;
  startPrice: string;
  minBidIncrement: string;
  mode: string;
  bidCount: number;
  endAt: Date | null;
  sellerNickname: string;
  sellerEmoji: string | null;
  sellerRating: string | null;
  isSpecial: boolean;
  specialLabel: string | null;
  photoUrl: string | null;
}): AuctionCardData {
  const currentPrice = Number(row.currentPrice);
  return {
    listingId: row.listingId,
    title: row.title,
    condition: row.condition,
    categoryName: row.categoryName,
    district: ADAS_CAMPAIGN.regionLabel,
    photoUrl: row.photoUrl ?? "/images/item-placeholder.svg",
    currentPrice: row.currentPrice,
    mode: row.mode,
    bidCount: row.bidCount,
    endAt: row.endAt,
    minNextBid: getRequiredBid(
      Number(row.startPrice),
      currentPrice,
      row.bidCount,
      Number(row.minBidIncrement),
    ),
    sellerNickname: row.sellerNickname,
    sellerEmoji: row.sellerEmoji,
    sellerRating: row.sellerRating,
    isSpecial: row.isSpecial,
    specialLabel: row.specialLabel,
  };
}

async function loadHomePublicData(): Promise<HomePublicData> {
  const activeAuctionRowsPromise = db
    .select({
      listingId: listings.id,
      title: listings.title,
      condition: listings.condition,
      categoryName: categories.name,
      currentPrice: auctions.currentPrice,
      startPrice: auctions.startPrice,
      minBidIncrement: auctions.minBidIncrement,
      mode: auctions.mode,
      bidCount: auctions.bidCount,
      endAt: auctions.endAt,
      sellerNickname: users.nickname,
      sellerEmoji: userProfiles.avatarEmoji,
      sellerRating: userProfiles.ratingAvg,
      isSpecial: listings.isSpecial,
      specialLabel: listings.specialLabel,
      photoUrl: sql<string | null>`(
        select lp.url
        from listing_photos lp
        where lp.listing_id = ${listings.id}
          and lp.kind = 'ogolne'
        order by lp.position asc, lp.created_at asc
        limit 1
      )`,
    })
    .from(auctions)
    .innerJoin(listings, eq(auctions.listingId, listings.id))
    .innerJoin(categories, eq(listings.categoryId, categories.id))
    .innerJoin(users, eq(listings.userId, users.id))
    .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
    .where(inArray(auctions.status, ["AKTYWNA", "ZBIERANIE_ZAINTERESOWANIA"]))
    .orderBy(asc(auctions.endAt))
    .limit(120);

  const campaignPromise = db
    .select()
    .from(campaigns)
    .where(eq(campaigns.isActive, true))
    .limit(1)
    .then((rows) => rows[0]);

  const updatePromise = db
    .select()
    .from(campaignUpdates)
    .where(eq(campaignUpdates.isPublished, true))
    .orderBy(desc(campaignUpdates.publishedAt))
    .limit(1)
    .then((rows) => rows[0]);

  const teamsPromise = db
    .select({
      id: supportTeams.id,
      name: supportTeams.name,
      slug: supportTeams.slug,
      description: supportTeams.description,
      imageUrl: supportTeams.imageUrl,
      createdAt: supportTeams.createdAt,
      members: count(teamMemberships.id),
    })
    .from(supportTeams)
    .leftJoin(teamMemberships, eq(teamMemberships.teamId, supportTeams.id))
    .where(eq(supportTeams.isActive, true))
    .groupBy(supportTeams.id)
    .orderBy(asc(supportTeams.createdAt))
    .limit(3);

  const statsPromise = db.execute<{
    active_listings: string;
    helpers: string;
    completed: string;
    confirmed_amount: string;
  }>(sql`
    select
      (select count(*)::text from listings where status = 'AKTYWNA') as active_listings,
      (select count(*)::text from users) as helpers,
      (select count(*)::text from transactions where status = 'ZAKONCZONA_POMYSLNIE') as completed,
      (select coalesce(sum(coalesce(planned_donation_amount, amount)), 0)::text
       from transactions where status = 'ZAKONCZONA_POMYSLNIE') as confirmed_amount
  `);

  const [rows, campaign, latestUpdate, teamRows, statsResult] = await Promise.all([
    activeAuctionRowsPromise,
    campaignPromise,
    updatePromise,
    teamsPromise,
    statsPromise,
  ]);

  const cards = rows.map(toCard);
  const byPopularity = [...cards].sort((a, b) => b.bidCount - a.bidCount || Number(a.currentPrice) - Number(b.currentPrice));
  const byEnding = [...cards].sort((a, b) => {
    const aTime = toTimestamp(a.endAt);
    const bTime = toTimestamp(b.endAt);
    return aTime - bTime;
  });

  const statsRow = statsResult.rows[0];

  return {
    special: byEnding.filter((item) => item.isSpecial).slice(0, 4),
    popular: byPopularity.slice(0, 4),
    noBids: byEnding.filter((item) => item.mode === "AUCTION" && item.bidCount === 0).slice(0, 4),
    endingSoon: byEnding.slice(0, 4),
    campaign,
    latestUpdate,
    teams: teamRows.map((team) => ({ ...team, members: Number(team.members) })),
    stats: {
      activeListings: Number(statsRow?.active_listings ?? 0),
      helpers: Number(statsRow?.helpers ?? 0),
      completed: Number(statsRow?.completed ?? 0),
      confirmedAmount: statsRow?.confirmed_amount ?? "0",
    },
  };
}

const loadCachedHomePublicData = unstable_cache(
  loadHomePublicData,
  ["home-public-data-v3"],
  {
    revalidate: CACHE_SECONDS,
    tags: [
      PUBLIC_CACHE_TAGS.home,
      PUBLIC_CACHE_TAGS.auctions,
      PUBLIC_CACHE_TAGS.teams,
      PUBLIC_CACHE_TAGS.campaign,
    ],
  },
);

export async function getHomePublicData(): Promise<HomePublicData> {
  try {
    return await loadCachedHomePublicData();
  } catch (error) {
    console.error("[home] Nie udało się pobrać danych publicznych:", error);
    return {
      special: [],
      popular: [],
      noBids: [],
      endingSoon: [],
      campaign: undefined,
      latestUpdate: undefined,
      teams: [],
      stats: {
        activeListings: 0,
        helpers: 0,
        completed: 0,
        confirmedAmount: "0",
      },
    };
  }
}

export const getAllowedCategories = unstable_cache(
  async () => db.select().from(categories).where(eq(categories.isAllowed, true)).orderBy(asc(categories.name)),
  ["allowed-categories-v1"],
  { revalidate: 300, tags: [PUBLIC_CACHE_TAGS.auctions] },
);

export const getPublicSitemapEntries = unstable_cache(
  async () => {
    const [auctionRows, eventRows] = await Promise.all([
      db
        .select({ id: listings.id, updatedAt: listings.updatedAt })
        .from(listings)
        .where(eq(listings.status, "AKTYWNA")),
      db.execute<{ slug: string; updated_at: Date }>(sql`
        select slug, updated_at
        from community_events
        where is_published = true and slug is not null
      `).then((result) => result.rows),
    ]);
    return { auctionRows, eventRows };
  },
  ["public-sitemap-entries-v1"],
  { revalidate: 300, tags: [PUBLIC_CACHE_TAGS.sitemap, PUBLIC_CACHE_TAGS.auctions] },
);
