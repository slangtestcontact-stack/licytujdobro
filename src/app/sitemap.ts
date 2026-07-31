import type { MetadataRoute } from "next";

import { getPublicSitemapEntries } from "@/lib/public-data";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const staticRoutes = [
    "",
    "/aukcje",
    "/zbiorka",
    "/wydarzenia",
    "/druzyny",
    "/historia-adasia",
    "/jak-to-dziala",
    "/bezpieczenstwo",
    "/transparentnosc",
    "/gdzie-trafiaja-pieniadze",
    "/faq",
    "/kontakt",
    "/prawne/regulamin",
    "/prawne/zasady-licytacji",
    "/prawne/polityka-prywatnosci",
    "/prawne/polityka-cookies",
    "/prawne/zgloszenia",
    "/prawne/odwolania",
  ];
  const { auctionRows, eventRows } = await getPublicSitemapEntries();

  return [
    ...staticRoutes.map((route) => ({
      url: `${base}${route}`,
      changeFrequency: route === "/aukcje" ? "daily" as const : "weekly" as const,
      priority: route === "" ? 1 : route === "/aukcje" ? 0.9 : 0.7,
    })),
    ...auctionRows.map((row) => ({
      url: `${base}/aukcje/${row.id}`,
      lastModified: row.updatedAt,
      changeFrequency: "hourly" as const,
      priority: 0.8,
    })),
    ...eventRows.map((row) => ({
      url: `${base}/wydarzenia/${row.slug}`,
      lastModified: row.updated_at,
      changeFrequency: "weekly" as const,
      priority: 0.65,
    })),
  ];
}
