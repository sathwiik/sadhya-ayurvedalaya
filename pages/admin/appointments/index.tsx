import { useEffect, useState } from 'react'
import Link from 'next/link'
import AdminLayout from '@/components/AdminLayout'
import { supabase } from '@/lib/supabase'

interface Appointment {
  id: string
  appt_date: string
  time_slot: string
  mode: string
  status: string
  patients: { id: string; name: string }
}

type Filter = 'today' | 'week' | 'month' | 'all'

const statusColors: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-600',
  no_show: 'bg-amber-100 text-amber-700',
}

function dateRange(filter: Filter): { from: string; to?: string } {
  const today = new Date()
  const pad = (d: Date) => d.toISOString().slice(0, 10)

  if (filter === 'today') return { from: pad(today), to: pad(today) }
  if (filter === 'week') {
    const end = new Date(today)
    end.setDate(today.getDate() + 6)
    return { from: pad(today), to: pad(end) }
  }
  if (filter === 'month') {
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    return { from: pad(new Date(today.getFullYear(), today.getMonth(), 1)), to: pad(end) }
  }
  return { from: '2000-01-01' }
}

export default function AppointmentsIndex() {
  const [filter, setFilter] = useState<Filter>('today')
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchAppointments() }, [filter])

  async function fetchAppointments() {
    setLoading(true)
    const { from, to } = dateRange(filter)

    let query = supabase
      .from('appointments')
      .select('id, appt_date, time_slot, mode, status, patients(id, name)')
      .gte('appt_date', from)
      .order('appt_date', { ascending: true })
      .order('time_slot', { ascending: true })

    if (to) query = query.lte('appt_date', to)

    const { data } = await query
    setAppointments((data as any) ?? [])
    setLoading(false)
  }

  const filters: { key: Filter; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'This week' },
    { key: 'month', label: 'This month' },
    { key: 'all', label: 'All' },
  ]

  return (
    <AdminLayout title="Appointments">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Appointments</h1>
        <Link
          href="/admin/appointments/new"
          className="bg-green-700 text-white text-sm font-medium px-3 py-1.5 rounded-md hover:bg-green-800"
        >
          + New appointment
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-lg w-fit">
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              filter === f.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Date</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Time</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Patient</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Mode</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-sm text-gray-400">Loading…</td></tr>
            ) : appointments.length === 0 ? (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-sm text-gray-400">No appointments for this period.</td></tr>
            ) : appointments.map(a => (
              <tr key={a.id} className="border-b border-gray-50 last:border-0">
                <td className="px-5 py-3 text-gray-900">{a.appt_date}</td>
                <td className="px-5 py-3 text-gray-700 font-medium">{a.time_slot}</td>
                <td className="px-5 py-3">
                  <Link
                    href={`/admin/patients/${(a.patients as any)?.id}`}
                    className="text-green-700 hover:underline font-medium"
                  >
                    {(a.patients as any)?.name ?? '—'}
                  </Link>
                </td>
                <td className="px-5 py-3 text-gray-500 capitalize">{a.mode}</td>
                <td className="px-5 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[a.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {a.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-5 py-3 text-right">
                  <span className="inline-flex gap-3">
                    <Link href={`/admin/appointments/${a.id}`} className="text-xs text-green-700 font-medium hover:underline">Edit</Link>
                    <Link href={`/admin/prescriptions/${a.id}`} className="text-xs text-gray-500 hover:underline">Rx</Link>
                    <Link href="/admin/billing" className="text-xs text-gray-500 hover:underline">Bill</Link>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  )
}
