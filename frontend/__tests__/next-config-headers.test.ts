type Header = { key: string; value: string };

const ENV_KEYS = ["NODE_ENV", "NEXT_PUBLIC_API_URL", "NEXT_PUBLIC_WS_URL"] as const;

async function headersFor(env: Record<string, string | undefined>) {
  for (const key of ENV_KEYS) {
    if (!(key in env)) continue;
    const value = env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  // next.config computes its headers at module load, so reload it for each
  // environment under test.
  jest.resetModules();
  const config = require("@/next.config").default;
  const [route] = await config.headers();
  return route.headers as Header[];
}

function cspOf(headers: Header[]): string {
  const header = headers.find((h) => h.key === "Content-Security-Policy");
  if (!header) throw new Error("Content-Security-Policy header is missing");
  return header.value;
}

describe("next.config security headers", () => {
  const original: Record<string, string | undefined> = {};

  beforeAll(() => {
    for (const key of ENV_KEYS) original[key] = process.env[key];
  });

  afterEach(() => {
    jest.resetModules();
    for (const key of ENV_KEYS) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
  });

  it("allows the configured API and WS origins in production", async () => {
    const csp = cspOf(
      await headersFor({
        NODE_ENV: "production",
        NEXT_PUBLIC_API_URL: "https://api.example.com/api",
        NEXT_PUBLIC_WS_URL: "wss://realtime.example.com",
      }),
    );

    expect(csp).toContain(
      "connect-src 'self' https://api.example.com wss://realtime.example.com",
    );
    expect(csp).toContain("https://horizon-testnet.stellar.org");
    expect(csp).toContain("https://soroban-testnet.stellar.org");
    expect(csp).not.toMatch(/localhost|127\.0\.0\.1/);
    expect(csp).not.toContain("'unsafe-eval'");
  });

  it("drops configured localhost origins from production builds", async () => {
    const csp = cspOf(
      await headersFor({
        NODE_ENV: "production",
        NEXT_PUBLIC_API_URL: "http://localhost:6003/api",
        NEXT_PUBLIC_WS_URL: "ws://localhost:6003",
      }),
    );

    expect(csp).toContain("connect-src 'self' https://horizon-testnet.stellar.org");
    expect(csp).not.toMatch(/localhost|127\.0\.0\.1/);
  });

  it("keeps localhost origins and unsafe-eval in development", async () => {
    const csp = cspOf(
      await headersFor({
        NODE_ENV: "development",
        NEXT_PUBLIC_API_URL: "http://localhost:6003/api",
        NEXT_PUBLIC_WS_URL: "ws://localhost:6003",
      }),
    );

    expect(csp).toContain("http://localhost:6003");
    expect(csp).toContain("ws://localhost:6003");
    expect(csp).toContain("'unsafe-eval'");
  });

  it("keeps every other header unchanged", async () => {
    const headers = await headersFor({ NODE_ENV: "production" });
    expect(headers).toEqual(
      expect.arrayContaining([
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      ]),
    );
  });
});
