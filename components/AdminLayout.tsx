import { useEffect, useState, ReactNode } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Head from 'next/head'
import { supabase } from '@/lib/supabase'

interface Props {
  children: ReactNode
  title?: string
}

const navLinks = [
  { href: '/admin', label: 'Dashboard', exact: true },
  { href: '/admin/patients', label: 'Patients' },
  { href: '/admin/appointments', label: 'Appointments' },
  { href: '/admin/messages', label: 'Messages' },
  { href: '/admin/stock', label: 'Stock' },
  { href: '/admin/billing', label: 'Billing' },
  { href: '/admin/posts', label: 'Posts' },
  { href: '/admin/settings', label: 'Settings' },
]

export default function AdminLayout({ children, title }: Props) {
  const router = useRouter()
  const [doctorName, setDoctorName] = useState('Doctor')
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push('/login')
    })
    supabase
      .from('settings')
      .select('doctor_name')
      .eq('id', 1)
      .single()
      .then(({ data }) => { if (data?.doctor_name) setDoctorName(data.doctor_name) })
  }, [router])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  function isActive(href: string, exact?: boolean) {
    if (exact) return router.pathname === href
    return router.pathname.startsWith(href)
  }

  return (
    <>
      <Head>
        <title>{title ? `${title} — Admin` : 'Saadhya Admin'}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className="min-h-screen flex bg-gray-50">
        {/* Sidebar — desktop */}
        <aside className="hidden md:flex flex-col w-56 bg-white border-r border-gray-200 fixed h-full">
          <div className="px-5 py-5 border-b border-gray-200">
            <p className="text-green-700 font-bold text-sm leading-tight">Saadhya Ayurvedalaya</p>
            <p className="text-gray-500 text-xs mt-0.5">Dr. {doctorName}</p>
          </div>
          <nav className="flex-1 py-4 px-2 space-y-0.5">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive(link.href, link.exact)
                    ? 'bg-green-50 text-green-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="px-4 py-4 border-t border-gray-200">
            <button
              onClick={handleLogout}
              className="w-full text-left text-sm text-gray-500 hover:text-red-600"
            >
              Logout
            </button>
          </div>
        </aside>

        {/* Top bar — mobile */}
        <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-gray-200 flex items-center justify-between px-4 py-3">
          <p className="text-green-700 font-bold text-sm">Saadhya Ayurvedalaya</p>
          <button onClick={() => setMenuOpen(!menuOpen)} className="text-gray-600 text-2xl leading-none">
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden fixed inset-0 z-20 bg-white pt-14 px-4">
            <nav className="space-y-1 py-4">
              {navLinks.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={`block px-3 py-2.5 rounded-md text-sm font-medium ${
                    isActive(link.href, link.exact)
                      ? 'bg-green-50 text-green-700'
                      : 'text-gray-600'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <button
                onClick={handleLogout}
                className="block w-full text-left px-3 py-2.5 text-sm text-red-600 mt-4"
              >
                Logout
              </button>
            </nav>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 md:ml-56 pt-14 md:pt-0">
          <div className="max-w-5xl mx-auto px-4 py-6">
            {children}
          </div>
        </main>
      </div>
    </>
  )
}
