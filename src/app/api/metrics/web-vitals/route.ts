import { NextRequest } from "next/server";
import { z } from "zod";

import { reportOperationalError } from "@/lib/operational-errors";
import { consumeRateLimit } from "@/lib/rate-limit";
import { assertTrustedMutationOrigin } from "@/lib/request-security";

const metricSchema = z.object({
  id: z.string().max(200),
  name: z.enum(["CLS", "FCP", "INP", "LCP", "TTFB"]),
  value: z.number().finite().nonnegative(),
  rating: z.enum(["good", "needs-improvement", "poor"]).optional(),
  navigationType: z.string().max(80).optional(),
  path: z.string().startsWith("/").max(500),
});

export async function POST(request: NextRequest) {
  try {
    await assertTrustedMutationOrigin(request, { allowMissing: false });
  } catch {
    return Response.json({ ok: false }, { status: 403 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rate = await consumeRateLimit(`web-vitals:${ip}`, 120, 60 * 60 * 1_000);
  if (!rate.ok) return Response.json({ ok: false }, { status: 429 });

  const parsed = metricSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false }, { status: 400 });

  if (parsed.data.rating === "poor") {
    await reportOperationalError(
      new Error(`Poor ${parsed.data.name}: ${parsed.data.value}`),
      {
        source: `web-vitals.${parsed.data.name.toLowerCase()}`,
        metadata: {
          path: parsed.data.path,
          value: parsed.data.value,
          rating: parsed.data.rating,
          navigationType: parsed.data.navigationType,
        },
      },
    );
  }

  return Response.json({ ok: true }, { status: 202 });
}
