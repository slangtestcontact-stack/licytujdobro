import type { ReactNode } from "react";

import { Alert } from "@/components/ui";
import { getLegalConfiguration } from "@/lib/legal-config";

export function ContentPage({
  eyebrow,
  title,
  intro,
  children,
  legal = false,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
  legal?: boolean;
}) {
  const legalConfig = legal ? getLegalConfiguration() : null;

  return (
    <main className="page-shell max-w-4xl py-14">
      <p className="text-xs font-bold uppercase tracking-[.14em] text-brand-600">{eyebrow}</p>
      <h1 className="text-balance mt-3 text-4xl font-bold tracking-[-.035em] text-ink sm:text-5xl">{title}</h1>
      <p className="mt-5 max-w-3xl text-base leading-7 text-slate-600">{intro}</p>

      {legalConfig && (
        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 border-y border-slate-200 py-4 text-xs leading-5 text-slate-600">
          <span><strong className="text-ink">Wersja:</strong> {legalConfig.legalVersion}</span>
          <span><strong className="text-ink">Obowiązuje od:</strong> {legalConfig.effectiveDate}</span>
          <span><strong className="text-ink">Ostatnia aktualizacja:</strong> {legalConfig.lastUpdatedDate}</span>
        </div>
      )}

      {legalConfig && !legalConfig.isComplete && (
        <div className="mt-6">
          <Alert tone="warning" title="Konfiguracja prawna nie jest kompletna">
            Przed publicznym uruchomieniem uzupełnij w środowisku: {legalConfig.missingRequiredFields.join(", ")}.
            Endpoint /api/readiness będzie traktował brak tych danych jako blokadę produkcyjną.
          </Alert>
        </div>
      )}

      <article className="mt-10 border-t border-slate-200 pt-2">{children}</article>
    </main>
  );
}

export function H2({ children }: { children: ReactNode }) {
  return <h2 className="mt-9 border-t border-slate-200 pt-7 text-xl font-bold text-ink first:mt-0 first:border-t-0">{children}</h2>;
}

export function H3({ children }: { children: ReactNode }) {
  return <h3 className="mt-6 text-base font-bold text-ink">{children}</h3>;
}

export function P({ children }: { children: ReactNode }) {
  return <p className="mt-3 leading-7 text-slate-700">{children}</p>;
}

export function Bullets({ children }: { children: ReactNode }) {
  return <ul className="mt-4 list-disc space-y-2 pl-5 leading-7 text-slate-700 marker:text-brand-600">{children}</ul>;
}

export function Numbered({ children }: { children: ReactNode }) {
  return <ol className="mt-4 list-decimal space-y-2 pl-5 leading-7 text-slate-700 marker:font-semibold marker:text-brand-700">{children}</ol>;
}

export function LegalNote({ children }: { children: ReactNode }) {
  return <div className="mt-5 rounded-xl border border-brand-200 bg-brand-50 p-5 text-sm leading-6 text-brand-950">{children}</div>;
}
