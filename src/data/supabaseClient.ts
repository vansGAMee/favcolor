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
  if (error) throw error
}
