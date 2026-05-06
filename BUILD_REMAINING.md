# Saadhya Ayurvedalaya — Remaining Build Tasks

## Status
- [x] package.json with all dependencies installed
- [x] Git repo: https://github.com/sathwiik/sadhya-ayurvedalaya
- [x] BUILD_REMAINING.md + CHANGE_001_no_sms.md saved

## Active Changes
- CHANGE_001: No SMS/MSG91. Manual Messages page instead. See CHANGE_001_no_sms.md.

---

## BATCH 1 — Config & Foundation
- [ ] `next.config.js`
- [ ] `tailwind.config.js`
- [ ] `postcss.config.js`
- [ ] `tsconfig.json`
- [ ] `.env.local` (template — NO MSG91 vars per CHANGE_001)
- [ ] `.gitignore` (already pushed, verify)
- [ ] `vercel.json` (backup cron only — NO SMS cron per CHANGE_001)
- [ ] `pages/_app.tsx`
- [ ] `pages/_document.tsx` (Inter font from Google Fonts)
- [ ] `styles/globals.css`

## BATCH 2 — Lib & Middleware
- [ ] `lib/supabase.ts` (anon client)
- [ ] `lib/supabaseAdmin.ts` (service role — server/API only)
- [ ] `lib/token.ts` (nanoid(21))
- [ ] `middleware.ts` (protect /admin/* → redirect to /login)
- NOTE: NO lib/sms.ts per CHANGE_001

## BATCH 3 — Components
- [ ] `components/AdminLayout.tsx` — sidebar: Dashboard | Patients | Appointments | Messages | Stock | Billing | Posts | Settings (Messages between Appointments and Stock per CHANGE_001)
- [ ] `components/PublicLayout.tsx`
- [ ] `components/ConsentModal.tsx`
- [ ] `components/PrescriptionPDF.tsx` (A5, @react-pdf/renderer)

## BATCH 4 — API Routes
- [ ] `pages/api/appointments/create.ts` — upsert patient + token + appt + billing + return token_url (NO SMS per CHANGE_001)
- [ ] `pages/api/token/[token].ts` — validate token, return safe data
- [ ] `pages/api/consent.ts` — set consent_given=true
- [ ] `pages/api/messages/mark-link-sent.ts` — sets link_sent=true for appointment id
- [ ] `pages/api/messages/mark-reminder-sent.ts` — sets reminder_sent=true for appointment id
- [ ] `pages/api/backup/run.ts` — monthly Google Drive export (cron)
- NOTE: NO pages/api/sms/* per CHANGE_001

## BATCH 5 — Public Pages
- [ ] `pages/index.tsx` (homepage)
- [ ] `pages/blog/index.tsx`
- [ ] `pages/blog/[id].tsx` (ISR, react-markdown)
- [ ] `pages/appt/[token].tsx` (consent flow, getServerSideProps)
- [ ] `pages/login.tsx` (email OTP)

## BATCH 6 — Admin Pages Part 1
- [ ] `pages/admin/index.tsx` — dashboard with "Messages pending" card (link_sent=false + tomorrow reminders) per CHANGE_001
- [ ] `pages/admin/patients/index.tsx`
- [ ] `pages/admin/patients/[id].tsx`
- [ ] `pages/admin/appointments/index.tsx`

## BATCH 7 — Admin Pages Part 2
- [ ] `pages/admin/appointments/new.tsx` — success state: token link + [Copy link] + "Go to Messages →" (NO "SMS sent" per CHANGE_001)
- [ ] `pages/admin/appointments/[id].tsx`
- [ ] `pages/admin/prescriptions/[appointmentId].tsx`
- [ ] `pages/admin/messages/index.tsx` — TWO TABS: Unsent links + Reminders (new page per CHANGE_001)

## BATCH 8 — Admin Pages Part 3
- [ ] `pages/admin/stock/index.tsx`
- [ ] `pages/admin/billing/index.tsx`
- [ ] `pages/admin/posts/index.tsx`
- [ ] `pages/admin/settings/index.tsx` — NO test SMS section per CHANGE_001

---

## DB Schema Note (run in Supabase before build)
Original schema SQL from spec PLUS:
```sql
ALTER TABLE appointments ADD COLUMN link_sent BOOLEAN DEFAULT false;
```

---

## Key Rules (from spec + CHANGE_001)
- Pages Router (NOT App Router)
- Supabase Auth email OTP, no password
- Service role key: API routes ONLY, never in pages/components
- Token page: getServerSideProps, never expose appointment_id to client
- Token page returns: name, date, time, mode, doctor name, complaint, diagnosis/prescriptions (if completed), follow_up_date ONLY
- Aadhaar: last 4 digits only
- Phone: 10-digit string stored, no country code
- Billing row auto-created with appointment
- Colour: green-700 primary, amber-600 accent, gray-50 bg
- All admin tables: overflow-x-auto
- No animations
- Messages page: copy-to-clipboard + mark-as-sent updates local state only (no reload)
