export type ContactVerificationMode = "both" | "either" | "email" | "phone";

export type ContactVerificationState = {
  emailVerifiedAt: Date | null;
  phoneVerifiedAt: Date | null;
};

export function getContactVerificationMode(): ContactVerificationMode {
  const value = process.env.CONTACT_VERIFICATION_MODE?.trim().toLowerCase();
  if (value === "either" || value === "email" || value === "phone") {
    return value;
  }
  return "both";
}

export function isTechnicalEmail(value: string | null | undefined): boolean {
  return !value || value.toLowerCase().endsWith("@users.invalid");
}

export function isTechnicalPhone(value: string | null | undefined): boolean {
  return !value || value.startsWith("pending-");
}

export function hasRequiredContactVerification(
  user: ContactVerificationState,
  mode: ContactVerificationMode = getContactVerificationMode(),
): boolean {
  const email = Boolean(user.emailVerifiedAt);
  const phone = Boolean(user.phoneVerifiedAt);

  if (mode === "email") return email;
  if (mode === "phone") return phone;
  if (mode === "either") return email || phone;
  return email && phone;
}

export function getContactVerificationDescription(
  mode: ContactVerificationMode = getContactVerificationMode(),
): string {
  if (mode === "email") return "potwierdzony adres e-mail";
  if (mode === "phone") return "potwierdzony numer telefonu";
  if (mode === "either") return "potwierdzony e-mail albo numer telefonu";
  return "potwierdzony e-mail i numer telefonu";
}
