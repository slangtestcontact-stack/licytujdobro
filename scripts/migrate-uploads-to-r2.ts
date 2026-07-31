import "dotenv/config";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";

import { db, pool } from "@/db";
import { listingPhotos, listings, listingVerificationPhotos } from "@/db/schema";
import { storePrivateImage, storePublicImage, usesR2Storage } from "@/lib/object-storage";

if (!usesR2Storage()) {
  throw new Error("Ustaw OBJECT_STORAGE_DRIVER=r2 oraz komplet zmiennych R2 przed migracją.");
}

let publicMoved = 0;
let publicSkipped = 0;
let privateMoved = 0;
let privateSkipped = 0;

try {
  const publicPhotos = await db.select().from(listingPhotos);
  for (const photo of publicPhotos) {
    if (!photo.url.startsWith("/uploads/")) {
      publicSkipped += 1;
      continue;
    }

    const relativePath = photo.url.replace(/^\/+/, "");
    const sourcePath = path.join(process.cwd(), "public", relativePath.replace(/^uploads\//, "uploads/"));
    const fileName = path.basename(relativePath);
    const body = await readFile(sourcePath);
    const newUrl = await storePublicImage({ listingId: photo.listingId, fileName, body });
    await db.update(listingPhotos).set({ url: newUrl, updatedAt: new Date() }).where(eq(listingPhotos.id, photo.id));
    publicMoved += 1;
    console.log(`[public] ${photo.url} -> ${newUrl}`);
  }

  if (process.argv.includes("--private")) {
    const privatePhotos = await db
      .select({ photo: listingVerificationPhotos, ownerId: listings.userId })
      .from(listingVerificationPhotos)
      .innerJoin(listings, eq(listings.id, listingVerificationPhotos.listingId));

    for (const row of privatePhotos) {
      const match = row.photo.url.match(/^\/api\/private-file\/([^/]+)\/([^/]+)$/);
      if (!match) {
        privateSkipped += 1;
        continue;
      }

      const [, listingId, fileName] = match;
      const sourcePath = path.join(process.cwd(), ".data", "private", row.ownerId, listingId, fileName);
      const body = await readFile(sourcePath);
      await storePrivateImage({ userId: row.ownerId, listingId, fileName, body });
      privateMoved += 1;
      console.log(`[private] ${listingId}/${fileName}`);
    }
  }

  console.log({ publicMoved, publicSkipped, privateMoved, privateSkipped });
  console.log("Migracja zakończona. Nie usuwaj lokalnych plików przed sprawdzeniem zdjęć w aplikacji.");
} finally {
  await pool.end();
}
