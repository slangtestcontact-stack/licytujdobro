import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  adminSettings,
  auctions,
  categories,
  listingPhotos,
  listings,
} from "@/db/schema";
import { getCurrentUser, isFullyVerified } from "@/lib/auth";
import { ListingWizard } from "@/components/listing-wizard";
import { Alert } from "@/components/ui";
import { ShieldIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function AddListingPage({
  searchParams,
}: {
  searchParams: Promise<{ listingId?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/logowanie");
  if (!isFullyVerified(user)) redirect("/weryfikacja?returnTo=/dodaj-przedmiot");
  if (!user.isAdultConfirmed || !user.acceptedTermsAt || !user.acceptedPrivacyAt || !user.onboardingCompletedAt) {
    redirect("/konto/dokoncz?returnTo=%2Fdodaj-przedmiot");
  }

  const listingId = (await searchParams).listingId;
  const categoryRows = await db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .where(eq(categories.isAllowed, true))
    .orderBy(categories.name);
  const [citySetting] = await db
    .select()
    .from(adminSettings)
    .where(eq(adminSettings.key, "pilotCity"))
    .limit(1);

  let listing = null;
  let photos: { id: string; url: string; kind: string }[] = [];
  let auction = null;

  if (listingId) {
    [listing] = await db
      .select()
      .from(listings)
      .where(and(eq(listings.id, listingId), eq(listings.userId, user.id)))
      .limit(1);
    if (!listing) redirect("/dashboard");

    photos = await db
      .select({ id: listingPhotos.id, url: listingPhotos.url, kind: listingPhotos.kind })
      .from(listingPhotos)
      .where(eq(listingPhotos.listingId, listingId))
      .orderBy(listingPhotos.position);
    [auction] = await db
      .select()
      .from(auctions)
      .where(eq(auctions.listingId, listingId))
      .limit(1);
  }

  return (
    <main className="page-shell max-w-5xl py-10">
      <div className="grid gap-7 border-b border-slate-200 pb-7 sm:grid-cols-[1fr_300px]">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.14em] text-brand-600">
            Nowa aukcja
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-[-.03em] text-ink">
            Wystaw przedmiot w kilku krokach
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Wymagamy tylko krótkiego opisu, miejscowości i jednego zdjęcia. Dane są
            zapisywane jako szkic, więc błąd formularza nie usuwa wcześniejszej pracy.
          </p>
        </div>
        <div className="flex gap-3 rounded-lg border border-brand-200 bg-brand-50 p-4">
          <ShieldIcon size={19} className="mt-0.5 shrink-0 text-brand-700" />
          <p className="text-xs leading-5 text-slate-600">
            Odbiór odbywa się osobiście. Dokładne miejsce spotkania nie jest publikowane
            w ogłoszeniu.
          </p>
        </div>
      </div>

      <div className="mt-6">
        <Alert tone="warning">
          Nie wystawiaj elektroniki, leków, biletów, kart podarunkowych ani innych
          niedozwolonych kategorii.
        </Alert>
      </div>

      <div className="mt-8">
        <ListingWizard
          categories={categoryRows}
          listing={listing}
          photos={photos}
          auction={auction}
          pilotCity={String(citySetting?.value ?? "Biłgoraj")}
        />
      </div>
    </main>
  );
}
