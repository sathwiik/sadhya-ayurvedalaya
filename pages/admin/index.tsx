import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import AdminLayout from '@/components/AdminLayout'
import { supabase } from '@/lib/supabase'

interface TodayAppointment {
  id: string
  time_slot: string
  mode: string
  status: string
  patients: { name: string }
}

interface DashboardStats {
  todayCount: number
  unpaidTotal: number
  lowStockCount: number
  messagesPending: number
}

const statusColors: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-600',
  no_show: 'bg-amber-100 text-amber-700',
}

function greeting(name: string) {
  const h = new Date().getHours()
  const time = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'
  return `Good ${time}, Dr. ${name}`
}

export default function Dashboard() {
  const router = useRouter()
  const [doctorName, setDoctorName] = useState('Doctor')
  const [stats, setStats] = useState<DashboardStats>({
    todayCount: 0, unpaidTotal: 0, lowStockCount: 0, messagesPending: 0,
  })
  const [todayAppts, setTodayAppts] = useState<TodayAppointment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    const today = new Date().toISOString().slice(0, 10)
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)

    const [
      { data: settingsData },
      { data: todayData },
      { data: billingData },
      { data: stockData },
      { data: unsentLinks },
      { data: reminders },
    ] = await Promise.all([
      supabase.from('settings').select('doctor_name').eq('id', 1).single(),
      supabase
        .from('appointments')
        .select('id, time_slot, mode, status, patients(name)')
        .eq('appt_date', today)
        .order('time_slot'),
      supabase
        .from('billing')
        .select('fee')
        .eq('paid', false),
      supabase
        .from('medicine_stock')
        .select('quantity, low_stock_threshold'),
      supabase
        .from('appointments')
        .select('id')
        .eq('link_sent', false)
        .not('token', 'is', null),
      supabase
        .from('appointments')
        .select('id')
        .eq('appt_date', tomorrow)
        .eq('status', 'scheduled')
        .eq('reminder_sent', false),
    ])

    if (settingsData?.doctor_name) setDoctorName(settingsData.doctor_name)

    const unpaidTotal = (billingData ?? []).reduce((sum, b) => sum + (Number(b.fee) || 0), 0)
    const lowStockCount = (stockData ?? []).filter(s => s.quantity <= s.low_stock_threshold).length
    const messagesPending = (unsentLinks?.length ?? 0) + (reminders?.length ?? 0)

    setStats({
      todayCount: todayData?.length ?? 0,
      unpaidTotal,
      lowStockCount,
      messagesPending,
    })
    setTodayAppts((todayData as any) ?? [])
    setLoading(false)
  }

  return (
    <AdminLayout title="Dashboard">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">{greeting(doctorName)}</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Link href="/admin/appointments" className="bg-white border border-gray-200 rounded-lg p-4 hover:border-green-300 transition-colors">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Today&apos;s appointments</p>
          <p className="text-3xl font-bold text-gray-900">{loading ? '—' : stats.todayCount}</p>
        </Link>

        <Link href="/admin/billing" className="bg-white border border-gray-200 rounded-lg p-4 hover:border-green-300 transition-colors">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Unpaid billing</p>
          <p className="text-3xl font-bold text-gray-900">
            {loading ? '—' : `₹${stats.unpaidTotal.toLocaleString('en-IN')}`}
          </p>
        </Link>

        <Link href="/admin/stock" className="bg-white border border-gray-200 rounded-lg p-4 hover:border-green-300 transition-colors">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Low stock items</p>
          <p className={`text-3xl font-bold ${stats.lowStockCount > 0 ? 'text-amber-600' : 'text-gray-900'}`}>
            {loading ? '—' : stats.lowStockCount}
          </p>
        </Link>

        <Link href="/admin/messages" className="bg-white border border-gray-200 rounded-lg p-4 hover:border-green-300 transition-colors">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Messages pending</p>
          <p className={`text-3xl font-bold ${stats.messagesPending > 0 ? 'text-amber-600' : 'text-gray-900'}`}>
            {loading ? '—' : stats.messagesPending}
          </p>
        </Link>
      </div>

      {/* Today's appointments */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Today&apos;s appointments</h2>
          <Link
            href="/admin/appointments/new"
            className="bg-green-700 text-white text-sm font-medium px-3 py-1.5 rounded-md hover:bg-green-800"
          >
            + New
          </Link>
        </div>

        {loading ? (
          <div className="px-5 py-8 text-center text-sm text-gray-400">Loading…</div>
        ) : todayAppts.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-gray-400">No appointments today.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Time</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Patient</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Mode</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {todayAppts.map(appt => (
                  <tr key={appt.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-3 font-medium text-gray-900">{appt.time_slot}</td>
                    <td className="px-5 py-3 text-gray-700">{(appt.patients as any)?.name ?? '—'}</td>
                    <td className="px-5 py-3 text-gray-500 capitalize">{appt.mode}</td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[appt.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {appt.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link href={`/admin/appointments/${appt.id}`} className="text-green-700 hover:underline text-xs font-medium">
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
