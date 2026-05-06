# Saadhya Ayurvedalaya — Setup Guide

Complete steps to take this from a fresh clone to a live production deployment.

---

## Prerequisites

- Node.js 18+ installed
- A [Supabase](https://supabase.com) account (free tier is fine)
- A [Vercel](https://vercel.com) account (free Hobby tier works — see note on cron below)
- A [Google Cloud](https://console.cloud.google.com) account (for Drive backup)
- The GitHub repo: `github.com/sathwiik/sadhya-ayurvedalaya`

---

## Step 1 — Supabase project

1. Go to [supabase.com](https://supabase.com) → New project
2. Note down:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **Anon public key** (Settings → API) → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Service role secret key** (Settings → API) → `SUPABASE_SERVICE_ROLE_KEY`

---

## Step 2 — Run the database schema

In your Supabase project → SQL Editor → run the full block below in one go:

```sql
-- PATIENTS
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  dob DATE,
  address TEXT,
  aadhaar_last4 TEXT CHECK (aadhaar_last4 IS NULL OR length(aadhaar_last4) = 4),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- APPOINTMENTS
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  appt_date DATE NOT NULL,
  time_slot TEXT NOT NULL,
  mode TEXT DEFAULT 'offline' CHECK (mode IN ('online', 'offline')),
  chief_complaint TEXT,
  diagnosis TEXT,
  clinical_notes TEXT,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled','completed','cancelled','no_show')),
  follow_up_date DATE,
  token TEXT UNIQUE,
  token_expires_at TIMESTAMPTZ,
  token_active BOOLEAN DEFAULT true,
  link_sent BOOLEAN DEFAULT false,
  consent_given BOOLEAN DEFAULT false,
  consent_at TIMESTAMPTZ,
  reminder_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX ON appointments(token);
CREATE INDEX ON appointments(appt_date);
CREATE INDEX ON appointments(patient_id);

-- PRESCRIPTIONS
CREATE TABLE prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE NOT NULL,
  drug_name TEXT NOT NULL,
  dosage TEXT,
  frequency TEXT,
  days INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- BILLING
CREATE TABLE billing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID UNIQUE REFERENCES appointments(id) ON DELETE CASCADE NOT NULL,
  patient_id UUID REFERENCES patients(id),
  fee DECIMAL(10,2) DEFAULT 0,
  items JSONB DEFAULT '[]',
  paid BOOLEAN DEFAULT false,
  payment_mode TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- MEDICINE STOCK
CREATE TABLE medicine_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drug_name TEXT NOT NULL UNIQUE,
  quantity INTEGER DEFAULT 0,
  unit TEXT DEFAULT 'units',
  low_stock_threshold INTEGER DEFAULT 10,
  price DECIMAL(10,2),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- CONTENT POSTS
CREATE TABLE content_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT,
  published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- SETTINGS (always one row)
CREATE TABLE settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  clinic_name TEXT DEFAULT 'Saadhya Ayurvedalaya',
  doctor_name TEXT DEFAULT 'Doctor',
  address TEXT,
  phone TEXT,
  email TEXT,
  consent_text TEXT DEFAULT 'Saadhya Ayurvedalaya stores your appointment details to provide you with care. By tapping Agree, you allow us to show your records here. You can request deletion of your data at any time by calling us.'
);
INSERT INTO settings (id) VALUES (1) ON CONFLICT DO NOTHING;

-- ROW LEVEL SECURITY
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicine_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctor full access" ON patients FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Doctor full access" ON appointments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Doctor full access" ON prescriptions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Doctor full access" ON billing FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Doctor full access" ON medicine_stock FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Doctor full access" ON content_posts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Doctor full access" ON settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Public read posts" ON content_posts FOR SELECT TO anon USING (published = true);
```

---

## Step 3 — Create the doctor account

1. Supabase dashboard → Authentication → Users → **Invite user**
2. Enter the doctor's email address
3. That's it — the doctor logs in via magic link (no password ever set)

---

## Step 4 — Google Drive backup (optional but recommended)

1. Go to [Google Cloud Console](https://console.cloud.google.com) → New project (or use existing)
2. Enable the **Google Drive API** for the project
3. IAM & Admin → Service Accounts → Create service account → give it any name
4. On the service account → Keys tab → Add Key → JSON → download the file
5. Open the downloaded JSON file — copy the entire contents → this is your `GOOGLE_SERVICE_ACCOUNT_JSON`
6. In Google Drive, create a folder called `Saadhya Backups`
7. Share that folder with the service account email (found in the JSON as `client_email`) — give it **Editor** access
8. Copy the folder ID from the Drive URL (the long string after `/folders/`) → `GOOGLE_DRIVE_FOLDER_ID`

---

## Step 5 — Fill in environment variables

Create `.env.local` in the project root (already gitignored):

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

GOOGLE_DRIVE_FOLDER_ID=1aBcDeFgHiJkLmNoPqRsTuV
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"..."}

NEXT_PUBLIC_SITE_URL=https://saadhyaayurvedalaya.com

# Generate with: openssl rand -hex 32
CRON_SECRET=your_random_secret_here
```

---

## Step 6 — Run locally to verify

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you should see the homepage.
Open [http://localhost:3000/login](http://localhost:3000/login) — enter the doctor's email, check inbox, click link → should land on `/admin`.

---

## Step 7 — Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub → select `sadhya-ayurvedalaya`
2. Framework preset: **Next.js** (auto-detected)
3. Environment variables → add all variables from Step 5
   - For `GOOGLE_SERVICE_ACCOUNT_JSON`, paste the entire JSON as a single line string
4. Deploy

> **Cron jobs note:** The monthly backup cron in `vercel.json` only runs on **Vercel Pro** ($20/month).
> On the free Hobby plan the cron is silently ignored.
> Free alternative: use [cron-job.org](https://cron-job.org) — create a monthly job hitting
> `https://saadhyaayurvedalaya.com/api/backup/run` with header `Authorization: Bearer YOUR_CRON_SECRET`.

---

## Step 8 — Connect custom domain

1. Vercel project → Settings → Domains → Add `saadhyaayurvedalaya.com`
2. Follow Vercel's DNS instructions (add CNAME or A record at your registrar)
3. HTTPS is provisioned automatically

---

## Step 9 — First-time clinic setup

1. Log in as the doctor → go to `/admin/settings`
2. Fill in: clinic name, doctor name, address, phone, email
3. Edit the consent text if needed (this appears on the patient appointment page)
4. Save

---

## Step 10 — Verify everything works

| Check | How |
|---|---|
| Homepage loads with clinic info | Visit `saadhyaayurvedalaya.com` |
| Doctor can log in | Visit `/login`, enter email, click link in inbox |
| Create a test appointment | `/admin/appointments/new` |
| Token link works | Open the link shown after creating appointment |
| Consent modal appears | Open link in a private/incognito window |
| Messages page shows the appointment | `/admin/messages` → Unsent links tab |
| PDF downloads work | Add a prescription → Download PDF button |
| Backup runs | Hit `GET /api/backup/run` with `Authorization: Bearer CRON_SECRET` header → check Drive folder |

---

## Done

The platform is live. The doctor's workflow from day one:

1. **New patient visit** → `/admin/appointments/new` → fill phone + details → Create
2. **Send link** → `/admin/messages` → Copy message → paste into WhatsApp → Mark as sent
3. **After consultation** → `/admin/appointments/[id]` → set status to Completed, add diagnosis
4. **Add prescriptions** → `/admin/prescriptions/[id]` → add drugs → Download PDF to hand to patient
5. **Collect payment** → `/admin/billing` → Edit fee → Mark as paid
6. **Next-day reminders** → `/admin/messages` → Reminders tab → copy + send → mark sent
