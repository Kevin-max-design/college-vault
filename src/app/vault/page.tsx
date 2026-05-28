import { requireAuth, getSupabaseClient } from '@/lib/auth-helpers'
import { redirect } from 'next/navigation'
import dynamic from 'next/dynamic'
import AppShell from '../components/AppShell'

const VaultClient = dynamic(() => import('./VaultClient'), {
  loading: () => (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh', fontFamily: 'var(--font-jakarta)' }}>
      <div style={{ color: '#00595c', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="material-symbols-outlined" style={{ animation: 'spin 1s linear infinite' }}>sync</span>
        Loading Vault...
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  )
})

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

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, avatar_url')
    .eq('id', auth.user.id)
    .single()

  const avatarUrl = profile?.avatar_url ?? null
  const fullName  = profile?.full_name?.trim() || ''
  const initials  = fullName
    ? (fullName.split(' ').slice(0, 2).map((n: string) => n ? n[0] : '').join('').toUpperCase() || 'U')
    : 'U'

  return (
    <AppShell 
      pageTitle="VAULT"
      userAvatarUrl={avatarUrl}
      userInitials={initials}
    >
      <VaultClient
        currentUser={{ id: auth.user.id, email: auth.user.email ?? '' }}
        initialListings={initialListings ?? []}
      />
    </AppShell>
  )
}
