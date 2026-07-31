"use server";

import { redirect } from "next/navigation";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { db } from "@/db";
import { adminSettings, emailLoginCodes, sessions, users, userProfiles, userVerifications } from "@/db/schema";
import { and, eq, desc, isNull } from "drizzle-orm";
import { createSession, destroyAllSessions, destroySession, getCurrentUser, hashPassword, verifyPassword } from "@/lib/auth";
import { getSmsProvider, generateNumericCode, isSmsDevMode } from "@/lib/sms";
import { getEmailProvider, isEmailDevMode } from "@/lib/email";
import { logAudit } from "@/lib/audit";
import { consumeRateLimit } from "@/lib/rate-limit";
import { findOrCreateQuickUser, getQuickAccountDestination, hashLoginCode, safeReturnTo } from "@/lib/quick-auth";
import { normalizePhone, shouldActivateAccount } from "@/lib/auth-policy";
import {
  getContactVerificationMode,
  hasRequiredContactVerification,
  isTechnicalEmail,
  isTechnicalPhone,
} from "@/lib/contact-verification";

export type ActionResult = { ok: boolean; error?: string; devHint?: string };

const registerSchema = z
  .object({
    firstName: z.string().trim().min(2, "Podaj imię (min. 2 znaki)."),
    nickname: z
      .string()
      .trim()
      .min(3, "Pseudonim musi mieć min. 3 znaki.")
      .max(30)
      .regex(/^[a-zA-Z0-9_.\-]+$/, "Dozwolone są litery, cyfry, kropka, myślnik i podkreślnik."),
    email: z.string().trim().email("Podaj poprawny adres e-mail."),
    phone: z
      .string()
      .trim()
      .max(30)
      .optional()
      .default("")
      .refine((value) => !value || /^\+?[0-9\s]{9,15}$/.test(value), "Podaj poprawny numer telefonu."),
    city: z.string().trim().min(2, "Podaj miasto."),
    password: z.string().min(8, "Hasło musi mieć min. 8 znaków."),
    confirmPassword: z.string(),
    isAdult: z.literal("on", { message: "Musisz potwierdzić pełnoletność." }),
    acceptTerms: z.literal("on", { message: "Musisz zaakceptować regulamin." }),
    acceptPrivacy: z.literal("on", { message: "Musisz zaakceptować politykę prywatności." }),
    acceptBidding: z.literal("on", { message: "Musisz zaakceptować zasady wiążącej licytacji." }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Hasła nie są identyczne.",
    path: ["confirmPassword"],
  });

export async function registerAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const raw = Object.fromEntries(formData.entries());
  const registerLimit = await consumeRateLimit(`register:${String(raw.email ?? "").toLowerCase()}`, 5, 60 * 60 * 1000);
  if (!registerLimit.ok) return { ok: false, error: `Zbyt wiele prób. Spróbuj za ${registerLimit.retryAfterSeconds} s.` };
  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Błąd walidacji formularza." };
  }
  const data = parsed.success ? parsed.data : null;
  if (!data) return { ok: false, error: "Błąd walidacji." };

  const [citySetting] = await db.select().from(adminSettings).where(eq(adminSettings.key, "pilotCity")).limit(1);
  const allowedCity = String(citySetting?.value ?? process.env.PILOT_CITY ?? "Biłgoraj i okolice");
  if (data.city.toLocaleLowerCase("pl") !== allowedCity.toLocaleLowerCase("pl")) {
    return { ok: false, error: `Serwis działa obecnie wyłącznie w mieście: ${allowedCity}.` };
  }

  const existingEmail = await db.select().from(users).where(eq(users.email, data.email.toLowerCase())).limit(1);
  if (existingEmail.length > 0) {
    return { ok: false, error: "Konto z tym adresem e-mail już istnieje." };
  }
  const existingNick = await db.select().from(users).where(eq(users.nickname, data.nickname)).limit(1);
  if (existingNick.length > 0) {
    return { ok: false, error: "Ten pseudonim jest już zajęty." };
  }
  const normalizedPhone = data.phone
    ? normalizePhone(data.phone)
    : `pending-${randomBytes(10).toString("hex")}`;
  if (data.phone) {
    const existingPhone = await db.select().from(users).where(eq(users.phone, normalizedPhone)).limit(1);
    if (existingPhone.length > 0) return { ok: false, error: "Konto z tym numerem telefonu już istnieje." };
  }

  const passwordHash = await hashPassword(data.password);
  const now = new Date();

  const [user] = await db
    .insert(users)
    .values({
      firstName: data.firstName,
      nickname: data.nickname,
      email: data.email.toLowerCase(),
      phone: normalizedPhone,
      city: data.city,
      passwordHash,
      isAdultConfirmed: true,
      acceptedTermsAt: now,
      acceptedPrivacyAt: now,
      acceptedBiddingRulesAt: now,
      authProvider: "password",
      onboardingCompletedAt: now,
      biddingTermsVersion: "2026-07-v1",
      biddingTermsAcceptedAt: now,
      status: "nowe",
    })
    .returning();

  await db.insert(userProfiles).values({ userId: user.id });

  const emailToken = await generateUniqueEmailVerificationCode();

  await db.insert(userVerifications).values({
    userId: user.id,
    emailToken,
    emailTokenExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
    phoneCode: null,
    phoneCodeExpiresAt: null,
  });

  try {
    await getEmailProvider().send({
      to: user.email,
      subject: "Kod weryfikacyjny LicytujDobro",
      text: `Twój kod weryfikacyjny: ${emailToken}
Kod działa przez 15 minut. Jeżeli to nie Ty, zignoruj tę wiadomość.`,
    });
  } catch (error) {
    console.error("[auth.register] Nie udało się wysłać kodu:", error);
  }

  await logAudit({ actorId: user.id, action: "REJESTRACJA", entityType: "user", entityId: user.id });

  await createSession(user.id);
  redirect("/weryfikacja");
}

const loginSchema = z.object({
  email: z.string().trim().email("Podaj poprawny adres e-mail."),
  password: z.string().min(1, "Podaj hasło."),
  returnTo: z.string().optional().default("/dashboard"),
});

export async function loginAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const loginRaw = Object.fromEntries(formData.entries());
  const loginKey = String(loginRaw.email ?? "").trim().toLowerCase();
  const loginLimit = await consumeRateLimit(`login:${loginKey}`, 8, 15 * 60 * 1000);
  if (!loginLimit.ok) return { ok: false, error: `Zbyt wiele prób logowania. Spróbuj za ${loginLimit.retryAfterSeconds} s.` };
  const parsed = loginSchema.safeParse(loginRaw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Błąd walidacji." };
  }
  const [user] = await db.select().from(users).where(eq(users.email, parsed.data.email.toLowerCase())).limit(1);
  if (!user) return { ok: false, error: "Nieprawidłowy e-mail lub hasło." };
  if (user.status === "zablokowane") return { ok: false, error: "To konto zostało zablokowane." };
  if (user.status === "zawieszone") return { ok: false, error: "To konto jest tymczasowo zawieszone." };

  const valid = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!valid) return { ok: false, error: "Nieprawidłowy e-mail lub hasło." };

  await createSession(user.id);
  await logAudit({ actorId: user.id, action: "LOGOWANIE", entityType: "user", entityId: user.id });
  const destination = safeReturnTo(parsed.data.returnTo);
  redirect(destination);
}

export async function logoutAction() {
  const user = await getCurrentUser();
  if (user) {
    await logAudit({ actorId: user.id, action: "WYLOGOWANIE", entityType: "user", entityId: user.id });
  }
  await destroySession();
  redirect("/");
}

export async function logoutAllSessionsAction() {
  const user = await getCurrentUser();
  if (!user) redirect("/logowanie");
  await logAudit({
    actorId: user.id,
    action: "WYLOGOWANIE_WSZYSTKICH_SESJI",
    entityType: "user",
    entityId: user.id,
  });
  await destroyAllSessions(user.id);
  redirect("/logowanie?allSessionsClosed=1");
}

async function generateUniqueEmailVerificationCode() {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const code = generateNumericCode(6);
    const [collision] = await db
      .select({ id: userVerifications.id })
      .from(userVerifications)
      .where(eq(userVerifications.emailToken, code))
      .limit(1);
    if (!collision) return code;
  }
  throw new Error("Nie udało się wygenerować kodu e-mail. Spróbuj ponownie.");
}

const contactVerificationSchema = z.object({
  method: z.enum(["both", "email", "phone"]).optional().default("both"),
  email: z.string().trim().optional().default(""),
  phone: z.string().trim().optional().default(""),
  acceptRules: z.string().optional(),
  returnTo: z.string().optional().default("/dashboard"),
});

export async function startContactVerificationAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Musisz być zalogowany." };

  const parsed = contactVerificationSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Uzupełnij dane kontaktowe.",
    };
  }

  const mode = getContactVerificationMode();
  const method =
    mode === "either"
      ? parsed.data.method === "phone"
        ? "phone"
        : "email"
      : mode;
  const wantsEmail = method === "both" || method === "email";
  const wantsPhone = method === "both" || method === "phone";
  const needsEmail = wantsEmail && !user.emailVerifiedAt;
  const needsPhone = wantsPhone && !user.phoneVerifiedAt;

  if (!needsEmail && !needsPhone) return { ok: true };

  if (!user.acceptedTermsAt && parsed.data.acceptRules !== "on") {
    return {
      ok: false,
      error: "Potwierdź pełnoletność i zaakceptuj regulamin oraz politykę prywatności.",
    };
  }

  let email = user.email;
  let phone = user.phone;

  if (needsEmail) {
    const candidate = parsed.data.email.toLowerCase();
    const emailResult = z.string().email("Podaj poprawny adres e-mail.").safeParse(candidate);
    if (!emailResult.success) {
      return { ok: false, error: emailResult.error.issues[0]?.message };
    }
    email = emailResult.data;
    const [owner] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (owner && owner.id !== user.id) {
      return { ok: false, error: "Ten adres e-mail jest już używany przez inne konto." };
    }
  }

  if (needsPhone) {
    try {
      phone = normalizePhone(parsed.data.phone);
    } catch (error) {
      return { ok: false, error: (error as Error).message };
    }
    const [owner] = await db.select({ id: users.id }).from(users).where(eq(users.phone, phone)).limit(1);
    if (owner && owner.id !== user.id) {
      return { ok: false, error: "Ten numer telefonu jest już używany przez inne konto." };
    }
  }

  if (needsEmail) {
    const rate = await consumeRateLimit(`email-verification:${user.id}`, 5, 60 * 60 * 1000);
    if (!rate.ok) {
      return { ok: false, error: `Limit wiadomości e-mail został wykorzystany. Spróbuj za ${rate.retryAfterSeconds} s.` };
    }
  }
  if (needsPhone) {
    const rate = await consumeRateLimit(`sms:${user.id}`, 5, 60 * 60 * 1000);
    if (!rate.ok) {
      return { ok: false, error: `Limit SMS został wykorzystany. Spróbuj za ${rate.retryAfterSeconds} s.` };
    }
  }

  const emailCode = needsEmail ? await generateUniqueEmailVerificationCode() : null;
  const phoneCode = needsPhone ? generateNumericCode(6) : null;
  const now = new Date();

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({
        email,
        phone,
        emailVerifiedAt: needsEmail ? null : user.emailVerifiedAt,
        phoneVerifiedAt: needsPhone ? null : user.phoneVerifiedAt,
        isAdultConfirmed: user.isAdultConfirmed || parsed.data.acceptRules === "on",
        acceptedTermsAt: user.acceptedTermsAt ?? (parsed.data.acceptRules === "on" ? now : null),
        acceptedPrivacyAt: user.acceptedPrivacyAt ?? (parsed.data.acceptRules === "on" ? now : null),
        acceptedBiddingRulesAt:
          user.acceptedBiddingRulesAt ?? (parsed.data.acceptRules === "on" ? now : null),
        onboardingCompletedAt: user.onboardingCompletedAt ?? now,
        updatedAt: now,
      })
      .where(eq(users.id, user.id));

    await tx
      .insert(userVerifications)
      .values({
        userId: user.id,
        emailToken: emailCode,
        emailTokenExpiresAt: emailCode
          ? new Date(Date.now() + 15 * 60 * 1000)
          : null,
        phoneCode,
        phoneCodeExpiresAt: phoneCode
          ? new Date(Date.now() + 15 * 60 * 1000)
          : null,
        phoneAttempts: 0,
      })
      .onConflictDoUpdate({
        target: userVerifications.userId,
        set: {
          ...(emailCode
            ? {
                emailToken: emailCode,
                emailTokenExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
              }
            : {}),
          ...(phoneCode
            ? {
                phoneCode,
                phoneCodeExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
                phoneAttempts: 0,
              }
            : {}),
          updatedAt: now,
        },
      });
  });

  const returnTo = safeReturnTo(parsed.data.returnTo);

  try {
    if (emailCode) {
      await getEmailProvider().send({
        to: email,
        subject: "Kod weryfikacyjny LicytujDobro",
        text: `Twój kod weryfikacyjny: ${emailCode}
Kod działa przez 15 minut. Jeżeli to nie Ty, zignoruj tę wiadomość.`,
      });
    }
    if (phoneCode) {
      await getSmsProvider().send(
        phone,
        `LicytujDobro: Twój kod weryfikacyjny to ${phoneCode}`,
      );
    }
  } catch (error) {
    console.error("[Weryfikacja kontaktu] Błąd wysyłki", error);
    return {
      ok: false,
      error: "Dane zapisano, ale nie udało się wysłać kodu. Spróbuj wysłać go ponownie.",
    };
  }

  return { ok: true };
}

export async function confirmEmailAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Musisz być zalogowany." };
  if (isTechnicalEmail(user.email)) {
    return { ok: false, error: "Najpierw podaj prawdziwy adres e-mail." };
  }

  const rate = await consumeRateLimit(`email-verify-attempt:${user.id}`, 10, 15 * 60 * 1000);
  if (!rate.ok) {
    return { ok: false, error: `Zbyt wiele prób. Spróbuj za ${rate.retryAfterSeconds} s.` };
  }

  const code = String(formData.get("code") ?? formData.get("token") ?? "").trim();
  if (!/^\d{6}$/.test(code)) {
    return { ok: false, error: "Wpisz sześciocyfrowy kod z wiadomości e-mail." };
  }

  const [verification] = await db
    .select()
    .from(userVerifications)
    .where(eq(userVerifications.userId, user.id))
    .orderBy(desc(userVerifications.createdAt))
    .limit(1);

  if (!verification || verification.emailToken !== code) {
    return { ok: false, error: "Nieprawidłowy kod e-mail." };
  }
  if (!verification.emailTokenExpiresAt || verification.emailTokenExpiresAt < new Date()) {
    return { ok: false, error: "Kod e-mail wygasł. Wyślij nowy." };
  }

  await db.transaction(async (tx) => {
    await tx.update(users).set({ emailVerifiedAt: new Date(), updatedAt: new Date() }).where(eq(users.id, user.id));
    await tx.update(userVerifications).set({ emailToken: null, emailTokenExpiresAt: null, updatedAt: new Date() }).where(eq(userVerifications.id, verification.id));
  });
  await maybeActivateAccount(user.id);

  const [updated] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
  if (updated && hasRequiredContactVerification(updated)) {
    redirect(safeReturnTo(String(formData.get("returnTo") ?? "/dashboard")));
  }
  return { ok: true };
}

export async function resendEmailVerificationAction(): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Musisz być zalogowany." };
  if (user.emailVerifiedAt) return { ok: true };
  if (isTechnicalEmail(user.email)) {
    return { ok: false, error: "Najpierw podaj prawdziwy adres e-mail." };
  }

  const resendLimit = await consumeRateLimit(`email-verification:${user.id}`, 5, 60 * 60 * 1000);
  if (!resendLimit.ok) {
    return { ok: false, error: `Limit wiadomości został wykorzystany. Spróbuj za ${resendLimit.retryAfterSeconds} s.` };
  }

  const emailCode = await generateUniqueEmailVerificationCode();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  await db
    .insert(userVerifications)
    .values({ userId: user.id, emailToken: emailCode, emailTokenExpiresAt: expiresAt })
    .onConflictDoUpdate({
      target: userVerifications.userId,
      set: { emailToken: emailCode, emailTokenExpiresAt: expiresAt, updatedAt: new Date() },
    });

  try {
    await getEmailProvider().send({
      to: user.email,
      subject: "Kod weryfikacyjny LicytujDobro",
      text: `Twój kod weryfikacyjny: ${emailCode}
Kod działa przez 15 minut. Jeżeli to nie Ty, zignoruj tę wiadomość.`,
    });
  } catch (error) {
    console.error("[auth.email-verification] Błąd wysyłki:", error);
    return {
      ok: false,
      error: "Nie udało się wysłać wiadomości. Spróbuj ponownie za chwilę.",
      devHint: isEmailDevMode() ? emailCode : undefined,
    };
  }

  return { ok: true, devHint: isEmailDevMode() ? emailCode : undefined };
}

export async function verifyPhoneAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Musisz być zalogowany." };
  if (isTechnicalPhone(user.phone)) {
    return { ok: false, error: "Najpierw podaj prawdziwy numer telefonu." };
  }

  const code = String(formData.get("code") ?? "").trim();
  const [verification] = await db
    .select()
    .from(userVerifications)
    .where(eq(userVerifications.userId, user.id))
    .orderBy(desc(userVerifications.createdAt))
    .limit(1);

  if (!verification) return { ok: false, error: "Brak aktywnego kodu. Wyślij kod ponownie." };
  if ((verification.phoneAttempts ?? 0) >= 5) {
    return { ok: false, error: "Zbyt wiele prób. Wygeneruj nowy kod SMS." };
  }
  if (!verification.phoneCodeExpiresAt || verification.phoneCodeExpiresAt < new Date()) {
    return { ok: false, error: "Kod SMS wygasł. Wyślij nowy." };
  }
  if (verification.phoneCode !== code) {
    await db
      .update(userVerifications)
      .set({ phoneAttempts: (verification.phoneAttempts ?? 0) + 1 })
      .where(eq(userVerifications.id, verification.id));
    return { ok: false, error: "Nieprawidłowy kod SMS." };
  }

  await db.transaction(async (tx) => {
    await tx.update(users).set({ phoneVerifiedAt: new Date(), updatedAt: new Date() }).where(eq(users.id, user.id));
    await tx.update(userVerifications).set({ phoneCode: null, phoneCodeExpiresAt: null, phoneAttempts: 0, updatedAt: new Date() }).where(eq(userVerifications.id, verification.id));
  });
  await maybeActivateAccount(user.id);

  const [updated] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
  if (updated && hasRequiredContactVerification(updated)) {
    redirect(safeReturnTo(String(formData.get("returnTo") ?? "/dashboard")));
  }
  return { ok: true };
}

export async function resendPhoneCodeAction(): Promise<ActionResult & { code?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Musisz być zalogowany." };
  if (isTechnicalPhone(user.phone)) {
    return { ok: false, error: "Najpierw podaj prawdziwy numer telefonu." };
  }

  const resendLimit = await consumeRateLimit(`sms:${user.id}`, 5, 60 * 60 * 1000);
  if (!resendLimit.ok) return { ok: false, error: `Limit SMS został wykorzystany. Spróbuj za ${resendLimit.retryAfterSeconds} s.` };

  const phoneCode = generateNumericCode(6);
  await db
    .insert(userVerifications)
    .values({
      userId: user.id,
      phoneCode,
      phoneCodeExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
      phoneAttempts: 0,
    })
    .onConflictDoUpdate({
      target: userVerifications.userId,
      set: {
        phoneCode,
        phoneCodeExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
        phoneAttempts: 0,
        updatedAt: new Date(),
      },
    });

  try {
    await getSmsProvider().send(
      user.phone,
      `LicytujDobro: Twój kod weryfikacyjny to ${phoneCode}`,
    );
  } catch (error) {
    console.error("[auth.phone-verification] Błąd wysyłki:", error);
    return {
      ok: false,
      error: "Nie udało się wysłać SMS-a. Spróbuj ponownie za chwilę.",
      devHint: isSmsDevMode() ? phoneCode : undefined,
    };
  }
  return { ok: true, devHint: isSmsDevMode() ? phoneCode : undefined };
}

async function maybeActivateAccount(userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (user && shouldActivateAccount(user)) {
    await db.update(users).set({ status: "aktywne", updatedAt: new Date() }).where(eq(users.id, userId));
  }
}

export async function requestPasswordResetAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const resetLimit = await consumeRateLimit(`reset:${email}`, 3, 60 * 60 * 1000);
  if (!resetLimit.ok) return { ok: false, error: `Spróbuj ponownie za ${resetLimit.retryAfterSeconds} s.` };
  if (!z.string().email().safeParse(email).success) return { ok: false, error: "Podaj poprawny adres e-mail." };
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  // Ten sam komunikat niezależnie od istnienia konta ogranicza możliwość sprawdzania adresów.
  if (!user) return { ok: true };
  const token = crypto.randomUUID();
  const [verification] = await db.select().from(userVerifications).where(eq(userVerifications.userId, user.id)).limit(1);
  if (verification) {
    await db.update(userVerifications).set({ passwordResetToken: token, passwordResetExpiresAt: new Date(Date.now() + 60 * 60 * 1000), updatedAt: new Date() }).where(eq(userVerifications.id, verification.id));
  } else {
    await db.insert(userVerifications).values({ userId: user.id, passwordResetToken: token, passwordResetExpiresAt: new Date(Date.now() + 60 * 60 * 1000) });
  }
  const resetUrl = `${process.env.APP_URL ?? "http://localhost:3000"}/haslo/nowe?token=${token}`;
  try {
    await getEmailProvider().send({
      to: email,
      subject: "Reset hasła LicytujDobro",
      text: `Otwórz link, aby ustawić nowe hasło: ${resetUrl}`,
    });
  } catch (error) {
    console.error("[auth.password-reset] Błąd wysyłki:", error);
  }
  return { ok: true, devHint: isEmailDevMode() ? token : undefined };
}

const resetPasswordSchema = z.object({
  token: z.string().uuid(),
  password: z.string().min(8, "Hasło musi mieć minimum 8 znaków."),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, { path: ["confirmPassword"], message: "Hasła nie są identyczne." });

export async function resetPasswordAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Nieprawidłowe dane." };
  const [verification] = await db.select().from(userVerifications).where(eq(userVerifications.passwordResetToken, parsed.data.token)).limit(1);
  if (!verification || !verification.passwordResetExpiresAt || verification.passwordResetExpiresAt < new Date()) return { ok: false, error: "Link resetujący jest nieprawidłowy lub wygasł." };
  const passwordHash = await hashPassword(parsed.data.password);
  await db.transaction(async (tx) => {
    await tx.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, verification.userId));
    await tx.delete(sessions).where(eq(sessions.userId, verification.userId));
    await tx.update(userVerifications).set({ passwordResetToken: null, passwordResetExpiresAt: null, updatedAt: new Date() }).where(eq(userVerifications.id, verification.id));
  });
  return { ok: true };
}


const emailCodeRequestSchema = z.object({
  email: z.string().trim().email("Podaj poprawny adres e-mail."),
  returnTo: z.string().optional().default("/dashboard"),
});

export async function requestEmailLoginCodeAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = emailCodeRequestSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Nieprawidłowy e-mail." };
  const email = parsed.data.email.toLowerCase();
  const rate = await consumeRateLimit(`email-login:${email}`, 5, 60 * 60 * 1000);
  if (!rate.ok) return { ok: false, error: `Zbyt wiele kodów. Spróbuj za ${rate.retryAfterSeconds} s.` };
  const code = generateNumericCode(6);
  await db.insert(emailLoginCodes).values({
    email,
    codeHash: hashLoginCode(email, code),
    returnTo: safeReturnTo(parsed.data.returnTo),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });
  try {
    await getEmailProvider().send({
      to: email,
      subject: "Kod logowania LicytujDobro",
      text: `Twój jednorazowy kod logowania: ${code}\nKod działa przez 10 minut. Jeżeli to nie Ty, zignoruj wiadomość.`,
    });
  } catch (error) {
    console.error("[auth.email-login] Błąd wysyłki:", error);
    return {
      ok: false,
      error: "Nie udało się wysłać kodu logowania. Spróbuj ponownie za chwilę.",
      devHint: isEmailDevMode() ? code : undefined,
    };
  }
  return { ok: true, devHint: isEmailDevMode() ? code : undefined };
}

const emailCodeVerifySchema = z.object({
  email: z.string().trim().email(),
  code: z.string().trim().regex(/^\d{6}$/, "Wpisz sześciocyfrowy kod."),
});

export async function verifyEmailLoginCodeAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = emailCodeVerifySchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Nieprawidłowy kod." };
  const email = parsed.data.email.toLowerCase();
  const [entry] = await db.select().from(emailLoginCodes)
    .where(and(eq(emailLoginCodes.email, email), isNull(emailLoginCodes.usedAt)))
    .orderBy(desc(emailLoginCodes.createdAt)).limit(1);
  if (!entry || entry.expiresAt <= new Date()) return { ok: false, error: "Kod wygasł. Wyślij nowy." };
  if (entry.attempts >= 5) return { ok: false, error: "Przekroczono limit prób. Wyślij nowy kod." };
  if (entry.codeHash !== hashLoginCode(email, parsed.data.code)) {
    await db.update(emailLoginCodes).set({ attempts: entry.attempts + 1 }).where(eq(emailLoginCodes.id, entry.id));
    return { ok: false, error: "Nieprawidłowy kod." };
  }
  const user = await findOrCreateQuickUser({ provider: "email_code", providerAccountId: email, email, name: email.split("@")[0] });
  await db.update(emailLoginCodes).set({ usedAt: new Date() }).where(eq(emailLoginCodes.id, entry.id));
  await createSession(user.id);
  const returnTo = safeReturnTo(entry.returnTo);
  redirect(getQuickAccountDestination(user, returnTo));
}

const completeQuickAccountSchema = z.object({
  nickname: z
    .string()
    .trim()
    .max(30)
    .regex(/^[a-zA-Z0-9_.\-]*$/, "Pseudonim zawiera niedozwolone znaki.")
    .optional()
    .default(""),
  acceptRules: z.literal("on", { message: "Potwierdź pełnoletność i zaakceptuj zasady." }),
  returnTo: z.string().optional().default("/dashboard"),
});

export async function completeQuickAccountAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sesja wygasła. Zaloguj się ponownie." };

  const parsed = completeQuickAccountSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Uzupełnij wymagane dane.",
    };
  }

  const chosenNickname = parsed.data.nickname || user.nickname;
  const [nicknameOwner] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.nickname, chosenNickname))
    .limit(1);
  if (nicknameOwner && nicknameOwner.id !== user.id) {
    return { ok: false, error: "Ten pseudonim jest już zajęty." };
  }

  const now = new Date();
  await db
    .update(users)
    .set({
      nickname: chosenNickname,
      isAdultConfirmed: true,
      acceptedTermsAt: user.acceptedTermsAt ?? now,
      acceptedPrivacyAt: user.acceptedPrivacyAt ?? now,
      acceptedBiddingRulesAt: user.acceptedBiddingRulesAt ?? now,
      biddingTermsVersion: "2026-07-v1",
      biddingTermsAcceptedAt: user.biddingTermsAcceptedAt ?? now,
      onboardingCompletedAt: now,
      updatedAt: now,
    })
    .where(eq(users.id, user.id));

  await logAudit({
    actorId: user.id,
    action: "UZUPELNIENIE_KONTA_OAUTH",
    entityType: "user",
    entityId: user.id,
  });

  redirect(safeReturnTo(parsed.data.returnTo));
}
