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
 * Verify an OTP code on the server so the session is written to
 * HTTP-only cookies (not localStorage). Returns { success } or { error }.
 * The caller is responsible for navigating after success.
 */
export async function verifyOtpAction(
  email: string,
  otp: string
): Promise<{ success?: boolean; error?: string }> {
  const cookieStore = await cookies()
  const supabase = makeSupabase(cookieStore)

  // Dev/admin bypass: code '000000' works anywhere the service role key is available
  const hasAdminKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY
  const devBypass = hasAdminKey && otp.trim() === '000000'

  if (devBypass && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const adminSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { cookies: { getAll() { return [] }, setAll() {} } }
    )
    
    // Check if user exists
    const { data: { users } } = await adminSupabase.auth.admin.listUsers()
    let user = users.find(u => u.email === email)
    
    // Set a dev password so we can seamlessly generate a session cookie
    const devPassword = 'devbypasspassword123!'
    if (!user) {
      const { data, error } = await adminSupabase.auth.admin.createUser({ 
        email, 
        password: devPassword, 
        email_confirm: true 
      })
      if (error) return { error: error.message }
      user = data.user
    } else {
      const { error } = await adminSupabase.auth.admin.updateUserById(user.id, { 
        password: devPassword 
      })
      if (error) return { error: error.message }
    }

    // Now sign in securely using the user client (which sets cookies automatically)
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: devPassword,
    })

    if (error) return { error: error.message }
    if (!data.session) return { error: 'No session returned from dev bypass.' }
    
    return { success: true }
  }

  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token: otp.trim(),
    type: 'email',
  })

  if (error) {
    const isExpired =
      error.message.toLowerCase().includes('expired') ||
      error.message.toLowerCase().includes('invalid') ||
      error.message.toLowerCase().includes('otp')
    return {
      error: isExpired
        ? 'This code has expired or is invalid. Request a new one below.'
        : error.message,
    }
  }

  if (!data.session) {
    return { error: 'No session returned. Please try again.' }
  }

  return { success: true }
}

/**
 * Send an OTP email. Returns { success } or { error }.
 */
export async function sendOtpAction(
  email: string
): Promise<{ success?: boolean; error?: string }> {
  // Skip sending OTP if service role key is available (bypass mode)
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { success: true }
  }

  const cookieStore = await cookies()
  const supabase = makeSupabase(cookieStore)

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

/**
 * Sign in with email and password (for admins). Returns { success } or { error }.
 */
export async function signInWithPasswordAction(
  email: string,
  password: string
): Promise<{ success?: boolean; error?: string }> {
  const cookieStore = await cookies()
  const supabase = makeSupabase(cookieStore)

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}
