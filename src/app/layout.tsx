import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { SiteHeader, SiteFooter, MobileBottomNav } from "@/components/shell";
import { getAppEnvironment } from "@/lib/environment";
import { WebVitalsReporter } from "@/components/web-vitals-reporter";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL || "http://localhost:3000"),
  title: "Pomóż Adasiowi Iwanejko — LicytujDobro",
  description:
    "Wpłać bezpośrednio, licytuj albo udostępnij akcję dla Adasia Iwanejko. Wpłaty trafiają bezpośrednio na oficjalną zbiórkę Adasia w serwisie Siepomaga.pl.",
  manifest: "/manifest.webmanifest",
  openGraph: { title: "Pomóżmy Adasiowi w walce o terapię", description: "Wpłać bezpośrednio, licytuj albo udostępnij akcję dla Adasia Iwanejko.", type: "website", locale: "pl_PL" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const environment = getAppEnvironment();
  const webVitalsEnabled =
    process.env.NODE_ENV === "production" ||
    process.env.WEB_VITALS_ENABLED === "true";
  const baseUrl = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: process.env.ORGANIZER_NAME?.trim() || "LicytujDobro",
    url: baseUrl,
    email: process.env.ORGANIZER_EMAIL?.trim() || undefined,
  };
  return (
    <html lang="pl" data-scroll-behavior="smooth">
      <body className="flex min-h-screen flex-col bg-surface text-ink antialiased">
        <a href="#main-content" className="skip-link">Przejdź do treści</a>
        {webVitalsEnabled ? <WebVitalsReporter /> : null}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd).replace(/</g, "\\u003c") }} />
        {environment === "test" && <div className="bg-amber-400 px-4 py-2 text-center text-xs font-black uppercase tracking-[.12em] text-amber-950">Środowisko testowe — sprawdź konfigurację oficjalnego linku do zbiórki</div>}
        <SiteHeader />
        <div id="main-content" tabIndex={-1} className="flex-1 pb-16 outline-none lg:pb-0">{children}</div>
        <SiteFooter />
        <MobileBottomNav />
      </body>
    </html>
  );
}
