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

export default function BlogIndex({ posts }: { posts: Post[] }) {
  return (
    <PublicLayout title="Blog">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Blog</h1>

        {posts.length === 0 ? (
          <p className="text-gray-500">No posts published yet.</p>
        ) : (
          <div className="space-y-6">
            {posts.map(post => (
              <Link
                key={post.id}
                href={`/blog/${post.id}`}
                className="block border border-gray-200 bg-white rounded-lg p-6 hover:border-green-300 hover:shadow-sm transition-all"
              >
                <p className="text-xs text-gray-400 mb-2">
                  {new Date(post.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'long', year: 'numeric'
                  })}
                </p>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">{post.title}</h2>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {post.body?.slice(0, 120)}{post.body?.length > 120 ? '…' : ''}
                </p>
                <p className="text-sm text-green-700 font-medium mt-3">Read more →</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PublicLayout>
  )
}

export const getServerSideProps: GetServerSideProps = async () => {
  const { data } = await supabaseAdmin
    .from('content_posts')
    .select('id, title, body, created_at')
    .eq('published', true)
    .order('created_at', { ascending: false })

  return { props: { posts: data ?? [] } }
}
