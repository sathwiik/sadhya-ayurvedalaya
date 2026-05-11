import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    if (!router.isReady) return

    async function handle() {
      const { code, error, error_description } = router.query

      if (error) {
        router.replace(`/login?error=${error_description ?? error}`)
        return
      }

      // PKCE flow: ?code= param
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(String(code))
        router.replace(error ? '/login?error=Session+exchange+failed' : '/admin')
        return
      }

      // Implicit flow: supabase-js auto-processes the #hash on init before
      // this effect runs, so check getSession() first — session is already set.
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.replace('/admin')
        return
      }

      // Fallback: listen in case the token exchange hasn't finished yet
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
          router.replace('/admin')
        }
      })

      return () => subscription.unsubscribe()
    }

    handle()
  }, [router.isReady, router.query])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-500 text-sm">Signing you in…</p>
    </div>
  )
}
