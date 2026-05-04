import { requireAuth, getSupabaseClient } from '@/lib/auth-helpers'
import { redirect } from 'next/navigation'
import ProjectsClient from './ProjectsClient'
import AppShell from '../components/AppShell'

// Server component to fetch listings for the Vault/Projects screen
export default async function ProjectsPage() {
  const auth = await requireAuth()
  if (auth.error || !auth.user) {
    redirect('/onboarding/verify')
  }

  const supabase = await getSupabaseClient()
  
  // We'll fetch the first page of listings here for SSR
  const { data: initialListings } = await supabase
    .from('listings')
    .select(`
      *,
      seller:profiles!listings_seller_id_fkey(id, full_name, avatar_url, department)
    `)
    .order('created_at', { ascending: false })
    .limit(20)

  return (
    <AppShell pageTitle="PROJECTS">
      <ProjectsClient 
        currentUser={{
          id: auth.user.id,
          email: auth.user.email ?? '',
        }}
        initialListings={initialListings ?? []}
      />
    </AppShell>
  )
}
