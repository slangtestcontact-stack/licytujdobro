import "server-only";

import { sql } from "drizzle-orm";
import { db } from "@/db";
import { rateLimitBuckets } from "@/db/schema";

export type RateLimitResult = {
  ok: boolean;
  retryAfterSeconds: number;
  remaining: number;
};

/**
 * Trwały, atomowy limiter oparty na PostgreSQL.
 * Działa wspólnie dla wielu instancji serwera i nie resetuje się po deployu.
 */
export async function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  if (!key || key.length > 220) throw new Error("Nieprawidłowy klucz limitu.");
  if (!Number.isInteger(limit) || limit < 1) throw new Error("Nieprawidłowy limit.");
  if (!Number.isFinite(windowMs) || windowMs < 1_000) throw new Error("Nieprawidłowe okno limitu.");

  const now = new Date();
  const newResetAt = new Date(now.getTime() + windowMs);

  const [bucket] = await db
    .insert(rateLimitBuckets)
    .values({ key, count: 1, resetAt: newResetAt, updatedAt: now })
    .onConflictDoUpdate({
      target: rateLimitBuckets.key,
      set: {
        count: sql<number>`case when ${rateLimitBuckets.resetAt} <= now() then 1 else ${rateLimitBuckets.count} + 1 end`,
        resetAt: sql<Date>`case when ${rateLimitBuckets.resetAt} <= now() then ${newResetAt} else ${rateLimitBuckets.resetAt} end`,
        updatedAt: now,
      },
    })
    .returning({ count: rateLimitBuckets.count, resetAt: rateLimitBuckets.resetAt });

  if (!bucket) throw new Error("Nie udało się sprawdzić limitu żądań.");

  const retryAfterSeconds = Math.max(
    0,
    Math.ceil((bucket.resetAt.getTime() - Date.now()) / 1_000),
  );

  return {
    ok: bucket.count <= limit,
    retryAfterSeconds: bucket.count <= limit ? 0 : retryAfterSeconds,
    remaining: Math.max(0, limit - bucket.count),
  };
}
