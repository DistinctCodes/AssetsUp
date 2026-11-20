import type { NextConfig } from "next";

// Comma-separated list of hostnames allowed for next/image optimisation,
// e.g. NEXT_PUBLIC_IMAGE_HOSTS="cdn.example.com,assets.example.com".
// When unset, no remote host is allowed.
const imageHosts = (process.env.NEXT_PUBLIC_IMAGE_HOSTS ?? "")
  .split(",")
  .map((h) => h.trim())
  .filter(Boolean);

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