import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import AdminShell from '@/app/components/AdminShell'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/onboarding/verify')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, department')
    .eq('id', user.id)
    .single()

  const role = profile?.role ?? 'student'

  // Only HOD and Principal can access the admin portal
  if (!['hod', 'principal'].includes(role)) {
    redirect('/classrooms')
  }

  // Principal can only access bulletin — redirect if they try any other admin page
  // (individual pages also handle this, but layout provides the shell)

  return (
    <AdminShell
      userRole={role}
      userName={profile?.full_name ?? 'Admin'}
      department={profile?.department ?? ''}
    >
      {children}
    </AdminShell>
  )
}
