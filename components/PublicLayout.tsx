import Head from 'next/head'
import Link from 'next/link'
import { ReactNode } from 'react'

interface Props {
  children: ReactNode
  title?: string
}

export default function PublicLayout({ children, title }: Props) {
  return (
    <>
      <Head>
        <title>{title ? `${title} — Saadhya Ayurvedalaya` : 'Saadhya Ayurvedalaya'}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/" className="text-green-700 font-bold text-lg">
              Saadhya Ayurvedalaya
            </Link>
            <nav className="flex gap-6 text-sm">
              <Link href="/" className="text-gray-600 hover:text-green-700">Home</Link>
              <Link href="/blog" className="text-gray-600 hover:text-green-700">Blog</Link>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="bg-white border-t border-gray-200 py-6 text-center text-sm text-gray-500">
          © {new Date().getFullYear()} Saadhya Ayurvedalaya. All rights reserved.
        </footer>
      </div>
    </>
  )
}
