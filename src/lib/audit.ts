import "server-only";
import { db } from "@/db";
import { auditEvents, notifications } from "@/db/schema";
import type { InferInsertModel } from "drizzle-orm";

type NotificationType = InferInsertModel<typeof notifications>["type"];

export async function logAudit(params: {
  actorId?: string | null;
  actorType?: "USER" | "ADMIN" | "SYSTEM";
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  await db.insert(auditEvents).values({
    actorId: params.actorId ?? null,
    actorType: params.actorType ?? "USER",
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId ?? null,
    metadata: params.metadata ?? {},
  });
}

export async function notify(params: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  dedupeKey?: string;
}) {
  const values = {
    userId: params.userId,
    type: params.type,
    title: params.title,
    body: params.body,
    relatedEntityType: params.relatedEntityType,
    relatedEntityId: params.relatedEntityId,
    dedupeKey: params.dedupeKey,
  };
  if (params.dedupeKey) {
    await db.insert(notifications).values(values).onConflictDoNothing({ target: notifications.dedupeKey });
    return;
  }
  await db.insert(notifications).values(values);
}
