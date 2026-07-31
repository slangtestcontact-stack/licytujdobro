// Czyste funkcje domenowe dla mechanizmu licytacji - łatwe do testowania jednostkowego.

function secureRandomIndex(maxExclusive: number): number {
  const array = new Uint32Array(1);
  globalThis.crypto.getRandomValues(array);
  return array[0] % maxExclusive;
}

export function generateVerificationCode(prefix = "LD"): string {
  const array = new Uint32Array(1);
  globalThis.crypto.getRandomValues(array);
  const num = 100000 + (array[0] % 900000);
  return `${prefix}-${num}`;
}

export function generateDonationCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += chars[secureRandomIndex(chars.length)];
  return `LD-K${out}`;
}

export function generateHandoverCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 10; i++) out += chars[secureRandomIndex(chars.length)];
  return `LD-H-${out}`;
}

export interface AntiSnipeResult {
  newEndAt: Date;
  newTotalExtensionSeconds: number;
  extended: boolean;
  appliedSeconds: number;
}

export function computeAntiSnipeExtension(params: {
  now: Date;
  currentEndAt: Date;
  totalExtensionSecondsSoFar: number;
  windowSeconds?: number;
  extensionSeconds?: number;
  maxExtensionSeconds?: number;
}): AntiSnipeResult {
  const {
    now,
    currentEndAt,
    totalExtensionSecondsSoFar,
    windowSeconds = 120,
    extensionSeconds = 120,
    maxExtensionSeconds = 1200,
  } = params;

  const remainingMs = currentEndAt.getTime() - now.getTime();
  const inWindow = remainingMs > 0 && remainingMs <= windowSeconds * 1000;
  if (!inWindow) return { newEndAt: currentEndAt, newTotalExtensionSeconds: totalExtensionSecondsSoFar, extended: false, appliedSeconds: 0 };

  const remainingBudget = Math.max(0, maxExtensionSeconds - totalExtensionSecondsSoFar);
  const appliedSeconds = Math.min(extensionSeconds, remainingBudget);
  if (appliedSeconds <= 0) return { newEndAt: currentEndAt, newTotalExtensionSeconds: totalExtensionSecondsSoFar, extended: false, appliedSeconds: 0 };

  return {
    newEndAt: new Date(currentEndAt.getTime() + appliedSeconds * 1000),
    newTotalExtensionSeconds: totalExtensionSecondsSoFar + appliedSeconds,
    extended: true,
    appliedSeconds,
  };
}

export function isAuctionOver(endAt: Date, now: Date = new Date()): boolean {
  return now.getTime() >= endAt.getTime();
}

export function formatMoney(value: number | string): string {
  const num = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", minimumFractionDigits: Number.isInteger(num) ? 0 : 2, maximumFractionDigits: 2 }).format(Number.isFinite(num) ? num : 0);
}

export function formatCountdown(endAt: Date, now: Date = new Date()): string {
  const diffMs = endAt.getTime() - now.getTime();
  if (diffMs <= 0) return "Zakończona";
  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) return `${days} d ${hours} godz.`;
  if (hours > 0) return `${hours} godz. ${minutes} min`;
  if (minutes > 0) return `${minutes} min ${seconds} s`;
  return `${seconds} s`;
}

export function isEndingSoon(endAt: Date, now: Date = new Date()): boolean {
  const diffMs = endAt.getTime() - now.getTime();
  return diffMs > 0 && diffMs <= 60 * 60 * 1000;
}

export function polishPlural(value: number, one: string, few: string, many: string): string {
  const abs = Math.abs(value);
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (abs === 1) return one;
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return few;
  return many;
}
