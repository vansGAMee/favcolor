import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { TrainingSessionRow } from './trainingCollection'

export const createTrainingClient = (url: string, publishableKey: string) => createClient(url, publishableKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
})

let client: SupabaseClient | null = null

export async function insertTrainingSession(row: TrainingSessionRow) {
  const url = import.meta.env.VITE_SUPABASE_URL
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  if (!url || !publishableKey) throw new Error('Training collection is not configured')
  client ??= createTrainingClient(url, publishableKey)
  const { error } = await client.from('training_sessions').insert(row)
  if (import.meta.env.DEV && import.meta.env.MODE !== 'test') console.debug('[favcolor training]', { stage: 'supabase-response', accepted: !error, code: error?.code, message: error?.message })
  if (error) throw new Error(`Supabase training insert failed (${error.code ?? 'unknown'}): ${error.message}`)
}
