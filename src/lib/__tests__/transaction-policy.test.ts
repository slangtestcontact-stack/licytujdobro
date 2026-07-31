import { describe, expect, it } from "vitest";
import {
  assertCanConfirmAlternativePayment,
  assertCanDeferPayment,
  bothPartiesConfirmed,
  validatePlannedDonationAmount,
} from "@/lib/transaction-policy";

describe("reguły kwoty wpłaty", () => {
  it("nie pozwala zejść poniżej wylicytowanej kwoty", () => {
    expect(() =>
      validatePlannedDonationAmount({
        requestedAmount: 90,
        requiredAmount: 100,
        paymentLimit: 500,
        transactionStatus: "PRZEDMIOT_ZAAKCEPTOWANY",
      }),
    ).toThrow("Minimalna wpłata");
  });

  it("nie pozwala przekroczyć limitu aktywnej kampanii", () => {
    expect(() =>
      validatePlannedDonationAmount({
        requestedAmount: 501,
        requiredAmount: 100,
        paymentLimit: 500,
        transactionStatus: "PRZEDMIOT_ZAAKCEPTOWANY",
      }),
    ).toThrow("Maksymalna wpłata");
  });

  it("pozwala dobrowolnie zwiększyć kwotę przed płatnością", () => {
    expect(
      validatePlannedDonationAmount({
        requestedAmount: 120,
        requiredAmount: 100,
        paymentLimit: 500,
        transactionStatus: "SPOTKANIE_ZAPLANOWANE",
      }),
    ).toBe(120);
  });
});

describe("reguły awaryjnej płatności", () => {
  it("pozwala odłożyć płatność po zaakceptowaniu przedmiotu", () => {
    expect(() => assertCanDeferPayment("PRZEDMIOT_ZAAKCEPTOWANY")).not.toThrow();
  });

  it("nie pozwala odłożyć płatności po zakończeniu", () => {
    expect(() => assertCanDeferPayment("ZAKONCZONA_POMYSLNIE")).toThrow();
  });

  it("przelew tradycyjny wymaga administratora", () => {
    expect(() =>
      assertCanConfirmAlternativePayment({
        status: "OCZEKUJE_NA_WERYFIKACJE",
        paymentFlow: "TRADITIONAL_TRANSFER",
        role: "buyer",
      }),
    ).toThrow("zweryfikowany przez administratora");
  });

  it("wpłata jest gotowa do przekazania dopiero po obu potwierdzeniach", () => {
    const now = new Date();
    expect(
      bothPartiesConfirmed({
        buyerDonationConfirmedAt: now,
        sellerDonationConfirmedAt: null,
      }),
    ).toBe(false);
    expect(
      bothPartiesConfirmed({
        buyerDonationConfirmedAt: now,
        sellerDonationConfirmedAt: now,
      }),
    ).toBe(true);
  });
});
