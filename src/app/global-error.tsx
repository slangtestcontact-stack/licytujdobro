"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pl">
      <body className="bg-slate-50 text-slate-900">
        <main className="mx-auto flex min-h-screen max-w-xl items-center px-4 py-16">
          <section className="w-full rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-red-700">
              Błąd aplikacji
            </p>
            <h1 className="mt-2 text-2xl font-bold">Nie udało się wczytać strony</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Sprawdź połączenie i spróbuj ponownie. Twoje zapisane dane nie zostały usunięte.
            </p>
            {error.digest ? (
              <p className="mt-2 text-xs text-slate-500">Identyfikator: {error.digest}</p>
            ) : null}
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={reset}
                className="rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-bold text-white"
              >
                Spróbuj ponownie
              </button>
              <button
                type="button"
                onClick={() => window.location.assign("/")}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold"
              >
                Wróć na stronę główną
              </button>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
