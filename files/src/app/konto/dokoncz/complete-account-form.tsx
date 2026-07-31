"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Alert, Button, Card, Field, inputClass } from "@/components/ui";

type ActionResult = { ok: boolean; error?: string; devHint?: string };
type FormAction = (previousState: ActionResult, formData: FormData) => Promise<ActionResult>;

const initial: ActionResult = { ok: false };

export function CompleteAccountForm({ action: serverAction, returnTo }: { action: FormAction; returnTo: string }) {
  const [state, action, pending] = useActionState(serverAction, initial);

  return (
    <main className="mx-auto max-w-xl px-4 py-10 sm:px-6">
      <Card className="p-6 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[.12em] text-brand-700">Szybkie konto</p>
        <h1 className="mt-2 text-2xl font-bold text-ink">Dokończ profil</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Tożsamość logowania została już potwierdzona przez Facebook, Google, Apple albo jednorazowy kod e-mail. Telefon i dodatkowy kod nie są wymagane. Ustaw publiczny pseudonim i zaakceptuj zasady.
        </p>
        {state.error && <div className="mt-4"><Alert tone="danger">{state.error}</Alert></div>}
        <form action={action} className="mt-6 grid gap-4">
          <input type="hidden" name="returnTo" value={returnTo} />
          <Field label="Pseudonim - opcjonalnie" htmlFor="nickname" hint="Zostaw puste, aby zachować pseudonim utworzony automatycznie.">
            <input id="nickname" name="nickname" minLength={3} maxLength={30} className={inputClass} autoComplete="nickname" placeholder="Np. TomekR" />
          </Field>
          <label className="flex gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-6">
            <input type="checkbox" name="acceptRules" required className="mt-1 h-4 w-4 accent-brand-700" />
            <span>
              Potwierdzam, że mam co najmniej 18 lat, akceptuję <Link href="/prawne/regulamin" target="_blank" className="font-semibold text-brand-700 underline">regulamin</Link> i zapoznałem(-am) się z <Link href="/prawne/polityka-prywatnosci" target="_blank" className="font-semibold text-brand-700 underline">polityką prywatności</Link>.
            </span>
          </label>
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? "Zapisywanie…" : "Zapisz i przejdź dalej"}
          </Button>
        </form>
      </Card>
    </main>
  );
}
