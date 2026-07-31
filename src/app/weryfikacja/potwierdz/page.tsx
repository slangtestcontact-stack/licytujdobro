import { eq } from "drizzle-orm";

import { db } from "@/db";
import { users, userVerifications } from "@/db/schema";
import { shouldActivateAccount } from "@/lib/auth-policy";
import { hasRequiredContactVerification } from "@/lib/contact-verification";
import { safeReturnTo } from "@/lib/quick-auth";
import { Alert, Card, LinkButton } from "@/components/ui";

export default async function ConfirmEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; returnTo?: string }>;
}) {
  const query = await searchParams;
  const token = query.token;
  const returnTo = safeReturnTo(query.returnTo);

  if (!token || token.length < 20) {
    return (
      <Result
        ok={false}
        message="Ten link nie jest obsługiwany. Wpisz sześciocyfrowy kod na stronie weryfikacji."
        href="/weryfikacja"
      />
    );
  }

  const [verification] = await db
    .select()
    .from(userVerifications)
    .where(eq(userVerifications.emailToken, token))
    .limit(1);

  if (
    !verification ||
    !verification.emailTokenExpiresAt ||
    verification.emailTokenExpiresAt < new Date()
  ) {
    return (
      <Result
        ok={false}
        message="Kod lub link jest nieprawidłowy albo wygasł."
        href="/weryfikacja"
      />
    );
  }

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ emailVerifiedAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, verification.userId));
    await tx
      .update(userVerifications)
      .set({
        emailToken: null,
        emailTokenExpiresAt: null,
        updatedAt: new Date(),
      })
      .where(eq(userVerifications.id, verification.id));
  });

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, verification.userId))
    .limit(1);

  if (user && shouldActivateAccount(user)) {
    await db
      .update(users)
      .set({ status: "aktywne", updatedAt: new Date() })
      .where(eq(users.id, user.id));
  }

  const complete = Boolean(user && hasRequiredContactVerification(user));

  return (
    <Result
      ok
      message={
        complete
          ? "Adres e-mail został potwierdzony. Weryfikacja jest zakończona."
          : "Adres e-mail został potwierdzony. Potwierdź jeszcze wymagany drugi kanał."
      }
      href={complete ? returnTo : `/weryfikacja?returnTo=${encodeURIComponent(returnTo)}`}
    />
  );
}

function Result({
  ok,
  message,
  href,
}: {
  ok: boolean;
  message: string;
  href: string;
}) {
  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <Card className="p-8">
        <Alert tone={ok ? "success" : "danger"}>{message}</Alert>
        <LinkButton href={href} className="mt-5">
          {ok ? "Kontynuuj" : "Wróć"}
        </LinkButton>
      </Card>
    </main>
  );
}
