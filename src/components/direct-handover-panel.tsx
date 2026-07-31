"use client";

import { useActionState } from "react";

import {
  confirmDirectHandoverAction,
  type DirectHandoverResult,
} from "@/actions/direct-handover";
import { Alert, Button } from "@/components/ui";
import { CheckIcon, PackageIcon } from "@/components/icons";

const initialState: DirectHandoverResult = { ok: false };

export function DirectHandoverPanel({
  transactionId,
  role,
  buyerConfirmed,
  sellerConfirmed,
}: {
  transactionId: string;
  role: "buyer" | "seller";
  buyerConfirmed: boolean;
  sellerConfirmed: boolean;
}) {
  const [state, action, pending] = useActionState(
    confirmDirectHandoverAction.bind(null, transactionId),
    initialState,
  );

  const ownConfirmed = role === "buyer" ? buyerConfirmed : sellerConfirmed;
  const effectiveOwnConfirmed = ownConfirmed || state.ok;
  const effectiveCompleted =
    state.completed ||
    (role === "buyer"
      ? effectiveOwnConfirmed && sellerConfirmed
      : buyerConfirmed && effectiveOwnConfirmed);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(16,40,32,.05)] sm:p-6">
      <div className="flex gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-800">
          <PackageIcon size={20} />
        </span>
        <div>
          <h2 className="text-lg font-bold text-ink">Potwierdzenie osobistego odbioru</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Użyj tego przycisku dopiero po faktycznym przekazaniu przedmiotu. LicytujDobro
            nie sprawdza wpłaty i nie uczestniczy w spotkaniu.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Confirmation label="Zwycięzca potwierdził odbiór" done={role === "buyer" ? effectiveOwnConfirmed : buyerConfirmed} />
        <Confirmation label="Wystawiający potwierdził przekazanie" done={role === "seller" ? effectiveOwnConfirmed : sellerConfirmed} />
      </div>

      {state.error ? <div className="mt-4"><Alert tone="danger">{state.error}</Alert></div> : null}
      {effectiveCompleted ? (
        <div className="mt-4"><Alert tone="success">Obie strony potwierdziły odbiór. Proces jest zakończony.</Alert></div>
      ) : effectiveOwnConfirmed ? (
        <div className="mt-4"><Alert tone="info">Twoje potwierdzenie zapisano. Czekamy na drugą stronę.</Alert></div>
      ) : (
        <form action={action} className="mt-5">
          <Button type="submit" disabled={pending}>
            {pending
              ? "Zapisywanie…"
              : role === "buyer"
                ? "Potwierdzam odbiór przedmiotu"
                : "Potwierdzam przekazanie przedmiotu"}
          </Button>
        </form>
      )}
    </section>
  );
}

function Confirmation({ label, done }: { label: string; done: boolean }) {
  return (
    <div className={`flex items-center gap-3 rounded-lg border p-3 text-sm ${done ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${done ? "bg-emerald-700 text-white" : "bg-white text-slate-400"}`}>
        <CheckIcon size={14} />
      </span>
      <span className="font-semibold">{label}</span>
    </div>
  );
}
