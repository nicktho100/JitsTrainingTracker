# Mat Time

A small, private Brazilian Jiu-Jitsu training tracker. It saves annual backfill totals for 2024 and 2025, then individual daily training sessions from 2026 onward.

## What it includes

- Cloudflare Access sign-in with server-side JWT validation.
- Cloudflare D1-backed persistence, so entries follow the user between phone and desktop.
- Daily sessions with hours trained, editable by selecting the day again.
- Separate annual backfill totals for 2024 and 2025.
- A mobile-first dashboard with recent sessions and all-time totals.

## Local development

```bash
pnpm install
pnpm dev
```

The app fails closed unless it receives a valid Cloudflare Access JWT and has a D1 database binding. See [CLOUDFLARE_DEPLOYMENT.md](./CLOUDFLARE_DEPLOYMENT.md) for the complete first deployment.

## Data model

`yearly_totals` stores a single backfill total per user for 2024 and 2025. `training_sessions` stores one daily entry per user and date from 2026 onward. The D1 schema is created defensively at runtime and is also captured in the generated Drizzle migration.
