import "server-only";

import type { Pool } from "pg";

type InstrumentedPool = Pool & { __licytujDobroQueryMonitor?: boolean };

function getQueryText(firstArgument: unknown): string {
  if (typeof firstArgument === "string") return firstArgument;
  if (firstArgument && typeof firstArgument === "object" && "text" in firstArgument) {
    const value = (firstArgument as { text?: unknown }).text;
    if (typeof value === "string") return value;
  }
  return "unknown-query";
}

function sanitizedQuery(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 500);
}

async function notifySlowQuery(durationMs: number, query: string) {
  const thresholdMs = Number(process.env.SLOW_QUERY_MS || 750);
  if (!Number.isFinite(thresholdMs) || durationMs < thresholdMs) return;

  const metadata = {
    source: "database.slow-query",
    durationMs: Math.round(durationMs),
    query: sanitizedQuery(query),
    environment: process.env.APP_ENV || process.env.NODE_ENV,
    occurredAt: new Date().toISOString(),
  };

  console.warn("[Slow SQL query]", metadata);

  const webhookUrl = (process.env.SLOW_QUERY_MONITOR_WEBHOOK_URL || process.env.ERROR_MONITOR_WEBHOOK_URL)?.trim();
  if (!webhookUrl) return;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4_000);
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ service: "LicytujDobro", ...metadata }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
  } catch (error) {
    console.error("Nie udało się wysłać informacji o wolnym zapytaniu SQL:", error);
  }
}

/** Mierzy zapytania wykonywane przez Drizzle/pg bez zapisywania ich parametrów. */
export function instrumentPostgresPool(pool: Pool): Pool {
  const instrumented = pool as InstrumentedPool;
  if (instrumented.__licytujDobroQueryMonitor) return pool;
  instrumented.__licytujDobroQueryMonitor = true;

  const originalQuery = pool.query.bind(pool);
  pool.query = ((...args: unknown[]) => {
    const startedAt = performance.now();
    const queryText = getQueryText(args[0]);
    const result = (originalQuery as (...queryArgs: unknown[]) => unknown)(...args);

    if (result && typeof result === "object" && "then" in result) {
      return (result as Promise<unknown>).finally(() => {
        void notifySlowQuery(performance.now() - startedAt, queryText);
      });
    }

    return result;
  }) as typeof pool.query;

  return pool;
}
