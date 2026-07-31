import Link from "next/link";

import { AccountMenu } from "@/components/account-menu";
import { DesktopNav } from "@/components/header-controls";
import {
  GridIcon,
  HeartIcon,
  HomeIcon,
  PlusIcon,
  ShieldIcon,
  UserIcon,
} from "@/components/icons";
import { ADAS_CAMPAIGN } from "@/lib/adas-campaign";
import { getCurrentUser } from "@/lib/auth";
import { getActiveCampaign } from "@/lib/campaign";
import { getLegalConfiguration } from "@/lib/legal-config";

function Brand() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-800 text-white">
        <HeartIcon size={16} />
      </span>

      <span className="text-[17px] font-bold tracking-[-0.025em] text-brand-800">
        LicytujDobro
      </span>
    </span>
  );
}

export async function SiteHeader() {
  const [user, campaign] = await Promise.all([
    getCurrentUser(),
    getActiveCampaign(),
  ]);

  const piggyBankUrl =
    campaign?.piggyBankUrl || ADAS_CAMPAIGN.piggyBankUrl;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/90 bg-white/95 backdrop-blur-md">
      <div className="page-shell flex h-16 items-center justify-between gap-5">
        <Link href="/" aria-label="LicytujDobro — strona główna">
          <Brand />
        </Link>

        <DesktopNav />

        <div className="hidden items-center gap-2 lg:flex">
          {user ? (
            <AccountMenu nickname={user.nickname} role={user.role} />
          ) : (
            <Link
              href="/logowanie"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-ink hover:border-brand-500"
            >
              Zaloguj się
            </Link>
          )}

          <a
            href={piggyBankUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-brand-800 px-4 py-2 text-sm font-bold text-white hover:bg-brand-700"
          >
            <HeartIcon size={16} />
            Wpłać dla Adasia
          </a>

          <Link
            href="/dodaj-przedmiot"
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-ink hover:border-brand-500"
          >
            <PlusIcon size={16} />
            Wystaw przedmiot
          </Link>
        </div>

        <Link
          href={user ? "/dashboard" : "/logowanie"}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-brand-800 lg:hidden"
          aria-label={user ? "Otwórz konto" : "Zaloguj się"}
        >
          <UserIcon size={19} />
        </Link>
      </div>
    </header>
  );
}

export async function SiteFooter() {
  const [campaign, legal] = await Promise.all([
    getActiveCampaign(),
    Promise.resolve(getLegalConfiguration()),
  ]);

  const piggyBankUrl =
    campaign?.piggyBankUrl || ADAS_CAMPAIGN.piggyBankUrl;

  const supportEmail =
    legal.operatorEmail &&
    !legal.operatorEmail.includes("wymagają uzupełnienia")
      ? legal.operatorEmail
      : "";

  const linkVerifiedAt =
    process.env.CAMPAIGN_LINK_VERIFIED_AT?.trim() ||
    ADAS_CAMPAIGN.sourceVerifiedAt;

  return (
    <footer className="mt-16 bg-brand-800 pb-24 text-white lg:pb-6">
      <div className="page-shell grid gap-8 py-8 lg:grid-cols-3 lg:items-start">
        <div className="lg:col-span-1">
          <BrandFooter />

          <p className="mt-3 max-w-md text-sm leading-6 text-brand-100">
            Lokalna platforma przekazywania przedmiotów dla Adasia. Rezerwujesz rzecz za stałą wpłatę albo licytujesz ją, a ustalona kwota trafia bezpośrednio na oficjalną zbiórkę.
          </p>

          <a
            href={piggyBankUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg bg-white px-4 text-sm font-bold text-brand-800 hover:bg-brand-50"
          >
            Wpłać dla Adasia ↗
          </a>

          <p className="mt-4 text-xs leading-5 text-brand-200">
            Bez prowizji platformy · {legal.serviceArea} · link do zbiórki
            sprawdzono {linkVerifiedAt}
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-3 lg:col-span-2">
          <FooterColumn
            title="Korzystanie"
            links={[
              ["/aukcje", "Aukcje"],
              ["/jak-to-dziala", "Jak to działa"],
              ["/historia-adasia", "Historia Adasia"],
              ["/druzyny", "Drużyny"],
              ["/wydarzenia", "Wydarzenia"],
            ]}
          />

          <FooterColumn
            title="Pomoc i zaufanie"
            links={[
              ["/bezpieczenstwo", "Bezpieczeństwo"],
              ["/gdzie-trafiaja-pieniadze", "Droga wpłaty"],
              ["/transparentnosc", "Transparentność"],
              ["/faq", "Najczęstsze pytania"],
              ["/kontakt", "Kontakt"],
              ["/prawne/zgloszenia", "Zgłoś naruszenie"],
            ]}
          />

          <FooterColumn
            title="Dokumenty"
            links={[
              ["/prawne/regulamin", "Regulamin serwisu"],
              ["/prawne/zasady-licytacji", "Zasady licytacji"],
              [
                "/prawne/polityka-prywatnosci",
                "Polityka prywatności",
              ],
              [
                "/prawne/polityka-cookies",
                "Cookies i pamięć urządzenia",
              ],
              ["/prawne/odwolania", "Odwołania od moderacji"],
            ]}
          />
        </div>
      </div>

      <div className="page-shell border-t border-white/15 py-5 text-xs leading-5 text-brand-200">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <p>
            © {new Date().getFullYear()} LicytujDobro · Operator:{" "}
            {legal.operatorLegalName}
          </p>

          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {supportEmail ? (
              <a
                href={`mailto:${supportEmail}`}
                className="font-semibold text-white hover:underline"
              >
                {supportEmail}
              </a>
            ) : null}

            <Link
              href="/kontakt"
              className="font-semibold text-white hover:underline"
            >
              Dane operatora
            </Link>
          </div>
        </div>

        <p className="mt-2 max-w-5xl">
          LicytujDobro nie przyjmuje ani nie weryfikuje wpłat i nie jest operatorem
          serwisu Siepomaga.pl. Wpłaty trafiają bezpośrednio na oficjalną
          zbiórkę Adasia, a odbiór strony ustalają samodzielnie.
        </p>
      </div>
    </footer>
  );
}

function BrandFooter() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-brand-800">
        <HeartIcon size={16} />
      </span>

      <span className="text-lg font-bold">LicytujDobro</span>
    </span>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: [string, string][];
}) {
  return (
    <div>
      <p className="text-sm font-semibold">{title}</p>

      <ul className="mt-3 space-y-2 text-sm text-brand-100">
        {links.map(([href, label]) => (
          <li key={href}>
            <Link href={href} className="hover:text-white">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export async function MobileBottomNav() {
  const campaign = await getActiveCampaign();

  const piggyBankUrl =
    campaign?.piggyBankUrl || ADAS_CAMPAIGN.piggyBankUrl;

  const mobileNav = [
    {
      href: "/",
      label: "Start",
      icon: HomeIcon,
    },
    {
      href: "/aukcje",
      label: "Aukcje",
      icon: GridIcon,
    },
    {
      href: piggyBankUrl,
      label: "Wpłać",
      icon: HeartIcon,
      primary: true,
      external: true,
    },
    {
      href: "/historia-adasia",
      label: "Adaś",
      icon: ShieldIcon,
    },
    {
      href: "/dashboard",
      label: "Konto",
      icon: UserIcon,
    },
  ];

  return (
    <nav
      aria-label="Nawigacja mobilna"
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-slate-200 bg-white px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-5px_18px_rgba(16,40,32,.08)] lg:hidden"
    >
      {mobileNav.map((item) => {
        const Icon = item.icon;

        const className = [
          "flex min-h-16 flex-col items-center justify-center gap-1",
          "text-[10px] font-semibold",
          item.primary ? "text-brand-800" : "text-slate-600",
        ].join(" ");

        const content = (
          <>
            <span
              className={
                item.primary
                  ? "flex h-9 w-9 items-center justify-center rounded-full bg-brand-800 text-white"
                  : ""
              }
            >
              <Icon size={item.primary ? 20 : 19} />
            </span>

            {item.label}
          </>
        );

        return item.external ? (
          <a
            key={item.label}
            href={item.href}
            target="_blank"
            rel="noreferrer"
            className={className}
          >
            {content}
          </a>
        ) : (
          <Link
            key={item.label}
            href={item.href}
            className={className}
          >
            {content}
          </Link>
        );
      })}
    </nav>
  );
}