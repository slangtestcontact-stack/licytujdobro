import { redirect } from "next/navigation";
import {
  confirmEmailAction,
  resendEmailVerificationAction,
  resendPhoneCodeAction,
  startContactVerificationAction,
  verifyPhoneAction,
} from "@/actions/auth";
import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { userVerifications } from "@/db/schema";
import { getCurrentUser, isFullyVerified } from "@/lib/auth";
import {
  getContactVerificationDescription,
  getContactVerificationMode,
  isTechnicalEmail,
  isTechnicalPhone,
} from "@/lib/contact-verification";
import { isEmailDevMode } from "@/lib/email";
import { isSmsDevMode } from "@/lib/sms";
import {
  ContactVerificationSetupForm,
  EmailVerificationForm,
  PhoneVerificationForm,
} from "@/components/verification-forms";
import { Alert, LinkButton } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function VerificationPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/logowanie");

  const query = await searchParams;
  const returnTo =
    query.returnTo?.startsWith("/") && !query.returnTo.startsWith("//")
      ? query.returnTo
      : "/dashboard";

  if (isFullyVerified(user)) redirect(returnTo);

  const [verification] = await db
    .select()
    .from(userVerifications)
    .where(eq(userVerifications.userId, user.id))
    .orderBy(desc(userVerifications.createdAt))
    .limit(1);

  const mode = getContactVerificationMode();
  const emailVerified = Boolean(user.emailVerifiedAt);
  const phoneVerified = Boolean(user.phoneVerifiedAt);
  const verificationComplete = isFullyVerified(user);
  const hasRealEmail = !isTechnicalEmail(user.email);
  const hasRealPhone = !isTechnicalPhone(user.phone);

  const emailRelevant =
    mode === "both" || mode === "email" || (mode === "either" && hasRealEmail);
  const phoneRelevant =
    mode === "both" || mode === "phone" || (mode === "either" && hasRealPhone);

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-ink">Weryfikacja przed licytacją</h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Konto utworzone e-mailem i hasłem wymaga jednorazowego potwierdzenia
        adresu e-mail. Konta Facebook, Google i Apple nie wymagają dodatkowego
        kodu. Wymagany jest {getContactVerificationDescription(mode)}.
      </p>

      {isEmailDevMode() && emailRelevant && !emailVerified && (
        <div className="mt-4">
          <Alert tone="warning" title="Tryb deweloperski e-mail">
            Dostawca e-mail nie jest skonfigurowany. Kod jest pokazany poniżej i
            wypisywany w terminalu aplikacji.
          </Alert>
        </div>
      )}

      {!verificationComplete &&
        ((!hasRealEmail && emailRelevant) || (!hasRealPhone && phoneRelevant) || !user.acceptedTermsAt) && (
        <div className="mt-6">
          <ContactVerificationSetupForm
            mode={mode}
            currentEmail={hasRealEmail ? user.email : undefined}
            currentPhone={hasRealPhone ? user.phone : undefined}
            emailVerified={emailVerified}
            phoneVerified={phoneVerified}
            termsAccepted={Boolean(user.acceptedTermsAt)}
            returnTo={returnTo}
            startAction={startContactVerificationAction}
          />
        </div>
      )}

      <div className="mt-4 grid gap-4">
        {hasRealEmail && emailRelevant && !emailVerified && (
          <EmailVerificationForm
            devCode={
              isEmailDevMode() ? verification?.emailToken ?? undefined : undefined
            }
            verified={emailVerified}
            email={user.email}
            returnTo={returnTo}
            confirmAction={confirmEmailAction}
            resendAction={resendEmailVerificationAction}
          />
        )}

        {hasRealPhone && phoneRelevant && !phoneVerified && (
          <PhoneVerificationForm
            devCode={
              isSmsDevMode() ? verification?.phoneCode ?? undefined : undefined
            }
            verified={phoneVerified}
            phone={user.phone}
            returnTo={returnTo}
            verifyAction={verifyPhoneAction}
            resendAction={resendPhoneCodeAction}
          />
        )}
      </div>

      {verificationComplete && (
        <div className="mt-6">
          <Alert tone="success" title="Weryfikacja zakończona">
            Możesz teraz składać wiążące oferty i wystawiać przedmioty.
          </Alert>
          <div className="mt-4 flex flex-wrap gap-3">
            <LinkButton href={returnTo}>
              {returnTo === "/dashboard"
                ? "Przejdź do konta"
                : "Wróć do rozpoczętej czynności"}
            </LinkButton>
            <LinkButton href="/aukcje" variant="outline">
              Zobacz aukcje
            </LinkButton>
          </div>
        </div>
      )}
    </main>
  );
}
