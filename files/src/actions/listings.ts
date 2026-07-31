"use server";

import { z } from "zod";
import { and, count, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  adminSettings,
  auctions,
  campaigns,
  categories,
  listingPhotos,
  listings,
} from "@/db/schema";
import { getCurrentUser, isFullyVerified } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { BLOCKED_KEYWORDS, DEFAULT_SETTINGS } from "@/lib/config";
import { assertCampaignConfigured } from "@/lib/single-campaign";
import { randomPublicCode } from "@/lib/public-code";

export type ListingActionResult = {
  ok: boolean;
  error?: string;
  listingId?: string;
};

const EDITABLE_STATUSES = ["SZKIC", "WYMAGA_POPRAWY"] as const;
type EditableListingStatus = (typeof EDITABLE_STATUSES)[number];

async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const [row] = await db
    .select()
    .from(adminSettings)
    .where(eq(adminSettings.key, key))
    .limit(1);
  return row ? (row.value as T) : fallback;
}

function normalizeText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ");
}

function containsBlockedKeyword(text: string): string | null {
  const normalized = normalizeText(text);
  return BLOCKED_KEYWORDS.find((word) => normalized.includes(normalizeText(word))) ?? null;
}

async function ensureCanList() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Musisz być zalogowany.");
  if (!isFullyVerified(user)) {
    throw new Error("Potwierdź wymagany kontakt, aby wystawiać przedmioty.");
  }
  if (user.status !== "aktywne") {
    throw new Error("Twoje konto nie może obecnie wystawiać przedmiotów.");
  }
  return user;
}

async function assertEditableOwnListing(listingId: string, userId: string) {
  const [listing] = await db
    .select()
    .from(listings)
    .where(eq(listings.id, listingId))
    .limit(1);

  if (
    !listing ||
    listing.userId !== userId ||
    !EDITABLE_STATUSES.includes(listing.status as EditableListingStatus)
  ) {
    throw new Error("Brak dostępu albo ogłoszenie nie może być już edytowane.");
  }

  return listing;
}

function listingQuality(input: {
  title: string;
  shortDescription: string;
  fullDescription: string;
  knownDefects: string;
  completeness: string;
  city: string;
  photoCount?: number;
}): number {
  return Math.min(
    100,
    (input.title.length >= 5 ? 20 : 0) +
      (input.shortDescription.length >= 20 ? 25 : 0) +
      (input.fullDescription.length >= 60 ? 10 : 0) +
      (input.knownDefects.length > 0 ? 10 : 0) +
      (input.completeness.length > 0 ? 10 : 0) +
      (input.city.length >= 2 ? 10 : 0) +
      (input.photoCount ? 25 : 0),
  );
}

const draftSchema = z.object({
  title: z.string().trim().min(5, "Tytuł musi mieć minimum 5 znaków.").max(160),
  categoryId: z.string().min(1, "Wybierz kategorię."),
  shortDescription: z
    .string()
    .trim()
    .min(10, "Krótki opis musi mieć minimum 10 znaków.")
    .max(240),
  fullDescription: z.string().trim().max(5_000).optional().default(""),
  condition: z.enum([
    "nowy",
    "jak_nowy",
    "bardzo_dobry",
    "dobry",
    "uzywany",
    "widoczne_slady",
  ]),
  knownDefects: z.string().trim().max(1_000).optional().default(""),
  completeness: z.string().trim().max(500).optional().default(""),
  estimatedValue: z.coerce.number().finite().positive("Podaj wartość większą od zera."),
  city: z
    .string()
    .trim()
    .min(2, "Podaj miasto lub miejscowość.")
    .max(120, "Nazwa miejscowości może mieć maksymalnie 120 znaków."),
  ownerType: z.enum(["SELF", "THIRD_PARTY"]).optional().default("SELF"),
  thirdPartyOwnerName: z.string().trim().max(160).optional().default(""),
  thirdPartyOwnerPhone: z.string().trim().max(32).optional().default(""),
  handoverResponsibleName: z.string().trim().max(160).optional().default(""),
});

export async function createOrUpdateDraftAction(
  _prev: ListingActionResult,
  formData: FormData,
): Promise<ListingActionResult> {
  let user;
  try {
    user = await ensureCanList();
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }

  const parsed = draftSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Sprawdź dane formularza.",
    };
  }

  const data = parsed.data;
  if (
    data.ownerType === "THIRD_PARTY" &&
    (data.thirdPartyOwnerName.length < 2 ||
      data.thirdPartyOwnerPhone.length < 9 ||
      data.handoverResponsibleName.length < 2)
  ) {
    return {
      ok: false,
      error:
        "Dla cudzego przedmiotu podaj właściciela, telefon kontaktowy i osobę odpowiedzialną za przekazanie.",
    };
  }

  const [category] = await db
    .select()
    .from(categories)
    .where(eq(categories.id, data.categoryId))
    .limit(1);
  if (!category || !category.isAllowed) {
    return { ok: false, error: "Wybrana kategoria nie jest dostępna." };
  }

  const globalLimit = await getSetting("maxItemValue", DEFAULT_SETTINGS.maxItemValue);
  const effectiveLimit = Math.min(
    Number(globalLimit),
    category.maxValue ? Number(category.maxValue) : Number(globalLimit),
  );
  if (data.estimatedValue > effectiveLimit) {
    return {
      ok: false,
      error: `Wartość przedmiotu przekracza limit ${effectiveLimit} zł dla tej kategorii.`,
    };
  }

  const blocked = containsBlockedKeyword(
    `${data.title} ${data.shortDescription} ${data.fullDescription}`,
  );
  if (blocked) {
    return {
      ok: false,
      error: `Opis wymaga ręcznej korekty - wykryto ryzykowne słowo „${blocked}”.`,
    };
  }

  const listingId = String(formData.get("listingId") ?? "");
  const existingPhotos = listingId
    ? await db
        .select({ id: listingPhotos.id })
        .from(listingPhotos)
        .where(eq(listingPhotos.listingId, listingId))
    : [];

  const dataForDb = {
    title: data.title,
    categoryId: data.categoryId,
    shortDescription: data.shortDescription,
    fullDescription: data.fullDescription,
    condition: data.condition,
    knownDefects: data.knownDefects,
    completeness: data.completeness,
    estimatedValue: String(data.estimatedValue),
    city: data.city,
    // Kolumna pozostaje dla zgodności ze schematem, ale nie jest pokazywana w formularzu.
    district: "",
    ownerType: data.ownerType,
    thirdPartyOwnerName:
      data.ownerType === "THIRD_PARTY" ? data.thirdPartyOwnerName : null,
    thirdPartyOwnerPhone:
      data.ownerType === "THIRD_PARTY" ? data.thirdPartyOwnerPhone : null,
    handoverResponsibleName:
      data.ownerType === "THIRD_PARTY" ? data.handoverResponsibleName : null,
    qualityScore: listingQuality({ ...data, photoCount: existingPhotos.length }),
    moderationNote: null,
    autosavedAt: new Date(),
    updatedAt: new Date(),
  };

  if (listingId) {
    try {
      await assertEditableOwnListing(listingId, user.id);
      await db.update(listings).set(dataForDb).where(eq(listings.id, listingId));
      revalidatePath("/dashboard");
      return { ok: true, listingId };
    } catch (error) {
      return { ok: false, error: (error as Error).message };
    }
  }

  const rows = await db
    .select({ c: count() })
    .from(listings)
    .where(
      and(
        eq(listings.userId, user.id),
        inArray(listings.status, [
          "SZKIC",
          "WYMAGA_POPRAWY",
          "OCZEKUJE_NA_MODERACJE",
          "ZATWIERDZONA",
          "AKTYWNA",
        ]),
      ),
    );
  const baseMax = await getSetting(
    "maxActiveListingsPerUser",
    DEFAULT_SETTINGS.maxActiveListingsPerUser,
  );
  const maxOpen = user.trustedSellerAt ? 10 : Number(baseMax);
  if (Number(rows[0]?.c ?? 0) >= maxOpen) {
    return {
      ok: false,
      error: user.trustedSellerAt
        ? "Jako zaufany wystawiający możesz mieć maksymalnie 10 otwartych ogłoszeń."
        : `Nowe konto może mieć maksymalnie ${maxOpen} otwarte ogłoszenia.`,
    };
  }

  let shortCode = randomPublicCode();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const [collision] = await db
      .select({ id: listings.id })
      .from(listings)
      .where(eq(listings.shortCode, shortCode))
      .limit(1);
    if (!collision) break;
    shortCode = randomPublicCode();
  }

  const [created] = await db
    .insert(listings)
    .values({
      ...dataForDb,
      shortCode,
      userId: user.id,
      status: "SZKIC",
    })
    .returning();

  await logAudit({
    actorId: user.id,
    action: "UTWORZONO_SZKIC_OGLOSZENIA",
    entityType: "listing",
    entityId: created.id,
  });

  return { ok: true, listingId: created.id };
}

function isOwnedUpload(url: string, listingId: string): boolean {
  return url.startsWith(`/uploads/${listingId}/`);
}

export async function addPhotoAction(params: {
  listingId: string;
  url: string;
  kind?: string;
}) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Musisz być zalogowany." };

  try {
    const listing = await assertEditableOwnListing(params.listingId, user.id);
    if (!isOwnedUpload(params.url, params.listingId)) {
      return { ok: false, error: "Nieprawidłowy plik zdjęcia." };
    }

    const [{ c }] = await db
      .select({ c: count() })
      .from(listingPhotos)
      .where(eq(listingPhotos.listingId, params.listingId));
    if (Number(c) >= 8) {
      return { ok: false, error: "Możesz dodać maksymalnie 8 zdjęć." };
    }

    const kind = Number(c) === 0 ? "ogolne" : "inne";
    await db.insert(listingPhotos).values({
      listingId: params.listingId,
      url: params.url,
      kind,
      position: Number(c),
    });

    await db
      .update(listings)
      .set({
        qualityScore: listingQuality({
          ...listing,
          photoCount: Number(c) + 1,
        }),
        updatedAt: new Date(),
      })
      .where(eq(listings.id, listing.id));

    revalidatePath(`/dodaj-przedmiot?listingId=${params.listingId}`);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

export async function removePhotoAction(photoId: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Musisz być zalogowany." };

  const [photo] = await db
    .select()
    .from(listingPhotos)
    .where(eq(listingPhotos.id, photoId))
    .limit(1);
  if (!photo) return { ok: false, error: "Nie znaleziono zdjęcia." };

  try {
    const listing = await assertEditableOwnListing(photo.listingId, user.id);
    await db.delete(listingPhotos).where(eq(listingPhotos.id, photoId));
    const [{ c }] = await db
      .select({ c: count() })
      .from(listingPhotos)
      .where(eq(listingPhotos.listingId, photo.listingId));
    await db
      .update(listings)
      .set({
        qualityScore: listingQuality({ ...listing, photoCount: Number(c) }),
        updatedAt: new Date(),
      })
      .where(eq(listings.id, listing.id));
    revalidatePath(`/dodaj-przedmiot?listingId=${listing.id}`);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

const auctionParamsSchema = z.object({
  listingId: z.string().min(1),
  startPrice: z.coerce.number().finite().positive("Podaj cenę większą od zera."),
  durationDays: z.coerce
    .number()
    .refine((value) => [3, 5, 7].includes(value), "Wybierz 3, 5 lub 7 dni."),
  preferredDays: z.string().trim().min(1),
  preferredHours: z.string().trim().min(1),
  meetingNotes: z.string().trim().max(500).optional().default(""),
});

export async function saveAuctionParamsAction(
  _prev: ListingActionResult,
  formData: FormData,
): Promise<ListingActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Musisz być zalogowany." };

  const parsed = auctionParamsSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Sprawdź parametry aukcji.",
    };
  }

  const data = parsed.data;
  let listing;
  try {
    listing = await assertEditableOwnListing(data.listingId, user.id);
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }

  if (data.startPrice > Number(listing.estimatedValue)) {
    return {
      ok: false,
      error: "Cena początkowa nie może przekraczać deklarowanej wartości przedmiotu.",
    };
  }

  const [activeCampaign] = await db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.isActive, true), eq(campaigns.isVisible, true)))
    .limit(1);
  if (!activeCampaign) {
    return { ok: false, error: "Administrator nie skonfigurował aktywnej zbiórki." };
  }
  try {
    assertCampaignConfigured(activeCampaign);
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }

  const paymentLimit = Number(activeCampaign.paymentLimit);
  if (data.startPrice > paymentLimit) {
    return {
      ok: false,
      error: `Cena początkowa przekracza limit zbiórki: ${paymentLimit} zł.`,
    };
  }

  const [existing] = await db
    .select()
    .from(auctions)
    .where(eq(auctions.listingId, data.listingId))
    .limit(1);
  const values = {
    campaignId: activeCampaign.id,
    startPrice: String(data.startPrice),
    currentPrice: String(data.startPrice),
    durationDays: data.durationDays,
    preferredDays: data.preferredDays,
    preferredHours: data.preferredHours,
    meetingNotes: data.meetingNotes,
    updatedAt: new Date(),
  };

  if (existing) {
    await db.update(auctions).set(values).where(eq(auctions.id, existing.id));
  } else {
    await db.insert(auctions).values({
      ...values,
      listingId: data.listingId,
      status: "ZATWIERDZONA",
    });
  }

  return { ok: true, listingId: data.listingId };
}

export async function submitListingAction(
  _prev: ListingActionResult,
  formData: FormData,
): Promise<ListingActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Musisz być zalogowany." };

  const listingId = String(formData.get("listingId") ?? "");
  if (
    formData.get("declTruthAndRights") !== "on" ||
    formData.get("declProcessRules") !== "on"
  ) {
    return { ok: false, error: "Potwierdź dwa wymagane oświadczenia." };
  }

  let listing;
  try {
    listing = await assertEditableOwnListing(listingId, user.id);
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }

  const photos = await db
    .select()
    .from(listingPhotos)
    .where(eq(listingPhotos.listingId, listingId));
  if (photos.length < 1) {
    return { ok: false, error: "Dodaj co najmniej jedno wyraźne zdjęcie przedmiotu." };
  }

  const [auction] = await db
    .select()
    .from(auctions)
    .where(eq(auctions.listingId, listingId))
    .limit(1);
  if (!auction) return { ok: false, error: "Uzupełnij parametry aukcji." };

  const now = new Date();
  await db
    .update(listings)
    .set({
      status: "OCZEKUJE_NA_MODERACJE",
      submittedAt: now,
      declarationsAcceptedAt: now,
      ownerConsentAt: listing.ownerType === "THIRD_PARTY" ? now : null,
      ownerDescriptionResponsibilityAcceptedAt:
        listing.ownerType === "THIRD_PARTY" ? now : null,
      moderationNote: null,
      updatedAt: now,
    })
    .where(eq(listings.id, listingId));

  await logAudit({
    actorId: user.id,
    action: "PRZESLANO_DO_MODERACJI",
    entityType: "listing",
    entityId: listingId,
  });
  revalidatePath("/dashboard");
  revalidatePath("/admin");
  return { ok: true, listingId };
}
