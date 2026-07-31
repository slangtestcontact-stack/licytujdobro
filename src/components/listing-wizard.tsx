"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  type ReactNode,
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  addPhotoAction,
  createOrUpdateDraftAction,
  removePhotoAction,
  saveAuctionParamsAction,
  submitListingAction,
  type ListingActionResult,
} from "@/actions/listings";
import { Alert, Button, Card, Field, inputClass } from "@/components/ui";
import { CheckIcon, ClockIcon, GavelIcon, HandHeartIcon, MapPinIcon, PackageIcon, ShieldIcon } from "@/components/icons";

const initial: ListingActionResult = { ok: false };
const STORAGE_KEY = "licytujdobro:listings:draft-v2";

type Category = { id: string; name: string };
type Listing = {
  id: string;
  title: string;
  categoryId: string;
  shortDescription: string;
  fullDescription: string;
  condition: string;
  knownDefects: string;
  completeness: string;
  estimatedValue: string;
  city: string;
  district: string;
  status: string;
  moderationNote: string | null;
  ownerType: string;
  thirdPartyOwnerName: string | null;
  thirdPartyOwnerPhone: string | null;
  handoverResponsibleName: string | null;
};
type Photo = { id: string; url: string; kind: string };
type Auction = {
  startPrice: string;
  minBidIncrement: string;
  mode: string;
  interestDurationHours: number;
  auctionDurationHours: number;
  durationDays: number;
  preferredDays: string | null;
  preferredHours: string | null;
  meetingNotes: string | null;
} | null;

type DraftValues = {
  title: string;
  categoryId: string;
  shortDescription: string;
  fullDescription: string;
  condition: string;
  estimatedValue: string;
  knownDefects: string;
  completeness: string;
  city: string;
  ownerType: "SELF" | "THIRD_PARTY";
  thirdPartyOwnerName: string;
  thirdPartyOwnerPhone: string;
  handoverResponsibleName: string;
};

function initialDraft(listing: Listing | null, pilotCity: string): DraftValues {
  return {
    title: listing?.title ?? "",
    categoryId: listing?.categoryId ?? "",
    shortDescription: listing?.shortDescription ?? "",
    fullDescription: listing?.fullDescription ?? "",
    condition: listing?.condition ?? "dobry",
    estimatedValue: listing?.estimatedValue ?? "",
    knownDefects: listing?.knownDefects ?? "",
    completeness: listing?.completeness ?? "",
    city: listing?.city || pilotCity || "Biłgoraj",
    ownerType: listing?.ownerType === "THIRD_PARTY" ? "THIRD_PARTY" : "SELF",
    thirdPartyOwnerName: listing?.thirdPartyOwnerName ?? "",
    thirdPartyOwnerPhone: listing?.thirdPartyOwnerPhone ?? "",
    handoverResponsibleName: listing?.handoverResponsibleName ?? "",
  };
}

export function ListingWizard({
  categories,
  listing,
  photos,
  auction,
  pilotCity,
}: {
  categories: Category[];
  listing: Listing | null;
  photos: Photo[];
  auction: Auction;
  pilotCity: string;
}) {
  const router = useRouter();
  const redirectedListingId = useRef<string | null>(null);
  const [draftState, draftAction, draftPending] = useActionState(
    createOrUpdateDraftAction,
    initial,
  );
  const [auctionState, auctionAction, auctionPending] = useActionState(
    saveAuctionParamsAction,
    initial,
  );
  const [submitState, submitAction, submitPending] = useActionState(
    submitListingAction,
    initial,
  );
  const [draft, setDraft] = useState(() => initialDraft(listing, pilotCity));
  const [photoItems, setPhotoItems] = useState<Photo[]>(photos);
  const [auctionMode, setAuctionMode] = useState<"FIXED_DONATION" | "AUCTION">(
    auction?.mode === "AUCTION" ? "AUCTION" : "FIXED_DONATION",
  );

  useEffect(() => {
    queueMicrotask(() => setPhotoItems(photos));
  }, [listing?.id, photos]);

  const effectiveId = draftState.listingId ?? listing?.id;

  useEffect(() => {
    queueMicrotask(() => {
      if (listing) {
        setDraft(initialDraft(listing, pilotCity));
        window.sessionStorage.removeItem(STORAGE_KEY);
        return;
      }
      try {
        const saved = window.sessionStorage.getItem(STORAGE_KEY);
        if (saved) setDraft((current) => ({ ...current, ...JSON.parse(saved) }));
      } catch {
        window.sessionStorage.removeItem(STORAGE_KEY);
      }
    });
  }, [listing, pilotCity]);

  useEffect(() => {
    if (listing || draftState.ok) return;
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  }, [draft, draftState.ok, listing]);

  useEffect(() => {
    const nextListingId = draftState.listingId;
    if (
      !draftState.ok ||
      !nextListingId ||
      nextListingId === listing?.id ||
      redirectedListingId.current === nextListingId
    ) {
      return;
    }

    redirectedListingId.current = nextListingId;
    window.sessionStorage.removeItem(STORAGE_KEY);
    router.replace(
      `/dodaj-przedmiot?listingId=${encodeURIComponent(nextListingId)}`,
    );
  }, [draftState.ok, draftState.listingId, listing?.id, router]);

  const quality = useMemo(() => {
    return Math.min(
      100,
      (draft.title.length >= 5 ? 20 : 0) +
        (draft.shortDescription.length >= 20 ? 25 : 0) +
        (draft.fullDescription.length >= 60 ? 10 : 0) +
        (draft.knownDefects.length > 0 ? 10 : 0) +
        (draft.completeness.length > 0 ? 10 : 0) +
        (draft.city.length >= 2 ? 10 : 0) +
        (photoItems.length > 0 ? 25 : 0),
    );
  }, [draft, photoItems.length]);

  function update<K extends keyof DraftValues>(key: K, value: DraftValues[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  const editable = !listing || ["SZKIC", "WYMAGA_POPRAWY"].includes(listing.status);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.12em] text-brand-600">
              Prosty kreator · 4 kroki
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Opis → zdjęcia → sposób licytacji → odbiór osobisty
            </p>
          </div>
          <strong className="text-brand-800">Jakość ogłoszenia: {quality}%</strong>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-brand-700 transition-all"
            style={{ width: `${quality}%` }}
          />
        </div>
        {quality < 60 && (
          <p className="mt-3 text-sm text-amber-800">
            Dodaj czytelny tytuł, krótki opis i przynajmniej jedno dobre zdjęcie.
            Pozostałe pola pomagają, ale nie są obowiązkowe.
          </p>
        )}
      </div>

      {listing?.status === "WYMAGA_POPRAWY" && (
        <Alert tone="warning" title="Ogłoszenie wymaga poprawy">
          {listing.moderationNote ?? "Zastosuj uwagi moderatora i prześlij ponownie."}
        </Alert>
      )}
      {listing && !editable && (
        <Alert tone="info">
          Ogłoszenie zostało przesłane. Aktualny status: <strong>{listing.status}</strong>.
        </Alert>
      )}

      <Card className="p-6">
        <Step
          number="1"
          title="Podstawowe informacje"
          description="Wymagamy tylko danych potrzebnych do zrozumienia, czym jest przedmiot i gdzie można go odebrać."
        />
        {draftState.error && <Alert tone="danger">{draftState.error}</Alert>}
        {draftState.ok && <Alert tone="success">Dane przedmiotu zapisano.</Alert>}

        <form action={draftAction} className="mt-5 grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="listingId" value={effectiveId ?? ""} />

          <Field label="Tytuł" htmlFor="title" required>
            <input
              id="title"
              name="title"
              value={draft.title}
              onChange={(event) => update("title", event.target.value)}
              className={inputClass}
              placeholder="np. Zestaw książek fantasy"
              required
            />
          </Field>

          <Field label="Kategoria" htmlFor="categoryId" required>
            <select
              id="categoryId"
              name="categoryId"
              value={draft.categoryId}
              onChange={(event) => update("categoryId", event.target.value)}
              className={inputClass}
              required
            >
              <option value="" disabled>
                Wybierz kategorię
              </option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </Field>

          <div className="sm:col-span-2">
            <Field
              label="Krótki opis"
              htmlFor="shortDescription"
              required
              hint="Jedno lub dwa zdania. Najważniejsze informacje zobaczą wszyscy licytujący."
            >
              <input
                id="shortDescription"
                name="shortDescription"
                value={draft.shortDescription}
                onChange={(event) => update("shortDescription", event.target.value)}
                className={inputClass}
                maxLength={240}
                required
              />
            </Field>
          </div>

          <div className="sm:col-span-2">
            <Field
              label="Dodatkowy opis"
              htmlFor="fullDescription"
              hint="Opcjonalnie: dopisz wymiary, historię przedmiotu lub inne szczegóły."
            >
              <textarea
                id="fullDescription"
                name="fullDescription"
                value={draft.fullDescription}
                onChange={(event) => update("fullDescription", event.target.value)}
                className={inputClass}
                rows={4}
              />
            </Field>
          </div>

          <Field label="Stan" htmlFor="condition" required>
            <select
              id="condition"
              name="condition"
              value={draft.condition}
              onChange={(event) => update("condition", event.target.value)}
              className={inputClass}
            >
              {[
                ["nowy", "Nowy"],
                ["jak_nowy", "Jak nowy"],
                ["bardzo_dobry", "Bardzo dobry"],
                ["dobry", "Dobry"],
                ["uzywany", "Używany"],
                ["widoczne_slady", "Widoczne ślady"],
              ].map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Orientacyjna wartość" htmlFor="estimatedValue" required>
            <input
              id="estimatedValue"
              name="estimatedValue"
              type="number"
              min="1"
              value={draft.estimatedValue}
              onChange={(event) => update("estimatedValue", event.target.value)}
              className={inputClass}
              required
            />
          </Field>

          <Field
            label="Znane wady"
            htmlFor="knownDefects"
            hint="Opcjonalnie. Gdy przedmiot nie ma wad, zostaw puste."
          >
            <textarea
              id="knownDefects"
              name="knownDefects"
              value={draft.knownDefects}
              onChange={(event) => update("knownDefects", event.target.value)}
              className={inputClass}
              rows={3}
            />
          </Field>

          <Field
            label="Kompletność"
            htmlFor="completeness"
            hint="Opcjonalnie, np. kompletna gra, brak instrukcji."
          >
            <textarea
              id="completeness"
              name="completeness"
              value={draft.completeness}
              onChange={(event) => update("completeness", event.target.value)}
              className={inputClass}
              rows={3}
            />
          </Field>

          <div className="sm:col-span-2">
            <Field
              label="Miasto lub miejscowość odbioru"
              htmlFor="city"
              required
              hint="Wpisz samodzielnie miejscowość. Dokładny punkt spotkania ustalicie dopiero po wygranej."
            >
              <input
                id="city"
                name="city"
                value={draft.city}
                onChange={(event) => update("city", event.target.value)}
                list="localities"
                autoComplete="address-level2"
                className={inputClass}
                placeholder="np. Biłgoraj, Wola Mała, Józefów"
                required
              />
              <datalist id="localities">
                <option value="Biłgoraj" />
                <option value="Wola Mała" />
                <option value="Frampol" />
                <option value="Józefów" />
                <option value="Tarnogród" />
                <option value="Goraj" />
                <option value="Zwierzyniec" />
              </datalist>
            </Field>
          </div>

          <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="font-semibold text-ink">Czyj jest przedmiot?</p>
            <div className="mt-3 flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="ownerType"
                  value="SELF"
                  checked={draft.ownerType === "SELF"}
                  onChange={() => update("ownerType", "SELF")}
                  className="accent-brand-700"
                />
                Mój
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="ownerType"
                  value="THIRD_PARTY"
                  checked={draft.ownerType === "THIRD_PARTY"}
                  onChange={() => update("ownerType", "THIRD_PARTY")}
                  className="accent-brand-700"
                />
                Wystawiam za zgodą innej osoby
              </label>
            </div>

            {draft.ownerType === "THIRD_PARTY" && (
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <Field label="Imię właściciela" htmlFor="thirdPartyOwnerName" required>
                  <input
                    id="thirdPartyOwnerName"
                    name="thirdPartyOwnerName"
                    value={draft.thirdPartyOwnerName}
                    onChange={(event) =>
                      update("thirdPartyOwnerName", event.target.value)
                    }
                    className={inputClass}
                    required
                  />
                </Field>
                <Field label="Telefon właściciela" htmlFor="thirdPartyOwnerPhone" required>
                  <input
                    id="thirdPartyOwnerPhone"
                    name="thirdPartyOwnerPhone"
                    value={draft.thirdPartyOwnerPhone}
                    onChange={(event) =>
                      update("thirdPartyOwnerPhone", event.target.value)
                    }
                    className={inputClass}
                    inputMode="tel"
                    required
                  />
                </Field>
                <Field label="Kto przekaże przedmiot" htmlFor="handoverResponsibleName" required>
                  <input
                    id="handoverResponsibleName"
                    name="handoverResponsibleName"
                    value={draft.handoverResponsibleName}
                    onChange={(event) =>
                      update("handoverResponsibleName", event.target.value)
                    }
                    className={inputClass}
                    required
                  />
                </Field>
              </div>
            )}
          </div>

          <div className="sm:col-span-2">
            <Button type="submit" disabled={draftPending || !editable}>
              {draftPending ? "Zapisywanie…" : "Zapisz i przejdź dalej"}
            </Button>
          </div>
        </form>
      </Card>

      {effectiveId && <PhotoSection
          listingId={effectiveId}
          photos={photoItems}
          onPhotosChange={setPhotoItems}
        />}

      {effectiveId && (
        <Card className="p-6 sm:p-7">
          <Step
            number="3"
            title="Jak chcesz przekazać przedmiot?"
            description="Wybierz sposób zdobycia przedmiotu. Na razie dostępny jest wyłącznie odbiór osobisty."
          />
          {auctionState.error && <Alert tone="danger">{auctionState.error}</Alert>}
          {auctionState.ok && <Alert tone="success">Sposób przekazania zapisano.</Alert>}

          <form action={auctionAction} className="mt-5 space-y-5">
            <input type="hidden" name="listingId" value={effectiveId} />
            <input type="hidden" name="interestDurationHours" value="48" />
            <input type="hidden" name="auctionDurationHours" value="24" />

            <fieldset>
              <legend className="sr-only">Sposób przekazania przedmiotu</legend>
              <div className="grid gap-4 lg:grid-cols-2">
                <label
                  className={`relative cursor-pointer rounded-xl border p-5 transition ${
                    auctionMode === "FIXED_DONATION"
                      ? "border-brand-600 bg-brand-50 shadow-[0_5px_18px_rgba(16,40,32,.06)]"
                      : "border-slate-200 bg-white hover:border-brand-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="mode"
                    value="FIXED_DONATION"
                    checked={auctionMode === "FIXED_DONATION"}
                    onChange={() => setAuctionMode("FIXED_DONATION")}
                    className="sr-only"
                  />
                  <span className="flex items-start gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-800">
                      <HandHeartIcon size={21} />
                    </span>
                    <span>
                      <span className="block text-lg font-bold text-ink">Za stałą wpłatę</span>
                      <span className="mt-2 block text-sm leading-6 text-slate-600">
                        Ustalasz jedną kwotę. Pierwsza osoba rezerwuje przedmiot,
                        wpłaca bezpośrednio na zbiórkę i umawia odbiór osobisty.
                      </span>
                      <span className="mt-3 block text-xs leading-5 text-slate-500">
                        Dobre dla zwykłych przedmiotów i szybkiego przekazania.
                      </span>
                    </span>
                  </span>
                  {auctionMode === "FIXED_DONATION" && (
                    <span className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full bg-brand-800 text-white">
                      <CheckIcon size={15} />
                    </span>
                  )}
                </label>

                <label
                  className={`relative cursor-pointer rounded-xl border p-5 transition ${
                    auctionMode === "AUCTION"
                      ? "border-brand-600 bg-brand-50 shadow-[0_5px_18px_rgba(16,40,32,.06)]"
                      : "border-slate-200 bg-white hover:border-brand-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="mode"
                    value="AUCTION"
                    checked={auctionMode === "AUCTION"}
                    onChange={() => setAuctionMode("AUCTION")}
                    className="sr-only"
                  />
                  <span className="flex items-start gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-800 text-white">
                      <GavelIcon size={21} />
                    </span>
                    <span>
                      <span className="block text-lg font-bold text-ink">W licytacji</span>
                      <span className="mt-2 block text-sm leading-6 text-slate-600">
                        Użytkownicy podbijają kwotę wsparcia. Przedmiot otrzymuje
                        osoba z najwyższą ofertą.
                      </span>
                      <span className="mt-3 block text-xs leading-5 text-slate-500">
                        Dobre dla wartościowych, wyjątkowych lub kolekcjonerskich przedmiotów.
                      </span>
                    </span>
                  </span>
                  {auctionMode === "AUCTION" && (
                    <span className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full bg-brand-800 text-white">
                      <CheckIcon size={15} />
                    </span>
                  )}
                </label>
              </div>
            </fieldset>

            <div className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50/60 p-5 sm:grid-cols-2">
              <Field
                label={auctionMode === "AUCTION" ? "Cena startowa" : "Stała kwota wsparcia"}
                htmlFor="startPrice"
                required
              >
                <input
                  id="startPrice"
                  name="startPrice"
                  type="number"
                  min="1"
                  step="1"
                  defaultValue={auction?.startPrice ?? "20"}
                  className={inputClass}
                  required
                />
              </Field>

              {auctionMode === "AUCTION" ? (
                <Field label="Minimalne przebicie" htmlFor="minBidIncrement" required>
                  <input
                    id="minBidIncrement"
                    name="minBidIncrement"
                    type="number"
                    min="1"
                    step="1"
                    defaultValue={auction?.minBidIncrement ?? "5"}
                    className={inputClass}
                    required
                  />
                </Field>
              ) : (
                <input
                  type="hidden"
                  name="minBidIncrement"
                  value={auction?.minBidIncrement ?? "5"}
                />
              )}

              <Field label="Czas dostępności" htmlFor="durationDays" required>
                <select
                  id="durationDays"
                  name="durationDays"
                  defaultValue={auction?.durationDays ?? 5}
                  className={inputClass}
                >
                  <option value="3">3 dni</option>
                  <option value="5">5 dni</option>
                  <option value="7">7 dni</option>
                </select>
              </Field>

              <div className="sm:col-span-2 rounded-xl border border-brand-200 bg-brand-50/70 p-4">
                <p className="flex items-center gap-2 font-bold text-brand-900">
                  <MapPinIcon size={18} /> Odbiór osobisty
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  W tej wersji serwisu nie ma wysyłki. Po zakończeniu licytacji strony
                  otrzymają swoje dane kontaktowe i samodzielnie ustalą termin oraz
                  publiczne miejsce spotkania w podanej miejscowości.
                </p>
              </div>

              <input
                type="hidden"
                name="preferredDays"
                value={auction?.preferredDays || "Do ustalenia po zakończeniu"}
              />
              <input
                type="hidden"
                name="preferredHours"
                value={auction?.preferredHours || "Do ustalenia po zakończeniu"}
              />

              <div className="sm:col-span-2 rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[.08em] text-slate-500">Miejscowość odbioru</p>
                <p className="mt-1 font-bold text-ink">{draft.city || "Uzupełnij miejscowość w pierwszym kroku"}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">Dokładny termin i publiczne miejsce spotkania strony ustalą dopiero po zakończeniu licytacji.</p>
              </div>

              <div className="sm:col-span-2">
                <Field
                  label="Dodatkowe informacje o odbiorze — opcjonalnie"
                  htmlFor="meetingNotes"
                  hint="Np. odbiór zwykle po godzinie 17:00. Nie wpisuj dokładnego adresu ani numeru telefonu."
                >
                  <textarea
                    id="meetingNotes"
                    name="meetingNotes"
                    defaultValue={auction?.meetingNotes ?? ""}
                    placeholder="Np. odbiór możliwy głównie po 17:00"
                    rows={3}
                    className={inputClass}
                  />
                </Field>
              </div>
            </div>

            <div className="rounded-xl border border-brand-200 bg-brand-50/70 p-4">
              <p className="text-sm font-bold text-brand-900">Jak to zadziała po publikacji?</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <ProcessChip icon={PackageIcon} number="1" title="Publikacja">
                  Przedmiot pojawia się w katalogu.
                </ProcessChip>
                <ProcessChip icon={auctionMode === "AUCTION" ? GavelIcon : CheckIcon} number="2" title={auctionMode === "AUCTION" ? "Oferty" : "Rezerwacja"}>
                  {auctionMode === "AUCTION" ? "Użytkownicy przebijają kwotę." : "Pierwsza osoba rezerwuje przedmiot."}
                </ProcessChip>
                <ProcessChip icon={CheckIcon} number="3" title={auctionMode === "AUCTION" ? "Wygrana" : "Rezerwacja"}>
                  {auctionMode === "AUCTION" ? "Najwyższa oferta wygrywa." : "Pierwsza osoba otrzymuje rezerwację."}
                </ProcessChip>
                <ProcessChip icon={MapPinIcon} number="4" title="Kontakt i odbiór">
                  Strony ustalają osobisty odbiór bez udziału administratora.
                </ProcessChip>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
              <p className="flex items-start gap-2 text-xs leading-5 text-slate-500">
                <ShieldIcon size={16} className="mt-0.5 shrink-0 text-brand-700" />
                Zwycięzca wpłaca bezpośrednio na zbiórkę. LicytujDobro nie przyjmuje ani nie weryfikuje wpłat.
              </p>
              <Button type="submit" disabled={auctionPending || !editable}>
                {auctionPending ? "Zapisywanie…" : "Zapisz i przejdź dalej"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {effectiveId && (
        <Card className="p-6">
          <Step
            number="4"
            title="Potwierdzenie i moderacja"
            description="Tylko dwa krótkie potwierdzenia. Administrator sprawdzi ogłoszenie przed publikacją."
          />
          {submitState.error && <Alert tone="danger">{submitState.error}</Alert>}
          {submitState.ok && (
            <Alert tone="success">Ogłoszenie przesłano do moderacji.</Alert>
          )}
          <form action={submitAction} className="mt-5 space-y-4">
            <input type="hidden" name="listingId" value={effectiveId} />
            <label className="flex gap-3 rounded-lg border border-slate-200 p-4 text-sm leading-6 text-slate-700">
              <input
                type="checkbox"
                name="declTruthAndRights"
                required
                className="mt-1"
              />
              <span>
                Mam prawo wystawić ten przedmiot. Zdjęcia i opis są prawdziwe,
                a wszystkie znane istotne wady zostały ujawnione.
              </span>
            </label>
            <label className="flex gap-3 rounded-lg border border-slate-200 p-4 text-sm leading-6 text-slate-700">
              <input
                type="checkbox"
                name="declProcessRules"
                required
                className="mt-1"
              />
              <span>
                Znam zasady: po zakończeniu licytacji kontaktuję się ze zwycięzcą
                i ustalam z nim osobisty odbiór. LicytujDobro nie weryfikuje wpłaty.
              </span>
            </label>
            <Button type="submit" size="lg" disabled={submitPending || submitState.ok || !editable}>
              {submitPending ? "Wysyłanie…" : "Prześlij do moderacji"}
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}

function ProcessChip({
  icon: Icon,
  number,
  title,
  children,
}: {
  icon: typeof ClockIcon;
  number: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-brand-100 bg-white p-3">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-800 text-[11px] font-bold text-white">
          {number}
        </span>
        <Icon size={16} className="text-brand-700" />
        <p className="text-sm font-bold text-ink">{title}</p>
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-600">{children}</p>
    </div>
  );
}

function PhotoSection({
  listingId,
  photos,
  onPhotosChange,
}: {
  listingId: string;
  photos: Photo[];
  onPhotosChange: (photos: Photo[]) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  async function upload(file: File): Promise<Photo> {
    const body = new FormData();
    body.set("file", file);
    body.set("listingId", listingId);
    body.set("purpose", "public");

    const response = await fetch("/api/upload", { method: "POST", body });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.ok) {
      throw new Error(data?.error ?? "Upload nie powiódł się.");
    }

    const result = await addPhotoAction({ listingId, url: data.url });
    if (!result.ok || !result.photo) {
      throw new Error(result.error ?? "Nie udało się zapisać zdjęcia.");
    }

    return result.photo;
  }

  return (
    <Card className="p-6">
      <Step
        number="2"
        title="Zdjęcie przedmiotu"
        description="Wystarczy jedno wyraźne zdjęcie. Możesz dodać więcej, aby lepiej pokazać przedmiot."
      />
      {message && (
        <Alert tone={message.startsWith("Błąd") ? "danger" : "success"}>
          {message}
        </Alert>
      )}
      <Field
        label="Dodaj zdjęcia"
        htmlFor="listing-photos"
        hint="JPG, PNG lub WEBP. Maksymalnie 8 zdjęć po 8 MB."
      >
        <input
          id="listing-photos"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className={inputClass}
          disabled={pending}
          onChange={(event) => {
            const input = event.currentTarget;
            const files: File[] = input.files ? Array.from(input.files) : [];
            if (!files.length) return;

            startTransition(async () => {
              try {
                const created: Photo[] = [];
                for (const file of files) created.push(await upload(file));
                onPhotosChange([...photos, ...created]);
                setMessage(
                  files.length === 1
                    ? "Zdjęcie dodane."
                    : `Dodano ${files.length} zdjęcia.`,
                );
                input.value = "";
              } catch (error) {
                setMessage(`Błąd: ${(error as Error).message}`);
              }
            });
          }}
        />
      </Field>

      {pending ? (
        <p className="mt-3 text-sm font-medium text-brand-700" role="status">
          Przetwarzanie zdjęcia…
        </p>
      ) : null}

      {photos.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-slate-300 p-5 text-sm text-slate-600">
          Dodaj przynajmniej jedno zdjęcie przed wysłaniem ogłoszenia do moderacji.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {photos.map((photo, index) => (
            <div key={photo.id} className="rounded-lg border border-slate-200 p-2">
              <Image
                src={photo.url}
                alt={`Zdjęcie przedmiotu ${index + 1}`}
                width={280}
                height={280}
                className="aspect-square w-full rounded-md object-cover"
              />
              {index === 0 ? (
                <p className="mt-1 text-xs font-semibold text-brand-700">
                  Zdjęcie główne
                </p>
              ) : null}
              <button
                type="button"
                className="mt-1 text-xs font-semibold text-danger"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const result = await removePhotoAction(photo.id);
                    if (!result.ok) {
                      setMessage(`Błąd: ${result.error}`);
                      return;
                    }
                    onPhotosChange(photos.filter((item) => item.id !== photo.id));
                    setMessage("Zdjęcie usunięte.");
                  })
                }
              >
                Usuń
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function Step({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-5 border-b border-slate-200 pb-4">
      <p className="text-[11px] font-bold uppercase tracking-[.12em] text-brand-600">
        Krok {number}
      </p>
      <div className="mt-2 flex items-start gap-3">
        <ShieldIcon size={20} className="mt-0.5 shrink-0 text-brand-700" />
        <div>
          <h2 className="text-xl font-bold tracking-[-.015em] text-ink">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
        </div>
      </div>
    </div>
  );
}
