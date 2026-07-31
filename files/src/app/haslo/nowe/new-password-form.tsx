"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Alert, Button, Card, Field, inputClass } from "@/components/ui";

type ActionResult = { ok: boolean; error?: string; devHint?: string };
type FormAction = (previousState: ActionResult, formData: FormData) => Promise<ActionResult>;
const initial: ActionResult = { ok: false };

export function NewPasswordForm({ action, token }: { action: FormAction; token: string }) {
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <Card className="p-7">
        <h1 className="text-2xl font-bold">Ustaw nowe hasło</h1>
        {state.ok ? (
          <Alert tone="success">Hasło zmienione. <Link href="/logowanie" className="font-bold underline">Zaloguj się</Link>.</Alert>
        ) : (
          <form action={formAction} className="mt-5 space-y-4">
            <input type="hidden" name="token" value={token} />
            {state.error ? <div role="alert"><Alert tone="danger">{state.error}</Alert></div> : null}
            <Field label="Nowe hasło" htmlFor="password">
              <input id="password" name="password" type="password" className={inputClass} minLength={8} required />
            </Field>
            <Field label="Powtórz hasło" htmlFor="confirmPassword">
              <input id="confirmPassword" name="confirmPassword" type="password" className={inputClass} minLength={8} required />
            </Field>
            <Button type="submit" disabled={pending || !token}>{pending ? "Zapisywanie…" : "Zmień hasło"}</Button>
          </form>
        )}
      </Card>
    </main>
  );
}
