import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // If Supabase env vars are missing, just pass through — don't crash
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  try {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    })

    // Refresh the session so server components can read it from cookies.
    // Do NOT add any logic between createServerClient and getUser().
    await supabase.auth.getUser()
  } catch (err) {
    // If Supabase fails (network error, bad key, etc.) don't crash the page
    console.error('[Middleware] Supabase error:', err)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    // Only run on page navigations — skip Next.js internals, API, and static files
    '/((?!_next|api/|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
