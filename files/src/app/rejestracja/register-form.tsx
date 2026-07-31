"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button, Card, Field, inputClass, Alert } from "@/components/ui";

type ActionResult = { ok: boolean; error?: string; devHint?: string };
type FormAction = (previousState: ActionResult, formData: FormData) => Promise<ActionResult>;

const initialState: ActionResult = { ok: false };

export function RegisterForm({ action }: { action: FormAction }) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <main className="mx-auto max-w-xl px-4 py-10 sm:px-6">
      <Card className="p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-ink">Załóż konto w LicytujDobro</h1>
        <p className="mt-2 text-sm text-slate-600">
          Konto jest bezpłatne. Przy rejestracji e-mailem wystarczy jednorazowo potwierdzić adres e-mail.
        </p>

        {state.error && (
          <div className="mt-4">
            <Alert tone="danger">{state.error}</Alert>
          </div>
        )}

        <form action={formAction} className="mt-6 grid gap-4">
          <Field label="Imię" htmlFor="firstName" required>
            <input id="firstName" name="firstName" required className={inputClass} autoComplete="given-name" />
          </Field>
          <Field label="Pseudonim publiczny" htmlFor="nickname" hint="Będzie widoczny dla innych użytkowników." required>
            <input id="nickname" name="nickname" required className={inputClass} autoComplete="nickname" />
          </Field>
          <Field label="Adres e-mail" htmlFor="email" required>
            <input id="email" name="email" type="email" required className={inputClass} autoComplete="email" />
          </Field>
          <Field label="Numer telefonu (opcjonalnie)" htmlFor="phone" hint="Możesz podać go później jako dane kontaktowe; kod SMS nie jest wymagany.">
            <input id="phone" name="phone" type="tel" className={inputClass} placeholder="+48 600 000 000" autoComplete="tel" />
          </Field>
          <Field label="Miasto" htmlFor="city" required>
            <input id="city" name="city" required className={inputClass} defaultValue={process.env.NEXT_PUBLIC_PILOT_CITY ?? "Biłgoraj i okolice"} autoComplete="address-level2" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Hasło" htmlFor="password" hint="Min. 8 znaków." required>
              <input id="password" name="password" type="password" required className={inputClass} autoComplete="new-password" />
            </Field>
            <Field label="Potwierdź hasło" htmlFor="confirmPassword" required>
              <input id="confirmPassword" name="confirmPassword" type="password" required className={inputClass} autoComplete="new-password" />
            </Field>
          </div>

          <fieldset className="mt-2 space-y-3 rounded-xl border border-slate-200 p-4">
            <legend className="px-1 text-sm font-bold text-ink">Oświadczenia</legend>
            <CheckboxLine id="isAdult" label="Oświadczam, że ukończyłem(-am) 18 lat." />
            <CheckboxLine id="acceptTerms" label="Akceptuję regulamin serwisu." link="/prawne/regulamin" />
            <CheckboxLine id="acceptPrivacy" label="Akceptuję politykę prywatności." link="/prawne/polityka-prywatnosci" />
            <CheckboxLine id="acceptBidding" label="Rozumiem i akceptuję zasady wiążącej licytacji." link="/prawne/zasady-licytacji" />
          </fieldset>

          <Button type="submit" size="lg" disabled={pending} className="mt-2">
            {pending ? "Tworzenie konta…" : "Załóż konto"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Masz już konto?{" "}
          <Link href="/logowanie" className="font-semibold text-brand-600 hover:underline">
            Zaloguj się
          </Link>
        </p>
      </Card>
    </main>
  );
}

function CheckboxLine({ id, label, link }: { id: string; label: string; link?: string }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3 text-sm text-slate-700">
      <input id={id} name={id} type="checkbox" required className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-500 focus:ring-brand-400" />
      <span>
        {label}{" "}
        {link && (
          <Link href={link} className="text-brand-600 underline" target="_blank">
            (przeczytaj)
          </Link>
        )}
      </span>
    </label>
  );
}
