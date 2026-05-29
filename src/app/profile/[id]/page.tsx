import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import AppShell from '@/app/components/AppShell'

interface Props {
  params: Promise<{ id: string }>
}

export default async function PublicProfilePage({ params }: Props) {
  const { id: profileId } = await params

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  // 1. Authenticate viewer
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/onboarding/verify')
  }

  // 2. If viewing own profile, redirect to the private editable profile page
  if (user.id === profileId) {
    redirect('/profile')
  }

  // 3. Fetch viewer's own avatar/initials for AppShell layout
  let viewerProfile = null
  try {
    const { data } = await supabase
      .from('profiles')
      .select('avatar_url, full_name')
      .eq('id', user.id)
      .single()
    viewerProfile = data
  } catch {}

  const viewerName = viewerProfile?.full_name?.trim() || ''
  const viewerInitials = viewerName
    ? (viewerName.split(' ').slice(0, 2).map((n: string) => n ? n[0] : '').join('').toUpperCase() || 'U')
    : 'U'

  // 4. Fetch target public profile
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, department, year_of_study, role, created_at')
    .eq('id', profileId)
    .single()

  if (profileErr || !profile) {
    redirect('/vault')
  }

  // 5. Fetch target's active marketplace listings
  const { data: listings } = await supabase
    .from('listings')
    .select('*')
    .eq('seller_id', profileId)
    .order('created_at', { ascending: false })

  // 6. Fetch stats (shared materials & doubts counts)
  const { count: doubtsCount } = await supabase
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('author_id', profileId)
    .eq('type', 'doubt')

  const { count: materialsCount } = await supabase
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('author_id', profileId)
    .eq('type', 'material')

  // 7. Fetch game sessions for trust level computation
  const { data: gameSessions } = await supabase
    .from('game_sessions')
    .select('score')
    .eq('player_id', profileId)

  const totalTrustPoints = (gameSessions ?? []).reduce((acc, curr) => acc + (curr.score ?? 0), 0)
  const trustLevel = totalTrustPoints > 500 ? 'Gold' : totalTrustPoints > 100 ? 'Silver' : 'Bronze'
  const trustColor = trustLevel === 'Gold' ? '#fea619' : trustLevel === 'Silver' ? '#78909c' : '#8d6e63'
  const trustText = trustLevel === 'Gold' ? '#684000' : '#eceff1'

  const targetName = profile.full_name || 'Anonymous Student'
  const targetInitials = targetName
    ? (targetName.split(' ').slice(0, 2).map((n: string) => n ? n[0] : '').join('').toUpperCase() || 'U')
    : 'U'

  return (
    <AppShell 
      pageTitle="STUDENT PROFILE" 
      userAvatarUrl={viewerProfile?.avatar_url} 
      userInitials={viewerInitials}
    >
      <main className="px-4 md:px-gutter max-w-xl mx-auto flex flex-col gap-6 py-6" style={{ fontFamily: 'var(--font-jakarta)' }}>
        
        {/* ── Profile Header Card ───────────────────────────────── */}
        <section className="bg-surface border-2 border-primary p-5 shadow-[4px_4px_0px_0px_#00595c] flex flex-col items-center gap-4 relative overflow-hidden">
          
          {/* Circular Avatar Frame */}
          <div style={{ position: 'relative', width: 96, height: 96 }}>
            <svg
              className="spin-slow"
              viewBox="0 0 106 106"
              style={{ position: 'absolute', inset: -5, width: 106, height: 106, color: '#00595c', zIndex: 0 }}
            >
              <circle cx="53" cy="53" r="48" fill="none" stroke="currentColor" strokeWidth={2.5} strokeDasharray="10 8" strokeLinecap="round" />
            </svg>
            <style>{`
              .spin-slow {
                animation: spin-anim 20s linear infinite;
              }
              @keyframes spin-anim {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
            `}</style>
            
            <div style={{
              position: 'relative', zIndex: 1, width: 96, height: 96, borderRadius: '50%',
              border: '2.5px solid #00595c', background: '#e5e3dd',
              display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden'
            }}>
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span className="font-newsreader font-black text-3xl text-primary">{targetInitials}</span>
              )}
            </div>
          </div>

          <div className="text-center flex flex-col gap-1">
            <h2 className="font-newsreader font-black text-2xl text-primary tracking-tight">{targetName}</h2>
            <p className="font-jakarta text-xs text-outline font-bold uppercase tracking-wider flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-sm">school</span>
              {profile.department ? `${profile.department} (Year ${profile.year_of_study})` : 'RGMCET Student'}
            </p>
            {profile.role && profile.role !== 'student' && (
              <span style={{
                background: '#00595c', color: '#fff', fontSize: '0.65rem', fontWeight: 900,
                textTransform: 'uppercase', padding: '2px 8px', alignSelf: 'center',
                marginTop: 4, letterSpacing: '0.05em'
              }}>
                {profile.role}
              </span>
            )}
          </div>

          {/* Trust Score Panel */}
          <div style={{
            width: '100%', background: '#f5f3ee', border: '1.5px solid #bec9c9',
            padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <div>
              <span className="label-caps block text-[0.6rem] text-outline">Trust Standing</span>
              <span className="font-newsreader font-black text-lg text-primary">{trustLevel} Level</span>
            </div>
            <div style={{
              background: trustColor, color: trustText, fontSize: '0.7rem', fontWeight: 900,
              padding: '4px 10px', border: '1.5px solid #002021', boxShadow: '2px 2px 0px 0px #002021'
            }}>
              {totalTrustPoints} XP
            </div>
          </div>
        </section>

        {/* ── Stats Panels Grid ─────────────────────────────────── */}
        <section className="grid grid-cols-2 gap-4">
          <div className="bg-surface border-2 border-primary p-4 shadow-[3px_3px_0px_0px_#00595c] flex flex-col gap-1 text-center">
            <span className="material-symbols-outlined text-primary text-xl">help_center</span>
            <span className="font-newsreader font-black text-2xl text-primary leading-none mt-1">{doubtsCount ?? 0}</span>
            <span className="font-jakarta text-[0.62rem] font-bold text-outline uppercase tracking-wider">Doubts Posted</span>
          </div>
          <div className="bg-surface border-2 border-primary p-4 shadow-[3px_3px_0px_0px_#00595c] flex flex-col gap-1 text-center">
            <span className="material-symbols-outlined text-primary text-xl">menu_book</span>
            <span className="font-newsreader font-black text-2xl text-primary leading-none mt-1">{materialsCount ?? 0}</span>
            <span className="font-jakarta text-[0.62rem] font-bold text-outline uppercase tracking-wider">Materials Shared</span>
          </div>
        </section>

        {/* ── Active Listings Card ─────────────────────────────── */}
        <section className="bg-surface border-2 border-primary p-5 shadow-[4px_4px_0px_0px_#00595c] flex flex-col gap-4">
          <h3 className="font-newsreader font-black text-xl text-primary border-b-2 border-primary pb-1.5 flex items-center gap-2">
            <span className="material-symbols-outlined">storefront</span>
            Active Listings ({listings?.length ?? 0})
          </h3>

          {!listings || listings.length === 0 ? (
            <p className="text-center font-jakarta text-xs text-outline py-4">No active marketplace listings posted by this student.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {listings.map(l => (
                <div key={l.id} style={{
                  border: '1.5px solid #00595c', background: '#fcfbf7', padding: '10px 12px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <div style={{ minWidth: 0, flex: 1, marginRight: 12 }}>
                    <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1b1c19', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {l.title}
                    </h4>
                    <span style={{ fontSize: '0.62rem', fontWeight: 900, textTransform: 'uppercase', color: '#fea619', background: '#684000', padding: '1px 5px' }}>
                      {l.type === 'rent' ? 'Rent' : 'Sell'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#00595c' }}>${l.price.toFixed(2)}</span>
                    <Link href="/vault">
                      <button className="bg-amber text-[0.6rem] font-bold uppercase tracking-wider px-2.5 py-1 border border-primary cursor-pointer">
                        View
                      </button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Back to Market Button ────────────────────────────── */}
        <Link href="/vault" style={{ textDecoration: 'none' }}>
          <button className="bg-surface text-primary border-2 border-primary py-3 font-jakarta font-black text-xs uppercase tracking-widest shadow-[3px_3px_0px_0px_#00595c] hover:bg-surface-variant active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cv-transition-btn cursor-pointer w-full text-center">
            Back to Marketplace
          </button>
        </Link>

      </main>
    </AppShell>
  )
}
