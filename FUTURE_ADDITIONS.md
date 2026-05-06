# Saadhya Ayurvedalaya — Future Additions & Known Issues

Post-MVP backlog. Do not build these now.

---

## Security & Reliability

**Rate limiting on /api/token/[token]**
No protection against endpoint hammering. nanoid(21) makes brute-force statistically impossible but still worth adding. Use Vercel's edge middleware or upstash/ratelimit post-launch.

**Billing items JSONB validation**
items column is free-form JSON. Validate shape server-side (array of {name: string, amount: number}) before saving to prevent silent PDF rendering errors.

**Database transactions for appointment + billing**
Currently two separate inserts — if billing insert fails, appointment exists with no billing record. Wrap in a Supabase RPC/function as a single transaction post-MVP.

**Token invalidation for cancelled appointments**
Token page currently shows appointment even if status = cancelled/no_show. Post-MVP: show "this appointment was cancelled — please contact the clinic" message instead of appointment details.

---

## Infrastructure

**Migrate @supabase/auth-helpers-nextjs → @supabase/ssr**
auth-helpers-nextjs is deprecated. Works for MVP but will stop receiving security updates. Migrate after MVP is stable.

**Vercel Pro / cron-job.org decision**
Vercel cron requires Pro plan ($20/mo). Current MVP uses basic Vercel cron (free tier = backup may not fire). Post-launch decision: upgrade to Pro, or replace with cron-job.org free scheduler pointing at /api/backup/run with CRON_SECRET header.

**UptimeRobot — site health monitoring**
Add two monitors post-launch:
- HTTP monitor every 5min on main domain → alerts if site goes down
- Monthly HTTP monitor on /api/backup/run with Authorization: Bearer CRON_SECRET header → fires backup independently of Vercel plan
Requires adding /api/health endpoint (returns {ok:true, ts:Date.now()}).

---

## Features (Post-MVP)

- WhatsApp messaging (upgrade from manual copy-paste)
- Online payments / Razorpay integration
- Video call links in appointment details
- Multiple doctor / staff accounts
- Patient self-registration portal
- PDF upload and storage for reports
- Push notifications (PWA)
- Email notifications as backup to SMS
- Appointment booking by patients themselves
- Lab results tracking
- Analytics dashboard (appointments per month, revenue trends)
