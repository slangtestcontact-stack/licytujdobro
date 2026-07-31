import "dotenv/config";
import { and, eq } from "drizzle-orm";
import { db, pool } from "@/db";
import { campaigns, listingPhotos, listings } from "@/db/schema";

const MATCHERS: { test: (title: string) => boolean; image: string; detail?: string }[] = [
  { test: (t) => /wiedźmin|wiedzmin/i.test(t), image: "/images/demo/book-wiedzmin.jpg", detail: "/images/demo/book-wiedzmin-detail.jpg" },
  { test: (t) => /komiks/i.test(t), image: "/images/demo/comics-set.jpg" },
  { test: (t) => /osadnicy|gra planszowa/i.test(t), image: "/images/demo/boardgame-osadnicy.jpg" },
  { test: (t) => /plakat/i.test(t), image: "/images/demo/poster-Biłgoraj.jpg" },
  { test: (t) => /puzzle/i.test(t), image: "/images/demo/puzzle-mountains.jpg" },
  { test: (t) => /obraz|wisła|wisla/i.test(t), image: "/images/demo/painting-vistula.jpg" },
  { test: (t) => /dziecięc|dzieciec/i.test(t), image: "/images/demo/children-books.jpg" },
  { test: (t) => /piłka|pilka/i.test(t), image: "/images/demo/signed-ball.jpg" },
];

async function main() {
  const rows = await db.select({ id: listings.id, title: listings.title }).from(listings);
  let updated = 0;
  for (const row of rows) {
    const match = MATCHERS.find((item) => item.test(row.title));
    if (!match) continue;
    await db.update(listingPhotos).set({ url: match.image, updatedAt: new Date() }).where(eq(listingPhotos.listingId, row.id));
    if (match.detail) {
      await db.update(listingPhotos).set({ url: match.detail, updatedAt: new Date() }).where(and(eq(listingPhotos.listingId, row.id), eq(listingPhotos.position, 1)));
    }
    updated++;
  }
  await db.update(campaigns).set({ imageUrl: "/adas-iwanejko.png", updatedAt: new Date() });
  console.log(`Zaktualizowano zdjęcia dla ${updated} ogłoszeń i kampanii demo.`);
}

main().then(async()=>{await pool.end();process.exit(0);}).catch(async(error)=>{console.error(error);await pool.end();process.exit(1);});
