import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { GridIcon, HeartIcon, HomeIcon, PlusIcon, ShieldIcon, UserIcon } from "@/components/icons";
import { DesktopNav } from "@/components/header-controls";
import { AccountMenu } from "@/components/account-menu";
import { ADAS_CAMPAIGN } from "@/lib/adas-campaign";
import { getActiveCampaign } from "@/lib/campaign";


function Brand() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-800 text-white">
        <HeartIcon size={16} />
      </span>
      <span className="text-[17px] font-bold tracking-[-0.025em] text-brand-800">LicytujDobro</span>
    </span>
  );
}

export async function SiteHeader() {
  const [user, campaign] = await Promise.all([getCurrentUser(), getActiveCampaign()]);
  const piggyBankUrl = campaign?.piggyBankUrl || ADAS_CAMPAIGN.piggyBankUrl;
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/90 bg-white/95 backdrop-blur-md">
      <div className="page-shell flex h-16 items-center justify-between gap-5">
        <Link href="/" aria-label="LicytujDobro - strona główna"><Brand /></Link>
        <DesktopNav />
        <div className="hidden items-center gap-2 lg:flex">
          {user ? (
            <>
              <AccountMenu nickname={user.nickname} role={user.role} />
            </>
          ) : (
            <Link href="/logowanie" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-ink hover:border-brand-500">Zaloguj się</Link>
          )}
          <a href={piggyBankUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-brand-800 px-4 py-2 text-sm font-bold text-white hover:bg-brand-700">
            <HeartIcon size={16} /> Wpłać dla Adasia
          </a>
          <Link href="/dodaj-przedmiot" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-ink hover:border-brand-500">
            <PlusIcon size={16} /> Wystaw przedmiot
          </Link>
        </div>
        <Link href={user ? "/dashboard" : "/logowanie"} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-brand-800 lg:hidden" aria-label={user ? "Otwórz konto" : "Zaloguj się"}>
          <UserIcon size={19} />
        </Link>
      </div>
    </header>
  );
}

export async function SiteFooter() {
  const campaign = await getActiveCampaign();
  const piggyBankUrl = campaign?.piggyBankUrl || ADAS_CAMPAIGN.piggyBankUrl;
  const operatorName = process.env.ORGANIZER_NAME?.trim();
  const supportEmail = process.env.ORGANIZER_EMAIL?.trim();
  const linkVerifiedAt = process.env.CAMPAIGN_LINK_VERIFIED_AT?.trim() || ADAS_CAMPAIGN.sourceVerifiedAt;
  return (
    <footer className="mt-20 bg-brand-800 pb-24 text-white lg:pb-8">
      <div className="page-shell grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr_1.25fr]">
        <div>
          <BrandFooter />
          <p className="mt-4 max-w-sm text-sm leading-6 text-brand-100">Pomagamy Adasiowi Iwanejko. Możesz wpłacić bezpośrednio, licytować albo udostępnić akcję kolejnej osobie.</p>
          <a href={piggyBankUrl} target="_blank" rel="noreferrer" className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-lg bg-white px-4 text-sm font-bold text-brand-800">Wpłać dla Adasia ↗</a>
          <p className="mt-5 text-xs text-brand-200">Odbiór osobisty · Bez prowizji · {process.env.NEXT_PUBLIC_PILOT_CITY ?? "Biłgoraj i okolice"}</p>
          <p className="mt-2 text-xs leading-5 text-brand-200">Link do zbiórki sprawdzono: {linkVerifiedAt}.</p>
          {operatorName && <p className="mt-2 text-xs leading-5 text-brand-200">Operator serwisu: {operatorName}.</p>}
          {supportEmail && <a href={`mailto:${supportEmail}`} className="mt-1 block text-xs font-semibold text-white hover:underline">{supportEmail}</a>}
        </div>
        <FooterColumn title="Platforma" links={[["/aukcje","Aukcje"],["/jak-to-dziala","Jak to działa"],["/historia-adasia","Historia Adasia"],["/gdzie-trafiaja-pieniadze","Gdzie trafiają pieniądze"],["/faq","FAQ"],["/kontakt","Kontakt"],["/druzyny","Drużyny"],["/wydarzenia","Wydarzenia"],["/bezpieczenstwo","Bezpieczeństwo"],["/transparentnosc","Transparentność"],["/pilotaz","Pilotaż"]]} />
        <FooterColumn title="Dokumenty" links={[["/prawne/regulamin","Regulamin"],["/prawne/zasady-licytacji","Zasady aukcji"],["/prawne/polityka-prywatnosci","Prywatność"],["/prawne/zgloszenia","Zgłoszenia"]]} />
        <div>
          <p className="text-sm font-semibold">Ważne</p>
          <p className="mt-3 text-sm leading-6 text-brand-100">LicytujDobro nie przyjmuje pieniędzy i nie zapisuje kodów BLIK. Wpłaty trafiają bezpośrednio na oficjalną zbiórkę Adasia w serwisie Siepomaga.pl. Wystawiający odpowiada za zgodność opisu i przekazanie przedmiotu, a zwycięzca za terminową wpłatę i odbiór zgodnie z regulaminem.</p>
        </div>
      </div>
      <div className="page-shell border-t border-white/15 pt-6 text-xs text-brand-200">© {new Date().getFullYear()} LicytujDobro · Wpłaty trafiają bezpośrednio na oficjalną zbiórkę Adasia w serwisie Siepomaga.pl.</div>
    </footer>
  );
}

function BrandFooter() {
  return <span className="inline-flex items-center gap-2.5"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-brand-800"><HeartIcon size={16}/></span><span className="text-lg font-bold">LicytujDobro</span></span>;
}

function FooterColumn({ title, links }: { title: string; links: [string,string][] }) {
  return <div><p className="text-sm font-semibold">{title}</p><ul className="mt-3 space-y-2.5 text-sm text-brand-100">{links.map(([href,label])=><li key={href}><Link href={href} className="hover:text-white">{label}</Link></li>)}</ul></div>;
}

export async function MobileBottomNav() {
  const campaign = await getActiveCampaign();
  const piggyBankUrl = campaign?.piggyBankUrl || ADAS_CAMPAIGN.piggyBankUrl;
  const mobileNav = [
    { href: "/", label: "Start", icon: HomeIcon },
    { href: "/aukcje", label: "Aukcje", icon: GridIcon },
    { href: piggyBankUrl, label: "Wpłać", icon: HeartIcon, primary: true, external: true },
    { href: "/historia-adasia", label: "Adaś", icon: ShieldIcon },
    { href: "/dashboard", label: "Konto", icon: UserIcon },
  ];
  return (
    <nav aria-label="Nawigacja mobilna" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-slate-200 bg-white px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-5px_18px_rgba(16,40,32,.08)] lg:hidden">
      {mobileNav.map((item) => {
        const Icon = item.icon;
        const className = `flex min-h-16 flex-col items-center justify-center gap-1 text-[10px] font-semibold ${item.primary ? "text-brand-800" : "text-slate-600"}`;
        const content = <><span className={item.primary ? "flex h-9 w-9 items-center justify-center rounded-full bg-brand-800 text-white" : ""}><Icon size={item.primary ? 20 : 19}/></span>{item.label}</>;
        return item.external ? <a key={item.label} href={item.href} target="_blank" rel="noreferrer" className={className}>{content}</a> : <Link key={item.label} href={item.href} className={className}>{content}</Link>;
      })}
    </nav>
  );
}
