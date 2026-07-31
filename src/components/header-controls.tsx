"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/aukcje", label: "Aukcje" },
  { href: "/jak-to-dziala", label: "Jak pomagam" },
  { href: "/historia-adasia", label: "Historia Adasia" },
  { href: "/bezpieczenstwo", label: "Bezpieczeństwo" },
];

export function DesktopNav() {
  const pathname = usePathname();

  return (
    <nav
      className="hidden h-full items-center gap-7 text-sm font-medium text-slate-600 lg:flex"
      aria-label="Nawigacja główna"
    >
      {NAV_LINKS.map((link) => {
        const active =
          pathname === link.href || pathname.startsWith(`${link.href}/`);

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`relative inline-flex h-16 items-center transition-colors ${
              active
                ? "font-semibold text-brand-800"
                : "hover:text-brand-700"
            }`}
          >
            {link.label}
            {active ? (
              <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-brand-700" />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
