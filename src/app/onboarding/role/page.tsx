import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

/**
 * Role page is now bypassed entirely for the UI.
 * This server component silently ensures the student role is set
 * on the profile row and forwards to the profile setup step.
 * If somehow a user lands here directly it still works correctly.
 */
export default async function RolePage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/onboarding/verify')

  // Silently ensure role = 'student' (safe to call even if already set)
  await supabase
    .from('profiles')
    .upsert({ id: user.id, role: 'student' }, { onConflict: 'id' })

  redirect('/onboarding/profile')
}
