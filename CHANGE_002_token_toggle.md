# Change 002 — Token Access Toggle (Doctor-controlled)

Date: 2026-05-06

## Intent
- Tokens are NEVER deleted from the database
- Doctor can enable/disable a patient's ability to view their appointment via the token link
- Toggle is per-appointment, on the edit appointment page
- Disabled links show a polite "access disabled" message (not "expired" or "invalid")

## Database migration (run in Supabase SQL editor)
```sql
ALTER TABLE appointments ADD COLUMN token_active BOOLEAN DEFAULT true;
```

## Files changed

### pages/api/token/[token].ts
- After validating token exists and not expired, also check token_active = true
- If token_active = false: return { error: 'Access disabled', disabled: true } with status 403

### pages/appt/[token].tsx
- Add new prop: disabled (boolean)
- New render state: disabled=true → show "Your appointment details are currently unavailable.
  Please contact [clinic_name] for more information." + clinic phone
- Different message from expired/invalid — does not say "link expired"

### pages/admin/appointments/[id].tsx
- Add toggle under the "Patient link" section
- Label: "Token link access"
- Toggle on = patient can view their appointment page
- Toggle off = patient sees "unavailable" message
- Saves immediately on toggle (no Save button needed for this field)
- Show current state clearly: green "Active" / gray "Disabled"
