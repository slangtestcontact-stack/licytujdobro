import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";

function optionalRemotePattern() {
  const publicUrl = process.env.R2_PUBLIC_URL;
  if (!publicUrl) return [];
  try {
    const url = new URL(publicUrl);
    return [{ protocol: "https" as const, hostname: url.hostname }];
  } catch {
    return [];
  }
}

const r2PublicOrigin = (() => {
  try {
    return process.env.R2_PUBLIC_URL ? new URL(process.env.R2_PUBLIC_URL).origin : "";
  } catch {
    return "";
  }
})();

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProduction ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://img.siepomaga.pl https://www.siepomaga.pl https://siepomaga.pl https://*.r2.dev https://*.licytujdobro.pl${r2PublicOrigin ? ` ${r2PublicOrigin}` : ""}`,
  "font-src 'self' data:",
  "connect-src 'self' https://graph.facebook.com https://www.facebook.com https://accounts.google.com https://oauth2.googleapis.com https://appleid.apple.com https://*.r2.cloudflarestorage.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self' https://www.facebook.com https://accounts.google.com https://appleid.apple.com",
  "object-src 'none'",
  isProduction ? "upgrade-insecure-requests" : "",
].filter(Boolean).join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  { key: "Cross-Origin-Resource-Policy", value: "same-site" },
  { key: "Content-Security-Policy-Report-Only", value: csp },
  ...(isProduction
    ? [{
        key: "Strict-Transport-Security",
        value: "max-age=31536000; includeSubDomains; preload",
      }]
    : []),
];

const nextConfig: NextConfig = {
  devIndicators: false,
  poweredByHeader: false,
  images: {
    minimumCacheTTL: 14_400,
    remotePatterns: [
      { protocol: "https", hostname: "img.siepomaga.pl" },
      { protocol: "https", hostname: "www.siepomaga.pl" },
      { protocol: "https", hostname: "siepomaga.pl" },
      { protocol: "https", hostname: "**.r2.dev" },
      ...optionalRemotePattern(),
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
