# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Saadhya Ayurvedalaya is a clinic management system for Ayurvedic practitioners. It provides two distinct surfaces:
- **Doctor/admin interface** (`/admin/*`) — appointment scheduling, prescriptions, billing, stock, blog, settings
- **Patient-facing interface** — homepage, blog, and time-limited tokenized appointment links (`/appt/[token]`)

## Commands

```bash
npm run dev       # Start dev server (localhost:3000)
npm run build     # Production build
npm run lint      # ESLint (next lint)
npm start         # Run production build locally
```

No test suite exists yet. There is a monthly cron endpoint at `/api/backup/run` (requires `Authorization: Bearer <CRON_SECRET>` header).

## Architecture

**Stack:** Next.js 14 (Pages Router) · TypeScript · Supabase (PostgreSQL + Auth) · Tailwind CSS · `@react-pdf/renderer`

### Two Supabase clients — use the right one

- `lib/supabase.ts` — anon key, client-side, respects Row-Level Security (RLS). Use in admin pages via `useEffect`.
- `lib/supabaseAdmin.ts` — service role key, server-side only, bypasses RLS. Use in API routes and `getServerSideProps` for public pages that need unrestricted access (token lookup, settings, backup).

**Never import `supabaseAdmin` in client-side code or expose the service role key.**

### Auth flow

Magic link OTP only — no passwords. Any authenticated user is treated as the doctor (no RBAC). The Next.js middleware (`middleware.ts`) enforces session at `/admin/*`. Supabase auth helpers used: `@supabase/auth-helpers-nextjs` (deprecated but functional — migration to `@supabase/ssr` is deferred post-MVP).

### Patient token flow

1. Doctor creates appointment → `POST /api/appointments/create` upserts patient, generates a `nanoid(21)` token (30-day expiry), creates billing record.
2. Doctor copies token URL manually into WhatsApp (no direct messaging integration yet).
3. Patient opens `/appt/[token]` → consent modal → `POST /api/consent`.
4. `GET /api/token/[token]` (called client-side) validates expiry and `token_active` flag, then returns appointment data.
5. Diagnosis + prescriptions are only revealed after `status = 'completed'` and consent given.

### Data fetching pattern

- **Public pages** (`/`, `/blog/*`, `/appt/[token]`): `getServerSideProps` with `supabaseAdmin`.
- **Admin pages** (`/admin/*`): client-side `useEffect` + `supabase` (anon) — no `getServerSideProps`.
- **API routes**: `supabaseAdmin` exclusively.

### PDF generation

`components/PrescriptionPDF.tsx` and `components/ReceiptPDF.tsx` use `@react-pdf/renderer`. These must only be rendered server-side or in dynamic imports with `ssr: false` — importing them statically in SSR pages causes crashes (see commit `246c3f8`).

### Billing items

The `billing.items` column is a free-form `JSONB` array — no schema enforced at the DB layer.

### Phone normalization

Patient phone numbers are normalized on write: strip spaces, strip leading zeros, keep last 10 digits. This is enforced in `POST /api/appointments/create`.

## Key Files

| Path | Purpose |
|------|---------|
| `middleware.ts` | Redirects unauthenticated requests away from `/admin/*` |
| `lib/supabase.ts` | Client-side Supabase (anon key) |
| `lib/supabaseAdmin.ts` | Server-side Supabase (service role, bypasses RLS) |
| `lib/token.ts` | nanoid(21) token generator |
| `components/AdminLayout.tsx` | Sidebar + nav for all admin pages |
| `pages/api/appointments/create.ts` | Core appointment creation (upsert patient → create appointment → create billing) |
| `pages/api/token/[token].ts` | Token validation + appointment data retrieval for patient view |
| `vercel.json` | Monthly cron schedule (`0 1 1 * *`) for `/api/backup/run` |
| `docs/SETUP.md` | Full deployment guide (Supabase schema, env vars, Vercel setup) |
| `docs/FUTURE_ADDITIONS.md` | Post-MVP backlog |

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # Server-only — never expose to client
GOOGLE_DRIVE_FOLDER_ID=           # For monthly backup cron
GOOGLE_SERVICE_ACCOUNT_JSON=      # Server-only JSON blob
NEXT_PUBLIC_SITE_URL=
CRON_SECRET=                      # Bearer token for /api/backup/run
```

## Known Technical Debt (from `docs/FUTURE_ADDITIONS.md`)

- `@supabase/auth-helpers-nextjs` is deprecated — migration to `@supabase/ssr` deferred
- No rate limiting on `/api/token/[token]`
- Appointment + billing creation is not wrapped in a DB transaction (two separate inserts)
- Cancelled appointments don't invalidate their token automatically
- Vercel cron requires Pro plan; Hobby tier silently ignores it
- No input validation library — manual checks only
