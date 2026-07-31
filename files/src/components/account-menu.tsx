import Link from "next/link";

import {
  logoutAction,
  logoutAllSessionsAction,
} from "@/actions/auth";

export function AccountMenu({
  nickname,
  role,
}: {
  nickname: string;
  role: string;
}) {
  const initials = nickname.slice(0, 2).toUpperCase();

  return (
    <details className="group relative">
      <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-lg px-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-brand-700 [&::-webkit-details-marker]:hidden">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-800">
          {initials}
        </span>
        <span>{role === "admin" ? "Administrator" : nickname}</span>
        <span
          aria-hidden="true"
          className="text-[10px] text-slate-400 transition-transform group-open:rotate-180"
        >
          ▼
        </span>
      </summary>

      <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_16px_40px_rgba(16,40,32,.14)]">
        {role === "admin" ? (
          <Link
            href="/admin"
            className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-ink hover:bg-brand-50 hover:text-brand-700"
          >
            Panel administratora
          </Link>
        ) : null}

        <Link
          href="/dashboard"
          className="block rounded-lg px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-brand-700"
        >
          Moje konto
        </Link>

        <form action={logoutAction} className="border-t border-slate-100 pt-1.5">
          <button
            className="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-slate-600 hover:bg-red-50 hover:text-danger"
            type="submit"
          >
            Wyloguj
          </button>
        </form>

        <form action={logoutAllSessionsAction}>
          <button
            className="block w-full rounded-lg px-3 py-2.5 text-left text-xs font-semibold text-slate-500 hover:bg-red-50 hover:text-danger"
            type="submit"
          >
            Wyloguj wszystkie urządzenia
          </button>
        </form>
      </div>
    </details>
  );
}
