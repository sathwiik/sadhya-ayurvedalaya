import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import AdminLayout from '@/components/AdminLayout'
import { supabase } from '@/lib/supabase'

const PrescriptionDownloadButton = dynamic(
  () => import('@/components/PrescriptionDownloadButton'),
  { ssr: false }
)

const FREQUENCIES = ['Once daily', 'Twice daily', 'Thrice daily', 'Morning and night', 'As needed', 'Other']

interface Prescription {
  id: string
  drug_name: string
  dosage: string
  frequency: string
  days: number
  notes: string
}

interface DispenseRecord {
  id: string
  drug_name: string
  quantity: number
  source: 'in_house' | 'external'
  vendor: string | null
  unit_price: number
}

interface StockItem {
  drug_name: string
  quantity: number
  price: number | null
}

interface ApptSummary {
  id: string
  appt_date: string
  diagnosis: string | null
  patients: { name: string; dob: string | null }
}

interface ClinicSettings {
  clinic_name: string
  doctor_name: string
  address: string
  phone: string
}

const emptyRx = { drug_name: '', dosage: '', frequency: 'Once daily', days: 7, notes: '' }
const emptyDispense: { drug_name: string; quantity: number; source: 'in_house' | 'external'; vendor: string; unit_price: number } = { drug_name: '', quantity: 1, source: 'in_house', vendor: '', unit_price: 0 }

export default function PrescriptionsPage() {
  const router = useRouter()
  const { appointmentId } = router.query as { appointmentId: string }

  const [appt, setAppt] = useState<ApptSummary | null>(null)
  const [rxList, setRxList] = useState<Prescription[]>([])
  const [dispenseList, setDispenseList] = useState<DispenseRecord[]>([])
  const [settings, setSettings] = useState<ClinicSettings>({ clinic_name: '', doctor_name: '', address: '', phone: '' })
  const [stockItems, setStockItems] = useState<StockItem[]>([])
  const [drugNames, setDrugNames] = useState<string[]>([])

  // Dosage form state
  const [addForm, setAddForm] = useState({ ...emptyRx })
  const [addError, setAddError] = useState('')
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Prescription>>({})
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const drugInputRef = useRef<HTMLInputElement>(null)

  // Dispense form state
  const [dispenseForm, setDispenseForm] = useState({ ...emptyDispense })
  const [dispenseError, setDispenseError] = useState('')
  const [dispensing, setDispensing] = useState(false)
  const [confirmDispenseDeleteId, setConfirmDispenseDeleteId] = useState<string | null>(null)
  const [dispenseSuggestions, setDispenseSuggestions] = useState<string[]>([])
  const [showDispenseSuggestions, setShowDispenseSuggestions] = useState(false)

  useEffect(() => {
    if (!appointmentId) return
    loadAll()
  }, [appointmentId])

  async function loadAll() {
    const [{ data: apptData }, { data: rxData }, { data: dispenseData }, { data: settingsData }, { data: stockData }] =
      await Promise.all([
        supabase.from('appointments').select('id, appt_date, diagnosis, patients(name, dob)').eq('id', appointmentId).single(),
        supabase.from('prescriptions').select('*').eq('appointment_id', appointmentId).order('created_at'),
        supabase.from('prescription_dispensing').select('*').eq('appointment_id', appointmentId).order('created_at'),
        supabase.from('settings').select('clinic_name, doctor_name, address, phone').eq('id', 1).single(),
        supabase.from('medicine_stock').select('drug_name, quantity, price').order('drug_name'),
      ])

    if (!apptData) { router.push('/admin/appointments'); return }
    setAppt(apptData as any)
    setRxList(rxData ?? [])
    setDispenseList(dispenseData ?? [])
    if (settingsData) setSettings(settingsData as any)
    const stock = stockData ?? []
    setStockItems(stock as StockItem[])
    setDrugNames(stock.map(s => s.drug_name))
  }

  // ── Dosage autocomplete ──
  function handleDrugInput(val: string, target: 'add' | 'edit') {
    if (target === 'add') setAddForm(f => ({ ...f, drug_name: val }))
    else setEditForm(f => ({ ...f, drug_name: val }))
    if (val.length > 0) {
      setSuggestions(drugNames.filter(n => n.toLowerCase().includes(val.toLowerCase())).slice(0, 6))
      setShowSuggestions(true)
    } else {
      setShowSuggestions(false)
    }
  }

  function selectSuggestion(name: string, target: 'add' | 'edit') {
    if (target === 'add') setAddForm(f => ({ ...f, drug_name: name }))
    else setEditForm(f => ({ ...f, drug_name: name }))
    setShowSuggestions(false)
  }

  // ── Dosage CRUD ──
  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setAddError('')
    if (!addForm.drug_name.trim()) { setAddError('Drug name is required.'); return }
    setAdding(true)
    const { data, error } = await supabase
      .from('prescriptions')
      .insert({ appointment_id: appointmentId, ...addForm })
      .select()
      .single()
    setAdding(false)
    if (error) { setAddError(error.message); return }
    setRxList(prev => [...prev, data])
    setAddForm({ ...emptyRx })
  }

  async function handleEditSave(id: string) {
    const { data, error } = await supabase
      .from('prescriptions')
      .update(editForm)
      .eq('id', id)
      .select()
      .single()
    if (error) return
    setRxList(prev => prev.map(r => r.id === id ? data : r))
    setEditingId(null)
  }

  async function handleDelete(id: string) {
    await supabase.from('prescriptions').delete().eq('id', id)
    setRxList(prev => prev.filter(r => r.id !== id))
    setConfirmDeleteId(null)
  }

  // ── Dispense autocomplete ──
  function handleDispenseDrugInput(val: string) {
    setDispenseForm(f => ({ ...f, drug_name: val, unit_price: 0 }))
    if (val.length > 0) {
      setDispenseSuggestions(drugNames.filter(n => n.toLowerCase().includes(val.toLowerCase())).slice(0, 6))
      setShowDispenseSuggestions(true)
    } else {
      setShowDispenseSuggestions(false)
    }
  }

  function selectDispenseSuggestion(name: string) {
    const stock = stockItems.find(s => s.drug_name === name)
    setDispenseForm(f => ({
      ...f,
      drug_name: name,
      unit_price: dispenseForm.source === 'in_house' ? (stock?.price ?? 0) : f.unit_price,
    }))
    setShowDispenseSuggestions(false)
  }

  function handleDispenseSourceChange(source: 'in_house' | 'external') {
    const stock = stockItems.find(s => s.drug_name === dispenseForm.drug_name)
    setDispenseForm(f => ({
      ...f,
      source,
      unit_price: source === 'in_house' ? (stock?.price ?? 0) : 0,
      vendor: source === 'in_house' ? '' : f.vendor,
    }))
  }

  // ── Dispense add/remove ──
  async function handleDispenseAdd(e: React.FormEvent) {
    e.preventDefault()
    setDispenseError('')
    if (!dispenseForm.drug_name.trim()) { setDispenseError('Drug name is required.'); return }
    if (dispenseForm.quantity < 1) { setDispenseError('Quantity must be at least 1.'); return }
    setDispensing(true)
    const res = await fetch('/api/dispensing/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appointment_id: appointmentId,
        drug_name: dispenseForm.drug_name,
        quantity: dispenseForm.quantity,
        source: dispenseForm.source,
        vendor: dispenseForm.vendor || null,
        unit_price: dispenseForm.unit_price,
      }),
    })
    const json = await res.json()
    setDispensing(false)
    if (!res.ok) { setDispenseError(json.error ?? 'Something went wrong.'); return }
    setDispenseList(prev => [...prev, json.record])
    // Refresh stock quantities
    const { data: stockData } = await supabase.from('medicine_stock').select('drug_name, quantity, price').order('drug_name')
    if (stockData) setStockItems(stockData as StockItem[])
    setDispenseForm({ ...emptyDispense })
  }

  async function handleDispenseRemove(id: string) {
    const res = await fetch('/api/dispensing/remove', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dispensing_id: id }),
    })
    if (!res.ok) return
    setDispenseList(prev => prev.filter(r => r.id !== id))
    // Refresh stock quantities
    const { data: stockData } = await supabase.from('medicine_stock').select('drug_name, quantity, price').order('drug_name')
    if (stockData) setStockItems(stockData as StockItem[])
    setConfirmDispenseDeleteId(null)
  }

  const patient = appt ? (appt.patients as any) : null

  if (!appt) return <AdminLayout title="Prescriptions"><div className="p-8 text-sm text-gray-400">Loading…</div></AdminLayout>

  return (
    <AdminLayout title="Prescriptions">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/admin/appointments/${appointmentId}`} className="text-sm text-gray-400 hover:text-gray-600">← Appointment</Link>
        <span className="text-gray-200">/</span>
        <h1 className="text-xl font-bold text-gray-900">Prescriptions</h1>
      </div>

      {/* Appointment summary */}
      <div className="bg-white border border-gray-200 rounded-lg px-5 py-4 mb-6 flex flex-wrap gap-6 text-sm">
        <div><p className="text-xs text-gray-400">Patient</p><p className="font-semibold text-gray-900">{patient?.name}</p></div>
        <div><p className="text-xs text-gray-400">Date</p><p className="font-semibold text-gray-900">{appt.appt_date}</p></div>
        {appt.diagnosis && <div><p className="text-xs text-gray-400">Diagnosis</p><p className="font-semibold text-gray-900">{appt.diagnosis}</p></div>}
      </div>

      {/* ── SECTION 1: DOSAGE INSTRUCTIONS ── */}
      <div className="bg-white border border-gray-200 rounded-lg mb-6 overflow-x-auto">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">Dosage Instructions</h2>
            <p className="text-xs text-gray-400 mt-0.5">Medical prescription — what to take and how</p>
          </div>
          {rxList.length > 0 && (
            <PrescriptionDownloadButton
              clinicName={settings.clinic_name}
              doctorName={settings.doctor_name}
              address={settings.address}
              phone={settings.phone}
              patientName={patient?.name ?? ''}
              dob={patient?.dob ?? undefined}
              apptDate={appt.appt_date}
              diagnosis={appt.diagnosis ?? undefined}
              prescriptions={rxList}
              fileName={`prescription_${(patient?.name ?? 'patient').replace(/\s+/g, '_')}_${appt.appt_date}.pdf`}
            />
          )}
        </div>

        {rxList.length === 0 ? (
          <div className="px-5 py-6 text-center text-sm text-gray-400">No dosage instructions added yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Drug', 'Dosage', 'Frequency', 'Days', 'Notes', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rxList.map(rx => (
                <tr key={rx.id} className="border-b border-gray-50 last:border-0">
                  {editingId === rx.id ? (
                    <>
                      {(['drug_name', 'dosage', 'notes'] as const).map(f => (
                        <td key={f} className="px-4 py-2">
                          <input value={(editForm as any)[f] ?? ''}
                            onChange={e => setEditForm(p => ({ ...p, [f]: e.target.value }))}
                            className="border border-gray-300 rounded px-2 py-1 text-sm w-full focus:outline-none focus:ring-1 focus:ring-green-600" />
                        </td>
                      ))}
                      <td className="px-4 py-2">
                        <select value={editForm.frequency ?? ''} onChange={e => setEditForm(p => ({ ...p, frequency: e.target.value }))}
                          className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none">
                          {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        <input type="number" value={editForm.days ?? ''} onChange={e => setEditForm(p => ({ ...p, days: Number(e.target.value) }))}
                          className="border border-gray-300 rounded px-2 py-1 text-sm w-16 focus:outline-none" />
                      </td>
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        <button onClick={() => handleEditSave(rx.id)} className="text-xs text-green-700 font-semibold hover:underline mr-2">Save</button>
                        <button onClick={() => setEditingId(null)} className="text-xs text-gray-400 hover:underline">Cancel</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 font-medium text-gray-900">{rx.drug_name}</td>
                      <td className="px-4 py-3 text-gray-600">{rx.dosage}</td>
                      <td className="px-4 py-3 text-gray-600">{rx.frequency}</td>
                      <td className="px-4 py-3 text-gray-600">{rx.days}</td>
                      <td className="px-4 py-3 text-gray-500">{rx.notes || '—'}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {confirmDeleteId === rx.id ? (
                          <span className="inline-flex items-center gap-2">
                            <span className="text-xs text-gray-500">Delete?</span>
                            <button onClick={() => handleDelete(rx.id)} className="text-xs text-red-600 font-semibold hover:underline">Confirm</button>
                            <button onClick={() => setConfirmDeleteId(null)} className="text-xs text-gray-400 hover:underline">Cancel</button>
                          </span>
                        ) : (
                          <span className="inline-flex gap-3">
                            <button onClick={() => { setEditingId(rx.id); setEditForm(rx) }} className="text-xs text-green-700 font-medium hover:underline">Edit</button>
                            <button onClick={() => setConfirmDeleteId(rx.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                          </span>
                        )}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add dosage form */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 mb-8">
        <h2 className="font-semibold text-gray-900 mb-4">Add dosage instruction</h2>
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="relative">
            <label className="block text-xs font-medium text-gray-600 mb-1">Drug name <span className="text-red-500">*</span></label>
            <input
              ref={drugInputRef}
              value={addForm.drug_name}
              onChange={e => handleDrugInput(e.target.value, 'add')}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              onFocus={() => addForm.drug_name && setShowSuggestions(true)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
              placeholder="Start typing to search stock…"
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-10 top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-md mt-0.5 max-h-40 overflow-y-auto">
                {suggestions.map(s => (
                  <button key={s} type="button" onMouseDown={() => selectSuggestion(s, 'add')}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-green-50 hover:text-green-700">
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Dosage</label>
              <input value={addForm.dosage} onChange={e => setAddForm(f => ({ ...f, dosage: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Frequency</label>
              <select value={addForm.frequency} onChange={e => setAddForm(f => ({ ...f, frequency: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600">
                {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Days</label>
              <input type="number" value={addForm.days} onChange={e => setAddForm(f => ({ ...f, days: Number(e.target.value) }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
              <input value={addForm.notes} onChange={e => setAddForm(f => ({ ...f, notes: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600" />
            </div>
          </div>

          {addError && <p className="text-red-600 text-sm">{addError}</p>}
          <button type="submit" disabled={adding}
            className="bg-green-700 text-white px-5 py-2 rounded-md text-sm font-semibold hover:bg-green-800 disabled:opacity-50">
            {adding ? 'Adding…' : 'Add drug'}
          </button>
        </form>
      </div>

      {/* ── SECTION 2: MEDICINE DISPENSING ── */}
      <div className="bg-white border border-gray-200 rounded-lg mb-6 overflow-x-auto">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Medicine Dispensing</h2>
          <p className="text-xs text-gray-400 mt-0.5">Units dispensed — in-house stock or external vendor</p>
        </div>

        {dispenseList.length === 0 ? (
          <div className="px-5 py-6 text-center text-sm text-gray-400">No medicines dispensed yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Drug', 'Qty', 'Source', 'Vendor', 'Unit price', 'Total', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dispenseList.map(d => (
                <tr key={d.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-3 font-medium text-gray-900">{d.drug_name}</td>
                  <td className="px-4 py-3 text-gray-600">{d.quantity}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      d.source === 'in_house'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {d.source === 'in_house' ? 'In-house' : 'External'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{d.vendor ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">₹{Number(d.unit_price).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">₹{(Number(d.unit_price) * d.quantity).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {confirmDispenseDeleteId === d.id ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="text-xs text-gray-500">Remove?</span>
                        <button onClick={() => handleDispenseRemove(d.id)} className="text-xs text-red-600 font-semibold hover:underline">Confirm</button>
                        <button onClick={() => setConfirmDispenseDeleteId(null)} className="text-xs text-gray-400 hover:underline">Cancel</button>
                      </span>
                    ) : (
                      <button onClick={() => setConfirmDispenseDeleteId(d.id)} className="text-xs text-red-500 hover:underline">Remove</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add dispense form */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Dispense medicine</h2>
        <form onSubmit={handleDispenseAdd} className="space-y-4">

          {/* Source toggle */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Source</label>
            <div className="flex gap-4">
              {(['in_house', 'external'] as const).map(src => (
                <label key={src} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" value={src} checked={dispenseForm.source === src}
                    onChange={() => handleDispenseSourceChange(src)} className="accent-green-700" />
                  <span className="text-sm text-gray-700">{src === 'in_house' ? 'In-house (clinic stock)' : 'External vendor'}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Drug name */}
            <div className="relative">
              <label className="block text-xs font-medium text-gray-600 mb-1">Drug name <span className="text-red-500">*</span></label>
              <input
                value={dispenseForm.drug_name}
                onChange={e => handleDispenseDrugInput(e.target.value)}
                onBlur={() => setTimeout(() => setShowDispenseSuggestions(false), 150)}
                onFocus={() => dispenseForm.drug_name && setShowDispenseSuggestions(true)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                placeholder={dispenseForm.source === 'in_house' ? 'Search clinic stock…' : 'Enter medicine name…'}
              />
              {showDispenseSuggestions && dispenseSuggestions.length > 0 && (
                <div className="absolute z-10 top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-md mt-0.5 max-h-40 overflow-y-auto">
                  {dispenseSuggestions.map(s => {
                    const item = stockItems.find(i => i.drug_name === s)
                    return (
                      <button key={s} type="button" onMouseDown={() => selectDispenseSuggestion(s)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-green-50 hover:text-green-700 flex justify-between">
                        <span>{s}</span>
                        {item && (
                          <span className={`text-xs ${item.quantity <= 0 ? 'text-red-400' : 'text-gray-400'}`}>
                            {item.quantity} in stock
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Units <span className="text-red-500">*</span></label>
              <input
                type="number"
                min={1}
                value={dispenseForm.quantity}
                onChange={e => setDispenseForm(f => ({ ...f, quantity: Number(e.target.value) }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
              />
              {dispenseForm.source === 'in_house' && dispenseForm.drug_name && (() => {
                const item = stockItems.find(s => s.drug_name === dispenseForm.drug_name)
                if (!item) return null
                const insufficient = dispenseForm.quantity > item.quantity
                return (
                  <p className={`text-xs mt-1 ${insufficient ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                    {insufficient
                      ? `Only ${item.quantity} unit(s) in stock`
                      : `${item.quantity} unit(s) available`}
                  </p>
                )
              })()}
            </div>

            {/* Unit price */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Unit price (₹){dispenseForm.source === 'in_house' && ' — auto-filled from stock'}
              </label>
              <input
                type="number"
                min={0}
                value={dispenseForm.unit_price}
                onChange={e => setDispenseForm(f => ({ ...f, unit_price: Number(e.target.value) }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
              />
              {dispenseForm.quantity > 0 && dispenseForm.unit_price > 0 && (
                <p className="text-xs text-gray-400 mt-1">
                  Total: ₹{(dispenseForm.unit_price * dispenseForm.quantity).toLocaleString('en-IN')}
                </p>
              )}
            </div>

            {/* Vendor — external only */}
            {dispenseForm.source === 'external' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Vendor / pharmacy</label>
                <input
                  value={dispenseForm.vendor}
                  onChange={e => setDispenseForm(f => ({ ...f, vendor: e.target.value }))}
                  placeholder="e.g. Apollo Pharmacy"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                />
              </div>
            )}
          </div>

          {dispenseError && (
            <div className="bg-red-50 border border-red-200 rounded-md px-4 py-3">
              <p className="text-red-700 text-sm">{dispenseError}</p>
            </div>
          )}

          <button type="submit" disabled={dispensing}
            className="bg-green-700 text-white px-5 py-2 rounded-md text-sm font-semibold hover:bg-green-800 disabled:opacity-50">
            {dispensing ? 'Saving…' : 'Add dispensing record'}
          </button>
        </form>
      </div>
    </AdminLayout>
  )
}
