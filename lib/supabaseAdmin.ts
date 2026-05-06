import { createClient } from '@supabase/supabase-js'

// Service role client — server/API routes ONLY. Never import this in pages or components.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export default supabaseAdmin
