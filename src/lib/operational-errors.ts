import "server-only";

import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { operationalErrors } from "@/db/schema";

export type OperationalErrorContext = {
  source: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
};

function normalizeError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

/** Zapisuje błąd w bazie i opcjonalnie wysyła go do zewnętrznego webhooka. */
export async function reportOperationalError(
  error: unknown,
  context: OperationalErrorContext,
): Promise<void> {
  const normalized = normalizeError(error);
  const now = new Date();

  try {
    const [existing] = await db
      .select()
      .from(operationalErrors)
      .where(
        and(
          eq(operationalErrors.source, context.source),
          eq(operationalErrors.message, normalized.message.slice(0, 5_000)),
          isNull(operationalErrors.resolvedAt),
        ),
      )
      .orderBy(desc(operationalErrors.lastOccurredAt))
      .limit(1);

    if (existing) {
      await db
        .update(operationalErrors)
        .set({
          occurrenceCount: existing.occurrenceCount + 1,
          lastOccurredAt: now,
          stack: normalized.stack?.slice(0, 20_000),
          metadata: { ...existing.metadata, ...context.metadata },
          updatedAt: now,
        })
        .where(eq(operationalErrors.id, existing.id));
    } else {
      await db.insert(operationalErrors).values({
        source: context.source,
        message: normalized.message.slice(0, 5_000),
        stack: normalized.stack?.slice(0, 20_000),
        entityType: context.entityType,
        entityId: context.entityId,
        metadata: context.metadata ?? {},
        lastOccurredAt: now,
      });
    }
  } catch (storageError) {
    console.error("Nie udało się zapisać błędu operacyjnego:", storageError);
  }

  const webhookUrl = process.env.ERROR_MONITOR_WEBHOOK_URL?.trim();
  if (!webhookUrl) return;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4_000);
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service: "LicytujDobro",
        environment: process.env.APP_ENV ?? process.env.NODE_ENV,
        source: context.source,
        message: normalized.message,
        entityType: context.entityType,
        entityId: context.entityId,
        metadata: context.metadata ?? {},
        occurredAt: now.toISOString(),
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
  } catch (webhookError) {
    console.error("Nie udało się wysłać błędu do monitoringu:", webhookError);
  }
}

export async function safeSideEffect(
  effect: () => Promise<unknown>,
  context: OperationalErrorContext,
): Promise<void> {
  try {
    await effect();
  } catch (error) {
    console.error(`[${context.source}] operacja poboczna nie powiodła się:`, error);
    await reportOperationalError(error, context);
  }
}
