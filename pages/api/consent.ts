import type { NextApiRequest, NextApiResponse } from 'next'
import supabaseAdmin from '@/lib/supabaseAdmin'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { token } = req.body
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Invalid token' })
  }

  // Verify token exists and is not expired before marking consent
  const { data: appt, error: fetchError } = await supabaseAdmin
    .from('appointments')
    .select('id, token_expires_at')
    .eq('token', token)
    .single()

  if (fetchError || !appt) {
    return res.status(404).json({ error: 'Invalid token' })
  }

  if (new Date(appt.token_expires_at) < new Date()) {
    return res.status(410).json({ error: 'Link expired' })
  }

  const { error } = await supabaseAdmin
    .from('appointments')
    .update({ consent_given: true, consent_at: new Date().toISOString() })
    .eq('token', token)

  if (error) {
    console.error('Consent update error:', error)
    return res.status(500).json({ error: 'Failed to record consent' })
  }

  return res.status(200).json({ success: true })
}
