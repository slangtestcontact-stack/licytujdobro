import "server-only";

import { createHash, randomBytes } from "crypto";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { socialAccounts, userProfiles, users } from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import {
  hasRequiredContactVerification,
  isTechnicalEmail,
} from "@/lib/contact-verification";

export function safeReturnTo(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }
  return value.slice(0, 500);
}

export function hashLoginCode(email: string, code: string) {
  const secret =
    process.env.EMAIL_LOGIN_SECRET ||
    process.env.SESSION_SECRET ||
    "dev-email-login-secret";

  return createHash("sha256")
    .update(`${email.toLowerCase()}:${code}:${secret}`)
    .digest("hex");
}

function createInternalEmail(provider: string, providerAccountId: string) {
  const identifier = createHash("sha256")
    .update(`${provider}:${providerAccountId}`)
    .digest("hex")
    .slice(0, 48);

  return `${provider}-${identifier}@users.invalid`;
}


async function activateIfReady<T extends {
  id: string;
  status: string;
  emailVerifiedAt: Date | null;
  phoneVerifiedAt: Date | null;
}>(user: T): Promise<T> {
  if (user.status !== "nowe" || !hasRequiredContactVerification(user)) {
    return user;
  }

  const [updated] = await db
    .update(users)
    .set({ status: "aktywne", updatedAt: new Date() })
    .where(eq(users.id, user.id))
    .returning();

  return (updated ?? user) as T;
}

function baseNickname(name: string, email: string) {
  const candidate = (name || email.split("@")[0] || "Pomagacz")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_.-]/g, "")
    .slice(0, 22);

  return candidate.length >= 3 ? candidate : "Pomagacz";
}

async function uniqueNickname(name: string, email: string) {
  const base = baseNickname(name, email);

  for (let index = 0; index < 20; index += 1) {
    const value =
      index === 0
        ? base
        : `${base}${String(index + 1).padStart(2, "0")}`;

    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.nickname, value))
      .limit(1);

    if (!existing) return value;
  }

  return `Pomagacz${randomBytes(3).toString("hex")}`;
}

export async function findOrCreateQuickUser(input: {
  provider: "google" | "facebook" | "apple" | "email_code";
  providerAccountId: string;
  email?: string | null;
  name?: string;
}) {
  const providerEmail = input.email?.trim().toLowerCase() || null;
  const storedEmail =
    providerEmail ?? createInternalEmail(input.provider, input.providerAccountId);

  const [linked] = await db
    .select({ user: users })
    .from(socialAccounts)
    .innerJoin(users, eq(users.id, socialAccounts.userId))
    .where(
      and(
        eq(socialAccounts.provider, input.provider),
        eq(socialAccounts.providerAccountId, input.providerAccountId),
      ),
    )
    .limit(1);

  if (linked?.user) {
    if (providerEmail) {
      await db
        .update(socialAccounts)
        .set({ emailAtProvider: providerEmail, updatedAt: new Date() })
        .where(
          and(
            eq(socialAccounts.provider, input.provider),
            eq(socialAccounts.providerAccountId, input.providerAccountId),
          ),
        );
    }

    if (providerEmail && isTechnicalEmail(linked.user.email)) {
      const [emailOwner] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, providerEmail))
        .limit(1);

      if (!emailOwner || emailOwner.id === linked.user.id) {
        const [updatedUser] = await db
          .update(users)
          .set({
            email: providerEmail,
            emailVerifiedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(users.id, linked.user.id))
          .returning();

        return activateIfReady(updatedUser ?? linked.user);
      }
    }

    return activateIfReady(linked.user);
  }

  let [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, storedEmail))
    .limit(1);

  if (!user) {
    const nickname = await uniqueNickname(input.name || "", storedEmail);
    const firstName =
      (input.name || nickname).trim().split(/\s+/)[0].slice(0, 120) ||
      "Pomagacz";
    const passwordHash = await hashPassword(randomBytes(32).toString("hex"));

    [user] = await db
      .insert(users)
      .values({
        email: storedEmail,
        phone: `pending-${randomBytes(10).toString("hex")}`,
        passwordHash,
        firstName,
        nickname,
        city: process.env.PILOT_CITY || "Biłgoraj i okolice",
        status: "nowe",
        authProvider: input.provider,
        emailVerifiedAt: providerEmail ? new Date() : null,
        phoneVerifiedAt: null,
        isAdultConfirmed: false,
      })
      .returning();

    await db.insert(userProfiles).values({ userId: user.id });
  } else if (providerEmail && !user.emailVerifiedAt) {
    const [updatedUser] = await db
      .update(users)
      .set({ emailVerifiedAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, user.id))
      .returning();

    user = updatedUser ?? user;
  }

  await db
    .insert(socialAccounts)
    .values({
      userId: user.id,
      provider: input.provider,
      providerAccountId: input.providerAccountId,
      emailAtProvider: providerEmail,
    })
    .onConflictDoNothing({
      target: [socialAccounts.provider, socialAccounts.providerAccountId],
    });

  const [finalLinked] = await db
    .select({ user: users })
    .from(socialAccounts)
    .innerJoin(users, eq(users.id, socialAccounts.userId))
    .where(
      and(
        eq(socialAccounts.provider, input.provider),
        eq(socialAccounts.providerAccountId, input.providerAccountId),
      ),
    )
    .limit(1);

  return activateIfReady(finalLinked?.user ?? user);
}
