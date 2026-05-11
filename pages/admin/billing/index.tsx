import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import AdminLayout from '@/components/AdminLayout'
import { supabase } from '@/lib/supabase'

// ReceiptDownloadButton wraps PDFDownloadLink + ReceiptPDF in a single dynamic import
// to avoid react-pdf running in SSR context (useSyncExternalStore error)
const ReceiptDownloadButton = dynamic(
  () => import('@/components/ReceiptDownloadButton'),
  { ssr: false }
)

interface BillingItem { name: string; amount: number }
interface BillingRow {
  id: string
  appointment_id: string
  fee: number
  items: BillingItem[]
  paid: boolean
  payment_mode: string | null
  paid_at: string | null
  created_at: string
  appointments: { appt_date: string; patients: { name: string } }
}

type Filter = 'all' | 'unpaid' | 'paid'
const PAYMENT_MODES = ['Cash', 'UPI', 'Card']

export default function BillingPage() {
  const [rows, setRows] = useState<BillingRow[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState({ clinic_name: '', doctor_name: '' })
  const [unpaidTotal, setUnpaidTotal] = useState(0)

  // Edit modal state
  const [editRow, setEditRow] = useState<BillingRow | null>(null)
  const [editFee, setEditFee] = useState('')
  const [editItems, setEditItems] = useState<BillingItem[]>([])
  const [editSaving, setEditSaving] = useState(false)

  // Pay modal state
  const [payRow, setPayRow] = useState<BillingRow | null>(null)
  const [payMode, setPayMode] = useState('Cash')
  const [paySaving, setPaySaving] = useState(false)

  useEffect(() => {
    loadAll()
    supabase.from('settings').select('clinic_name, doctor_name').eq('id', 1).single()
      .then(({ data }) => { if (data) setSettings(data as any) })
  }, [])

  async function loadAll() {
    setLoading(true)
    const { data } = await supabase
      .from('billing')
      .select('*, appointments(appt_date, patients(name))')
      .order('created_at', { ascending: false })
    const all = (data ?? []) as BillingRow[]
    setRows(all)
    setUnpaidTotal(all.filter(r => !r.paid).reduce((s, r) => s + Number(r.fee), 0))
    setLoading(false)
  }

  const filtered = rows.filter(r =>
    filter === 'all' ? true : filter === 'unpaid' ? !r.paid : r.paid
  )

  async function saveEdit() {
    if (!editRow) return
    setEditSaving(true)
    const { data } = await supabase
      .from('billing')
      .update({ fee: Number(editFee), items: editItems })
      .eq('id', editRow.id)
      .select('*, appointments(appt_date, patients(name))')
      .single()
    setEditSaving(false)
    if (data) {
      setRows(prev => prev.map(r => r.id === editRow.id ? data as BillingRow : r))
      setUnpaidTotal(prev => {
        const diff = Number(editFee) - Number(editRow.fee)
        return !editRow.paid ? prev + diff : prev
      })
    }
    setEditRow(null)
  }

  async function savePay() {
    if (!payRow) return
    setPaySaving(true)
    const now = new Date().toISOString()
    const { data } = await supabase
      .from('billing')
      .update({ paid: true, payment_mode: payMode.toLowerCase(), paid_at: now })
      .eq('id', payRow.id)
      .select('*, appointments(appt_date, patients(name))')
      .single()
    setPaySaving(false)
    if (data) {
      setRows(prev => prev.map(r => r.id === payRow.id ? data as BillingRow : r))
      setUnpaidTotal(prev => prev - Number(payRow.fee))
    }
    setPayRow(null)
  }

  function openEdit(row: BillingRow) {
    setEditRow(row)
    setEditFee(String(row.fee))
    setEditItems(Array.isArray(row.items) ? [...row.items] : [])
  }

  return (
    <AdminLayout title="Billing">
      <h1 className="text-xl font-bold text-gray-900 mb-4">Billing</h1>

      {/* Summary */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-5 py-4 mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Total unpaid</p>
          <p className="text-2xl font-bold text-amber-800">₹{unpaidTotal.toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-lg w-fit">
        {(['all', 'unpaid', 'paid'] as Filter[]).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${
              filter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              {['Date', 'Patient', 'Fee (₹)', 'Status', 'Payment', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-sm text-gray-400">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-sm text-gray-400">No billing records.</td></tr>
            ) : filtered.map(row => (
              <tr key={row.id} className="border-b border-gray-50 last:border-0">
                <td className="px-4 py-3 text-gray-700">
                  {row.appointments?.appt_date
                    ? new Date(row.appointments.appt_date).toLocaleDateString('en-GB')
                    : '—'}
                </td>
                <td className="px-4 py-3 font-medium text-gray-900">{(row.appointments?.patients as any)?.name ?? '—'}</td>
                <td className="px-4 py-3 text-gray-900 font-medium">₹{Number(row.fee).toLocaleString('en-IN')}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${row.paid ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {row.paid ? 'Paid' : 'Unpaid'}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 capitalize">{row.payment_mode ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex gap-3 justify-end w-full">
                    <button onClick={() => openEdit(row)} className="text-xs text-green-700 font-medium hover:underline">Edit</button>
                    {!row.paid && (
                      <button onClick={() => { setPayRow(row); setPayMode('Cash') }}
                        className="text-xs text-gray-700 font-medium hover:underline">Mark paid</button>
                    )}
                    {row.paid && (
                      <ReceiptDownloadButton
                        row={row}
                        clinicName={settings.clinic_name}
                        doctorName={settings.doctor_name}
                      />
                    )}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit fee modal */}
      {editRow && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm shadow-xl">
            <h2 className="font-bold text-gray-900 mb-4">Edit billing</h2>
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-600 mb-1">Total fee (₹)</label>
              <input type="number" value={editFee} onChange={e => setEditFee(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600" />
            </div>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-gray-600">Line items</label>
                <button onClick={() => setEditItems(i => [...i, { name: '', amount: 0 }])}
                  className="text-xs text-green-700 hover:underline font-medium">+ Add item</button>
              </div>
              <div className="space-y-2">
                {editItems.map((item, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input placeholder="Item name" value={item.name}
                      onChange={e => setEditItems(prev => prev.map((it, j) => j === i ? { ...it, name: e.target.value } : it))}
                      className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-600" />
                    <input type="number" placeholder="₹" value={item.amount}
                      onChange={e => setEditItems(prev => prev.map((it, j) => j === i ? { ...it, amount: Number(e.target.value) } : it))}
                      className="w-20 border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-600" />
                    <button onClick={() => setEditItems(prev => prev.filter((_, j) => j !== i))}
                      className="text-red-400 hover:text-red-600 text-xs">✕</button>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={saveEdit} disabled={editSaving}
                className="flex-1 bg-green-700 text-white py-2 rounded-md text-sm font-semibold hover:bg-green-800 disabled:opacity-50">
                {editSaving ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => setEditRow(null)} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-md text-sm font-medium hover:bg-gray-200">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Mark paid modal */}
      {payRow && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm shadow-xl">
            <h2 className="font-bold text-gray-900 mb-1">Mark as paid</h2>
            <p className="text-sm text-gray-500 mb-4">₹{Number(payRow.fee).toLocaleString('en-IN')} — {(payRow.appointments?.patients as any)?.name}</p>
            <div className="mb-5">
              <label className="block text-xs font-medium text-gray-600 mb-2">Payment mode</label>
              <div className="flex gap-3">
                {PAYMENT_MODES.map(m => (
                  <label key={m} className="flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" value={m} checked={payMode === m} onChange={() => setPayMode(m)} className="accent-green-700" />
                    <span className="text-sm text-gray-700">{m}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={savePay} disabled={paySaving}
                className="flex-1 bg-green-700 text-white py-2 rounded-md text-sm font-semibold hover:bg-green-800 disabled:opacity-50">
                {paySaving ? 'Saving…' : 'Confirm payment'}
              </button>
              <button onClick={() => setPayRow(null)} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-md text-sm font-medium hover:bg-gray-200">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
