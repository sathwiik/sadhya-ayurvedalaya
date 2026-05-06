import type { NextApiRequest, NextApiResponse } from 'next'
import supabaseAdmin from '@/lib/supabaseAdmin'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { token } = req.query
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Invalid token' })
  }

  // Fetch appointment by token using service role (bypasses RLS)
  const { data: appt, error } = await supabaseAdmin
    .from('appointments')
    .select(`
      id,
      appt_date,
      time_slot,
      mode,
      status,
      chief_complaint,
      diagnosis,
      follow_up_date,
      token_expires_at,
      consent_given,
      patients (
        name,
        dob
      ),
      prescriptions (
        drug_name,
        dosage,
        frequency,
        days,
        notes
      )
    `)
    .eq('token', token)
    .single()

  if (error || !appt) {
    return res.status(404).json({ error: 'Invalid link' })
  }

  // Check expiry
  if (new Date(appt.token_expires_at) < new Date()) {
    return res.status(410).json({ error: 'Link expired' })
  }

  // Fetch doctor name and clinic name from settings
  const { data: settings } = await supabaseAdmin
    .from('settings')
    .select('clinic_name, doctor_name, phone, consent_text')
    .eq('id', 1)
    .single()

  // Only return prescriptions and diagnosis if appointment is completed
  // and never return clinical_notes, phone, billing, or aadhaar
  const isCompleted = appt.status === 'completed'
  const isCancelled = appt.status === 'cancelled' || appt.status === 'no_show'

  return res.status(200).json({
    consent_given: appt.consent_given,
    consent_text: settings?.consent_text ?? '',
    clinic_name: settings?.clinic_name ?? 'Saadhya Ayurvedalaya',
    clinic_phone: settings?.phone ?? '',
    doctor_name: settings?.doctor_name ?? 'Doctor',
    patient_name: (appt.patients as any)?.name ?? '',
    appt_date: appt.appt_date,
    time_slot: appt.time_slot,
    mode: appt.mode,
    status: appt.status,
    is_cancelled: isCancelled,
    chief_complaint: appt.chief_complaint,
    diagnosis: isCompleted ? appt.diagnosis : null,
    follow_up_date: isCompleted ? appt.follow_up_date : null,
    prescriptions: isCompleted ? appt.prescriptions : [],
  })
}
