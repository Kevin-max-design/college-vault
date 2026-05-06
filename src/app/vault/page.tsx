import { requireAuth, getSupabaseClient } from '@/lib/auth-helpers'
import { redirect } from 'next/navigation'
import VaultClient from './VaultClient'
import AppShell from '../components/AppShell'

export default async function VaultPage() {
  const auth = await requireAuth()
  if (auth.error || !auth.user) {
    redirect('/onboarding/verify')
  }

  const supabase = await getSupabaseClient()

  const { data: initialListings } = await supabase
    .from('listings')
    .select(`
      *,
      seller:profiles!listings_seller_id_fkey(id, full_name, avatar_url, department)
    `)
    .order('created_at', { ascending: false })
    .limit(20)

  return (
    <AppShell pageTitle="VAULT">
      <VaultClient
        currentUser={{ id: auth.user.id, email: auth.user.email ?? '' }}
        initialListings={initialListings ?? []}
      />
    </AppShell>
  )
}
