import "server-only";

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function randomPublicCode(length = 7) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

export function sanitizePublicCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 18);
}

export function getPublicBaseUrl() {
  const value = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000";
  return value.replace(/\/$/, "");
}

export function publicAuctionUrl(code: string) {
  return `${getPublicBaseUrl()}/a/${sanitizePublicCode(code)}`;
}
