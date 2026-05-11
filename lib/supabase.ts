import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs'

// Uses cookie-based storage so the middleware can read the session server-side.
// Must only be imported in client-side code (pages, useEffect) — never in API routes.
export const supabase = createPagesBrowserClient()
