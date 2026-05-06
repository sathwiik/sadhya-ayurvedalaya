import { useEffect, useState } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { supabase } from '@/lib/supabase'

interface Post {
  id: string
  title: string
  body: string
  published: boolean
  created_at: string
  updated_at: string
}

type View = 'list' | 'form'

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<View>('list')
  const [editing, setEditing] = useState<Post | null>(null)
  const [form, setForm] = useState({ title: '', body: '', published: false })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  useEffect(() => { loadPosts() }, [])

  async function loadPosts() {
    setLoading(true)
    const { data } = await supabase
      .from('content_posts')
      .select('*')
      .order('created_at', { ascending: false })
    setPosts(data ?? [])
    setLoading(false)
  }

  function openNew() {
    setEditing(null)
    setForm({ title: '', body: '', published: false })
    setSaveError('')
    setView('form')
  }

  function openEdit(post: Post) {
    setEditing(post)
    setForm({ title: post.title, body: post.body, published: post.published })
    setSaveError('')
    setView('form')
  }

  async function handleSave() {
    setSaveError('')
    if (!form.title.trim()) { setSaveError('Title is required.'); return }
    setSaving(true)
    const now = new Date().toISOString()

    if (editing) {
      const { data, error } = await supabase
        .from('content_posts')
        .update({ title: form.title, body: form.body, published: form.published, updated_at: now })
        .eq('id', editing.id)
        .select()
        .single()
      setSaving(false)
      if (error) { setSaveError(error.message); return }
      setPosts(prev => prev.map(p => p.id === editing.id ? data : p))
    } else {
      const { data, error } = await supabase
        .from('content_posts')
        .insert({ title: form.title, body: form.body, published: form.published, updated_at: now })
        .select()
        .single()
      setSaving(false)
      if (error) { setSaveError(error.message); return }
      setPosts(prev => [data, ...prev])
    }
    setView('list')
  }

  async function handleDelete(id: string) {
    await supabase.from('content_posts').delete().eq('id', id)
    setPosts(prev => prev.filter(p => p.id !== id))
    setConfirmDeleteId(null)
  }

  if (view === 'form') {
    return (
      <AdminLayout title={editing ? 'Edit post' : 'New post'}>
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setView('list')} className="text-sm text-gray-400 hover:text-gray-600">← Posts</button>
          <span className="text-gray-200">/</span>
          <h1 className="text-xl font-bold text-gray-900">{editing ? 'Edit post' : 'New post'}</h1>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 max-w-2xl space-y-5">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Title <span className="text-red-500">*</span></label>
            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Body <span className="text-gray-400 font-normal">(Markdown supported)</span>
            </label>
            <textarea
              rows={16}
              value={form.body}
              onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-600 resize-y"
              placeholder="Write your post in Markdown…"
            />
          </div>

          <div className="flex items-center justify-between border border-gray-200 rounded-lg px-4 py-3">
            <div>
              <p className="text-sm font-medium text-gray-900">
                {form.published ? 'Published' : 'Draft'}
              </p>
              <p className="text-xs text-gray-400">
                {form.published ? 'Visible on the public blog' : 'Not visible to visitors'}
              </p>
            </div>
            <button
              onClick={() => setForm(f => ({ ...f, published: !f.published }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                form.published ? 'bg-green-600' : 'bg-gray-300'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                form.published ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>

          {saveError && <p className="text-red-600 text-sm">{saveError}</p>}

          <div className="flex gap-3">
            <button onClick={handleSave} disabled={saving}
              className="bg-green-700 text-white px-6 py-2.5 rounded-md text-sm font-semibold hover:bg-green-800 disabled:opacity-50">
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Publish post'}
            </button>
            <button onClick={() => setView('list')} className="text-sm text-gray-500 hover:underline">Cancel</button>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Posts">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Posts</h1>
        <button onClick={openNew}
          className="bg-green-700 text-white text-sm font-medium px-3 py-1.5 rounded-md hover:bg-green-800">
          + Add post
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              {['Title', 'Status', 'Date', ''].map(h => (
                <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="px-5 py-8 text-center text-sm text-gray-400">Loading…</td></tr>
            ) : posts.length === 0 ? (
              <tr><td colSpan={4} className="px-5 py-8 text-center text-sm text-gray-400">No posts yet.</td></tr>
            ) : posts.map(post => (
              <tr key={post.id} className="border-b border-gray-50 last:border-0">
                <td className="px-5 py-3 font-medium text-gray-900 max-w-xs truncate">{post.title}</td>
                <td className="px-5 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    post.published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {post.published ? 'Published' : 'Draft'}
                  </span>
                </td>
                <td className="px-5 py-3 text-gray-400 text-xs">
                  {new Date(post.created_at).toLocaleDateString('en-IN')}
                </td>
                <td className="px-5 py-3 text-right">
                  {confirmDeleteId === post.id ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="text-xs text-gray-500">Delete?</span>
                      <button onClick={() => handleDelete(post.id)} className="text-xs text-red-600 font-semibold hover:underline">Confirm</button>
                      <button onClick={() => setConfirmDeleteId(null)} className="text-xs text-gray-400 hover:underline">Cancel</button>
                    </span>
                  ) : (
                    <span className="inline-flex gap-3">
                      <button onClick={() => openEdit(post)} className="text-xs text-green-700 font-medium hover:underline">Edit</button>
                      <button onClick={() => setConfirmDeleteId(post.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  )
}
