import { useEffect, useState } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { supabase } from '@/lib/supabase'

interface MessageCard {
  id: string
  patient_name: string
  phone: string
  appt_date: string
  time_slot: string
  mode: string
  token?: string
}

type Tab = 'links' | 'reminders'

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy}
      className="text-sm border border-gray-300 rounded-md px-3 py-1.5 text-gray-700 hover:border-green-400 hover:text-green-700 font-medium">
      {copied ? 'Copied ✓' : 'Copy message'}
    </button>
  )
}

export default function MessagesPage() {
  const [tab, setTab] = useState<Tab>('links')
  const [links, setLinks] = useState<MessageCard[]>([])
  const [reminders, setReminders] = useState<MessageCard[]>([])
  const [loading, setLoading] = useState(true)
  const [markingId, setMarkingId] = useState<string | null>(null)

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [{ data: linkData }, { data: reminderData }] = await Promise.all([
      supabase
        .from('appointments')
        .select('id, appt_date, time_slot, mode, token, patients(name, phone)')
        .eq('link_sent', false)
        .not('token', 'is', null)
        .order('created_at', { ascending: false }),
      supabase
        .from('appointments')
        .select('id, appt_date, time_slot, mode, patients(name, phone)')
        .eq('appt_date', tomorrow)
        .eq('status', 'scheduled')
        .eq('reminder_sent', false)
        .order('time_slot', { ascending: true }),
    ])

    setLinks(normalise(linkData))
    setReminders(normalise(reminderData))
    setLoading(false)
  }

  function normalise(data: any[]): MessageCard[] {
    return (data ?? []).map(r => ({
      id: r.id,
      patient_name: r.patients?.name ?? '',
      phone: r.patients?.phone ?? '',
      appt_date: r.appt_date,
      time_slot: r.time_slot,
      mode: r.mode,
      token: r.token,
    }))
  }

  async function markLinkSent(id: string) {
    setMarkingId(id)
    await fetch('/api/messages/mark-link-sent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointment_id: id }),
    })
    setLinks(prev => prev.filter(c => c.id !== id))
    setMarkingId(null)
  }

  async function markReminderSent(id: string) {
    setMarkingId(id)
    await fetch('/api/messages/mark-reminder-sent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointment_id: id }),
    })
    setReminders(prev => prev.filter(c => c.id !== id))
    setMarkingId(null)
  }

  function linkMessage(c: MessageCard) {
    return `Hi ${c.patient_name}, your appointment at Saadhya Ayurvedalaya is confirmed for ${c.appt_date} at ${c.time_slot}. View your appointment details here: ${siteUrl}/appt/${c.token}`
  }

  function reminderMessage(c: MessageCard) {
    return `Hi ${c.patient_name}, this is a reminder that your appointment at Saadhya Ayurvedalaya is tomorrow at ${c.time_slot}. See you then!`
  }

  function Card({ card, message, onMark }: { card: MessageCard; message: string; onMark: () => void }) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="font-semibold text-gray-900 text-base">{card.patient_name}</p>
            <a href={`tel:${card.phone}`} className="text-green-700 font-medium text-sm hover:underline">
              {card.phone}
            </a>
          </div>
          <div className="text-right text-xs text-gray-400">
            <p>{card.appt_date}</p>
            <p>{card.time_slot} · {card.mode === 'online' ? 'Online' : 'In-clinic'}</p>
          </div>
        </div>

        <pre className="bg-gray-50 border border-gray-200 rounded-md p-3 text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed mb-4 select-all">
          {message}
        </pre>

        <div className="flex gap-3">
          <CopyButton text={message} />
          <button
            onClick={onMark}
            disabled={markingId === card.id}
            className="text-sm bg-green-700 text-white rounded-md px-3 py-1.5 font-medium hover:bg-green-800 disabled:opacity-50"
          >
            {markingId === card.id ? 'Saving…' : 'Mark as sent'}
          </button>
        </div>
      </div>
    )
  }

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'links', label: 'Unsent links', count: links.length },
    { key: 'reminders', label: 'Reminders', count: reminders.length },
  ]

  return (
    <AdminLayout title="Messages">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Messages</h1>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className={`rounded-full px-1.5 py-0.5 text-xs font-bold leading-none ${
                tab === t.key ? 'bg-amber-100 text-amber-700' : 'bg-gray-200 text-gray-500'
              }`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : tab === 'links' ? (
        links.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-2xl mb-2">✓</p>
            <p className="text-sm font-medium">All links sent. Nothing pending.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {links.map(c => (
              <Card key={c.id} card={c} message={linkMessage(c)} onMark={() => markLinkSent(c.id)} />
            ))}
          </div>
        )
      ) : (
        reminders.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-2xl mb-2">✓</p>
            <p className="text-sm font-medium">No reminders due for tomorrow.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reminders.map(c => (
              <Card key={c.id} card={c} message={reminderMessage(c)} onMark={() => markReminderSent(c.id)} />
            ))}
          </div>
        )
      )}
    </AdminLayout>
  )
}
