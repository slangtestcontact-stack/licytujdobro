import type { Metadata } from "next";
import Link from "next/link";

import { HandHeartIcon, ShieldIcon, UserIcon } from "@/components/icons";
import { getActiveCampaign } from "@/lib/campaign";

export const metadata: Metadata = {
  title: "Transparentność działania — LicytujDobro",
  description: "Sprawdź rolę platformy, zasady prezentowania aukcji, moderacji i drogę wpłat na oficjalną zbiórkę Adasia.",
  openGraph: {
    title: "Transparentność działania — LicytujDobro",
    description: "Sprawdź rolę platformy, zasady prezentowania aukcji, moderacji i drogę wpłat na oficjalną zbiórkę Adasia.",
  },
};

export default async function TransparencyPage() {
  const campaign = await getActiveCampaign();

  return (
    <main className="page-shell max-w-4xl py-12">
      <p className="text-xs font-bold uppercase tracking-[.14em] text-brand-600">Zaufanie i zasady</p>
      <h1 className="mt-3 text-4xl font-bold tracking-[-.035em] text-ink">Jak działa LicytujDobro</h1>
      <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
        Platforma łączy osoby przekazujące przedmioty z licytującymi. Nie przyjmuje wpłat, nie prowadzi salda użytkowników i nie jest stroną płatności.
      </p>

      <div className="mt-10 grid gap-5 sm:grid-cols-3">
        <Box icon={HandHeartIcon} title="Wpłata poza platformą">
          Zwycięzca wpłaca bezpośrednio na oficjalną zbiórkę w zewnętrznym serwisie. LicytujDobro nie ma dostępu do środków ani danych płatniczych.
        </Box>
        <Box icon={ShieldIcon} title="Proces z potwierdzeniami">
          Oferty, terminy, statusy, decyzje moderacyjne i najważniejsze kroki procesu są rejestrowane, aby ograniczyć nadużycia i ułatwić wyjaśnianie problemów.
        </Box>
        <Box icon={UserIcon} title="Dane ograniczone do celu">
          Publicznie prezentujemy pseudonim, ogólną lokalizację i treść aukcji. Dane kontaktowe i dokładne miejsce spotkania nie są publiczne.
        </Box>
      </div>

      <section className="mt-12 space-y-8 text-sm leading-7 text-slate-700">
        <Part title="Kto jest stroną uzgodnienia">
          Wystawiający odpowiada za prawo do rozporządzania przedmiotem, opis, stan i przekazanie. Zwycięzca odpowiada za prawdziwość oferty,
          oględziny, wpłatę na zbiórkę i odbiór. Operator udostępnia narzędzia i moderuje, ale nie jest sprzedawcą ani kupującym.
        </Part>
        <Part title="Jak prezentujemy aukcje">
          Listy mogą być układane według czasu zakończenia, liczby ofert, kategorii, braku ofert lub filtra wybranego przez użytkownika.
          Oznaczenie „aukcja specjalna” jest nadawane ręcznie wyjątkowym przedmiotom. Nie jest płatnym pozycjonowaniem i nie gwarantuje jakości ani wyniku.
        </Part>
        <Part title="Jak moderujemy">
          Treści mogą być sprawdzane przed publikacją i po zgłoszeniu. Ograniczenia opierają się na prawie, regulaminie, bezpieczeństwie i wiarygodności procesu.
          Użytkownik powinien otrzymać konkretne uzasadnienie oraz możliwość odwołania. Ostateczne decyzje mogą być przeglądane przez człowieka.
        </Part>
        <Part title="Jak liczymy pomoc">
          Publiczna suma w LicytujDobro, jeżeli jest pokazywana, obejmuje wyłącznie kwoty przypisane do zakończonych i potwierdzonych procesów w platformie.
          Nie stanowi pełnego wyniku zbiórki ani informacji księgowej zewnętrznego operatora.
        </Part>
        <Part title="Relacja z rodziną i zewnętrzną zbiórką">
          Imię, historia i zdjęcia Adasia mogą być publikowane wyłącznie na podstawie odpowiednich zgód. Informację o formalnej współpracy z rodziną,
          fundacją lub serwisem płatniczym wolno podawać tylko wtedy, gdy została rzeczywiście uzgodniona i udokumentowana.
        </Part>
      </section>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/gdzie-trafiaja-pieniadze" className="rounded-lg bg-brand-800 px-5 py-3 text-sm font-semibold text-white">Zobacz drogę wpłaty</Link>
        {campaign?.piggyBankUrl && <a href={campaign.piggyBankUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-brand-300 bg-white px-5 py-3 text-sm font-semibold text-brand-800">Otwórz oficjalną zbiórkę ↗</a>}
        <Link href="/prawne/zgloszenia" className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-semibold text-ink">Zgłoś naruszenie</Link>
      </div>
    </main>
  );
}

function Box({ icon: Icon, title, children }: { icon: typeof ShieldIcon; title: string; children: React.ReactNode }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-5"><Icon className="text-brand-700" size={22} /><h2 className="mt-4 font-bold text-ink">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{children}</p></div>;
}

function Part({ title, children }: { title: string; children: React.ReactNode }) {
  return <div><h2 className="text-xl font-bold text-ink">{title}</h2><p className="mt-2">{children}</p></div>;
}
