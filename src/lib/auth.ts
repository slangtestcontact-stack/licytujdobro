import "server-only";

import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import { and, eq, gt, sql } from "drizzle-orm";

import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { hasRequiredContactVerification } from "@/lib/contact-verification";

const SESSION_COOKIE =
  process.env.NODE_ENV === "production" ? "__Host-ld_session" : "ld_session";
const SESSION_DAYS = 30;
const MAX_ACTIVE_SESSIONS = 5;

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const id = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1_000);

  await db.transaction(async (tx) => {
    await tx.delete(sessions).where(sql`${sessions.expiresAt} <= now()`);
    await tx.insert(sessions).values({ id, userId, expiresAt });
    await tx.execute(sql`
      delete from sessions
      where user_id = ${userId}
        and id not in (
          select id
          from sessions
          where user_id = ${userId}
          order by created_at desc
          limit ${MAX_ACTIVE_SESSIONS}
        )
    `);
  });

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });

  return { id, userId, expiresAt };
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.delete(sessions).where(eq(sessions.id, hashSessionToken(token)));
  }
  store.delete(SESSION_COOKIE);
}

export async function destroyAllSessions(userId: string) {
  await db.delete(sessions).where(eq(sessions.userId, userId));
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

async function loadCurrentUser() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const [row] = await db
    .select({ user: users, session: sessions })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(
      and(
        eq(sessions.id, hashSessionToken(token)),
        gt(sessions.expiresAt, new Date()),
      ),
    )
    .limit(1);

  return row?.user ?? null;
}

export const getCurrentUser = cache(loadCurrentUser);

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") throw new Error("FORBIDDEN");
  return user;
}

export function isFullyVerified(user: {
  emailVerifiedAt: Date | null;
  phoneVerifiedAt: Date | null;
  authProvider?: string | null;
}) {
  return hasRequiredContactVerification(user);
}
