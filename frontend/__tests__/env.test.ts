import { parseEnv } from "@/lib/env";

describe("parseEnv", () => {
  it("applies local defaults when nothing is set", () => {
    const env = parseEnv({});
    expect(env.NEXT_PUBLIC_API_URL).toBe("http://localhost:6003/api");
    expect(env.NEXT_PUBLIC_STELLAR_NETWORK).toBe("testnet");
    expect(env.NEXT_PUBLIC_WS_URL).toBeUndefined();
  });

  it("treats empty strings as unset", () => {
    expect(parseEnv({ NEXT_PUBLIC_API_URL: "" }).NEXT_PUBLIC_API_URL).toBe(
      "http://localhost:6003/api",
    );
  });

  it("accepts explicit values", () => {
    const env = parseEnv({
      NEXT_PUBLIC_API_URL: "https://api.example.com/api",
      NEXT_PUBLIC_WS_URL: "wss://api.example.com",
      NEXT_PUBLIC_STELLAR_NETWORK: "mainnet",
    });
    expect(env.NEXT_PUBLIC_API_URL).toBe("https://api.example.com/api");
    expect(env.NEXT_PUBLIC_WS_URL).toBe("wss://api.example.com");
    expect(env.NEXT_PUBLIC_STELLAR_NETWORK).toBe("mainnet");
  });

  it("fails fast with a readable message on invalid values", () => {
    expect(() => parseEnv({ NEXT_PUBLIC_API_URL: "not a url" })).toThrow(
      /NEXT_PUBLIC_API_URL/,
    );
    expect(() => parseEnv({ NEXT_PUBLIC_STELLAR_NETWORK: "devnet" })).toThrow(
      /NEXT_PUBLIC_STELLAR_NETWORK/,
    );
  });
});
