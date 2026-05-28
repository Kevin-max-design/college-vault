'use server'

import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

function makeSupabase(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )
}

/**
 * Sign in an existing student with email + password.
 * Returns { success } or { error }.
 */
export async function signInAction(
  email: string,
  password: string
): Promise<{ success?: boolean; error?: string }> {
  const cookieStore = await cookies()
  const supabase = makeSupabase(cookieStore)

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    if (error.message.toLowerCase().includes('invalid login')) {
      return { error: 'Incorrect email or password. Please try again.' }
    }
    return { error: error.message }
  }

  return { success: true }
}

/**
 * Register a new student with email + password.
 * Returns { success } or { error } or { success, needsConfirmation } if
 * email confirmation is enabled in Supabase Auth settings.
 */
export async function signUpAction(
  email: string,
  password: string
): Promise<{ success?: boolean; error?: string; needsConfirmation?: boolean }> {
  const cookieStore = await cookies()
  const supabase = makeSupabase(cookieStore)

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })

  if (error) {
    if (error.message.toLowerCase().includes('already registered')) {
      return { error: 'An account with this email already exists. Please sign in instead.' }
    }
    return { error: error.message }
  }

  // If email confirmation is disabled in Supabase, session is available immediately
  if (data.session) return { success: true }

  // Email confirmation is enabled — user must check inbox
  return { success: true, needsConfirmation: true }
}

/**
 * Sign in with email and password (for admin/HOD accounts).
 * Returns { success } or { error }.
 */
export async function signInWithPasswordAction(
  email: string,
  password: string
): Promise<{ success?: boolean; error?: string }> {
  const cookieStore = await cookies()
  const supabase = makeSupabase(cookieStore)

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}
