"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { Alert, Button, Card, Field, inputClass } from "@/components/ui";

type ActionResult = { ok: boolean; error?: string; devHint?: string };
type FormAction = (previousState: ActionResult, formData: FormData) => Promise<ActionResult>;
const initial: ActionResult = { ok: false };

export function EmailCodeForm({
  requestAction,
  verifyAction,
  returnTo,
}: {
  requestAction: FormAction;
  verifyAction: FormAction;
  returnTo: string;
}) {
  const [email, setEmail] = useState("");
  const [requestState, requestFormAction, requesting] = useActionState(requestAction, initial);
  const [verifyState, verifyFormAction, verifying] = useActionState(verifyAction, initial);

  return (
    <main className="mx-auto max-w-md px-4 py-10 sm:px-6">
      <Card className="p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-ink">Logowanie kodem e-mail</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">Bez tworzenia i zapamiętywania hasła. Kod jest jednorazowy i działa 10 minut.</p>
        <form action={requestFormAction} className="mt-6 grid gap-4">
          <input type="hidden" name="returnTo" value={returnTo} />
          <Field label="Adres e-mail" htmlFor="code-email" required>
            <input id="code-email" name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required className={inputClass} autoComplete="email" />
          </Field>
          <Button type="submit" disabled={requesting}>{requesting ? "Wysyłanie…" : "Wyślij kod"}</Button>
        </form>
        {requestState.error ? <div className="mt-4" role="alert"><Alert tone="danger">{requestState.error}</Alert></div> : null}
        {requestState.ok ? <div className="mt-4" role="status"><Alert tone="success">Kod został wysłany.{requestState.devHint ? ` Tryb lokalny - kod: ${requestState.devHint}` : ""}</Alert></div> : null}
        <form action={verifyFormAction} className="mt-6 grid gap-4 border-t border-slate-200 pt-6">
          <input type="hidden" name="email" value={email} />
          <Field label="Kod z wiadomości" htmlFor="login-code" required>
            <input id="login-code" name="code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required className={`${inputClass} text-center text-xl tracking-[.35em]`} autoComplete="one-time-code" />
          </Field>
          <Button type="submit" disabled={verifying || !email}>{verifying ? "Sprawdzanie…" : "Zaloguj się kodem"}</Button>
        </form>
        {verifyState.error ? <div className="mt-4" role="alert"><Alert tone="danger">{verifyState.error}</Alert></div> : null}
        <Link href={`/logowanie?returnTo=${encodeURIComponent(returnTo)}`} className="mt-6 inline-block text-sm font-semibold text-brand-700">Wróć do innych metod</Link>
      </Card>
    </main>
  );
}
