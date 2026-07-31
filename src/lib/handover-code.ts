import { createHash, randomInt, timingSafeEqual } from "node:crypto";

export const HANDOVER_CODE_TTL_MS = 15 * 60 * 1000;

export function generateOneTimeHandoverCode() {
  return String(randomInt(100000, 1000000));
}

export function hashOneTimeHandoverCode(transactionId: string, code: string, secret: string) {
  if (secret.length < 32 || /change-me/i.test(secret)) throw new Error("HANDOVER_CODE_SECRET_NOT_CONFIGURED");
  return createHash("sha256").update(`${secret}:${transactionId}:${code}`).digest("hex");
}

export function verifyOneTimeHandoverCode(expectedHash: string, transactionId: string, code: string, secret: string) {
  const actualHash = hashOneTimeHandoverCode(transactionId, code, secret);
  const expected = Buffer.from(expectedHash, "hex");
  const actual = Buffer.from(actualHash, "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
