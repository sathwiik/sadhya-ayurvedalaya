import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import AdminLayout from '@/components/AdminLayout'
import { supabase } from '@/lib/supabase'

const TIME_SLOTS = Array.from({ length: 19 }, (_, i) => {
  const totalMins = 9 * 60 + i * 30
  const h = String(Math.floor(totalMins / 60)).padStart(2, '0')
  const m = String(totalMins % 60).padStart(2, '0')
  return `${h}:${m}`
})

const STATUSES = ['scheduled', 'completed', 'cancelled', 'no_show']

interface Appointment {
  id: string
  appt_date: string
  time_slot: string
  mode: string
  status: string
  chief_complaint: string
  diagnosis: string
  clinical_notes: string
  follow_up_date: string
  token: string
  patients: { id: string; name: string; phone: string }
}

export default function EditAppointment() {
  const router = useRouter()
  const { id } = router.query as { id: string }
  const [appt, setAppt] = useState<Appointment | null>(null)
  const [form, setForm] = useState<Partial<Appointment>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)

  useEffect(() => {
    if (!id) return
    supabase
      .from('appointments')
      .select('*, patients(id, name, phone)')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        if (!data) { router.push('/admin/appointments'); return }
        setAppt(data as any)
        setForm(data as any)
      })
  }, [id])

  async function handleSave() {
    setError('')
    setSaving(true)
    const { error } = await supabase
      .from('appointments')
      .update({
        appt_date: form.appt_date,
        time_slot: form.time_slot,
        mode: form.mode,
        status: form.status,
        chief_complaint: form.chief_complaint,
        diagnosis: form.diagnosis || null,
        clinical_notes: form.clinical_notes || null,
        follow_up_date: form.follow_up_date || null,
      })
      .eq('id', id)
    setSaving(false)
    if (error) { setError(error.message); return }
    setAppt(prev => ({ ...prev!, ...form }))
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  function field(key: keyof Appointment, label: string, type: string = 'text') {
    return (
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
        <input
          type={type}
          value={(form as any)[key] ?? ''}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
        />
      </div>
    )
  }

  async function handleResendLink() {
    if (!appt?.token) return
    setResending(true)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin
    const tokenUrl = `${siteUrl}/appt/${appt.token}`
    await navigator.clipboard.writeText(tokenUrl).catch(() => {})
    setResending(false)
    setResent(true)
    setTimeout(() => setResent(false), 3000)
  }

  if (!appt) return <AdminLayout title="Appointment"><div className="p-8 text-gray-400 text-sm">Loading…</div></AdminLayout>

  const patient = appt.patients as any

  return (
    <AdminLayout title="Edit appointment">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/appointments" className="text-sm text-gray-400 hover:text-gray-600">← Appointments</Link>
        <span className="text-gray-200">/</span>
        <h1 className="text-xl font-bold text-gray-900">
          {patient?.name} — {appt.appt_date}
        </h1>
      </div>

      {/* Quick links */}
      <div className="flex gap-3 mb-6">
        <Link href={`/admin/prescriptions/${id}`}
          className="text-sm bg-white border border-gray-200 rounded-md px-3 py-1.5 text-gray-700 hover:border-green-300 font-medium">
          Prescriptions →
        </Link>
        <Link href="/admin/billing"
          className="text-sm bg-white border border-gray-200 rounded-md px-3 py-1.5 text-gray-700 hover:border-green-300 font-medium">
          Billing →
        </Link>
        <Link href={`/admin/patients/${patient?.id}`}
          className="text-sm bg-white border border-gray-200 rounded-md px-3 py-1.5 text-gray-700 hover:border-green-300 font-medium">
          Patient record →
        </Link>
      </div>

      {form.status === 'completed' && (
        <div className="bg-amber-50 border border-amber-200 rounded-md px-4 py-3 mb-5 text-sm text-amber-800">
          Appointment marked complete — remember to add prescriptions and mark billing as paid.
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg p-6 max-w-lg space-y-4 mb-6">
        <div className="grid grid-cols-2 gap-4">
          {field('appt_date', 'Date', 'date')}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Time slot</label>
            <select value={form.time_slot ?? ''} onChange={e => setForm(f => ({ ...f, time_slot: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600">
              {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Mode</label>
            <select value={form.mode ?? 'offline'} onChange={e => setForm(f => ({ ...f, mode: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600">
              <option value="offline">In-clinic</option>
              <option value="online">Online</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
            <select value={form.status ?? 'scheduled'} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600">
              {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Chief complaint</label>
          <textarea rows={2} value={form.chief_complaint ?? ''}
            onChange={e => setForm(f => ({ ...f, chief_complaint: e.target.value }))}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 resize-none" />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Diagnosis</label>
          <textarea rows={2} value={form.diagnosis ?? ''}
            onChange={e => setForm(f => ({ ...f, diagnosis: e.target.value }))}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 resize-none" />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Clinical notes <span className="text-gray-400">(private)</span></label>
          <textarea rows={3} value={form.clinical_notes ?? ''}
            onChange={e => setForm(f => ({ ...f, clinical_notes: e.target.value }))}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 resize-none" />
        </div>

        {field('follow_up_date', 'Follow-up date', 'date')}

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <div className="flex items-center gap-4 pt-1">
          <button onClick={handleSave} disabled={saving}
            className="bg-green-700 text-white px-5 py-2.5 rounded-md font-semibold text-sm hover:bg-green-800 disabled:opacity-50">
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          {saved && <span className="text-green-600 text-sm font-medium">Saved ✓</span>}
        </div>
      </div>

      {/* Resend token link */}
      {appt.token && (
        <div className="bg-white border border-gray-200 rounded-lg p-5 max-w-lg">
          <h2 className="font-semibold text-gray-900 mb-1 text-sm">Patient link</h2>
          <p className="text-xs text-gray-400 mb-3">Copy the appointment link to send to the patient manually.</p>
          <button
            onClick={handleResendLink}
            disabled={resending}
            className="bg-white border border-gray-300 text-gray-700 text-sm font-medium px-4 py-2 rounded-md hover:border-green-400 hover:text-green-700"
          >
            {resent ? 'Link copied ✓' : resending ? 'Copying…' : 'Copy token link'}
          </button>
        </div>
      )}
    </AdminLayout>
  )
}
