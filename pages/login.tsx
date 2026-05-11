import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Head from 'next/head'

export default function Login() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      },
    })

    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
  }

  return (
    <>
      <Head>
        <title>Doctor Login — Saadhya Ayurvedalaya</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white border border-gray-200 rounded-lg p-8 w-full max-w-sm shadow-sm">
          <div className="mb-6 text-center">
            <p className="text-green-700 font-bold text-lg">Saadhya Ayurvedalaya</p>
            <p className="text-gray-500 text-sm mt-1">Doctor login</p>
          </div>

          {sent ? (
            <div className="text-center">
              <div className="text-4xl mb-3">📬</div>
              <p className="font-semibold text-gray-800 mb-1">Check your email</p>
              <p className="text-sm text-gray-500">
                Click the link in the email sent to <span className="font-medium">{email}</span> to log in.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                  placeholder="doctor@example.com"
                />
              </div>
              {error && (
                <p className="text-red-600 text-sm">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-700 text-white py-2.5 rounded-md font-semibold text-sm hover:bg-green-800 disabled:opacity-50"
              >
                {loading ? 'Sending…' : 'Send login link'}
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  )
}
