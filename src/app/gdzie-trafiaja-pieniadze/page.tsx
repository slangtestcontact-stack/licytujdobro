import { ShieldIcon } from "@/components/icons";
import { ADAS_CAMPAIGN } from "@/lib/adas-campaign";
import { getActiveCampaign } from "@/lib/campaign";

export default async function MoneyPathPage() {
  const campaign = await getActiveCampaign();
  const piggy = campaign?.piggyBankUrl || ADAS_CAMPAIGN.piggyBankUrl;

  return (
    <main className="page-shell max-w-4xl py-10">
      <p className="text-xs font-bold uppercase tracking-[.14em] text-brand-700">Transparentność wpłat</p>
      <h1 className="mt-3 text-4xl font-bold tracking-[-.04em] text-ink">Gdzie trafia wylicytowana kwota?</h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
        Wylicytowana kwota nie trafia do wystawiającego ani LicytujDobro. Po oględzinach zwycięzca samodzielnie wpłaca ją na oficjalną zbiórkę Adasia w zewnętrznym serwisie.
      </p>

      <ol className="mt-9 grid gap-4 sm:grid-cols-3">
        {["Zwycięzca aukcji", "Oficjalny link do zbiórki", "Zbiórka Adasia"].map((label, index) => (
          <li key={label} className="relative rounded-xl border border-slate-200 bg-white p-5">
            <span className="text-xs font-bold text-brand-700">0{index + 1}</span>
            <p className="mt-3 font-bold text-ink">{label}</p>
            {index < 2 && <span className="absolute -bottom-4 left-1/2 z-10 -translate-x-1/2 text-brand-700 sm:-right-3 sm:bottom-auto sm:left-auto sm:top-1/2 sm:translate-x-0 sm:-translate-y-1/2">↓</span>}
          </li>
        ))}
      </ol>

      <div className="mt-9 rounded-xl border border-brand-200 bg-brand-50 p-5">
        <p className="flex items-center gap-2 font-bold text-brand-900"><ShieldIcon size={19} />LicytujDobro nie ma dostępu do pieniędzy</p>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          Nie przechowujemy kodów BLIK, danych karty ani loginu bankowego. Przed zatwierdzeniem sprawdź dokładny adres strony i odbiorcę płatności.
          Nie wpłacaj na numer rachunku lub telefon przesłany w prywatnej wiadomości.
        </p>
        <p className="mt-3 break-all text-xs text-slate-500">Zweryfikowany link używany przez platformę: {piggy}</p>
        <a href={piggy} target="_blank" rel="noreferrer" className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-brand-800 px-5 text-sm font-semibold text-white">Otwórz oficjalną zbiórkę ↗</a>
      </div>

      <p className="mt-6 text-xs leading-5 text-slate-500">
        LicytujDobro jest niezależną platformą techniczną i nie jest operatorem serwisu prowadzącego zbiórkę. Zewnętrzna wpłata podlega regulaminowi i polityce prywatności tego serwisu.
      </p>
    </main>
  );
}
