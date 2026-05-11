import type { NextApiRequest, NextApiResponse } from 'next'
import supabaseAdmin from '@/lib/supabaseAdmin'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { dispensing_id } = req.body
  if (!dispensing_id) return res.status(400).json({ error: 'Missing dispensing_id' })

  const { data: record } = await supabaseAdmin
    .from('prescription_dispensing')
    .select('*')
    .eq('id', dispensing_id)
    .single()

  if (!record) return res.status(404).json({ error: 'Record not found' })

  if (record.source === 'in_house') {
    // Restore stock
    const { data: stock } = await supabaseAdmin
      .from('medicine_stock')
      .select('id, quantity')
      .eq('drug_name', record.drug_name)
      .single()

    if (stock) {
      await supabaseAdmin
        .from('medicine_stock')
        .update({ quantity: stock.quantity + record.quantity, updated_at: new Date().toISOString() })
        .eq('id', stock.id)
    }

    // Remove billing line item and subtract from fee
    const { data: billing } = await supabaseAdmin
      .from('billing')
      .select('id, items, fee')
      .eq('appointment_id', record.appointment_id)
      .single()

    if (billing) {
      const currentItems = Array.isArray(billing.items) ? billing.items : []
      const itemName = `${record.drug_name} ×${record.quantity}`
      const idx = currentItems.findIndex((i: any) => i.name === itemName)
      const itemAmount = idx >= 0 ? Number(currentItems[idx].amount) : 0
      const newItems = idx >= 0 ? currentItems.filter((_: any, j: number) => j !== idx) : currentItems
      const newFee = Math.max(0, Number(billing.fee) - itemAmount)
      await supabaseAdmin
        .from('billing')
        .update({ items: newItems, fee: newFee })
        .eq('id', billing.id)
    }
  }

  const { error } = await supabaseAdmin
    .from('prescription_dispensing')
    .delete()
    .eq('id', dispensing_id)

  if (error) {
    console.error('dispensing delete error:', error)
    return res.status(500).json({ error: 'Failed to remove record' })
  }

  return res.status(200).json({ success: true })
}
