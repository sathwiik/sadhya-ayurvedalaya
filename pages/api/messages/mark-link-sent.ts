import type { NextApiRequest, NextApiResponse } from 'next'
import supabaseAdmin from '@/lib/supabaseAdmin'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { appointment_id } = req.body
  if (!appointment_id) return res.status(400).json({ error: 'Missing appointment_id' })

  const value = req.body.value !== undefined ? Boolean(req.body.value) : true

  const { error } = await supabaseAdmin
    .from('appointments')
    .update({ link_sent: value })
    .eq('id', appointment_id)

  if (error) {
    console.error('mark-link-sent error:', error)
    return res.status(500).json({ error: 'Failed to update' })
  }

  return res.status(200).json({ success: true })
}
