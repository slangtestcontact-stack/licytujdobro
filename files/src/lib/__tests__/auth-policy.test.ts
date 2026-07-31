import { afterEach, describe, expect, it } from "vitest";
import {
  isSafeInternalReturnTo,
  normalizePhone,
  shouldActivateAccount,
} from "@/lib/auth-policy";
import {
  hasRequiredContactVerification,
  isTechnicalEmail,
  isTechnicalPhone,
} from "@/lib/contact-verification";

afterEach(() => {
  delete process.env.CONTACT_VERIFICATION_MODE;
});

describe("reguły uwierzytelnienia", () => {
  it("normalizuje polski numer telefonu", () => {
    expect(normalizePhone("600 700 800")).toBe("+48600700800");
    expect(normalizePhone("+48 600 700 800")).toBe("+48600700800");
  });

  it("odrzuca zbyt krótki numer telefonu", () => {
    expect(() => normalizePhone("123")).toThrow(
      "Nieprawidłowy numer telefonu",
    );
  });

  it("domyślnie wymaga e-maila i telefonu", () => {
    const now = new Date();
    expect(
      shouldActivateAccount({
        emailVerifiedAt: now,
        phoneVerifiedAt: now,
        status: "nowe",
      }),
    ).toBe(true);
    expect(
      shouldActivateAccount({
        emailVerifiedAt: now,
        phoneVerifiedAt: null,
        status: "nowe",
      }),
    ).toBe(false);
  });

  it("w trybie either akceptuje e-mail albo telefon", () => {
    process.env.CONTACT_VERIFICATION_MODE = "either";
    const now = new Date();
    expect(
      hasRequiredContactVerification({
        emailVerifiedAt: now,
        phoneVerifiedAt: null,
      }),
    ).toBe(true);
    expect(
      hasRequiredContactVerification({
        emailVerifiedAt: null,
        phoneVerifiedAt: now,
      }),
    ).toBe(true);
  });

  it("rozpoznaje techniczne dane kont społecznościowych", () => {
    expect(isTechnicalEmail("facebook-abc@users.invalid")).toBe(true);
    expect(isTechnicalEmail("uzytkownik@example.pl")).toBe(false);
    expect(isTechnicalPhone("pending-abc")).toBe(true);
    expect(isTechnicalPhone("+48600700800")).toBe(false);
  });

  it("pozwala wracać tylko do wewnętrznych ścieżek", () => {
    expect(isSafeInternalReturnTo("/aukcje/123")).toBe(true);
    expect(isSafeInternalReturnTo("//evil.example")).toBe(false);
    expect(isSafeInternalReturnTo("https://evil.example")).toBe(false);
    expect(isSafeInternalReturnTo("/foo\\bar")).toBe(false);
  });
});
