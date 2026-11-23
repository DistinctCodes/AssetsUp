import type { NextConfig } from "next";

// Remote image hosts are an explicit allowlist read at build time. The default
// is an empty list (no remote hosts), so a deployment must opt in to each CDN
// it trusts instead of inheriting a wildcard that accepts any HTTPS host.
const imageHosts = Array.from(
  new Set(
    (process.env.NEXT_PUBLIC_IMAGE_HOSTS ?? "")
      .split(",")
      .map((host) => host.trim().toLowerCase())
      .filter((host) => host.length > 0),
  ),
);

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  images: {
    remotePatterns: imageHosts.map((hostname) => ({
      protocol: "https" as const,
      hostname,
    })),
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' http://localhost:6003 ws://localhost:6003 https://horizon-testnet.stellar.org https://soroban-testnet.stellar.org; font-src 'self' data:;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;