"use client";

import Link from "next/link";
import { useActionState, type ReactNode } from "react";

import { AppleMark, FacebookMark, GoogleMark, MailMark } from "@/components/auth-provider-icons";
import { HeartIcon, ShieldIcon } from "@/components/icons";
import { Alert, Button, Field, inputClass } from "@/components/ui";

type ActionResult = { ok: boolean; error?: string; devHint?: string };
type FormAction = (
  previousState: ActionResult,
  formData: FormData,
) => Promise<ActionResult>;

const initialState: ActionResult = { ok: false };

const errors: Record<string, string> = {
  google_not_configured:
    "Logowanie Google nie jest jeszcze skonfigurowane. Skorzystaj z kodu e-mail.",
  facebook_not_configured:
    "Logowanie Facebook nie jest jeszcze skonfigurowane. Skorzystaj z kodu e-mail.",
  apple_not_configured:
    "Logowanie Apple nie jest jeszcze skonfigurowane. Skorzystaj z kodu e-mail.",
  apple_https_required:
    "Apple wymaga publicznego adresu HTTPS. Lokalnie skorzystaj z Google, Facebooka lub kodu e-mail.",
  oauth_state: "Sesja logowania wygasła. Spróbuj ponownie.",
  google_failed: "Nie udało się zalogować przez Google.",
  facebook_failed:
    "Nie udało się dokończyć logowania przez Facebook. Spróbuj ponownie.",
  facebook_denied: "Logowanie przez Facebook zostało anulowane.",
  facebook_email_missing:
    "Facebook potwierdził konto, ale nie przekazał adresu e-mail.",
  apple_failed:
    "Nie udało się zalogować przez Apple. Spróbuj ponownie albo użyj kodu e-mail.",
};

export function LoginForm({
  action,
  returnTo,
  oauthError,
}: {
  action: FormAction;
  returnTo: string;
  oauthError?: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const socialQuery = `?returnTo=${encodeURIComponent(returnTo)}`;
  const oauthErrorMessage = oauthError ? errors[oauthError] : undefined;

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-8 sm:px-6 sm:py-12">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_55px_rgba(16,40,32,.09)]">
        <div className="border-b border-slate-100 bg-brand-50/55 px-6 py-6 text-center sm:px-8">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-brand-800 text-white">
            <HeartIcon size={21} />
          </span>
          <h1 className="mt-4 text-2xl font-bold tracking-[-.03em] text-ink sm:text-3xl">
            Zaloguj się, aby licytować
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
            Oglądanie aukcji, udostępnianie i wpłata dla Adasia nie
            wymagają konta. Logowanie zabezpiecza wyłącznie wiążące
            oferty.
          </p>
        </div>

        <div className="p-5 sm:p-8">
          {oauthErrorMessage ? (
            <div className="mb-5" role="alert">
              <Alert tone="warning">{oauthErrorMessage}</Alert>
            </div>
          ) : null}
          {state.error ? (
            <div className="mb-5" role="alert">
              <Alert tone="danger">{state.error}</Alert>
            </div>
          ) : null}

          <div className="grid gap-3">
            <ProviderLink href={`/api/auth/facebook/start${socialQuery}`} icon={<FacebookMark />}>
              Kontynuuj przez Facebooka
            </ProviderLink>
            <ProviderLink href={`/api/auth/apple/start${socialQuery}`} icon={<AppleMark />}>
              Kontynuuj przez konto Apple
            </ProviderLink>
            <ProviderLink href={`/api/auth/google/start${socialQuery}`} icon={<GoogleMark />}>
              Kontynuuj przez konto Google
            </ProviderLink>
            <ProviderLink href={`/logowanie/kod${socialQuery}`} icon={<MailMark className="text-brand-800" />}>
              Wyślij kod na e-mail
            </ProviderLink>
          </div>

          <div className="my-7 flex items-center gap-3 text-xs font-semibold uppercase tracking-[.12em] text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            <span>albo użyj hasła</span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <form action={formAction} className="grid gap-4">
            <input type="hidden" name="returnTo" value={returnTo} />
            <Field label="Adres e-mail" htmlFor="email" required>
              <input id="email" name="email" type="email" required className={inputClass} autoComplete="email" />
            </Field>
            <Field label="Hasło" htmlFor="password" required>
              <input id="password" name="password" type="password" required className={inputClass} autoComplete="current-password" />
            </Field>
            <Button type="submit" size="lg" className="w-full" disabled={pending}>
              {pending ? "Logowanie…" : "Zaloguj się"}
            </Button>
            <Link href="/haslo/reset" className="text-center text-sm font-semibold text-brand-700 hover:underline">
              Nie pamiętam hasła
            </Link>
          </form>

          <div className="mt-7 flex gap-3 rounded-xl border border-brand-100 bg-brand-50/60 p-4 text-xs leading-5 text-slate-600">
            <ShieldIcon size={18} className="mt-0.5 shrink-0 text-brand-700" />
            <p>Publicznie pokazujemy tylko pseudonim. Nie uzyskujemy dostępu do haseł, postów, grup ani listy znajomych.</p>
          </div>
          <p className="mt-5 text-center text-sm text-slate-600">
            Nie masz konta?{" "}
            <Link href={`/rejestracja?returnTo=${encodeURIComponent(returnTo)}`} className="font-semibold text-brand-700 hover:underline">
              Załóż je klasycznie
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

function ProviderLink({ href, icon, children }: { href: string; icon: ReactNode; children: ReactNode }) {
  return (
    <a href={href} className="group relative grid min-h-[62px] grid-cols-[42px_1fr_42px] items-center rounded-lg border-2 border-brand-900 bg-white px-4 text-base font-bold text-ink transition hover:-translate-y-0.5 hover:bg-brand-50/50 hover:shadow-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-200">
      <span className="flex items-center justify-center">{icon}</span>
      <span className="text-center">{children}</span>
      <span aria-hidden="true" className="text-right text-brand-700 opacity-0 transition group-hover:opacity-100">→</span>
    </a>
  );
}
