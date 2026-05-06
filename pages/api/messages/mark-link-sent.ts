import type { NextApiRequest, NextApiResponse } from 'next'
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const supabase = createServerSupabaseClient({ req, res })
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return res.status(401).json({ error: 'Unauthorized' })

  const { appointment_id } = req.body
  if (!appointment_id) return res.status(400).json({ error: 'Missing appointment_id' })

  const { error } = await supabase
    .from('appointments')
    .update({ link_sent: true })
    .eq('id', appointment_id)

  if (error) {
    console.error('mark-link-sent error:', error)
    return res.status(500).json({ error: 'Failed to update' })
  }

  return res.status(200).json({ success: true })
}
