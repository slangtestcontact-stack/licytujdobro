import { GavelIcon, HandHeartIcon, MapPinIcon, PackageIcon } from "@/components/icons";

const STEPS = [
  {
    icon: PackageIcon,
    title: "Wybierz przedmiot",
    text: "Sprawdź opis i wybierz: stała wpłata dla szybkiej rezerwacji albo licytacja z przebijaniem ofert.",
  },
  {
    icon: GavelIcon,
    title: "Zarezerwuj albo licytuj",
    text: "Przy stałej wpłacie liczy się pierwsza prawidłowa rezerwacja. W licytacji wygrywa najwyższa oferta.",
  },
  {
    icon: HandHeartIcon,
    title: "Wpłać bezpośrednio na zbiórkę",
    text: "Po wygranej wpłacasz zadeklarowaną kwotę bezpośrednio w serwisie Siepomaga. LicytujDobro nie przyjmuje ani nie weryfikuje wpłat.",
  },
  {
    icon: MapPinIcon,
    title: "Ustal odbiór osobisty",
    text: "Po zakończeniu otrzymujesz kontakt do wystawiającego. Wspólnie ustalacie termin oraz publiczne miejsce odbioru.",
  },
];

export function ProcessSteps() {
  return (
    <ol className="relative mt-8 grid gap-0 border-y border-slate-200 lg:grid-cols-4 lg:border-y-0">
      {STEPS.map((step, index) => {
        const Icon = step.icon;
        return (
          <li
            key={step.title}
            className="relative grid grid-cols-[42px_1fr] gap-4 border-b border-slate-200 py-5 last:border-b-0 lg:block lg:border-b-0 lg:border-r lg:px-6 lg:first:pl-0 lg:last:border-r-0"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-800 text-sm font-bold text-white">
              {index + 1}
            </span>
            <div className="lg:mt-4">
              <div className="mb-2 hidden text-brand-700 lg:block">
                <Icon size={21} />
              </div>
              <h3 className="text-sm font-semibold text-ink">{step.title}</h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">{step.text}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
