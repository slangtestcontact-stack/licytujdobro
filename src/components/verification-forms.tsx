"use client";

import Link from "next/link";
import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Card, Field, inputClass } from "@/components/ui";
import type { ContactVerificationMode } from "@/lib/contact-verification";

type ActionResult = { ok: boolean; error?: string; devHint?: string };
type StateAction = (previousState: ActionResult, formData: FormData) => Promise<ActionResult>;
type SimpleAction = () => Promise<ActionResult>;

const initial: ActionResult = { ok: false };

export function ContactVerificationSetupForm({
  mode,
  currentEmail,
  currentPhone,
  emailVerified,
  phoneVerified,
  termsAccepted,
  returnTo,
  startAction,
}: {
  mode: ContactVerificationMode;
  currentEmail?: string;
  currentPhone?: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  termsAccepted: boolean;
  returnTo: string;
  startAction: StateAction;
}) {
  const router = useRouter();
  const refreshedAfterSuccess = useRef(false);
  const [state, action, pending] = useActionState(
    startAction,
    initial,
  );
  const [method, setMethod] = useState<"email" | "phone">("email");

  useEffect(() => {
    if (!state.ok || refreshedAfterSuccess.current) return;
    refreshedAfterSuccess.current = true;
    router.refresh();
  }, [state.ok, router]);

  const showEmail =
    !emailVerified &&
    (mode === "both" || mode === "email" || (mode === "either" && method === "email"));
  const showPhone =
    !phoneVerified &&
    (mode === "both" || mode === "phone" || (mode === "either" && method === "phone"));

  return (
    <Card className="p-6">
      <h2 className="text-lg font-bold text-ink">Podaj dane do weryfikacji</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Konto utworzone e-mailem i hasłem wymaga potwierdzenia adresu e-mail.
        Po wpisaniu kodu konto zostanie aktywowane do licytowania i wystawiania.
      </p>

      {mode === "either" && (
        <fieldset className="mt-5">
          <legend className="text-sm font-semibold text-ink">
            Wybierz sposób weryfikacji
          </legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm">
              <input
                type="radio"
                name="verification-method-ui"
                checked={method === "email"}
                onChange={() => setMethod("email")}
                className="accent-brand-700"
              />
              Kod na e-mail
            </label>
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm">
              <input
                type="radio"
                name="verification-method-ui"
                checked={method === "phone"}
                onChange={() => setMethod("phone")}
                className="accent-brand-700"
              />
              Kod SMS
            </label>
          </div>
        </fieldset>
      )}

      {state.error && (
        <div className="mt-4">
          <Alert tone="danger">{state.error}</Alert>
        </div>
      )}
      {state.ok && (
        <div className="mt-4">
          <Alert tone="success">Kod został wysłany.</Alert>
        </div>
      )}

      <form action={action} className="mt-5 grid gap-4">
        <input
          type="hidden"
          name="method"
          value={mode === "either" ? method : mode}
        />
        <input type="hidden" name="returnTo" value={returnTo} />

        {showEmail && (
          <Field
            label="Adres e-mail"
            htmlFor="verification-email"
            required
            hint="Na ten adres wyślemy sześciocyfrowy kod."
          >
            <input
              id="verification-email"
              name="email"
              type="email"
              required
              defaultValue={currentEmail}
              autoComplete="email"
              className={inputClass}
              placeholder="twoj@email.pl"
            />
          </Field>
        )}

        {showPhone && (
          <Field
            label="Numer telefonu"
            htmlFor="verification-phone"
            required
            hint="Numer nie będzie widoczny publicznie."
          >
            <input
              id="verification-phone"
              name="phone"
              type="tel"
              required
              defaultValue={currentPhone}
              autoComplete="tel"
              inputMode="tel"
              className={inputClass}
              placeholder="+48 500 000 000"
            />
          </Field>
        )}

        {!termsAccepted && (
          <label className="flex gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-6">
            <input
              type="checkbox"
              name="acceptRules"
              required
              className="mt-1 h-4 w-4 accent-brand-700"
            />
            <span>
              Potwierdzam, że mam co najmniej 18 lat, akceptuję{" "}
              <Link
                href="/prawne/regulamin"
                target="_blank"
                className="font-semibold text-brand-700 underline"
              >
                regulamin
              </Link>{" "}
              i zapoznałem(-am) się z{" "}
              <Link
                href="/prawne/polityka-prywatnosci"
                target="_blank"
                className="font-semibold text-brand-700 underline"
              >
                polityką prywatności
              </Link>
              .
            </span>
          </label>
        )}

        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Wysyłanie…" : showEmail && showPhone ? "Wyślij oba kody" : "Wyślij kod"}
        </Button>
      </form>
    </Card>
  );
}

export function EmailVerificationForm({
  devCode,
  verified,
  email,
  returnTo,
  confirmAction,
  resendAction,
}: {
  devCode?: string;
  verified: boolean;
  email: string;
  returnTo: string;
  confirmAction: StateAction;
  resendAction: SimpleAction;
}) {
  const router = useRouter();
  const refreshedAfterSuccess = useRef(false);
  const [state, formAction, pending] = useActionState(confirmAction, initial);
  const [currentDevCode, setCurrentDevCode] = useState(devCode);
  const [isResending, startResend] = useTransition();
  const [resendMsg, setResendMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!state.ok || refreshedAfterSuccess.current) return;
    refreshedAfterSuccess.current = true;
    router.refresh();
  }, [state.ok, router]);

  return (
    <Card className="p-6">
      <h2 className="text-lg font-bold text-ink">Potwierdź adres e-mail</h2>
      {verified || state.ok ? (
        <Alert tone="success">Adres e-mail został potwierdzony.</Alert>
      ) : (
        <>
          <p className="mt-2 text-sm text-slate-600">
            Wpisz sześciocyfrowy kod wysłany na <strong>{email}</strong>.
          </p>
          {currentDevCode && (
            <div className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-warning">
              <p className="font-bold">Tryb lokalny e-mail</p>
              <p className="mt-1">
                Kod: <strong className="text-base">{currentDevCode}</strong>
              </p>
            </div>
          )}
          {state.error && (
            <div className="mt-3">
              <Alert tone="danger">{state.error}</Alert>
            </div>
          )}
          {resendMsg && (
            <div className="mt-3">
              <Alert tone="info">{resendMsg}</Alert>
            </div>
          )}
          <form action={formAction} className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input type="hidden" name="returnTo" value={returnTo} />
            <input
              name="code"
              required
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              className={inputClass}
              placeholder="123456"
              aria-label="Kod e-mail"
            />
            <Button type="submit" disabled={pending}>
              {pending ? "Potwierdzanie…" : "Potwierdź e-mail"}
            </Button>
          </form>
          <button
            type="button"
            disabled={isResending}
            onClick={() => {
              startResend(async () => {
                const result = await resendAction();
                setResendMsg(
                  result.ok
                    ? "Wysłano nowy kod e-mail."
                    : result.error ?? "Nie udało się wysłać kodu.",
                );
                if (result.devHint) setCurrentDevCode(result.devHint);
              });
            }}
            className="mt-3 text-sm font-semibold text-brand-600 hover:underline disabled:opacity-50"
          >
            {isResending ? "Wysyłanie…" : "Wyślij kod ponownie"}
          </button>
        </>
      )}
    </Card>
  );
}

export function PhoneVerificationForm({
  devCode,
  verified,
  phone,
  returnTo,
  verifyAction,
  resendAction,
}: {
  devCode?: string;
  verified: boolean;
  phone: string;
  returnTo: string;
  verifyAction: StateAction;
  resendAction: SimpleAction;
}) {
  const router = useRouter();
  const refreshedAfterSuccess = useRef(false);
  const [state, formAction, pending] = useActionState(verifyAction, initial);
  const [currentDevCode, setCurrentDevCode] = useState(devCode);
  const [isResending, startResend] = useTransition();
  const [resendMsg, setResendMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!state.ok || refreshedAfterSuccess.current) return;
    refreshedAfterSuccess.current = true;
    router.refresh();
  }, [state.ok, router]);

  return (
    <Card className="p-6">
      <h2 className="text-lg font-bold text-ink">Potwierdź numer telefonu</h2>
      {verified || state.ok ? (
        <Alert tone="success">Numer telefonu został potwierdzony.</Alert>
      ) : (
        <>
          <p className="mt-2 text-sm text-slate-600">
            Wpisz sześciocyfrowy kod SMS wysłany na <strong>{phone}</strong>.
          </p>
          {currentDevCode && (
            <div className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-warning">
              <p className="font-bold">Tryb lokalny SMS</p>
              <p className="mt-1">
                Kod: <strong className="text-base">{currentDevCode}</strong>
              </p>
            </div>
          )}
          {state.error && (
            <div className="mt-3">
              <Alert tone="danger">{state.error}</Alert>
            </div>
          )}
          {resendMsg && (
            <div className="mt-3">
              <Alert tone="info">{resendMsg}</Alert>
            </div>
          )}
          <form action={formAction} className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input type="hidden" name="returnTo" value={returnTo} />
            <input
              name="code"
              required
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              className={inputClass}
              placeholder="123456"
              aria-label="Kod SMS"
            />
            <Button type="submit" disabled={pending}>
              {pending ? "Potwierdzanie…" : "Potwierdź telefon"}
            </Button>
          </form>
          <button
            type="button"
            disabled={isResending}
            onClick={() => {
              startResend(async () => {
                const result = await resendAction();
                setResendMsg(
                  result.ok
                    ? "Wysłano nowy kod SMS."
                    : result.error ?? "Nie udało się wysłać kodu.",
                );
                if (result.devHint) setCurrentDevCode(result.devHint);
              });
            }}
            className="mt-3 text-sm font-semibold text-brand-600 hover:underline disabled:opacity-50"
          >
            {isResending ? "Wysyłanie…" : "Wyślij kod ponownie"}
          </button>
        </>
      )}
    </Card>
  );
}
