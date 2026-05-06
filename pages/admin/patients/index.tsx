import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import AdminLayout from '@/components/AdminLayout'
import { supabase } from '@/lib/supabase'

interface Patient {
  id: string
  name: string
  phone: string
  dob: string | null
  created_at: string
  last_appt?: string | null
}

export default function PatientsIndex() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', phone: '', dob: '', address: '', aadhaar_last4: '' })
  const [addError, setAddError] = useState('')
  const [addLoading, setAddLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetchPatients('')
  }, [])

  function handleSearch(val: string) {
    setSearch(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchPatients(val), 300)
  }

  async function fetchPatients(q: string) {
    setLoading(true)
    let query = supabase
      .from('patients')
      .select('id, name, phone, dob, created_at')
      .order('created_at', { ascending: false })
      .limit(100)

    if (q.trim()) {
      query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%`)
    }

    const { data } = await query
    setPatients(data ?? [])
    setLoading(false)
  }

  async function handleDelete(id: string) {
    await supabase.from('patients').delete().eq('id', id)
    setPatients(prev => prev.filter(p => p.id !== id))
    setConfirmDeleteId(null)
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setAddError('')
    if (!addForm.name.trim() || !addForm.phone.trim()) {
      setAddError('Name and phone are required.')
      return
    }
    const phone = addForm.phone.replace(/\s+/g, '').replace(/^0+/, '').slice(-10)
    if (phone.length !== 10) {
      setAddError('Enter a valid 10-digit phone number.')
      return
    }
    setAddLoading(true)
    const { error } = await supabase.from('patients').insert({
      name: addForm.name.trim(),
      phone,
      ...(addForm.dob && { dob: addForm.dob }),
      ...(addForm.address && { address: addForm.address }),
      ...(addForm.aadhaar_last4 && { aadhaar_last4: addForm.aadhaar_last4 }),
    })
    setAddLoading(false)
    if (error) {
      setAddError(error.message.includes('unique') ? 'A patient with this phone number already exists.' : error.message)
      return
    }
    setAddForm({ name: '', phone: '', dob: '', address: '', aadhaar_last4: '' })
    setShowAddForm(false)
    fetchPatients(search)
  }

  return (
    <AdminLayout title="Patients">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Patients</h1>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-green-700 text-white text-sm font-medium px-3 py-1.5 rounded-md hover:bg-green-800"
        >
          + Add patient
        </button>
      </div>

      {/* Add patient form */}
      {showAddForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">New patient</h2>
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Name <span className="text-red-500">*</span></label>
              <input
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Phone <span className="text-red-500">*</span></label>
              <input
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                value={addForm.phone} onChange={e => setAddForm(f => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date of birth</label>
              <input
                type="date"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                value={addForm.dob} onChange={e => setAddForm(f => ({ ...f, dob: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Aadhaar last 4 digits</label>
              <input
                maxLength={4}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                value={addForm.aadhaar_last4} onChange={e => setAddForm(f => ({ ...f, aadhaar_last4: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Address</label>
              <input
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                value={addForm.address} onChange={e => setAddForm(f => ({ ...f, address: e.target.value }))}
              />
            </div>
            {addError && <p className="md:col-span-2 text-red-600 text-sm">{addError}</p>}
            <div className="md:col-span-2 flex gap-3">
              <button type="submit" disabled={addLoading} className="bg-green-700 text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-green-800 disabled:opacity-50">
                {addLoading ? 'Saving…' : 'Save patient'}
              </button>
              <button type="button" onClick={() => setShowAddForm(false)} className="text-sm text-gray-500 hover:text-gray-700">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <div className="mb-4">
        <input
          type="search"
          placeholder="Search by name or phone…"
          value={search}
          onChange={e => handleSearch(e.target.value)}
          className="w-full md:w-80 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
        />
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Name</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Phone</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Date of birth</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Added</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-gray-400">Loading…</td></tr>
            ) : patients.length === 0 ? (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-gray-400">No patients found.</td></tr>
            ) : patients.map(p => (
              <tr key={p.id} className="border-b border-gray-50 last:border-0">
                <td className="px-5 py-3 font-medium text-gray-900">{p.name}</td>
                <td className="px-5 py-3 text-gray-600">{p.phone}</td>
                <td className="px-5 py-3 text-gray-500">{p.dob ?? '—'}</td>
                <td className="px-5 py-3 text-gray-400 text-xs">
                  {new Date(p.created_at).toLocaleDateString('en-IN')}
                </td>
                <td className="px-5 py-3 text-right">
                  {confirmDeleteId === p.id ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="text-xs text-gray-500">Delete?</span>
                      <button onClick={() => handleDelete(p.id)} className="text-xs text-red-600 font-semibold hover:underline">Confirm</button>
                      <button onClick={() => setConfirmDeleteId(null)} className="text-xs text-gray-400 hover:underline">Cancel</button>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-3">
                      <Link href={`/admin/patients/${p.id}`} className="text-xs text-green-700 font-medium hover:underline">View</Link>
                      <button onClick={() => setConfirmDeleteId(p.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  )
}
