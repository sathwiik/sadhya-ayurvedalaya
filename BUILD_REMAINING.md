# Saadhya Ayurvedalaya — Remaining Build Tasks

## Status
- [x] package.json with all dependencies
- [x] npm install (node_modules)
- [x] Git repo pushed to https://github.com/sathwiik/sadhya-ayurvedalaya

---

## BATCH 1 — Config & Foundation
- [ ] `next.config.js`
- [ ] `tailwind.config.js`
- [ ] `postcss.config.js`
- [ ] `tsconfig.json`
- [ ] `.env.local` (template)
- [ ] `.gitignore`
- [ ] `vercel.json` (cron jobs)
- [ ] `pages/_app.tsx`
- [ ] `pages/_document.tsx` (Inter font)

## BATCH 2 — Lib & Middleware
- [ ] `lib/supabase.ts` (anon client)
- [ ] `lib/supabaseAdmin.ts` (service role)
- [ ] `lib/token.ts` (nanoid)
- [ ] `lib/sms.ts` (MSG91)
- [ ] `middleware.ts` (protect /admin/*)

## BATCH 3 — Components
- [ ] `components/AdminLayout.tsx` (sidebar, auth guard)
- [ ] `components/PublicLayout.tsx` (header/footer)
- [ ] `components/ConsentModal.tsx` (full-screen overlay)
- [ ] `components/PrescriptionPDF.tsx` (react-pdf, A5)

## BATCH 4 — API Routes
- [ ] `pages/api/appointments/create.ts` (upsert patient + appt + billing + SMS)
- [ ] `pages/api/token/[token].ts` (validate token, return safe data)
- [ ] `pages/api/consent.ts` (set consent_given=true)
- [ ] `pages/api/sms/reminder.ts` (cron: next-day reminders)
- [ ] `pages/api/backup/run.ts` (cron: monthly Google Drive export)

## BATCH 5 — Public Pages
- [ ] `pages/index.tsx` (homepage: hero, about, blog previews, contact)
- [ ] `pages/blog/index.tsx` (published posts list)
- [ ] `pages/blog/[id].tsx` (post with react-markdown, ISR)
- [ ] `pages/appt/[token].tsx` (patient token page, consent flow)
- [ ] `pages/login.tsx` (doctor email OTP login)

## BATCH 6 — Admin Pages (Part 1)
- [ ] `pages/admin/index.tsx` (dashboard: cards, today's appointments)
- [ ] `pages/admin/patients/index.tsx` (list, search, add, delete)
- [ ] `pages/admin/patients/[id].tsx` (detail, edit inline, history, danger delete)
- [ ] `pages/admin/appointments/index.tsx` (list, date filter, status badges)

## BATCH 7 — Admin Pages (Part 2)
- [ ] `pages/admin/appointments/new.tsx` (2-step form, phone lookup, SMS on create)
- [ ] `pages/admin/appointments/[id].tsx` (edit appt, resend SMS, quick links)
- [ ] `pages/admin/prescriptions/[appointmentId].tsx` (add/edit drugs, autocomplete, PDF download)
- [ ] `pages/admin/stock/index.tsx` (medicine stock, inline edit, low stock sort)

## BATCH 8 — Admin Pages (Part 3)
- [ ] `pages/admin/billing/index.tsx` (billing list, mark paid modal, receipt PDF)
- [ ] `pages/admin/posts/index.tsx` (CRUD content posts, markdown, publish toggle)
- [ ] `pages/admin/settings/index.tsx` (clinic settings, consent text, test SMS)

---

## Key Decisions / Notes
- Pages Router (NOT App Router)
- Supabase Auth email OTP (magic link) — no password
- Token page: getServerSideProps with service role key — never exposes appointment ID
- ConsentModal: cannot dismiss by clicking outside — two explicit choices only
- Aadhaar: last 4 digits only, never full number
- Phone stored as 10-digit string, "91" prepended only for SMS
- Billing row auto-created when appointment is created
- Stock autocomplete on prescription drug name field
- All admin tables: overflow-x-auto for mobile
- Colour palette: green-700 primary, amber-600 accent, gray-50 bg
