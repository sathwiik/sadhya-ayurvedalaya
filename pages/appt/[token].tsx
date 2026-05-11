import { GetServerSideProps } from 'next'
import { useState } from 'react'
import Head from 'next/head'
import ConsentModal from '@/components/ConsentModal'

interface Prescription {
  drug_name: string
  dosage: string
  frequency: string
  days: number
  notes?: string
}

interface DispenseRecord {
  drug_name: string
  quantity: number
  source: 'in_house' | 'external'
  vendor: string | null
}

interface Props {
  valid: boolean
  expired: boolean
  disabled: boolean
  data?: {
    consent_given: boolean
    consent_text: string
    clinic_name: string
    clinic_phone: string
    doctor_name: string
    patient_name: string
    appt_date: string
    time_slot: string
    mode: string
    status: string
    is_cancelled: boolean
    chief_complaint: string
    diagnosis: string | null
    follow_up_date: string | null
    prescriptions: Prescription[]
    dispensing: DispenseRecord[]
    appointment_id: string
    medicines_collected: boolean
  }
  token: string
}

export default function TokenPage({ valid, expired, disabled, data, token }: Props) {
  const [consentGiven, setConsentGiven] = useState(data?.consent_given ?? false)
  const [consentDeclined, setConsentDeclined] = useState(false)
  const [showModal, setShowModal] = useState(!data?.consent_given)
  const [collected, setCollected] = useState(data?.medicines_collected ?? false)

  // Doctor has disabled this link
  if (disabled) {
    return (
      <>
        <Head><title>Appointment — Saadhya Ayurvedalaya</title></Head>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="text-center max-w-sm">
            <p className="text-green-700 font-bold text-lg mb-6">Saadhya Ayurvedalaya</p>
            <div className="bg-white border border-gray-200 rounded-lg p-8">
              <p className="text-2xl mb-3">🏥</p>
              <h1 className="text-lg font-bold text-gray-900 mb-2">
                Details currently unavailable
              </h1>
              <p className="text-sm text-gray-500 mb-6">
                Your appointment details are not available online at this time.
                Please contact us for more information.
              </p>
              {data?.clinic_phone && (
                <a
                  href={`tel:${data.clinic_phone}`}
                  className="inline-block bg-green-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold"
                >
                  Call {data.clinic_phone}
                </a>
              )}
            </div>
          </div>
        </div>
      </>
    )
  }

  // Invalid or expired link
  if (!valid || expired) {
    return (
      <>
        <Head><title>Link expired — Saadhya Ayurvedalaya</title></Head>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="text-center max-w-sm">
            <p className="text-green-700 font-bold text-lg mb-6">Saadhya Ayurvedalaya</p>
            <div className="bg-white border border-gray-200 rounded-lg p-8">
              <p className="text-2xl mb-3">🔗</p>
              <h1 className="text-lg font-bold text-gray-900 mb-2">
                {expired ? 'This link has expired' : 'Invalid link'}
              </h1>
              <p className="text-sm text-gray-500 mb-6">
                Please contact Saadhya Ayurvedalaya to get a new appointment link.
              </p>
              {data?.clinic_phone && (
                <a
                  href={`tel:${data.clinic_phone}`}
                  className="inline-block bg-green-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold"
                >
                  Call {data.clinic_phone}
                </a>
              )}
            </div>
          </div>
        </div>
      </>
    )
  }

  if (!data) return null

  async function handleAgree() {
    await fetch('/api/consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
    setConsentGiven(true)
    setShowModal(false)
  }

  function handleDecline() {
    setConsentDeclined(true)
    setShowModal(false)
  }

  const formattedDate = new Date(data.appt_date).toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  const modeLabel = data.mode === 'online' ? 'Online' : 'In-clinic'

  return (
    <>
      <Head><title>Your Appointment — {data.clinic_name}</title></Head>

      {showModal && (
        <ConsentModal
          consentText={data.consent_text}
          onAgree={handleAgree}
          onDecline={handleDecline}
        />
      )}

      <div className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="text-center mb-6">
            <p className="text-green-700 font-bold text-xl">{data.clinic_name}</p>
            <p className="text-gray-500 text-sm">Dr. {data.doctor_name}</p>
          </div>

          {/* Cancelled banner */}
          {data.is_cancelled && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4 text-center">
              <p className="text-amber-800 font-semibold text-sm">This appointment was cancelled.</p>
              <p className="text-amber-600 text-xs mt-1">Please contact the clinic to reschedule.</p>
            </div>
          )}

          {/* Core appointment info — always visible */}
          <div className="bg-white border border-gray-200 rounded-lg p-5 mb-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Appointment
            </p>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-400">Patient</p>
                <p className="font-semibold text-gray-900">{data.patient_name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Date</p>
                <p className="font-semibold text-gray-900">{formattedDate}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Time</p>
                <p className="font-semibold text-gray-900">{data.time_slot}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Mode</p>
                <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${
                  data.mode === 'online'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-green-100 text-green-700'
                }`}>
                  {modeLabel}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-400">Doctor</p>
                <p className="font-semibold text-gray-900">Dr. {data.doctor_name}</p>
              </div>
            </div>
          </div>

          {/* Full details — only if consent given */}
          {(consentGiven && !consentDeclined) && (
            <>
              {data.chief_complaint && (
                <div className="bg-white border border-gray-200 rounded-lg p-5 mb-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                    Chief Complaint
                  </p>
                  <p className="text-sm text-gray-700">{data.chief_complaint}</p>
                </div>
              )}

              {data.diagnosis && (
                <div className="bg-white border border-gray-200 rounded-lg p-5 mb-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                    Diagnosis
                  </p>
                  <p className="text-sm text-gray-700">{data.diagnosis}</p>
                </div>
              )}

              {data.prescriptions.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-5 mb-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                    Prescriptions
                  </p>
                  <div className="space-y-3">
                    {data.prescriptions.map((rx, i) => (
                      <div key={i} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                        <p className="font-semibold text-gray-900 text-sm">{rx.drug_name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {rx.dosage} · {rx.frequency} · {rx.days} days
                        </p>
                        {rx.notes && (
                          <p className="text-xs text-gray-400 mt-0.5 italic">{rx.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {data.dispensing.length > 0 && (() => {
                const inHouse = data.dispensing.filter(d => d.source === 'in_house')
                const external = data.dispensing.filter(d => d.source === 'external')

                return (
                  <div className="bg-white border border-gray-200 rounded-lg p-5 mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Medicines</p>
                      {collected && (
                        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-green-100 text-green-700 border border-green-200">
                          ✓ Collected
                        </span>
                      )}
                    </div>

                    {inHouse.length > 0 && (
                      <div className={external.length > 0 ? 'mb-4' : ''}>
                        <p className="text-xs font-medium text-green-700 mb-1">Dispensed at clinic</p>
                        {inHouse.map((d, i) => (
                          <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                            <p className={`text-sm font-medium ${collected ? 'line-through text-gray-400' : 'text-gray-900'}`}>{d.drug_name}</p>
                            <span className="text-xs text-gray-500">{d.quantity} unit{d.quantity !== 1 ? 's' : ''}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {external.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-blue-700 mb-1">To be purchased</p>
                        {external.map((d, i) => (
                          <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                            <div>
                              <p className={`text-sm font-medium ${collected ? 'line-through text-gray-400' : 'text-gray-900'}`}>{d.drug_name}</p>
                              {d.vendor && <p className="text-xs text-gray-400 mt-0.5">From: {d.vendor}</p>}
                            </div>
                            <span className="text-xs text-gray-500">{d.quantity} unit{d.quantity !== 1 ? 's' : ''}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })()}

              {data.follow_up_date && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-5 mb-4">
                  <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1">
                    Follow-up
                  </p>
                  <p className="text-sm font-semibold text-gray-900">
                    {new Date(data.follow_up_date).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'long', year: 'numeric'
                    })}
                  </p>
                </div>
              )}
            </>
          )}

          {/* Contact */}
          {data.clinic_phone && (
            <div className="text-center mt-6">
              <a
                href={`tel:${data.clinic_phone}`}
                className="text-sm text-green-700 font-medium hover:underline"
              >
                📞 {data.clinic_phone}
              </a>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  const token = params?.token as string

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const response = await fetch(`${baseUrl}/api/token/${token}`)

  if (response.status === 404) {
    return { props: { valid: false, expired: false, disabled: false, token } }
  }

  if (response.status === 410) {
    return { props: { valid: true, expired: true, disabled: false, token } }
  }

  if (response.status === 403) {
    const json = await response.json()
    if (json.disabled) {
      return { props: { valid: true, expired: false, disabled: true, token } }
    }
    return { props: { valid: false, expired: false, disabled: false, token } }
  }

  if (!response.ok) {
    return { props: { valid: false, expired: false, disabled: false, token } }
  }

  const data = await response.json()
  return { props: { valid: true, expired: false, disabled: false, data, token } }
}
