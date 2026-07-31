const fs = require("fs");
const path = require("path");

const projectPath = process.argv[2];
if (!projectPath) {
  console.error("Użycie: node apply-targeted-patch.cjs /sciezka/do/projektu");
  process.exit(1);
}

const filePath = path.join(projectPath, "src", "app", "page.tsx");
if (!fs.existsSync(filePath)) {
  console.error(`Nie znaleziono pliku: ${filePath}`);
  process.exit(1);
}

let source = fs.readFileSync(filePath, "utf8");
const backupPath = `${filePath}.bak`;
if (!fs.existsSync(backupPath)) {
  fs.copyFileSync(filePath, backupPath);
  console.log(`Utworzono kopię: ${backupPath}`);
}

const overlay = `              <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-white/70 bg-white/94 p-4 shadow-lg backdrop-blur-sm">
                <p className="text-xs font-bold uppercase tracking-[.12em] text-brand-700">{ADAS_CAMPAIGN.fullName}</p>
                <p className="mt-1 text-sm font-semibold text-ink">{ADAS_CAMPAIGN.diagnosis}</p>
                <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-slate-600"><MapPinIcon size={14}/>{ADAS_CAMPAIGN.locationLabel}</p>
              </div>
            </div>
            <div className="absolute -bottom-7 -left-3 max-w-[270px] rounded-2xl border border-brand-200 bg-white p-4 shadow-[0_12px_35px_rgba(16,40,32,.12)] sm:left-6">
              <p className="text-xs font-bold uppercase tracking-[.1em] text-brand-700">Cel oficjalnej zbiórki</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">{ADAS_CAMPAIGN.collectionPurpose}</p>
            </div>
`;

let changed = false;
if (source.includes(overlay)) {
  source = source.replace(overlay, "            </div>\n");
  changed = true;
}

if (source.includes("  MapPinIcon,\n") && !source.includes("<MapPinIcon")) {
  source = source.replace("  MapPinIcon,\n", "");
  changed = true;
}

if (!changed) {
  if (!source.includes("Cel oficjalnej zbiórki") && !source.includes("<MapPinIcon")) {
    console.log("Patch wygląda na już zastosowany. Nie zmieniono pliku.");
    process.exit(0);
  }

  console.error("Nie znaleziono oczekiwanego bloku. Użyj pliku src/app/page.tsx z patcha jako wersji zapasowej albo porównaj diff/page.tsx.patch.");
  process.exit(2);
}

fs.writeFileSync(filePath, source, "utf8");
console.log(`Zastosowano patch: ${filePath}`);
