import type { NextConfig } from "next";

// These headers are assembled at module load, i.e. at `next build` time for
// production. NEXT_PUBLIC_* values are also inlined at build time, so the CSP
// always describes the environment the bundle was built for.
const isDevelopment = process.env.NODE_ENV === "development";

/** Return scheme://host[:port] of a configured URL, dropping any path/query. */
function originOf(value?: string): string | null {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return null;
  }
}

/** Localhost origins are only useful in development; never ship them in CSP. */
function isLocalOrigin(origin: string): boolean {
  return /(?:^|\/\/)(?:localhost|127\.0\.0\.1|\[::1\])(?::|\/|$)/i.test(origin);
}

const configuredOrigins = [
  originOf(process.env.NEXT_PUBLIC_API_URL),
  originOf(process.env.NEXT_PUBLIC_WS_URL),
].filter((origin): origin is string => Boolean(origin));

const connectSources = [
  "'self'",
  // Dev servers are permitted only when actually running in development.
  ...configuredOrigins.filter(
    (origin) => isDevelopment || !isLocalOrigin(origin),
  ),
  // Stellar/Soroban testnet endpoints used by the wallet/contract layer.
  "https://horizon-testnet.stellar.org",
  "https://soroban-testnet.stellar.org",
];

// `unsafe-eval` is a development-only escape hatch for tooling/source maps;
// production scripts run with the stricter allow-list.
const scriptSources = [
  "'self'",
  "'unsafe-inline'",
  ...(isDevelopment ? ["'unsafe-eval'"] : []),
].join(" ");

const contentSecurityPolicy =
  [
    "default-src 'self'",
    `script-src ${scriptSources}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    `connect-src ${connectSources.join(" ")}`,
    "font-src 'self' data:",
  ].join("; ") + ";";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // The QR scanner needs same-origin camera access via getUserMedia;
          // microphone and geolocation stay disabled.
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
          {
            key: "Content-Security-Policy",
            value: contentSecurityPolicy,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
