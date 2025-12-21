import { createClient, SupabaseClient } from '@supabase/supabase-js'

let supabaseAdminInstance: SupabaseClient<any> | null = null

function getSupabaseAdmin(): SupabaseClient<any> {
  if (supabaseAdminInstance) {
    return supabaseAdminInstance
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    // Only throw at runtime, not at build time
    if (typeof window === 'undefined' && process.env.NODE_ENV !== 'production') {
      // During build, just warn - the actual error will happen at runtime
      console.warn('Supabase admin client: Missing environment variables. Will fail at runtime.')
    }
    throw new Error('Missing Supabase configuration. Check your environment variables.')
  }

  supabaseAdminInstance = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  return supabaseAdminInstance
}

// Admin client with service role key (bypasses RLS)
export const supabaseAdmin = new Proxy({} as SupabaseClient<any>, {
  get(_, prop) {
    return getSupabaseAdmin()[prop as keyof SupabaseClient<any>]
  }
})

