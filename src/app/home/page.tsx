import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import AppShell from '@/app/components/AppShell'

export default async function HomePage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/onboarding/verify')
  }

  let profile = null
  try {
    const { data } = await supabase
      .from('profiles')
      .select('full_name, avatar_url, department, year_of_study, role')
      .eq('id', user.id)
      .single()
    profile = data
  } catch (err) {
    console.error('Error fetching profile server-side on homepage:', err)
  }

  // Check if they are a club lead
  let isClubLead = false
  if (profile) {
    if (profile.role === 'hod' || profile.role === 'principal') {
      isClubLead = true
    } else {
      const { count } = await supabase
        .from('clubs')
        .select('id', { count: 'exact', head: true })
        .eq('lead_id', user.id)
      isClubLead = (count || 0) > 0
    }
  }

  const fullName = profile?.full_name?.trim() || ''
  const firstName = fullName ? (fullName.split(' ')[0] || 'Student') : 'Student'
  const initials = fullName
    ? (fullName.split(' ').slice(0, 2).map((n: string) => n ? n[0] : '').join('').toUpperCase() || 'U')
    : 'U'

  // Server-side query for unread notifications count (cheap COUNT query)
  let unreadCount = 0
  try {
    const { count } = await supabase
      .from('user_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('read_at', null)
    unreadCount = count || 0
  } catch (e) {
    console.error('Error fetching unread count on homepage:', e)
  }

  // Server-side query for user active/reserved club status
  let userClub = null
  try {
    const { data: membership } = await supabase
      .from('club_members')
      .select('status, club_id')
      .eq('user_id', user.id)
      .in('status', ['reserved', 'active'])
      .maybeSingle()

    if (membership) {
      const { data: clubDetail } = await supabase
        .from('clubs')
        .select('name')
        .eq('id', membership.club_id)
        .single()
      
      if (clubDetail) {
        userClub = {
          name: clubDetail.name,
          status: membership.status
        }
      }
    }
  } catch (e) {
    console.error('Error fetching user club for homepage:', e)
  }

  // Server-side query for the single latest notice in social bulletin
  let latestNotice = null
  try {
    const departmentFilter = profile?.department 
      ? `scope.eq.global,and(scope.eq.department,department.eq.${profile.department})` 
      : 'scope.eq.global'
    const { data: notice } = await supabase
      .from('notices')
      .select('title, scope, department, created_at')
      .eq('archived', false)
      .or(departmentFilter)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    
    latestNotice = notice
  } catch (e) {
    console.error('Error fetching latest notice for homepage:', e)
  }

  return (
    <AppShell pageTitle="Campus Vault" userAvatarUrl={profile?.avatar_url} userInitials={initials}>
      <main className="px-4 md:px-6 max-w-4xl mx-auto flex flex-col gap-6 py-5">
        
        {/* ── Greeting & Notification Status ────────────────────── */}
        <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-[#bec9c9] pb-4">
          <div>
            <h2 className="font-newsreader font-black text-3xl md:text-4xl text-[#00595c] leading-tight">
              Hey {firstName}!
            </h2>
            <p className="font-jakarta text-xs text-[#6e7979] font-bold uppercase tracking-wider mt-1 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm font-bold">school</span>
              {profile?.department ? `${profile.department} • Year ${profile.year_of_study}` : 'RGMCET Student'}
            </p>
          </div>
          {unreadCount > 0 ? (
            <Link href="/vault" className="no-underline w-fit">
              <div className="bg-[#fff8f8] text-[#ba1a1a] border-2 border-[#ba1a1a] shadow-[2px_2px_0px_0px_#ba1a1a] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all px-3 py-1.5 font-jakarta font-black text-[0.7rem] uppercase tracking-wider flex items-center gap-2 rounded-lg cursor-pointer">
                <span className="material-symbols-outlined text-sm font-black animate-pulse">notifications</span>
                <span>{unreadCount} new notification{unreadCount > 1 ? 's' : ''}</span>
              </div>
            </Link>
          ) : (
            <div className="bg-[#f8faf9] text-[#2d4a3e] border border-[#2d4a3e] px-3 py-1.5 font-jakarta font-bold text-[0.7rem] uppercase tracking-wider flex items-center gap-2 rounded-lg w-fit">
              <span className="material-symbols-outlined text-sm font-bold text-[#2d4a3e]">check_circle</span>
              <span>All caught up</span>
            </div>
          )}
        </section>

        {/* ── Today Panel (Compact Summary) ───────────────────── */}
        <section className="bg-[#fbf9f4] border-2 border-[#bec9c9] p-4 rounded-xl flex flex-col gap-3">
          <h3 className="font-jakarta font-black text-[0.7rem] uppercase tracking-wider text-[#00595c] flex items-center gap-1.5">
            <span className="material-symbols-outlined text-base">today</span>
            Today at Campus Vault
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Classrooms summary */}
            <div className="bg-white border border-[#bec9c9] p-3 rounded-lg flex flex-col gap-1">
              <span className="font-jakarta text-[0.62rem] font-bold text-[#6e7979] uppercase">Classrooms</span>
              <p className="font-jakarta text-xs font-semibold text-[#1a1a1a] truncate">
                Ask doubts, share materials
              </p>
            </div>

            {/* Marketplace summary */}
            <div className="bg-white border border-[#bec9c9] p-3 rounded-lg flex flex-col gap-1">
              <span className="font-jakarta text-[0.62rem] font-bold text-[#6e7979] uppercase">Marketplace</span>
              <p className="font-jakarta text-xs font-semibold text-[#1a1a1a] truncate">
                Buy &amp; sell textbooks/gear
              </p>
            </div>

            {/* Club Status summary */}
            <div className="bg-white border border-[#bec9c9] p-3 rounded-lg flex flex-col gap-1">
              <span className="font-jakarta text-[0.62rem] font-bold text-[#6e7979] uppercase">My Club</span>
              <p className="font-jakarta text-xs font-semibold text-[#1a1a1a] truncate">
                {userClub ? `🏆 ${userClub.name} (${userClub.status})` : '✨ No active club joined'}
              </p>
            </div>
          </div>

          {/* Latest Notice Banner */}
          {latestNotice && (
            <div className="bg-[#fffdf5] border border-[#fea619] p-2.5 rounded-lg flex items-center gap-2 text-xs font-jakarta text-[#855300]">
              <span className="material-symbols-outlined text-sm font-bold text-[#fea619]">campaign</span>
              <span className="font-bold">Latest Bulletin:</span>
              <span className="truncate flex-1">{latestNotice.title}</span>
              <Link href="/bulletin" className="underline font-black text-[#855300] flex-shrink-0 hover:text-primary">View Board</Link>
            </div>
          )}
        </section>

        {/* ── Main Actions Grid ───────────────────────────────── */}
        <section className="flex flex-col gap-4">
          <div className="border-b border-[#bec9c9] pb-1 flex justify-between items-end">
            <h3 className="font-newsreader font-black text-xl text-[#00595c]">
              Quick Actions
            </h3>
            <span className="font-jakarta text-[0.62rem] font-bold text-[#6e7979] uppercase tracking-wider">
              Jump to section
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            
            {/* 1. Classrooms */}
            <Link href="/classrooms" className="no-underline group">
              <article className="h-full bg-white border-2 border-[#00595c] shadow-[3px_3px_0px_0px_#00595c] hover:shadow-[5px_5px_0px_0px_#00595c] hover:-translate-y-0.5 transition-all p-4 rounded-xl flex flex-col gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#eafaf9] border border-[#0d7377] flex items-center justify-center text-[#0d7377] group-hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined text-xl">school</span>
                </div>
                <div>
                  <h4 className="font-newsreader font-black text-lg text-[#1a1a1a] group-hover:text-[#00595c] transition-colors leading-tight">
                    Classrooms
                  </h4>
                  <p className="font-jakarta text-[0.7rem] text-[#6e7979] mt-1 leading-snug">
                    Doubts, materials, replies
                  </p>
                </div>
              </article>
            </Link>

            {/* 2. Vault Market */}
            <Link href="/vault" className="no-underline group">
              <article className="h-full bg-white border-2 border-[#00595c] shadow-[3px_3px_0px_0px_#00595c] hover:shadow-[5px_5px_0px_0px_#00595c] hover:-translate-y-0.5 transition-all p-4 rounded-xl flex flex-col gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#fffdf5] border border-[#fea619] flex items-center justify-center text-[#fea619] group-hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined text-xl">storefront</span>
                </div>
                <div>
                  <h4 className="font-newsreader font-black text-lg text-[#1a1a1a] group-hover:text-[#00595c] transition-colors leading-tight">
                    Vault Market
                  </h4>
                  <p className="font-jakarta text-[0.7rem] text-[#6e7979] mt-1 leading-snug">
                    Buy, rent, message sellers
                  </p>
                </div>
              </article>
            </Link>

            {/* 3. Clubs */}
            <Link href="/clubs" className="no-underline group">
              <article className="h-full bg-white border-2 border-[#00595c] shadow-[3px_3px_0px_0px_#00595c] hover:shadow-[5px_5px_0px_0px_#00595c] hover:-translate-y-0.5 transition-all p-4 rounded-xl flex flex-col gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#e8f5e9] border border-[#2e7d32] flex items-center justify-center text-[#2e7d32] group-hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined text-xl">groups</span>
                </div>
                <div>
                  <h4 className="font-newsreader font-black text-lg text-[#1a1a1a] group-hover:text-[#00595c] transition-colors leading-tight">
                    Clubs
                  </h4>
                  <p className="font-jakarta text-[0.7rem] text-[#6e7979] mt-1 leading-snug">
                    Reserve slots, payments
                  </p>
                </div>
              </article>
            </Link>

            {/* 4. Connect */}
            <Link href="/connect" className="no-underline group">
              <article className="h-full bg-white border-2 border-[#00595c] shadow-[3px_3px_0px_0px_#00595c] hover:shadow-[5px_5px_0px_0px_#00595c] hover:-translate-y-0.5 transition-all p-4 rounded-xl flex flex-col gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#f3e5f5] border border-[#6a1b9a] flex items-center justify-center text-[#6a1b9a] group-hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined text-xl">diversity_3</span>
                </div>
                <div>
                  <h4 className="font-newsreader font-black text-lg text-[#1a1a1a] group-hover:text-[#00595c] transition-colors leading-tight">
                    Connect Peers
                  </h4>
                  <p className="font-jakarta text-[0.7rem] text-[#6e7979] mt-1 leading-snug">
                    Find students, message peers
                  </p>
                </div>
              </article>
            </Link>

            {/* 5. Social Bulletin */}
            <Link href="/bulletin" className="no-underline group">
              <article className="h-full bg-white border-2 border-[#00595c] shadow-[3px_3px_0px_0px_#00595c] hover:shadow-[5px_5px_0px_0px_#00595c] hover:-translate-y-0.5 transition-all p-4 rounded-xl flex flex-col gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#fff8f8] border border-[#ba1a1a] flex items-center justify-center text-[#ba1a1a] group-hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined text-xl">campaign</span>
                </div>
                <div>
                  <h4 className="font-newsreader font-black text-lg text-[#1a1a1a] group-hover:text-[#00595c] transition-colors leading-tight">
                    Social Bulletin
                  </h4>
                  <p className="font-jakarta text-[0.7rem] text-[#6e7979] mt-1 leading-snug">
                    Notices and deadlines
                  </p>
                </div>
              </article>
            </Link>

            {/* 6. Profile */}
            <Link href="/profile" className="no-underline group">
              <article className="h-full bg-white border-2 border-[#00595c] shadow-[3px_3px_0px_0px_#00595c] hover:shadow-[5px_5px_0px_0px_#00595c] hover:-translate-y-0.5 transition-all p-4 rounded-xl flex flex-col gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#f0eee9] border border-[#3e4949] flex items-center justify-center text-[#3e4949] group-hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined text-xl">person</span>
                </div>
                <div>
                  <h4 className="font-newsreader font-black text-lg text-[#1a1a1a] group-hover:text-[#00595c] transition-colors leading-tight">
                    My Profile
                  </h4>
                  <p className="font-jakarta text-[0.7rem] text-[#6e7979] mt-1 leading-snug">
                    Edit interests and settings
                  </p>
                </div>
              </article>
            </Link>

            {/* 7. Admin Portal Card (HOD/Principal/Admin only) */}
            {(profile?.role === 'hod' || profile?.role === 'principal') && (
              <Link href="/admin" className="no-underline group col-span-2 md:col-span-1">
                <article className="h-full bg-[#fdf2f2] border-2 border-[#ba1a1a] shadow-[3px_3px_0px_0px_#ba1a1a] hover:shadow-[5px_5px_0px_0px_#ba1a1a] hover:-translate-y-0.5 transition-all p-4 rounded-xl flex flex-col gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#ffccd5] border border-[#ba1a1a] flex items-center justify-center text-[#ba1a1a] group-hover:scale-105 transition-transform">
                    <span className="material-symbols-outlined text-xl">admin_panel_settings</span>
                  </div>
                  <div>
                    <h4 className="font-newsreader font-black text-lg text-[#ba1a1a] group-hover:text-[#900] transition-colors leading-tight">
                      Admin Portal
                    </h4>
                    <p className="font-jakarta text-[0.7rem] text-[#b71c1c] mt-1 leading-snug">
                      Manage classrooms &amp; users
                    </p>
                  </div>
                </article>
              </Link>
            )}

            {/* 8. Club Lead Portal Card (Club Lead who is not Admin) */}
            {isClubLead && profile?.role !== 'hod' && profile?.role !== 'principal' && (
              <Link href="/club-lead" className="no-underline group col-span-2 md:col-span-1">
                <article className="h-full bg-[#e8f5e9] border-2 border-[#2e7d32] shadow-[3px_3px_0px_0px_#2e7d32] hover:shadow-[5px_5px_0px_0px_#2e7d32] hover:-translate-y-0.5 transition-all p-4 rounded-xl flex flex-col gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#ccffd5] border border-[#2e7d32] flex items-center justify-center text-[#2e7d32] group-hover:scale-105 transition-transform">
                    <span className="material-symbols-outlined text-xl">assignment_ind</span>
                  </div>
                  <div>
                    <h4 className="font-newsreader font-black text-lg text-[#2e7d32] group-hover:text-[#1b5e20] transition-colors leading-tight">
                      Club Lead Portal
                    </h4>
                    <p className="font-jakarta text-[0.7rem] text-[#1b5e20] mt-1 leading-snug">
                      Manage club &amp; verifications
                    </p>
                  </div>
                </article>
              </Link>
            )}

          </div>
        </section>

      </main>
    </AppShell>
  )
}
