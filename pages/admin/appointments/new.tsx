import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import AdminLayout from '@/components/AdminLayout'
import { supabase } from '@/lib/supabase'

const TIME_SLOTS = Array.from({ length: 19 }, (_, i) => {
  const totalMins = 9 * 60 + i * 30
  const h = String(Math.floor(totalMins / 60)).padStart(2, '0')
  const m = String(totalMins % 60).padStart(2, '0')
  return `${h}:${m}`
})

const FREQUENCIES = ['Once daily', 'Twice daily', 'Thrice daily', 'Morning and night', 'As needed', 'Other']

interface FoundPatient {
  id: string
  name: string
  dob: string | null
  phone: string
}

type Step = 1 | 2
type Result = { token_url: string; appointment_id: string }

export default function NewAppointment() {
  const [step, setStep] = useState<Step>(1)

  // Step 1 — patient
  const [phone, setPhone] = useState('')
  const [foundPatient, setFoundPatient] = useState<FoundPatient | null>(null)
  const [lookingUp, setLookingUp] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDob, setNewDob] = useState('')
  const [newAddress, setNewAddress] = useState('')
  const [newAadhaar, setNewAadhaar] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Step 2 — appointment
  const [apptDate, setApptDate] = useState(new Date().toISOString().slice(0, 10))
  const [timeSlot, setTimeSlot] = useState('09:00')
  const [mode, setMode] = useState<'offline' | 'online'>('offline')
  const [complaint, setComplaint] = useState('')

  // Submit
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<Result | null>(null)
  const [copied, setCopied] = useState(false)

  function handlePhoneChange(val: string) {
    const cleaned = val.replace(/\D/g, '').slice(0, 10)
    setPhone(cleaned)
    setFoundPatient(null)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (cleaned.length >= 6) {
      debounceRef.current = setTimeout(() => lookupPhone(cleaned), 400)
    }
  }

  async function lookupPhone(p: string) {
    setLookingUp(true)
    const { data } = await supabase
      .from('patients')
      .select('id, name, dob, phone')
      .eq('phone', p)
      .single()
    setLookingUp(false)
    if (data) {
      setFoundPatient(data)
      setNewName(data.name)
    }
  }

  function step1Valid() {
    const p = phone.replace(/\D/g, '')
    if (p.length !== 10) return false
    if (!foundPatient && !newName.trim()) return false
    return true
  }

  async function handleSubmit() {
    setError('')
    if (!complaint.trim()) { setError('Chief complaint is required.'); return }
    setSubmitting(true)

    const res = await fetch('/api/appointments/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patient_name: foundPatient?.name ?? newName,
        patient_phone: phone,
        appt_date: apptDate,
        time_slot: timeSlot,
        mode,
        chief_complaint: complaint,
        ...(newDob && { dob: newDob }),
        ...(newAddress && { address: newAddress }),
        ...(newAadhaar && { aadhaar_last4: newAadhaar }),
      }),
    })

    const json = await res.json()
    setSubmitting(false)

    if (!res.ok) { setError(json.error ?? 'Something went wrong.'); return }
    setResult(json)
  }

  async function copyLink() {
    if (!result) return
    await navigator.clipboard.writeText(result.token_url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Success state
  if (result) {
    return (
      <AdminLayout title="Appointment created">
        <div className="max-w-lg">
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-4">
            <p className="font-semibold text-green-800 mb-4">Appointment created.</p>
            <p className="text-xs font-medium text-gray-500 mb-1">Token link</p>
            <a
              href={result.token_url}
              target="_blank"
              rel="noreferrer"
              className="block font-mono text-sm text-green-700 break-all mb-3 hover:underline"
            >
              {result.token_url}
            </a>
            <button
              onClick={copyLink}
              className="bg-white border border-green-300 text-green-700 text-sm font-semibold px-4 py-2 rounded-md hover:bg-green-50"
            >
              {copied ? 'Copied ✓' : 'Copy link'}
            </button>
          </div>
          <p className="text-sm text-gray-600 mb-6">
            Go to{' '}
            <Link href="/admin/messages" className="text-green-700 font-medium hover:underline">
              Messages →
            </Link>{' '}
            to send this to the patient.
          </p>
          <div className="flex gap-3">
            <Link href="/admin/appointments" className="text-sm text-green-700 hover:underline font-medium">
              View all appointments
            </Link>
            <span className="text-gray-300">|</span>
            <button
              onClick={() => {
                setResult(null); setStep(1); setPhone(''); setFoundPatient(null)
                setNewName(''); setNewDob(''); setNewAddress(''); setNewAadhaar('')
                setComplaint(''); setCopied(false)
              }}
              className="text-sm text-gray-500 hover:underline"
            >
              Create another
            </button>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="New appointment">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/appointments" className="text-sm text-gray-400 hover:text-gray-600">← Appointments</Link>
        <span className="text-gray-200">/</span>
        <h1 className="text-xl font-bold text-gray-900">New appointment</h1>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-3 mb-8">
        {[1, 2].map(s => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
              step === s ? 'bg-green-700 text-white' : step > s ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
            }`}>{s}</div>
            <span className={`text-sm ${step === s ? 'font-semibold text-gray-900' : 'text-gray-400'}`}>
              {s === 1 ? 'Patient' : 'Appointment'}
            </span>
            {s < 2 && <span className="text-gray-200 ml-1">›</span>}
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6 max-w-lg">

        {/* ── STEP 1 ── */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Phone number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={e => handlePhoneChange(e.target.value)}
                placeholder="10-digit mobile number"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
              />
              {lookingUp && <p className="text-xs text-gray-400 mt-1">Looking up…</p>}
              {foundPatient && (
                <div className="mt-2 bg-green-50 border border-green-200 rounded-md px-3 py-2 flex items-center gap-2">
                  <span className="text-xs font-semibold text-green-700 bg-green-100 rounded-full px-2 py-0.5">Existing patient</span>
                  <span className="text-sm text-gray-800 font-medium">{foundPatient.name}</span>
                  {foundPatient.dob && <span className="text-xs text-gray-400">DOB: {foundPatient.dob}</span>}
                </div>
              )}
            </div>

            {!foundPatient && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Patient name <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Date of birth</label>
                    <input type="date" value={newDob} onChange={e => setNewDob(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Aadhaar last 4</label>
                    <input maxLength={4} value={newAadhaar}
                      onChange={e => setNewAadhaar(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Address</label>
                  <input value={newAddress} onChange={e => setNewAddress(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600" />
                </div>
              </>
            )}

            <button
              onClick={() => setStep(2)}
              disabled={!step1Valid()}
              className="w-full bg-green-700 text-white py-2.5 rounded-md font-semibold text-sm hover:bg-green-800 disabled:opacity-40"
            >
              Next — appointment details
            </button>
          </div>
        )}

        {/* ── STEP 2 ── */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Date <span className="text-red-500">*</span></label>
                <input type="date" value={apptDate} onChange={e => setApptDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Time slot <span className="text-red-500">*</span></label>
                <select value={timeSlot} onChange={e => setTimeSlot(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600">
                  {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">Mode <span className="text-red-500">*</span></label>
              <div className="flex gap-4">
                {(['offline', 'online'] as const).map(m => (
                  <label key={m} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" value={m} checked={mode === m} onChange={() => setMode(m)}
                      className="accent-green-700" />
                    <span className="text-sm text-gray-700">{m === 'offline' ? 'In-clinic' : 'Online'}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Chief complaint <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={complaint}
                onChange={e => setComplaint(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 resize-none"
              />
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <div className="flex gap-3 pt-1">
              <button onClick={() => setStep(1)} className="text-sm text-gray-500 hover:underline">← Back</button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 bg-green-700 text-white py-2.5 rounded-md font-semibold text-sm hover:bg-green-800 disabled:opacity-50"
              >
                {submitting ? 'Creating…' : 'Create appointment'}
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
