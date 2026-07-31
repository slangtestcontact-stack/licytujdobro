import "server-only";

export type AppEnvironment = "development" | "test" | "production";

export function getAppEnvironment(): AppEnvironment {
  const value = (process.env.APP_ENV || process.env.NODE_ENV || "development").toLowerCase();
  if (value === "production") return "production";
  if (value === "test" || value === "staging") return "test";
  return "development";
}

export function isTestEnvironment() {
  return getAppEnvironment() === "test";
}

export function paymentsEnabled() {
  return getAppEnvironment() !== "test";
}

export function familyConsentsConfirmed() {
  return [
    process.env.FAMILY_NAME_CONSENT_CONFIRMED,
    process.env.FAMILY_PHOTO_CONSENT_CONFIRMED,
    process.env.FAMILY_STORY_CONSENT_CONFIRMED,
  ].every((value) => value === "true");
}
