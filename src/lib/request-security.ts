import "server-only";

import { headers } from "next/headers";

function normalizeOrigin(value: string) {
  return value.replace(/\/$/, "").toLowerCase();
}

export async function assertTrustedMutationOrigin(request?: Request, options: { allowMissing?: boolean } = {}) {
  const appOrigin = normalizeOrigin(
    process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  );

  const sourceHeaders = request?.headers ?? (await headers());
  const origin = sourceHeaders.get("origin");
  const referer = sourceHeaders.get("referer");

  // Narzędzia serwerowe i cron mogą nie wysyłać Origin. Ich autoryzacja
  // odbywa się osobnym sekretem, więc brak nagłówka nie jest automatycznie błędem.
  if (!origin && !referer) {
    if (options.allowMissing === false) throw new Error("MISSING_ORIGIN");
    return;
  }

  const candidate = origin || (referer ? new URL(referer).origin : "");
  if (!candidate || normalizeOrigin(candidate) !== appOrigin) {
    throw new Error("UNTRUSTED_ORIGIN");
  }
}
