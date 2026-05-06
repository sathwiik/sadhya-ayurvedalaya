import type { NextApiRequest, NextApiResponse } from 'next'
import supabaseAdmin from '@/lib/supabaseAdmin'
import { generateToken } from '@/lib/token'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const {
    patient_name,
    patient_phone,
    appt_date,
    time_slot,
    mode = 'offline',
    chief_complaint,
    dob,
    address,
    aadhaar_last4,
  } = req.body

  // Validate required fields
  if (!patient_name || !patient_phone || !appt_date || !time_slot || !chief_complaint) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  // Normalise phone — strip spaces, leading zeros, keep 10 digits
  const phone = String(patient_phone).replace(/\s+/g, '').replace(/^0+/, '').slice(-10)

  if (phone.length !== 10) {
    return res.status(400).json({ error: 'Invalid phone number' })
  }

  // 1. Upsert patient by phone
  const { data: patient, error: patientError } = await supabaseAdmin
    .from('patients')
    .upsert(
      {
        name: patient_name,
        phone,
        ...(dob && { dob }),
        ...(address && { address }),
        ...(aadhaar_last4 && { aadhaar_last4 }),
      },
      { onConflict: 'phone', ignoreDuplicates: false }
    )
    .select('id')
    .single()

  if (patientError || !patient) {
    console.error('Patient upsert error:', patientError)
    return res.status(500).json({ error: 'Failed to save patient' })
  }

  // 2. Generate token
  const token = generateToken()
  const tokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

  // 3. Insert appointment
  const { data: appointment, error: apptError } = await supabaseAdmin
    .from('appointments')
    .insert({
      patient_id: patient.id,
      appt_date,
      time_slot,
      mode,
      chief_complaint,
      token,
      token_expires_at: tokenExpiresAt,
      status: 'scheduled',
    })
    .select('id')
    .single()

  if (apptError || !appointment) {
    console.error('Appointment insert error:', apptError)
    return res.status(500).json({ error: 'Failed to create appointment' })
  }

  // 4. Insert empty billing record
  const { error: billingError } = await supabaseAdmin
    .from('billing')
    .insert({
      appointment_id: appointment.id,
      patient_id: patient.id,
      fee: 0,
      items: [],
    })

  if (billingError) {
    // Non-fatal — log but don't fail the request. Billing can be created manually.
    console.error('Billing insert error:', billingError)
  }

  const tokenUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/appt/${token}`

  return res.status(200).json({
    success: true,
    appointment_id: appointment.id,
    token_url: tokenUrl,
  })
}
