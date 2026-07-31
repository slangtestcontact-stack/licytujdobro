import { hasRequiredContactVerification } from "@/lib/contact-verification";

export function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 9 || digits.length > 15) {
    throw new Error("Nieprawidłowy numer telefonu.");
  }
  return digits.startsWith("48") ? `+${digits}` : `+48${digits}`;
}

export function shouldActivateAccount(input: {
  emailVerifiedAt: Date | null;
  phoneVerifiedAt: Date | null;
  status: string;
}): boolean {
  return input.status === "nowe" && hasRequiredContactVerification(input);
}

export function isSafeInternalReturnTo(value: string | null | undefined): boolean {
  return Boolean(
    value &&
      value.startsWith("/") &&
      !value.startsWith("//") &&
      !value.includes("\\") &&
      value.length <= 500,
  );
}
