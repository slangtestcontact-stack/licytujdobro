import "server-only";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { hasRequiredContactVerification } from "@/lib/contact-verification";

const SESSION_COOKIE = process.env.NODE_ENV === "production" ? "__Host-ld_session" : "ld_session";
const SESSION_DAYS = 30;

export async function hashPassword(password: string) { return bcrypt.hash(password, 12); }
export async function verifyPassword(password: string, hash: string) { return bcrypt.compare(password, hash); }
function hashSessionToken(token: string) { return createHash("sha256").update(token).digest("hex"); }

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const id = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(sessions).values({ id, userId, expiresAt });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", expires: expiresAt });
  return { id, userId, expiresAt };
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.id, hashSessionToken(token)));
  store.delete(SESSION_COOKIE);
}

export async function getCurrentUser() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const [row] = await db.select({ user: users, session: sessions }).from(sessions).innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.id, hashSessionToken(token)), gt(sessions.expiresAt, new Date()))).limit(1);
  return row?.user ?? null;
}

export async function requireUser() { const user = await getCurrentUser(); if (!user) throw new Error("UNAUTHORIZED"); return user; }
export async function requireAdmin() { const user = await getCurrentUser(); if (!user || user.role !== "admin") throw new Error("FORBIDDEN"); return user; }
export function isFullyVerified(user: { emailVerifiedAt: Date | null; phoneVerifiedAt: Date | null }) {
  return hasRequiredContactVerification(user);
}
