"use server";

import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { z } from "zod";

import { db } from "@/db";
import { contactMessages } from "@/db/schema";
import { consumeRateLimit } from "@/lib/rate-limit";

export type LegalFormResult = {
  ok: boolean;
  error?: string;
  reference?: string;
};

const noticeSchema = z.object({
  name: z.string().trim().min(2, "Podaj imię, nazwę albo nazwę podmiotu.").max(160),
  email: z.string().trim().email("Podaj poprawny adres e-mail.").max(255),
  contentUrl: z.string().trim().url("Podaj pełny adres URL zgłaszanej treści.").max(2000),
  category: z.enum([
    "OSZUSTWO",
    "NARUSZENIE_PRAW",
    "NIEDOZWOLONY_PRZEDMIOT",
    "DANE_OSOBOWE",
    "GROZBY_NIENAWISC",
    "INNE_NIELEGALNE",
  ]),
  legalBasis: z.string().trim().max(500).optional().default(""),
  explanation: z.string().trim().min(30, "Opisz konkretnie, dlaczego treść może być nielegalna.").max(5000),
  goodFaith: z.literal("on", { message: "Potwierdź działanie w dobrej wierze." }),
});

const appealSchema = z.object({
  name: z.string().trim().min(2, "Podaj imię lub pseudonim.").max(160),
  email: z.string().trim().email("Podaj poprawny adres e-mail.").max(255),
  decisionReference: z.string().trim().min(3, "Podaj identyfikator albo opis decyzji.").max(300),
  explanation: z.string().trim().min(20, "Wyjaśnij, dlaczego decyzja powinna zostać zmieniona.").max(5000),
  requestedOutcome: z.string().trim().min(3, "Napisz, czego oczekujesz.").max(1000),
});

async function requestIdentity() {
  const requestHeaders = await headers();
  const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim()
    || requestHeaders.get("x-real-ip")
    || "unknown";
  return ip;
}

function reference(prefix: "DSA" | "ODW") {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  return `${prefix}-${date}-${randomBytes(4).toString("hex").toUpperCase()}`;
}

export async function sendIllegalContentNoticeAction(
  _prev: LegalFormResult,
  formData: FormData,
): Promise<LegalFormResult> {
  const parsed = noticeSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Uzupełnij zgłoszenie." };
  }

  const ip = await requestIdentity();
  const rate = await consumeRateLimit(
    `legal-notice:${ip}:${parsed.data.email.toLowerCase()}`,
    6,
    60 * 60 * 1000,
  );
  if (!rate.ok) {
    return { ok: false, error: `Zbyt wiele zgłoszeń. Spróbuj za ${rate.retryAfterSeconds} s.` };
  }

  const ref = reference("DSA");
  const message = [
    `Numer zgłoszenia: ${ref}`,
    `Kategoria: ${parsed.data.category}`,
    `Adres treści: ${parsed.data.contentUrl}`,
    `Wskazana podstawa prawna: ${parsed.data.legalBasis || "nie wskazano"}`,
    "",
    "Uzasadnienie:",
    parsed.data.explanation,
    "",
    "Zgłaszający potwierdził działanie w dobrej wierze i kompletność informacji.",
  ].join("\n");

  await db.insert(contactMessages).values({
    name: parsed.data.name,
    email: parsed.data.email.toLowerCase(),
    subject: `[DSA ${ref}] Zgłoszenie nielegalnej treści`,
    message,
  });

  return { ok: true, reference: ref };
}

export async function sendModerationAppealAction(
  _prev: LegalFormResult,
  formData: FormData,
): Promise<LegalFormResult> {
  const parsed = appealSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Uzupełnij odwołanie." };
  }

  const ip = await requestIdentity();
  const rate = await consumeRateLimit(
    `moderation-appeal:${ip}:${parsed.data.email.toLowerCase()}`,
    6,
    60 * 60 * 1000,
  );
  if (!rate.ok) {
    return { ok: false, error: `Zbyt wiele odwołań. Spróbuj za ${rate.retryAfterSeconds} s.` };
  }

  const ref = reference("ODW");
  const message = [
    `Numer odwołania: ${ref}`,
    `Decyzja: ${parsed.data.decisionReference}`,
    "",
    "Uzasadnienie odwołania:",
    parsed.data.explanation,
    "",
    "Oczekiwany rezultat:",
    parsed.data.requestedOutcome,
  ].join("\n");

  await db.insert(contactMessages).values({
    name: parsed.data.name,
    email: parsed.data.email.toLowerCase(),
    subject: `[ODWOŁANIE ${ref}] Decyzja moderacyjna`,
    message,
  });

  return { ok: true, reference: ref };
}
