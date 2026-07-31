const DONATION_EDITABLE_STATUSES = new Set([
  "OCZEKUJE_NA_POTWIERDZENIE_ZWYCIEZCY",
  "UMAWIANIE_SPOTKANIA",
  "SPOTKANIE_ZAPLANOWANE",
  "OBIE_STRONY_NA_MIEJSCU",
  "OGLEDZINY",
  "PRZEDMIOT_ZAAKCEPTOWANY",
]);

const DEFERABLE_PAYMENT_STATUSES = new Set([
  "PRZEDMIOT_ZAAKCEPTOWANY",
  "OCZEKUJE_NA_PLATNOSC",
  "OCZEKUJE_NA_WERYFIKACJE",
  "PROBLEM_Z_PLATNOSCIA",
  "OCZEKIWANIE_NA_OTWARCIE_TERMINALU",
]);

export function validatePlannedDonationAmount(input: {
  requestedAmount: number;
  requiredAmount: number;
  paymentLimit: number;
  transactionStatus: string;
}): number {
  if (!DONATION_EDITABLE_STATUSES.has(input.transactionStatus)) {
    throw new Error("Kwoty nie można zmienić po rozpoczęciu płatności.");
  }

  const amount = Math.round(Number(input.requestedAmount) * 100) / 100;
  if (!Number.isFinite(amount) || amount < input.requiredAmount) {
    throw new Error(
      `Minimalna wpłata wynosi ${input.requiredAmount.toFixed(2).replace(".", ",")} zł.`,
    );
  }
  if (!Number.isFinite(input.paymentLimit) || input.paymentLimit <= 0) {
    throw new Error("Zbiórka nie ma prawidłowego limitu wpłaty.");
  }
  if (amount > input.paymentLimit) {
    throw new Error(
      `Maksymalna wpłata w tym procesie wynosi ${input.paymentLimit.toFixed(2).replace(".", ",")} zł.`,
    );
  }
  return amount;
}

export function assertCanDeferPayment(status: string): void {
  if (!DEFERABLE_PAYMENT_STATUSES.has(status)) {
    throw new Error("Na tym etapie nie można odłożyć wpłaty.");
  }
}

export function assertCanConfirmAlternativePayment(input: {
  status: string;
  paymentFlow: string;
  role: string;
}): void {
  if (input.role === "admin") {
    throw new Error("Administrator używa osobnej weryfikacji wpłaty.");
  }
  if (!["OCZEKUJE_NA_PLATNOSC", "OCZEKUJE_NA_WERYFIKACJE"].includes(input.status)) {
    throw new Error("Ta metoda wpłaty nie oczekuje teraz na potwierdzenie.");
  }
  if (input.paymentFlow === "TRADITIONAL_TRANSFER") {
    throw new Error(
      "Przelew tradycyjny musi zostać zaksięgowany i zweryfikowany przez administratora.",
    );
  }
}

export function bothPartiesConfirmed(input: {
  buyerDonationConfirmedAt: Date | null;
  sellerDonationConfirmedAt: Date | null;
}): boolean {
  return Boolean(
    input.buyerDonationConfirmedAt && input.sellerDonationConfirmedAt,
  );
}
