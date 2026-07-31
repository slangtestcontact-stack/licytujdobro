export type ContactVerificationMode = "both" | "either" | "email" | "phone";

export type ContactVerificationState = {
  emailVerifiedAt: Date | null;
  phoneVerifiedAt: Date | null;
  authProvider?: string | null;
};

const PROVIDERS_WITHOUT_EXTRA_VERIFICATION = new Set([
  "facebook",
  "google",
  "apple",
  "email_code",
]);

export function getContactVerificationMode(): ContactVerificationMode {
  const value = process.env.CONTACT_VERIFICATION_MODE?.trim().toLowerCase();
  if (value === "either" || value === "email" || value === "phone") {
    return value;
  }
  return "email";
}

export function isTechnicalEmail(value: string | null | undefined): boolean {
  return !value || value.toLowerCase().endsWith("@users.invalid");
}

export function isTechnicalPhone(value: string | null | undefined): boolean {
  return !value || value.startsWith("pending-");
}

/**
 * Facebook, Google i Apple uwierzytelniają konto przez OAuth,
 * dlatego nie wymagamy po nich dodatkowego kodu e-mail ani SMS.
 *
 * Logowanie kodem e-mail (email_code) również potwierdza dostęp
 * do adresu już podczas samego logowania.
 *
 * Dla klasycznego konta z hasłem obowiązuje tryb ustawiony
 * w CONTACT_VERIFICATION_MODE. Ustaw wartość "email", aby
 * wymagać wyłącznie potwierdzenia adresu e-mail.
 */
export function hasRequiredContactVerification(
  user: ContactVerificationState,
  mode: ContactVerificationMode = getContactVerificationMode(),
): boolean {
  const provider = user.authProvider?.trim().toLowerCase() || "password";

  if (PROVIDERS_WITHOUT_EXTRA_VERIFICATION.has(provider)) {
    return true;
  }

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
