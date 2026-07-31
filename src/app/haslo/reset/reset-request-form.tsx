"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Alert, Button, Card, Field, inputClass } from "@/components/ui";

type ActionResult = { ok: boolean; error?: string; devHint?: string };
type FormAction = (previousState: ActionResult, formData: FormData) => Promise<ActionResult>;
const initial: ActionResult = { ok: false };

export function ResetRequestForm({ action }: { action: FormAction }) {
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <Card className="p-7">
        <h1 className="text-2xl font-bold">Odzyskaj hasło</h1>
        <p className="mt-2 text-sm text-slate-600">Podaj adres e-mail przypisany do konta.</p>
        {state.ok ? (
          <div className="mt-4" role="status">
            <Alert tone="success">
              Jeżeli konto istnieje, link resetujący został przygotowany.
              {state.devHint ? (
                <> Tryb lokalny: <Link className="font-bold underline" href={`/haslo/nowe?token=${state.devHint}`}>otwórz link</Link>.</>
              ) : null}
            </Alert>
          </div>
        ) : null}
        {state.error ? (
          <div className="mt-4" role="alert"><Alert tone="danger">{state.error}</Alert></div>
        ) : null}
        <form action={formAction} className="mt-5 space-y-4">
          <Field label="E-mail" htmlFor="email">
            <input id="email" name="email" type="email" className={inputClass} required />
          </Field>
          <Button type="submit" disabled={pending}>{pending ? "Przygotowywanie…" : "Wyślij link"}</Button>
        </form>
      </Card>
    </main>
  );
}
