import { NextRequest } from "next/server";
import sharp from "sharp";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { listings } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { consumeRateLimit } from "@/lib/rate-limit";
import { assertTrustedMutationOrigin } from "@/lib/request-security";
import { storePrivateImage, storePublicImage } from "@/lib/object-storage";
import { reportOperationalError } from "@/lib/operational-errors";

export const runtime = "nodejs";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 8 * 1024 * 1024;
const MAX_PIXELS = 40_000_000;

function detectedType(buffer: Buffer): "jpg" | "png" | "webp" | null {
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return "jpg";
  }
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    )
  ) {
    return "png";
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString() === "RIFF" &&
    buffer.subarray(8, 12).toString() === "WEBP"
  ) {
    return "webp";
  }
  return null;
}

async function safeImageBuffer(input: Buffer): Promise<Buffer> {
  const image = sharp(input, {
    failOn: "error",
    limitInputPixels: MAX_PIXELS,
    sequentialRead: true,
  });
  const metadata = await image.metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error("Nie udało się odczytać wymiarów zdjęcia.");
  }
  if (metadata.width * metadata.height > MAX_PIXELS) {
    throw new Error("Zdjęcie ma zbyt dużą rozdzielczość.");
  }

  // Ponowne kodowanie usuwa metadane EXIF i nie zapisuje surowego uploadu 1:1.
  return image
    .rotate()
    .resize({
      width: 2_400,
      height: 2_400,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 84, effort: 4 })
    .toBuffer();
}

export async function POST(req: NextRequest) {
  try {
    await assertTrustedMutationOrigin(req, { allowMissing: false });
  } catch {
    return Response.json({ ok: false, error: "Nieprawidłowe źródło żądania." }, { status: 403 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return Response.json(
      { ok: false, error: "Musisz być zalogowany." },
      { status: 401 },
    );
  }

  const rate = await consumeRateLimit(`upload:${user.id}`, 30, 60 * 60 * 1_000);
  if (!rate.ok) {
    return Response.json(
      {
        ok: false,
        error: `Limit przesyłania plików. Spróbuj za ${rate.retryAfterSeconds} s.`,
      },
      { status: 429 },
    );
  }

  const formData = await req.formData();
  const file = formData.get("file");
  const listingId = String(formData.get("listingId") ?? "");
  const purpose = String(formData.get("purpose") ?? "public");

  if (!(file instanceof File) || !listingId) {
    return Response.json(
      { ok: false, error: "Brak pliku lub identyfikatora ogłoszenia." },
      { status: 400 },
    );
  }

  const [listing] = await db
    .select()
    .from(listings)
    .where(eq(listings.id, listingId))
    .limit(1);
  if (
    !listing ||
    listing.userId !== user.id ||
    !["SZKIC", "WYMAGA_POPRAWY"].includes(listing.status)
  ) {
    return Response.json({ ok: false, error: "Brak dostępu." }, { status: 403 });
  }

  if (!ALLOWED_TYPES.includes(file.type) || file.size > MAX_SIZE) {
    return Response.json(
      { ok: false, error: "Dozwolone: JPG, PNG lub WEBP do 8 MB." },
      { status: 400 },
    );
  }

  const original = Buffer.from(await file.arrayBuffer());
  if (!detectedType(original)) {
    return Response.json(
      { ok: false, error: "Plik nie jest prawidłowym obrazem JPG, PNG ani WEBP." },
      { status: 400 },
    );
  }

  let output: Buffer;
  try {
    output = await safeImageBuffer(original);
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Nie udało się bezpiecznie przetworzyć zdjęcia.",
      },
      { status: 400 },
    );
  }

  const fileName = `${crypto.randomUUID()}.webp`;
  try {
    const url = purpose === "verification"
      ? await storePrivateImage({ userId: user.id, listingId, fileName, body: output })
      : await storePublicImage({ listingId, fileName, body: output });

    return Response.json({ ok: true, url });
  } catch (error) {
    console.error("[upload] Nie udało się zapisać zdjęcia", error);
    await reportOperationalError(error, {
      source: "upload.storage",
      entityType: "listing",
      entityId: listingId,
      metadata: { purpose, storageDriver: process.env.OBJECT_STORAGE_DRIVER || "local" },
    });
    return Response.json(
      { ok: false, error: "Nie udało się zapisać zdjęcia. Spróbuj ponownie." },
      { status: 503 },
    );
  }
}
