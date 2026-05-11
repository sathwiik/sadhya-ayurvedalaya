import type { NextApiRequest, NextApiResponse } from 'next'
import supabaseAdmin from '@/lib/supabaseAdmin'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { appointment_id, collected } = req.body
  if (!appointment_id || typeof collected !== 'boolean') {
    return res.status(400).json({ error: 'Missing appointment_id or collected value' })
  }

  const { error } = await supabaseAdmin
    .from('appointments')
    .update({ medicines_collected: collected })
    .eq('id', appointment_id)

  if (error) {
    console.error('toggle-complete error:', error)
    return res.status(500).json({ error: error.message })
  }

  return res.status(200).json({ success: true })
}
