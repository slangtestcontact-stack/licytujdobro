// Konfiguracja pierwszej wersji produkcyjnej LicytujDobro dla jednej zbiórki.
// Wartości domyślne administrator może nadpisać w tabeli admin_settings.

export const DEFAULT_SETTINGS = {
  pilotCity: "Biłgoraj",
  maxItemValue: 500,
  auctionDurations: [3, 5, 7],
  maxExtensionMinutes: 20,
  extensionWindowMinutes: 2,
  extensionSeconds: 120,
  maxActiveListingsPerUser: 2,
  winnerConfirmHours: 12,
  meetingDeadlineDays: 5,
};

export type BidIncrementRule = { upTo: number | null; increment: number };

// Tabela minimalnego przebicia zgodnie ze specyfikacją.
export const BID_INCREMENT_TABLE: BidIncrementRule[] = [
  { upTo: 49, increment: 2 },
  { upTo: 199, increment: 5 },
  { upTo: 499, increment: 10 },
  { upTo: null, increment: 20 },
];

export function getMinIncrement(currentPrice: number): number {
  for (const rule of BID_INCREMENT_TABLE) {
    if (rule.upTo === null || currentPrice <= rule.upTo) {
      return rule.increment;
    }
  }
  return BID_INCREMENT_TABLE[BID_INCREMENT_TABLE.length - 1].increment;
}

export function getMinNextBid(currentPrice: number, configuredIncrement?: number): number {
  const increment =
    configuredIncrement && Number.isFinite(configuredIncrement) && configuredIncrement > 0
      ? configuredIncrement
      : getMinIncrement(currentPrice);
  return roundToTwo(currentPrice + increment);
}

export function getRequiredBid(
  startPrice: number,
  currentPrice: number,
  bidCount: number,
  configuredIncrement?: number,
): number {
  return bidCount === 0
    ? roundToTwo(startPrice)
    : getMinNextBid(currentPrice, configuredIncrement);
}

function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100;
}

export const CONDITION_LABELS: Record<string, string> = {
  nowy: "Nowy",
  jak_nowy: "Jak nowy",
  bardzo_dobry: "Bardzo dobry",
  dobry: "Dobry",
  uzywany: "Używany",
  widoczne_slady: "Posiada widoczne ślady użytkowania",
};

export const ALLOWED_CATEGORY_SEED = [
  "Książki",
  "Komiksy",
  "Gry planszowe",
  "Puzzle",
  "Plakaty",
  "Obrazy",
  "Proste rękodzieło",
  "Dekoracje",
  "Drobne artykuły sportowe",
  "Akcesoria biurowe",
  "Niewielkie kolekcje",
  "Proste zabawki bez elektroniki",
];

export const BLOCKED_KEYWORDS = [
  "telefon",
  "smartfon",
  "laptop",
  "komputer",
  "elektronik",
  "lek",
  "suplement",
  "alkohol",
  "papieros",
  "tyton",
  "broń",
  "nóż",
  "kosmetyk",
  "żywność",
  "bilet",
  "karta podarunkowa",
  "biżuteria",
  "fotelik",
  "medyczn",
  "zwierz",
  "kod cyfrowy",
  "usługa",
  "usluga",
];

export const MEETING_SAFE_PLACES = [
  "Galeria handlowa",
  "Kawiarnia",
  "Biblioteka",
  "Urząd",
  "Dworzec",
  "Miejsce monitorowane",
  "Inne publiczne i bezpieczne miejsce",
];

export const BADGES = {
  FIRST_LISTING: "Pierwsza aukcja",
  FIRST_WIN: "Pierwsza wygrana",
  DONATED_100: "100 zł dla Adasia",
  DONATED_500: "500 zł dla Adasia",
  FIVE_HANDOVERS: "Pięć udanych przekazań",
  TRUSTED_SELLER: "Zaufany wystawiający",
  PUNCTUAL: "Punktualny uczestnik",
};

export const NO_PAYMENT_WARNING =
  "Nie dokonuj wpłaty przed spotkaniem. Najpierw obejrzyj przedmiot. Następnie wybierz bezpieczną metodę wpłaty na oficjalnej stronie Siepomaga. LicytujDobro nie przyjmuje pieniędzy.";

export const WINNER_MESSAGE =
  "Wygrałeś aukcję. Nie wpłacaj jeszcze pieniędzy. Najpierw umów spotkanie i obejrzyj przedmiot.";

export const CAMPAIGN_DISCLAIMER =
  "Zbiórka Adasia jest prowadzona w serwisie Siepomaga. LicytujDobro nie przyjmuje wpłat, nie zapisuje kodów BLIK i nie przechowuje danych bankowych.";
