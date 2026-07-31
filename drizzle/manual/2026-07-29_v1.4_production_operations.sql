BEGIN;

CREATE TABLE IF NOT EXISTS "rate_limit_buckets" (
  "key" varchar(220) PRIMARY KEY NOT NULL,
  "count" integer DEFAULT 0 NOT NULL,
  "reset_at" timestamp with time zone NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "rate_limit_buckets_reset_idx"
  ON "rate_limit_buckets" USING btree ("reset_at");

CREATE TABLE IF NOT EXISTS "operational_errors" (
  "id" text PRIMARY KEY NOT NULL,
  "source" varchar(120) NOT NULL,
  "message" text NOT NULL,
  "stack" text,
  "entity_type" varchar(60),
  "entity_id" text,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "occurrence_count" integer DEFAULT 1 NOT NULL,
  "last_occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
  "resolved_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone
);

CREATE INDEX IF NOT EXISTS "operational_errors_unresolved_idx"
  ON "operational_errors" USING btree ("resolved_at", "last_occurred_at");

CREATE INDEX IF NOT EXISTS "operational_errors_source_idx"
  ON "operational_errors" USING btree ("source", "last_occurred_at");

COMMIT;
