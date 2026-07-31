import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LicytujDobro - dla Adasia",
    short_name: "LicytujDobro",
    description: "Wpłać bezpośrednio, licytuj albo udostępnij akcję dla Adasia Iwanejko.",
    start_url: "/",
    display: "standalone",
    background_color: "#fafbfa",
    theme_color: "#123d35",
    lang: "pl",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
