import "server-only";

export type LegalConfiguration = {
  serviceName: string;
  operatorLegalName: string;
  operatorDisplayName: string;
  operatorAddress: string;
  operatorEmail: string;
  operatorPhone: string;
  operatorNip: string;
  operatorRegistry: string;
  privacyEmail: string;
  dsaContactEmail: string;
  legalVersion: string;
  effectiveDate: string;
  lastUpdatedDate: string;
  serviceArea: string;
  missingRequiredFields: string[];
  isComplete: boolean;
};

function env(name: string) {
  return process.env[name]?.trim() ?? "";
}

export function getLegalConfiguration(): LegalConfiguration {
  const operatorDisplayName = env("ORGANIZER_NAME") || "LicytujDobro";
  const operatorLegalName = env("ORGANIZER_LEGAL_NAME") || operatorDisplayName;
  const operatorEmail = env("ORGANIZER_EMAIL");
  const operatorAddress = env("ORGANIZER_ADDRESS");

  const required: Array<[string, string]> = [
    ["ORGANIZER_LEGAL_NAME", env("ORGANIZER_LEGAL_NAME")],
    ["ORGANIZER_ADDRESS", operatorAddress],
    ["ORGANIZER_EMAIL", operatorEmail],
  ];

  const missingRequiredFields = required
    .filter(([, value]) => !value || /example\.pl|do uzupełnienia|change-me/i.test(value))
    .map(([name]) => name);

  return {
    serviceName: "LicytujDobro",
    operatorLegalName,
    operatorDisplayName,
    operatorAddress: operatorAddress || "Dane adresowe wymagają uzupełnienia przed publikacją.",
    operatorEmail: operatorEmail || "Dane kontaktowe wymagają uzupełnienia przed publikacją.",
    operatorPhone: env("ORGANIZER_PHONE"),
    operatorNip: env("ORGANIZER_NIP"),
    operatorRegistry: env("ORGANIZER_REGISTRY"),
    privacyEmail: env("PRIVACY_EMAIL") || operatorEmail,
    dsaContactEmail: env("DSA_CONTACT_EMAIL") || operatorEmail,
    legalVersion: env("LEGAL_VERSION") || "1.0",
    effectiveDate: env("LEGAL_EFFECTIVE_DATE") || "2026-07-30",
    lastUpdatedDate: env("LEGAL_LAST_UPDATED_DATE") || env("LEGAL_EFFECTIVE_DATE") || "2026-07-30",
    serviceArea: env("NEXT_PUBLIC_PILOT_CITY") || env("PILOT_CITY") || "Biłgoraj i okolice",
    missingRequiredFields,
    isComplete: missingRequiredFields.length === 0,
  };
}

export const CURRENT_BIDDING_TERMS_VERSION =
  process.env.LEGAL_BIDDING_TERMS_VERSION?.trim() || "2026-07-v2";
