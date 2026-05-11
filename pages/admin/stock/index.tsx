import { useEffect, useState } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { supabase } from '@/lib/supabase'

interface StockItem {
  id: string
  drug_name: string
  quantity: number
  unit: string
  low_stock_threshold: number
  price: number | null
}

type EditField = 'quantity' | 'unit' | 'low_stock_threshold' | 'price'

const emptyForm = { drug_name: '', quantity: 0, unit: 'units', low_stock_threshold: 10, price: '' }

function statusLabel(qty: number, threshold: number) {
  if (qty === 0) return { label: 'Out', cls: 'bg-red-100 text-red-700' }
  if (qty <= threshold) return { label: 'Low', cls: 'bg-amber-100 text-amber-700' }
  return { label: 'OK', cls: 'bg-green-100 text-green-700' }
}

export default function StockPage() {
  const [items, setItems] = useState<StockItem[]>([])
  const [loading, setLoading] = useState(true)
  const [addForm, setAddForm] = useState({ ...emptyForm })
  const [addError, setAddError] = useState('')
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Partial<StockItem>>({})
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [showRestock, setShowRestock] = useState(false)
  const [restockRows, setRestockRows] = useState<{ drug_name: string; qty: number }[]>([{ drug_name: '', qty: 0 }])
  const [restockError, setRestockError] = useState('')
  const [restocking, setRestocking] = useState(false)
  const [restockDone, setRestockDone] = useState(false)

  useEffect(() => { loadStock() }, [])

  async function loadStock() {
    setLoading(true)
    const { data } = await supabase
      .from('medicine_stock')
      .select('*')
      .order('quantity', { ascending: true })
    setItems(data ?? [])
    setLoading(false)
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setAddError('')
    if (!addForm.drug_name.trim()) { setAddError('Drug name is required.'); return }
    setAdding(true)
    const { data, error } = await supabase
      .from('medicine_stock')
      .insert({
        drug_name: addForm.drug_name.trim(),
        quantity: Number(addForm.quantity),
        unit: addForm.unit || 'units',
        low_stock_threshold: Number(addForm.low_stock_threshold),
        price: addForm.price !== '' ? Number(addForm.price) : null,
      })
      .select()
      .single()
    setAdding(false)
    if (error) {
      setAddError(error.message.includes('unique') ? 'A drug with this name already exists.' : error.message)
      return
    }
    setItems(prev => [...prev, data].sort((a, b) => a.quantity - b.quantity))
    setAddForm({ ...emptyForm })
  }

  async function handleBlurSave(id: string) {
    if (!editingId) return
    const { data, error } = await supabase
      .from('medicine_stock')
      .update({ ...editValues, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (!error && data) {
      setItems(prev => prev.map(i => i.id === id ? data : i).sort((a, b) => a.quantity - b.quantity))
    }
    setEditingId(null)
    setEditValues({})
  }

  async function handleDelete(id: string) {
    await supabase.from('medicine_stock').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
    setConfirmDeleteId(null)
  }

  async function handleRestock() {
    setRestockError('')
    const valid = restockRows.filter(r => r.drug_name.trim() && r.qty > 0)
    if (valid.length === 0) { setRestockError('Add at least one item with a quantity greater than 0.'); return }

    const unknown = valid.filter(r => !items.find(i => i.drug_name === r.drug_name))
    if (unknown.length > 0) {
      setRestockError(`Not in stock: ${unknown.map(r => r.drug_name).join(', ')}. Add them first.`)
      return
    }

    setRestocking(true)
    for (const row of valid) {
      const item = items.find(i => i.drug_name === row.drug_name)!
      await supabase
        .from('medicine_stock')
        .update({ quantity: item.quantity + row.qty, updated_at: new Date().toISOString() })
        .eq('id', item.id)
    }
    setRestocking(false)
    setRestockDone(true)
    setRestockRows([{ drug_name: '', qty: 0 }])
    setTimeout(() => { setRestockDone(false); setShowRestock(false) }, 1500)
    loadStock()
  }

  function startEdit(item: StockItem) {
    setEditingId(item.id)
    setEditValues({
      quantity: item.quantity,
      unit: item.unit,
      low_stock_threshold: item.low_stock_threshold,
      price: item.price ?? undefined,
    })
  }

  function EditCell({ field, type = 'text' }: { field: EditField; type?: string }) {
    return (
      <input
        type={type}
        value={(editValues as any)[field] ?? ''}
        onChange={e => setEditValues(v => ({ ...v, [field]: type === 'number' ? Number(e.target.value) : e.target.value }))}
        autoFocus={field === 'quantity'}
        className="border border-gray-300 rounded px-2 py-1 text-sm w-full focus:outline-none focus:ring-1 focus:ring-green-600"
      />
    )
  }

  return (
    <AdminLayout title="Medicine Stock">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Medicine Stock</h1>

      {/* Add drug form */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Add drug</h2>
        <form onSubmit={handleAdd} className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Drug name <span className="text-red-500">*</span></label>
            <input value={addForm.drug_name} onChange={e => setAddForm(f => ({ ...f, drug_name: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Quantity</label>
            <input type="number" min={0} value={addForm.quantity} onChange={e => setAddForm(f => ({ ...f, quantity: Number(e.target.value) }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Unit</label>
            <input value={addForm.unit} onChange={e => setAddForm(f => ({ ...f, unit: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Threshold</label>
            <input type="number" min={0} value={addForm.low_stock_threshold} onChange={e => setAddForm(f => ({ ...f, low_stock_threshold: Number(e.target.value) }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Price (₹)</label>
            <input type="number" min={0} step="0.01" value={addForm.price} onChange={e => setAddForm(f => ({ ...f, price: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600" />
          </div>
          {addError && <p className="md:col-span-5 text-red-600 text-sm">{addError}</p>}
          <div className="md:col-span-5">
            <button type="submit" disabled={adding}
              className="bg-green-700 text-white px-5 py-2 rounded-md text-sm font-semibold hover:bg-green-800 disabled:opacity-50">
              {adding ? 'Adding…' : 'Add drug'}
            </button>
          </div>
        </form>
      </div>

      {/* Restock panel */}
      <div className="bg-white border border-gray-200 rounded-lg mb-6">
        <button
          onClick={() => { setShowRestock(s => !s); setRestockError('') }}
          className="w-full flex items-center justify-between px-5 py-4 text-left"
        >
          <div>
            <p className="font-semibold text-gray-900">Restock items</p>
            <p className="text-xs text-gray-400 mt-0.5">Add incoming quantities to multiple existing stock items at once</p>
          </div>
          <span className="text-gray-400 text-sm">{showRestock ? '▲' : '▼'}</span>
        </button>

        {showRestock && (
          <div className="border-t border-gray-100 p-5 space-y-3">
            {restockRows.map((row, i) => (
              <div key={i} className="flex gap-3 items-center">
                <div className="flex-1">
                  <input
                    list="stock-drugs"
                    value={row.drug_name}
                    onChange={e => setRestockRows(prev => prev.map((r, j) => j === i ? { ...r, drug_name: e.target.value } : r))}
                    placeholder="Drug name"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                  />
                </div>
                <div className="w-32">
                  <input
                    type="number"
                    min={1}
                    value={row.qty || ''}
                    onChange={e => setRestockRows(prev => prev.map((r, j) => j === i ? { ...r, qty: Number(e.target.value) } : r))}
                    placeholder="Units to add"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                  />
                </div>
                {restockRows.length > 1 && (
                  <button
                    onClick={() => setRestockRows(prev => prev.filter((_, j) => j !== i))}
                    className="text-gray-300 hover:text-red-400 text-lg leading-none"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}

            {/* Datalist for autocomplete */}
            <datalist id="stock-drugs">
              {items.map(i => <option key={i.id} value={i.drug_name} />)}
            </datalist>

            <button
              onClick={() => setRestockRows(prev => [...prev, { drug_name: '', qty: 0 }])}
              className="text-sm text-green-700 font-medium hover:underline"
            >
              + Add another item
            </button>

            {restockError && (
              <div className="bg-red-50 border border-red-200 rounded-md px-4 py-3">
                <p className="text-red-700 text-sm">{restockError}</p>
              </div>
            )}

            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={handleRestock}
                disabled={restocking || restockDone}
                className="bg-green-700 text-white px-5 py-2 rounded-md text-sm font-semibold hover:bg-green-800 disabled:opacity-50"
              >
                {restockDone ? 'Updated ✓' : restocking ? 'Updating…' : 'Update stock'}
              </button>
              <button
                onClick={() => { setShowRestock(false); setRestockRows([{ drug_name: '', qty: 0 }]); setRestockError('') }}
                className="text-sm text-gray-400 hover:underline"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Stock table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-xs text-gray-400">Click Edit to update a stock item.</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              {['Drug name', 'Quantity', 'Unit', 'Threshold', 'Price (₹)', 'Status', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-5 py-8 text-center text-sm text-gray-400">Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={7} className="px-5 py-8 text-center text-sm text-gray-400">No stock items yet.</td></tr>
            ) : items.map(item => {
              const { label, cls } = statusLabel(item.quantity, item.low_stock_threshold)
              const isEditing = editingId === item.id
              return (
                <tr key={item.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-3 font-medium text-gray-900">{item.drug_name}</td>
                  <td className="px-4 py-3">
                    {isEditing ? <EditCell field="quantity" type="number" /> : <span className={item.quantity === 0 ? 'text-red-600 font-semibold' : ''}>{item.quantity}</span>}
                  </td>
                  <td className="px-4 py-3">
                    {isEditing ? <EditCell field="unit" /> : item.unit}
                  </td>
                  <td className="px-4 py-3">
                    {isEditing ? <EditCell field="low_stock_threshold" type="number" /> : item.low_stock_threshold}
                  </td>
                  <td className="px-4 py-3">
                    {isEditing ? <EditCell field="price" type="number" /> : item.price != null ? `₹${item.price}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>{label}</span>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {isEditing ? (
                      <span className="inline-flex items-center gap-2">
                        <button onClick={() => handleBlurSave(item.id)} className="text-xs text-green-700 font-semibold hover:underline">Save</button>
                        <button onClick={() => { setEditingId(null); setEditValues({}) }} className="text-xs text-gray-400 hover:underline">Cancel</button>
                      </span>
                    ) : confirmDeleteId === item.id ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="text-xs text-gray-500">Delete?</span>
                        <button onClick={() => handleDelete(item.id)} className="text-xs text-red-600 font-semibold hover:underline">Confirm</button>
                        <button onClick={() => setConfirmDeleteId(null)} className="text-xs text-gray-400 hover:underline">Cancel</button>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-3">
                        <button onClick={() => startEdit(item)} className="text-xs text-green-700 font-medium hover:underline">Edit</button>
                        <button onClick={() => setConfirmDeleteId(item.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  )
}
