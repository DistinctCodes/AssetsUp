# API Hardening: Rate Limiting, Helmet, Env Validation

## Security headers (helmet)

`helmet()` is registered in `main.ts` to set secure HTTP response headers
(CSP, HSTS, `X-Frame-Options`, `X-Content-Type-Options`, etc.).

## Rate limiting (@nestjs/throttler)

`@nestjs/throttler` is configured from env (`THROTTLE_TTL`, `THROTTLE_LIMIT`)
with `ThrottlerGuard` applied globally. Auth endpoints get stricter per-route
limits:

- `POST /api/auth/login` — 5 requests/min
- `POST /api/auth/register` — 5 requests/min

## Strict env validation

`validateEnv` (`src/config/env.validation.ts`) is wired into
`ConfigModule.forRoot({ validate: validateEnv })`, so the app **fails fast on
boot** when a required variable (`DATABASE_URL`, `JWT_SECRET`, …) is missing or a
numeric variable is malformed, instead of starting in a broken state.
