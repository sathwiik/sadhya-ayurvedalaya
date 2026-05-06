# Change 001 — Replace Automated SMS with Manual Messages Page

Applied to: Saadhya Ayurvedalaya codebase
Date noted: 2026-05-06
Status: TO APPLY during build

---

## Database
- ADD COLUMN `appointments.link_sent BOOLEAN DEFAULT false`
- Keep `reminder_sent` column (now marked manually, not by cron)

## Remove entirely
- `lib/sms.ts`
- `pages/api/sms/reminder.ts`
- `pages/api/sms/test.ts`
- SMS cron entries in `vercel.json` (keep backup cron)
- From `.env.local`: MSG91_AUTH_KEY, MSG91_SENDER_ID, MSG91_TOKEN_TEMPLATE_ID, MSG91_REMINDER_TEMPLATE_ID
- Settings page: "Send test SMS" section

## Update: pages/api/appointments/create.ts
Keep: upsert patient, generate token, insert appointment, insert billing, return token_url
Remove: all MSG91/SMS calls

## Update: pages/admin/appointments/new.tsx success state
Show: "Appointment created." + token link (clickable) + [Copy link] button + "Go to Messages →"
Remove: "SMS sent to [phone]" text and "Resend SMS" button

## Add: pages/admin/messages/index.tsx
Two tabs:

### Tab 1 — Unsent links
Query: appointments WHERE link_sent=false AND token IS NOT NULL ORDER BY created_at DESC
Join: patients (name, phone)
Card shows:
- Patient name + phone (tap-to-call)
- Appointment date, time, mode
- Pre-written message block (monospace):
  "Hi [name], your appointment at Saadhya Ayurvedalaya is confirmed for [date] at [time]. View details: [SITE_URL]/appt/[token]"
- [Copy message] → clipboard, changes to "Copied ✓" for 2s
- [Mark as sent] → sets link_sent=true, removes card from local state (no reload)
Empty state: "All links sent. Nothing pending."

### Tab 2 — Reminders
Query: appointments WHERE appt_date = CURRENT_DATE+1 AND status='scheduled' AND reminder_sent=false ORDER BY time_slot ASC
Join: patients (name, phone)
Card shows:
- Patient name + phone
- Time, mode
- Pre-written message: "Hi [name], reminder: appointment at Saadhya Ayurvedalaya is tomorrow at [time]. See you then!"
- [Copy message] + [Mark as sent] same as Tab 1 (sets reminder_sent=true)
Empty state: "No reminders due for tomorrow."

Page behaviour:
- Default tab: Unsent links
- Tab labels show count badge: "Unsent links (3)", "Reminders (2)"
- Cards removed from local state on mark-as-sent (no reload)

## Update: pages/admin/index.tsx (Dashboard)
Add "Messages pending" card:
- Count = (link_sent=false AND token IS NOT NULL) + (appt_date=tomorrow AND reminder_sent=false AND status=scheduled)
- Clicking card → /admin/messages

## Update: AdminLayout sidebar
Add "Messages" link between Appointments and Stock → /admin/messages
