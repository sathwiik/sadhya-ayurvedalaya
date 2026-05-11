import type { NextApiRequest, NextApiResponse } from 'next'
import supabaseAdmin from '@/lib/supabaseAdmin'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { appointment_id, drug_name, quantity, source, vendor, unit_price } = req.body

  if (!appointment_id || !drug_name || !quantity || !source) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const qty = Number(quantity)
  const price = Number(unit_price ?? 0)

  if (qty < 1) return res.status(400).json({ error: 'Quantity must be at least 1' })

  if (source === 'in_house') {
    const { data: stock } = await supabaseAdmin
      .from('medicine_stock')
      .select('id, quantity')
      .eq('drug_name', drug_name)
      .single()

    if (!stock) {
      return res.status(400).json({ error: `"${drug_name}" not found in stock. Add it to stock first.` })
    }

    if (stock.quantity < qty) {
      return res.status(400).json({
        error: `Insufficient stock — only ${stock.quantity} unit(s) of "${drug_name}" available.`,
      })
    }

    // Deduct stock
    const { error: stockErr } = await supabaseAdmin
      .from('medicine_stock')
      .update({ quantity: stock.quantity - qty, updated_at: new Date().toISOString() })
      .eq('id', stock.id)

    if (stockErr) return res.status(500).json({ error: 'Failed to update stock' })

    // Add line item to billing and update fee
    const { data: billing } = await supabaseAdmin
      .from('billing')
      .select('id, items, fee')
      .eq('appointment_id', appointment_id)
      .single()

    if (billing) {
      const currentItems = Array.isArray(billing.items) ? billing.items : []
      const itemAmount = price * qty
      const newItem = { name: `${drug_name} ×${qty}`, amount: itemAmount }
      await supabaseAdmin
        .from('billing')
        .update({
          items: [...currentItems, newItem],
          fee: Number(billing.fee) + itemAmount,
        })
        .eq('id', billing.id)
    }
  }

  const { data, error } = await supabaseAdmin
    .from('prescription_dispensing')
    .insert({
      appointment_id,
      drug_name,
      quantity: qty,
      source,
      vendor: vendor?.trim() || null,
      unit_price: price,
    })
    .select()
    .single()

  if (error) {
    console.error('dispensing insert error:', error)
    return res.status(500).json({ error: error.message ?? 'Failed to save dispensing record' })
  }

  return res.status(200).json({ success: true, record: data })
}
