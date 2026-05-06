import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import AdminLayout from '@/components/AdminLayout'
import { supabase } from '@/lib/supabase'

interface Patient {
  id: string
  name: string
  phone: string
  dob: string | null
  address: string | null
  aadhaar_last4: string | null
}

interface Appointment {
  id: string
  appt_date: string
  time_slot: string
  mode: string
  status: string
  diagnosis: string | null
}

const statusColors: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-600',
  no_show: 'bg-amber-100 text-amber-700',
}

export default function PatientDetail() {
  const router = useRouter()
  const { id } = router.query as { id: string }

  const [patient, setPatient] = useState<Patient | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Partial<Patient>>({})
  const [saveLoading, setSaveLoading] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [deleteInput, setDeleteInput] = useState('')
  const [showDeleteBox, setShowDeleteBox] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [totalBilled, setTotalBilled] = useState(0)
  const [totalPaid, setTotalPaid] = useState(0)

  useEffect(() => {
    if (!id) return
    loadPatient()
  }, [id])

  async function loadPatient() {
    const [{ data: p }, { data: appts }, { data: billing }] = await Promise.all([
      supabase.from('patients').select('*').eq('id', id).single(),
      supabase
        .from('appointments')
        .select('id, appt_date, time_slot, mode, status, diagnosis')
        .eq('patient_id', id)
        .order('appt_date', { ascending: false }),
      supabase
        .from('billing')
        .select('fee, paid')
        .eq('patient_id', id),
    ])

    if (!p) { router.push('/admin/patients'); return }
    setPatient(p)
    setForm(p)
    setAppointments(appts ?? [])

    const billed = (billing ?? []).reduce((s, b) => s + Number(b.fee), 0)
    const paid = (billing ?? []).filter(b => b.paid).reduce((s, b) => s + Number(b.fee), 0)
    setTotalBilled(billed)
    setTotalPaid(paid)
  }

  async function handleSave() {
    setSaveError('')
    if (!form.name?.trim() || !form.phone?.trim()) {
      setSaveError('Name and phone are required.')
      return
    }
    const phone = form.phone.replace(/\s+/g, '').replace(/^0+/, '').slice(-10)
    if (phone.length !== 10) { setSaveError('Invalid phone number.'); return }

    setSaveLoading(true)
    const { error } = await supabase
      .from('patients')
      .update({ name: form.name, phone, dob: form.dob || null, address: form.address || null, aadhaar_last4: form.aadhaar_last4 || null })
      .eq('id', id)
    setSaveLoading(false)

    if (error) { setSaveError(error.message); return }
    setPatient({ ...patient!, ...form, phone })
    setEditing(false)
  }

  async function handleDelete() {
    if (deleteInput !== 'DELETE') return
    setDeleteLoading(true)
    await supabase.from('patients').delete().eq('id', id)
    router.push('/admin/patients')
  }

  if (!patient) return <AdminLayout title="Patient"><div className="p-8 text-gray-400 text-sm">Loading…</div></AdminLayout>

  return (
    <AdminLayout title={patient.name}>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/patients" className="text-sm text-gray-400 hover:text-gray-600">← Patients</Link>
        <span className="text-gray-200">/</span>
        <h1 className="text-xl font-bold text-gray-900">{patient.name}</h1>
      </div>

      {/* Patient info card */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Patient info</h2>
          {!editing ? (
            <button onClick={() => setEditing(true)} className="text-sm text-green-700 hover:underline font-medium">Edit</button>
          ) : (
            <div className="flex gap-3">
              <button onClick={handleSave} disabled={saveLoading} className="text-sm text-green-700 font-semibold hover:underline disabled:opacity-50">
                {saveLoading ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => { setEditing(false); setForm(patient); setSaveError('') }} className="text-sm text-gray-400 hover:underline">Cancel</button>
            </div>
          )}
        </div>

        {saveError && <p className="text-red-600 text-sm mb-3">{saveError}</p>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { label: 'Name', key: 'name', type: 'text', required: true },
            { label: 'Phone', key: 'phone', type: 'text', required: true },
            { label: 'Date of birth', key: 'dob', type: 'date' },
            { label: 'Aadhaar last 4', key: 'aadhaar_last4', type: 'text' },
          ].map(({ label, key, type, required }) => (
            <div key={key}>
              <p className="text-xs text-gray-400 mb-1">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</p>
              {editing ? (
                <input
                  type={type}
                  maxLength={key === 'aadhaar_last4' ? 4 : undefined}
                  value={(form as any)[key] ?? ''}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                />
              ) : (
                <p className="text-sm font-medium text-gray-900">{(patient as any)[key] ?? '—'}</p>
              )}
            </div>
          ))}
          <div className="md:col-span-2">
            <p className="text-xs text-gray-400 mb-1">Address</p>
            {editing ? (
              <input
                value={form.address ?? ''}
                onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
              />
            ) : (
              <p className="text-sm font-medium text-gray-900">{patient.address ?? '—'}</p>
            )}
          </div>
        </div>

        {/* Summary stats */}
        <div className="flex gap-6 mt-5 pt-4 border-t border-gray-100">
          <div>
            <p className="text-xs text-gray-400">Total appointments</p>
            <p className="font-semibold text-gray-900">{appointments.length}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Total billed</p>
            <p className="font-semibold text-gray-900">₹{totalBilled.toLocaleString('en-IN')}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Total paid</p>
            <p className="font-semibold text-green-700">₹{totalPaid.toLocaleString('en-IN')}</p>
          </div>
        </div>
      </div>

      {/* Appointment history */}
      <div className="bg-white border border-gray-200 rounded-lg mb-8">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Appointment history</h2>
          <Link href="/admin/appointments/new" className="text-sm text-green-700 hover:underline font-medium">+ New appointment</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Date', 'Time', 'Mode', 'Status', 'Diagnosis', ''].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {appointments.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-6 text-center text-sm text-gray-400">No appointments yet.</td></tr>
              ) : appointments.map(a => (
                <tr key={a.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-5 py-3 text-gray-900">{a.appt_date}</td>
                  <td className="px-5 py-3 text-gray-600">{a.time_slot}</td>
                  <td className="px-5 py-3 text-gray-500 capitalize">{a.mode}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[a.status] ?? ''}`}>
                      {a.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-500 max-w-xs truncate">{a.diagnosis ?? '—'}</td>
                  <td className="px-5 py-3 text-right">
                    <span className="inline-flex gap-3">
                      <Link href={`/admin/appointments/${a.id}`} className="text-xs text-green-700 hover:underline font-medium">Edit</Link>
                      <Link href={`/admin/prescriptions/${a.id}`} className="text-xs text-gray-500 hover:underline">Rx</Link>
                      <Link href={`/admin/billing`} className="text-xs text-gray-500 hover:underline">Bill</Link>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Danger zone */}
      <div className="border border-red-200 rounded-lg p-5">
        <h2 className="font-semibold text-red-700 mb-2">Delete patient</h2>
        {!showDeleteBox ? (
          <button onClick={() => setShowDeleteBox(true)} className="text-sm text-red-600 hover:underline font-medium">
            Delete this patient…
          </button>
        ) : (
          <>
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4 text-sm text-red-800 leading-relaxed">
              This permanently deletes <strong>{patient.name}</strong> and all their appointment, prescription, and billing records. <strong>This cannot be undone.</strong>
            </div>
            <p className="text-sm text-gray-600 mb-2">Type <strong>DELETE</strong> to confirm:</p>
            <div className="flex gap-3 items-center">
              <input
                value={deleteInput}
                onChange={e => setDeleteInput(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-red-400"
                placeholder="DELETE"
              />
              <button
                onClick={handleDelete}
                disabled={deleteInput !== 'DELETE' || deleteLoading}
                className="bg-red-600 text-white px-4 py-1.5 rounded-md text-sm font-semibold hover:bg-red-700 disabled:opacity-40"
              >
                {deleteLoading ? 'Deleting…' : 'Delete permanently'}
              </button>
              <button onClick={() => { setShowDeleteBox(false); setDeleteInput('') }} className="text-sm text-gray-400 hover:underline">Cancel</button>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  )
}
