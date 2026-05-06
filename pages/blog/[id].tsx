import { GetStaticProps, GetStaticPaths } from 'next'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import PublicLayout from '@/components/PublicLayout'
import supabaseAdmin from '@/lib/supabaseAdmin'

interface Post {
  id: string
  title: string
  body: string
  created_at: string
}

export default function BlogPost({ post }: { post: Post }) {
  return (
    <PublicLayout title={post.title}>
      <div className="max-w-2xl mx-auto px-4 py-12">
        <Link href="/blog" className="text-sm text-green-700 hover:underline mb-6 inline-block">
          ← Back to blog
        </Link>
        <p className="text-xs text-gray-400 mb-2">
          {new Date(post.created_at).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'long', year: 'numeric'
          })}
        </p>
        <h1 className="text-3xl font-bold text-gray-900 mb-8">{post.title}</h1>
        <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed">
          <ReactMarkdown>{post.body}</ReactMarkdown>
        </div>
      </div>
    </PublicLayout>
  )
}

export const getStaticPaths: GetStaticPaths = async () => {
  const { data } = await supabaseAdmin
    .from('content_posts')
    .select('id')
    .eq('published', true)

  const paths = (data ?? []).map(post => ({ params: { id: post.id } }))
  return { paths, fallback: 'blocking' }
}

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const { data: post } = await supabaseAdmin
    .from('content_posts')
    .select('id, title, body, created_at')
    .eq('id', params?.id)
    .eq('published', true)
    .single()

  if (!post) return { notFound: true }

  return {
    props: { post },
    revalidate: 300,
  }
}
