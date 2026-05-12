import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL  as string | undefined
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

// Fallback prevents createClient from throwing "Invalid URL" when env vars
// are missing in the build environment (e.g. Vercel without vars configured).
// Pages will show their own loading/error states instead of crashing the app.
const FALLBACK_URL = 'https://placeholder.supabase.co'
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiJ9.placeholder'

export const supabase = createClient(
  supabaseUrl  ?? FALLBACK_URL,
  supabaseAnon ?? FALLBACK_KEY,
)

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnon)
