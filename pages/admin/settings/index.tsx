import { useEffect, useState } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { supabase } from '@/lib/supabase'

interface Settings {
  clinic_name: string
  doctor_name: string
  address: string
  phone: string
  email: string
  hero_tagline: string
  about_text: string
  consent_text: string
  default_fee: number
}

const defaults: Settings = {
  clinic_name: 'Saadhya Ayurvedalaya',
  doctor_name: 'Doctor',
  address: '',
  phone: '',
  email: '',
  hero_tagline: 'Traditional Ayurvedic healing for modern wellness. Rooted in nature, guided by science.',
  about_text: '',
  consent_text: 'Saadhya Ayurvedalaya stores your appointment details to provide you with care. By tapping Agree, you allow us to show your records here. You can request deletion of your data at any time by calling us.',
  default_fee: 0,
}

export default function SettingsPage() {
  const [form, setForm] = useState<Settings>({ ...defaults })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.from('settings').select('*').eq('id', 1).single().then(({ data }) => {
      if (data) setForm({ ...defaults, ...data })
      setLoading(false)
    })
  }, [])

  function set(key: keyof Settings) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.clinic_name.trim()) { setError('Clinic name is required.'); return }
    setSaving(true)
    const { error } = await supabase
      .from('settings')
      .upsert({ id: 1, ...form })
    setSaving(false)
    if (error) { setError(error.message); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (loading) return <AdminLayout title="Settings"><div className="p-8 text-sm text-gray-400">Loading…</div></AdminLayout>

  return (
    <AdminLayout title="Settings">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Settings</h1>

      <form onSubmit={handleSave} className="space-y-6 max-w-lg">
        {/* Clinic info */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Clinic information</h2>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Clinic name <span className="text-red-500">*</span></label>
            <input value={form.clinic_name} onChange={set('clinic_name')}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Doctor name</label>
            <input value={form.doctor_name} onChange={set('doctor_name')}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Address</label>
            <input value={form.address} onChange={set('address')}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
              <input value={form.phone} onChange={set('phone')}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input type="email" value={form.email} onChange={set('email')}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Hero tagline</label>
            <input value={form.hero_tagline} onChange={set('hero_tagline')}
              placeholder="Traditional Ayurvedic healing for modern wellness…"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600" />
            <p className="text-xs text-gray-400 mt-1">Subtitle shown under the clinic name on the homepage.</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">About text</label>
            <textarea
              rows={5}
              value={form.about_text}
              onChange={set('about_text')}
              placeholder={`Dr. ${form.doctor_name} is a qualified Ayurvedic practitioner…`}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 resize-y"
            />
            <p className="text-xs text-gray-400 mt-1">Shown in the About section on the homepage.</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Default appointment fee (₹)</label>
            <input
              type="number"
              min={0}
              value={form.default_fee}
              onChange={e => setForm(f => ({ ...f, default_fee: Number(e.target.value) }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
            />
            <p className="text-xs text-gray-400 mt-1">Auto-filled into billing when a new appointment is created. Can be changed per-appointment in billing.</p>
          </div>
        </div>

        {/* Consent text */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-3">
          <div>
            <h2 className="font-semibold text-gray-900">Patient consent text</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              This appears in the privacy notice popup when patients open their appointment link for the first time.
            </p>
          </div>
          <textarea
            rows={5}
            value={form.consent_text}
            onChange={set('consent_text')}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 resize-y"
          />
          <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
            <p className="text-xs font-medium text-gray-500 mb-1">Preview</p>
            <p className="text-xs text-gray-600 leading-relaxed">{form.consent_text}</p>
          </div>
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <div className="flex items-center gap-4">
          <button type="submit" disabled={saving}
            className="bg-green-700 text-white px-6 py-2.5 rounded-md text-sm font-semibold hover:bg-green-800 disabled:opacity-50">
            {saving ? 'Saving…' : 'Save settings'}
          </button>
          {saved && <span className="text-green-600 text-sm font-medium">Saved ✓</span>}
        </div>
      </form>
    </AdminLayout>
  )
}
