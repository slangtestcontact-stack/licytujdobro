"use client";

import { useActionState } from "react";

import { Alert, Button, Field, inputClass } from "@/components/ui";

export type LegalFormResult = {
  ok: boolean;
  error?: string;
  reference?: string;
};

type LegalFormAction = (
  previousState: LegalFormResult,
  formData: FormData,
) => Promise<LegalFormResult>;

const initialState: LegalFormResult = { ok: false };

export function IllegalContentNoticeForm({ action: serverAction }: { action: LegalFormAction }) {
  const [state, action, pending] = useActionState(serverAction, initialState);

  if (state.ok) {
    return (
      <Alert tone="success" title="Zgłoszenie zostało przyjęte">
        Numer zgłoszenia: <strong>{state.reference}</strong>. Zachowaj go do dalszego kontaktu.
      </Alert>
    );
  }

  return (
    <form action={action} className="grid gap-4">
      <Field label="Imię i nazwisko lub nazwa podmiotu" htmlFor="notice-name" required>
        <input id="notice-name" name="name" required maxLength={160} className={inputClass} />
      </Field>
      <Field label="E-mail do kontaktu" htmlFor="notice-email" required>
        <input id="notice-email" name="email" type="email" required maxLength={255} className={inputClass} />
      </Field>
      <Field label="Dokładny adres URL zgłaszanej treści" htmlFor="notice-url" required>
        <input id="notice-url" name="contentUrl" type="url" required maxLength={2000} placeholder="https://licytujdobro.pl/aukcje/..." className={inputClass} />
      </Field>
      <Field label="Rodzaj problemu" htmlFor="notice-category" required>
        <select id="notice-category" name="category" required defaultValue="" className={inputClass}>
          <option value="" disabled>Wybierz kategorię</option>
          <option value="OSZUSTWO">Oszustwo lub próba wyłudzenia</option>
          <option value="NARUSZENIE_PRAW">Naruszenie praw autorskich, znaków lub innych praw</option>
          <option value="NIEDOZWOLONY_PRZEDMIOT">Przedmiot zakazany albo nielegalny</option>
          <option value="DANE_OSOBOWE">Bezprawne ujawnienie danych osobowych</option>
          <option value="GROZBY_NIENAWISC">Groźby, przemoc lub nawoływanie do nienawiści</option>
          <option value="INNE_NIELEGALNE">Inna potencjalnie nielegalna treść</option>
        </select>
      </Field>
      <Field label="Podstawa prawna, jeżeli ją znasz" htmlFor="notice-law">
        <input id="notice-law" name="legalBasis" maxLength={500} placeholder="Pole opcjonalne" className={inputClass} />
      </Field>
      <Field label="Dlaczego treść może być nielegalna?" htmlFor="notice-explanation" required>
        <textarea id="notice-explanation" name="explanation" required minLength={30} maxLength={5000} rows={7} className={inputClass} />
      </Field>
      <label className="flex gap-3 text-sm leading-6 text-slate-700">
        <input name="goodFaith" type="checkbox" required className="mt-1 h-4 w-4 accent-brand-700" />
        <span>Oświadczam, że działam w dobrej wierze i przekazane informacje są według mojej wiedzy kompletne i prawidłowe.</span>
      </label>
      {state.error && <Alert tone="danger">{state.error}</Alert>}
      <Button type="submit" disabled={pending}>{pending ? "Wysyłanie…" : "Wyślij zgłoszenie"}</Button>
    </form>
  );
}

export function ModerationAppealForm({ action: serverAction }: { action: LegalFormAction }) {
  const [state, action, pending] = useActionState(serverAction, initialState);

  if (state.ok) {
    return (
      <Alert tone="success" title="Odwołanie zostało przyjęte">
        Numer odwołania: <strong>{state.reference}</strong>. Zachowaj go do dalszego kontaktu.
      </Alert>
    );
  }

  return (
    <form action={action} className="grid gap-4">
      <Field label="Imię, nazwisko lub pseudonim" htmlFor="appeal-name" required>
        <input id="appeal-name" name="name" required maxLength={160} className={inputClass} />
      </Field>
      <Field label="E-mail powiązany ze sprawą" htmlFor="appeal-email" required>
        <input id="appeal-email" name="email" type="email" required maxLength={255} className={inputClass} />
      </Field>
      <Field label="Identyfikator lub opis decyzji" htmlFor="appeal-reference" required>
        <input id="appeal-reference" name="decisionReference" required maxLength={300} placeholder="Np. ID aukcji, data i rodzaj decyzji" className={inputClass} />
      </Field>
      <Field label="Dlaczego decyzja powinna zostać zmieniona?" htmlFor="appeal-explanation" required>
        <textarea id="appeal-explanation" name="explanation" required minLength={20} maxLength={5000} rows={7} className={inputClass} />
      </Field>
      <Field label="Oczekiwany rezultat" htmlFor="appeal-outcome" required>
        <textarea id="appeal-outcome" name="requestedOutcome" required minLength={3} maxLength={1000} rows={3} className={inputClass} />
      </Field>
      {state.error && <Alert tone="danger">{state.error}</Alert>}
      <Button type="submit" disabled={pending}>{pending ? "Wysyłanie…" : "Wyślij odwołanie"}</Button>
    </form>
  );
}
