import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { listings, listingVerificationPhotos } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { readPrivateImage } from "@/lib/object-storage";
import { reportOperationalError } from "@/lib/operational-errors";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const segments = (await params).path;
  if (segments.length !== 2) return new Response("Not found", { status: 404 });
  const [listingId, fileName] = segments;
  if (
    !/^[a-zA-Z0-9-]+$/.test(listingId) ||
    !/^[a-zA-Z0-9.-]+$/.test(fileName)
  ) {
    return new Response("Not found", { status: 404 });
  }

  const url = `/api/private-file/${listingId}/${fileName}`;
  const [row] = await db
    .select({ ownerId: listings.userId })
    .from(listingVerificationPhotos)
    .innerJoin(listings, eq(listingVerificationPhotos.listingId, listings.id))
    .where(
      and(
        eq(listingVerificationPhotos.listingId, listingId),
        eq(listingVerificationPhotos.url, url),
      ),
    )
    .limit(1);

  if (!row || (row.ownerId !== user.id && user.role !== "admin")) {
    return new Response("Forbidden", { status: 403 });
  }

  try {
    const file = await readPrivateImage({
      userId: row.ownerId,
      listingId,
      fileName,
    });
    return new Response(file.body, {
      headers: {
        "Content-Type": file.contentType,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    await reportOperationalError(error, {
      source: "private-file.read",
      entityType: "listing",
      entityId: listingId,
    });
    return new Response("Not found", { status: 404 });
  }
}
