import "server-only";
import { revalidatePath, revalidateTag } from "next/cache";

export const PUBLIC_CACHE_TAGS = {
  home: "public:home",
  auctions: "public:auctions",
  teams: "public:teams",
  campaign: "public:campaign",
  sitemap: "public:sitemap",
} as const;

export function revalidatePublicContent(options?: {
  listingId?: string;
  campaign?: boolean;
  teams?: boolean;
  sitemap?: boolean;
}) {
  revalidateTag(PUBLIC_CACHE_TAGS.home, "max");
  revalidateTag(PUBLIC_CACHE_TAGS.auctions, "max");
  revalidatePath("/");
  revalidatePath("/aukcje");

  if (options?.listingId) {
    revalidatePath(`/aukcje/${options.listingId}`);
  }
  if (options?.campaign) {
    revalidateTag(PUBLIC_CACHE_TAGS.campaign, "max");
    revalidatePath("/zbiorka");
  }
  if (options?.teams) {
    revalidateTag(PUBLIC_CACHE_TAGS.teams, "max");
    revalidatePath("/druzyny");
  }
  if (options?.sitemap) {
    revalidateTag(PUBLIC_CACHE_TAGS.sitemap, "max");
    revalidatePath("/sitemap.xml");
  }
}
