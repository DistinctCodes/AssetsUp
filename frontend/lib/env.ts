import { z } from "zod";

/**
 * Validated frontend environment. Import `env` instead of reading
 * `process.env.NEXT_PUBLIC_*` directly so every module shares one set of
 * defaults and a bad value fails fast with a readable message.
 */
const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

export const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .url("NEXT_PUBLIC_API_URL must be a full URL, e.g. http://localhost:6003/api")
      .default("http://localhost:6003/api"),
  ),
  NEXT_PUBLIC_WS_URL: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .url("NEXT_PUBLIC_WS_URL must be a full URL, e.g. ws://localhost:6003")
      .optional(),
  ),
  NEXT_PUBLIC_STELLAR_NETWORK: z.preprocess(
    emptyToUndefined,
    z
      .enum(["testnet", "mainnet"], {
        message: "NEXT_PUBLIC_STELLAR_NETWORK must be 'testnet' or 'mainnet'",
      })
      .default("testnet"),
  ),
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(raw: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "env"}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid frontend environment configuration:\n${problems}`);
  }
  return result.data;
}

// Next.js only inlines literal `process.env.NEXT_PUBLIC_X` reads, so each
// variable is referenced explicitly here.
export const env: Env = parseEnv({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
  NEXT_PUBLIC_STELLAR_NETWORK: process.env.NEXT_PUBLIC_STELLAR_NETWORK,
});
