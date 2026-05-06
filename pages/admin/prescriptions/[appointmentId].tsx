import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import AdminLayout from '@/components/AdminLayout'
import { supabase } from '@/lib/supabase'

const PDFDownloadLink = dynamic(
  () => import('@react-pdf/renderer').then(m => m.PDFDownloadLink),
  { ssr: false }
)
import PrescriptionPDF from '@/components/PrescriptionPDF'

const FREQUENCIES = ['Once daily', 'Twice daily', 'Thrice daily', 'Morning and night', 'As needed', 'Other']

interface Prescription {
  id: string
  drug_name: string
  dosage: string
  frequency: string
  days: number
  notes: string
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

export default function PrescriptionsPage() {
  const router = useRouter()
  const { appointmentId } = router.query as { appointmentId: string }

  const [appt, setAppt] = useState<ApptSummary | null>(null)
  const [rxList, setRxList] = useState<Prescription[]>([])
  const [settings, setSettings] = useState<ClinicSettings>({ clinic_name: '', doctor_name: '', address: '', phone: '' })
  const [drugNames, setDrugNames] = useState<string[]>([])
  const [addForm, setAddForm] = useState({ ...emptyRx })
  const [addError, setAddError] = useState('')
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Prescription>>({})
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const drugInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!appointmentId) return
    loadAll()
  }, [appointmentId])

  async function loadAll() {
    const [{ data: apptData }, { data: rxData }, { data: settingsData }, { data: stockData }] =
      await Promise.all([
        supabase.from('appointments').select('id, appt_date, diagnosis, patients(name, dob)').eq('id', appointmentId).single(),
        supabase.from('prescriptions').select('*').eq('appointment_id', appointmentId).order('created_at'),
        supabase.from('settings').select('clinic_name, doctor_name, address, phone').eq('id', 1).single(),
        supabase.from('medicine_stock').select('drug_name').order('drug_name'),
      ])

    if (!apptData) { router.push('/admin/appointments'); return }
    setAppt(apptData as any)
    setRxList(rxData ?? [])
    if (settingsData) setSettings(settingsData as any)
    setDrugNames((stockData ?? []).map(s => s.drug_name))
  }

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

  const patient = appt ? (appt.patients as any) : null

  const rxInput = (
    label: string, field: keyof typeof addForm, value: string | number,
    onChange: (v: string) => void, type = 'text'
  ) => (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {field === 'frequency' ? (
        <select value={value} onChange={e => onChange(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600">
          {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
      ) : (
        <input type={type} value={value} onChange={e => onChange(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600" />
      )}
    </div>
  )

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

      {/* Existing prescriptions */}
      <div className="bg-white border border-gray-200 rounded-lg mb-6 overflow-x-auto">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Prescriptions ({rxList.length})</h2>
          {rxList.length > 0 && (
            <PDFDownloadLink
              document={
                <PrescriptionPDF
                  clinicName={settings.clinic_name}
                  doctorName={settings.doctor_name}
                  address={settings.address}
                  phone={settings.phone}
                  patientName={patient?.name ?? ''}
                  dob={patient?.dob ?? undefined}
                  apptDate={appt.appt_date}
                  diagnosis={appt.diagnosis ?? undefined}
                  prescriptions={rxList}
                />
              }
              fileName={`prescription_${(patient?.name ?? 'patient').replace(/\s+/g, '_')}_${appt.appt_date}.pdf`}
            >
              {({ loading }) => (
                <button className="text-sm bg-green-700 text-white px-3 py-1.5 rounded-md font-medium hover:bg-green-800">
                  {loading ? 'Preparing…' : 'Download PDF'}
                </button>
              )}
            </PDFDownloadLink>
          )}
        </div>

        {rxList.length === 0 ? (
          <div className="px-5 py-6 text-center text-sm text-gray-400">No prescriptions added yet.</div>
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

      {/* Add drug form */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Add drug</h2>
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
            {rxInput('Dosage', 'dosage', addForm.dosage, v => setAddForm(f => ({ ...f, dosage: v })))}
            {rxInput('Frequency', 'frequency', addForm.frequency, v => setAddForm(f => ({ ...f, frequency: v })))}
            {rxInput('Days', 'days', addForm.days, v => setAddForm(f => ({ ...f, days: Number(v) })), 'number')}
            {rxInput('Notes', 'notes', addForm.notes, v => setAddForm(f => ({ ...f, notes: v })))}
          </div>

          {addError && <p className="text-red-600 text-sm">{addError}</p>}
          <button type="submit" disabled={adding}
            className="bg-green-700 text-white px-5 py-2 rounded-md text-sm font-semibold hover:bg-green-800 disabled:opacity-50">
            {adding ? 'Adding…' : 'Add drug'}
          </button>
        </form>
      </div>
    </AdminLayout>
  )
}
