import { GetServerSideProps } from 'next'
import Link from 'next/link'
import PublicLayout from '@/components/PublicLayout'
import supabaseAdmin from '@/lib/supabaseAdmin'

interface Post {
  id: string
  title: string
  body: string
  created_at: string
}

interface Settings {
  clinic_name: string
  doctor_name: string
  address: string
  phone: string
  email: string
}

interface Props {
  settings: Settings
  posts: Post[]
}

export default function HomePage({ settings, posts }: Props) {
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="bg-green-700 text-white py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">{settings.clinic_name}</h1>
          <p className="text-green-100 text-lg mb-8">
            Traditional Ayurvedic healing for modern wellness. Rooted in nature, guided by science.
          </p>
          <a
            href={`tel:${settings.phone}`}
            className="inline-block bg-white text-green-700 font-semibold px-6 py-3 rounded-lg hover:bg-green-50"
          >
            Book an appointment — call us
          </a>
        </div>
      </section>

      {/* About */}
      <section className="max-w-3xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">About Dr. {settings.doctor_name}</h2>
        <p className="text-gray-600 leading-relaxed">
          Dr. {settings.doctor_name} is a qualified Ayurvedic practitioner dedicated to holistic,
          personalised care. With a deep grounding in classical Ayurvedic texts and years of clinical
          experience, the practice blends time-tested remedies with an understanding of each
          patient&apos;s unique constitution.
        </p>
      </section>

      {/* Blog previews */}
      {posts.length > 0 && (
        <section className="bg-white border-t border-gray-200 py-16 px-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-gray-900">From the blog</h2>
              <Link href="/blog" className="text-sm text-green-700 hover:underline font-medium">
                View all →
              </Link>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {posts.map(post => (
                <Link
                  key={post.id}
                  href={`/blog/${post.id}`}
                  className="block border border-gray-200 rounded-lg p-5 hover:border-green-300 hover:shadow-sm transition-all"
                >
                  <p className="text-xs text-gray-400 mb-2">
                    {new Date(post.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short', year: 'numeric'
                    })}
                  </p>
                  <h3 className="font-semibold text-gray-900 mb-2 leading-snug">{post.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    {post.body?.slice(0, 120)}{post.body?.length > 120 ? '…' : ''}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Contact */}
      <section className="max-w-3xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Contact us</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {settings.address && (
            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Address</p>
              <p className="text-gray-700 text-sm leading-relaxed">{settings.address}</p>
            </div>
          )}
          {settings.phone && (
            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Phone</p>
              <a href={`tel:${settings.phone}`} className="text-green-700 font-semibold text-sm hover:underline">
                {settings.phone}
              </a>
            </div>
          )}
          {settings.email && (
            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Email</p>
              <a href={`mailto:${settings.email}`} className="text-green-700 text-sm hover:underline">
                {settings.email}
              </a>
            </div>
          )}
        </div>
      </section>
    </PublicLayout>
  )
}

export const getServerSideProps: GetServerSideProps = async () => {
  const [{ data: settingsData }, { data: postsData }] = await Promise.all([
    supabaseAdmin.from('settings').select('*').eq('id', 1).single(),
    supabaseAdmin
      .from('content_posts')
      .select('id, title, body, created_at')
      .eq('published', true)
      .order('created_at', { ascending: false })
      .limit(3),
  ])

  return {
    props: {
      settings: settingsData ?? {
        clinic_name: 'Saadhya Ayurvedalaya',
        doctor_name: 'Doctor',
        address: '',
        phone: '',
        email: '',
      },
      posts: postsData ?? [],
    },
  }
}
