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

        {/* ── Management Portals Alerts (Role-based Quick Access) ── */}
        {(profile?.role === 'hod' || profile?.role === 'principal') && (
          <Link href="/admin" className="no-underline">
            <div className="bg-[#fdf2f2] border-2 border-[#ba1a1a] shadow-[3px_3px_0px_0px_#ba1a1a] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all p-3 rounded-lg flex items-center gap-3 text-xs font-jakarta text-[#ba1a1a] font-black">
              <span className="material-symbols-outlined text-xl">admin_panel_settings</span>
              <span>⚠️ Management Alert: Click here to enter HOD Admin Portal</span>
            </div>
          </Link>
        )}

        {isClubLead && profile?.role !== 'hod' && profile?.role !== 'principal' && (
          <Link href="/club-lead" className="no-underline">
            <div className="bg-[#e8f5e9] border-2 border-[#2e7d32] shadow-[3px_3px_0px_0px_#2e7d32] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all p-3 rounded-lg flex items-center gap-3 text-xs font-jakarta text-[#2e7d32] font-black">
              <span className="material-symbols-outlined text-xl">assignment_ind</span>
              <span>⚠️ Lead Alert: Click here to enter Club Lead Portal</span>
            </div>
          </Link>
        )}

        {/* ── Reminders & Deadlines Panel ───────────────────────── */}
        <section className="flex flex-col gap-4">
          <div className="border-b border-[#bec9c9] pb-1 flex justify-between items-end">
            <h3 className="font-newsreader font-black text-xl text-[#00595c]">
              Important Reminders
            </h3>
            <span className="font-jakarta text-[0.62rem] font-bold text-[#6e7979] uppercase tracking-wider">
              Academic &amp; Student Actions
            </span>
          </div>

          <div className="flex flex-col gap-3">
            
            {/* Notice Board Reminder */}
            {latestNotice ? (
              <div className="bg-[#fffdf5] border-2 border-[#fea619] shadow-[3px_3px_0px_0px_#fea619] p-4 rounded-xl flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#fff9e6] border border-[#fea619] flex items-center justify-center text-[#fea619] flex-shrink-0">
                  <span className="material-symbols-outlined text-lg">campaign</span>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-jakarta text-[0.62rem] font-black text-[#855300] uppercase tracking-wider">Campus Notice Board</span>
                  <h4 className="font-newsreader font-black text-base text-[#1a1a1a] truncate mt-0.5">
                    {latestNotice.title}
                  </h4>
                  <Link href="/bulletin" className="inline-block mt-2 font-jakarta text-[0.7rem] font-bold text-[#855300] underline hover:text-[#00595c]">
                    Open Notice Board
                  </Link>
                </div>
              </div>
            ) : (
              <div className="bg-[#f0eee9] border border-[#bec9c9] p-3 rounded-xl flex items-center gap-2 text-xs font-jakarta text-[#6e7979]">
                <span className="material-symbols-outlined text-base">campaign</span>
                <span>No new global announcement notices today.</span>
              </div>
            )}

            {/* Club Status Reminder */}
            {userClub ? (
              <div className={`border-2 p-4 rounded-xl flex items-start gap-3 shadow-[3px_3px_0px_0px_#00595c] ${
                userClub.status === 'reserved' 
                  ? 'bg-[#fff8f8] border-[#ba1a1a] shadow-[3px_3px_0px_0px_#ba1a1a]' 
                  : 'bg-[#e8f5e9] border-[#2e7d32] shadow-[3px_3px_0px_0px_#2e7d32]'
              }`}>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 border ${
                  userClub.status === 'reserved' 
                    ? 'bg-[#ffebee] border-[#ba1a1a] text-[#ba1a1a]' 
                    : 'bg-[#e8f5e9] border-[#2e7d32] text-[#2e7d32]'
                }`}>
                  <span className="material-symbols-outlined text-lg">groups</span>
                </div>
                <div className="flex-1 min-w-0">
                  <span className={`font-jakarta text-[0.62rem] font-black uppercase tracking-wider ${
                    userClub.status === 'reserved' ? 'text-[#ba1a1a]' : 'text-[#2e7d32]'
                  }`}>Club Membership Status</span>
                  
                  {userClub.status === 'reserved' ? (
                    <>
                      <h4 className="font-newsreader font-black text-base text-[#1a1a1a] mt-0.5">
                        Slot Reserved in {userClub.name}
                      </h4>
                      <p className="font-jakarta text-[0.7rem] text-[#ba1a1a] mt-1 leading-snug">
                        ⚠️ Payment Pending: Please upload your payment receipt under the Clubs panel to secure your seat.
                      </p>
                    </>
                  ) : (
                    <>
                      <h4 className="font-newsreader font-black text-base text-[#1a1a1a] mt-0.5">
                        Active Member of {userClub.name}
                      </h4>
                      <p className="font-jakarta text-[0.7rem] text-[#2e7d32] mt-1 leading-snug">
                        🏆 Registered Semester Slot: You are officially enrolled in the club. Check details or view roster.
                      </p>
                    </>
                  )}
                  <Link href="/clubs" className={`inline-block mt-2 font-jakarta text-[0.7rem] font-bold underline hover:text-[#00595c] ${
                    userClub.status === 'reserved' ? 'text-[#ba1a1a]' : 'text-[#2e7d32]'
                  }`}>
                    Manage Club Slot
                  </Link>
                </div>
              </div>
            ) : (
              <div className="bg-[#fffdf5] border-2 border-[#00595c] shadow-[3px_3px_0px_0px_#00595c] p-4 rounded-xl flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#fff9e6] border border-[#00595c] flex items-center justify-center text-[#fea619] flex-shrink-0">
                  <span className="material-symbols-outlined text-lg">hotel_class</span>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-jakarta text-[0.62rem] font-black text-[#00595c] uppercase tracking-wider">Club Registration</span>
                  <h4 className="font-newsreader font-black text-base text-[#1a1a1a] mt-0.5">
                    No Club Enrolled
                  </h4>
                  <p className="font-jakarta text-[0.7rem] text-[#6e7979] mt-1 leading-snug">
                    Codes Club, Art House, Hydra, Shield Prep, and Vedic Vox slot registrations are live. Enroll first-come-first-serve!
                  </p>
                  <Link href="/clubs" className="inline-block mt-2 font-jakarta text-[0.7rem] font-bold text-[#00595c] underline hover:text-[#0b4d50]">
                    Register semester slot
                  </Link>
                </div>
              </div>
            )}

            {/* Notification Inbox Reminder */}
            {unreadCount > 0 && (
              <div className="bg-[#f3e5f5] border-2 border-[#6a1b9a] shadow-[3px_3px_0px_0px_#6a1b9a] p-4 rounded-xl flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#fae8ff] border border-[#6a1b9a] flex items-center justify-center text-[#6a1b9a] flex-shrink-0">
                  <span className="material-symbols-outlined text-lg">chat</span>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-jakarta text-[0.62rem] font-black text-[#6a1b9a] uppercase tracking-wider">Unread Inbox Messages</span>
                  <h4 className="font-newsreader font-black text-base text-[#1a1a1a] mt-0.5">
                    You have {unreadCount} unread message{unreadCount > 1 ? 's' : ''}
                  </h4>
                  <p className="font-jakarta text-[0.7rem] text-[#6a1b9a] mt-1 leading-snug">
                    Pending messages waiting in your marketplace chat or peer-to-peer student discovery conversations.
                  </p>
                  <Link href="/vault" className="inline-block mt-2 font-jakarta text-[0.7rem] font-bold text-[#6a1b9a] underline hover:text-[#00595c]">
                    Open Unified Inbox
                  </Link>
                </div>
              </div>
            )}

          </div>
        </section>

        {/* ── Campus Sponsorships & Ads ───────────────────────── */}
        <section className="flex flex-col gap-4">
          <div className="border-b border-[#bec9c9] pb-1 flex justify-between items-end">
            <h3 className="font-newsreader font-black text-xl text-[#00595c]">
              Campus Announcements &amp; Promos
            </h3>
            <span className="font-jakarta text-[0.62rem] font-bold text-[#6e7979] uppercase tracking-wider">
              Sponsored / Bulletin Ads
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Ad 1: Book Exchange */}
            <Link href="/vault" className="no-underline group">
              <article className="h-full bg-white border-2 border-[#00595c] shadow-[3px_3px_0px_0px_#00595c] hover:shadow-[5px_5px_0px_0px_#00595c] hover:-translate-y-0.5 transition-all p-4 rounded-xl flex flex-col gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#fffdf5] border border-[#fea619] flex items-center justify-center text-[#fea619] group-hover:scale-105 transition-transform flex-shrink-0">
                  <span className="material-symbols-outlined text-xl">storefront</span>
                </div>
                <div>
                  <div className="flex justify-between items-center">
                    <span className="font-jakarta text-[0.55rem] font-bold text-[#fea619] uppercase tracking-widest bg-[#fffdf5] px-1.5 py-0.5 border border-[#fea619] rounded-md">SPONSORED</span>
                  </div>
                  <h4 className="font-newsreader font-black text-base text-[#1a1a1a] group-hover:text-[#00595c] transition-colors leading-tight mt-2">
                    Rent &amp; Sell Semester Textbooks
                  </h4>
                  <p className="font-jakarta text-[0.7rem] text-[#6e7979] mt-1 leading-snug">
                    Done with engineering mechanics? Rent or sell your old textbooks, lab coats, and calculators directly to juniors in the Marketplace.
                  </p>
                </div>
              </article>
            </Link>

            {/* Ad 2: Hackathon Promo */}
            <Link href="/clubs" className="no-underline group">
              <article className="h-full bg-white border-2 border-[#00595c] shadow-[3px_3px_0px_0px_#00595c] hover:shadow-[5px_5px_0px_0px_#00595c] hover:-translate-y-0.5 transition-all p-4 rounded-xl flex flex-col gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#e8f5e9] border border-[#2e7d32] flex items-center justify-center text-[#2e7d32] group-hover:scale-105 transition-transform flex-shrink-0">
                  <span className="material-symbols-outlined text-xl">terminal</span>
                </div>
                <div>
                  <span className="font-jakarta text-[0.55rem] font-bold text-[#2e7d32] uppercase tracking-widest bg-[#e8f5e9] px-1.5 py-0.5 border border-[#2e7d32] rounded-md">CLUB PROMO</span>
                  <h4 className="font-newsreader font-black text-base text-[#1a1a1a] group-hover:text-[#00595c] transition-colors leading-tight mt-2">
                    Codes Club: Semester Hackathon
                  </h4>
                  <p className="font-jakarta text-[0.7rem] text-[#6e7979] mt-1 leading-snug">
                    Secure slot registration in Codes Club! Reserves exclusive seats for next month's annual Hackathon and coding bootcamps.
                  </p>
                </div>
              </article>
            </Link>

            {/* Ad 3: Peer Connect */}
            <Link href="/connect" className="no-underline group col-span-1 md:col-span-2">
              <article className="h-full bg-[#fbf9f4] border-2 border-[#00595c] shadow-[3px_3px_0px_0px_#00595c] hover:shadow-[5px_5px_0px_0px_#00595c] hover:-translate-y-0.5 transition-all p-4 rounded-xl flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-[#f3e5f5] border border-[#6a1b9a] flex items-center justify-center text-[#6a1b9a] group-hover:scale-105 transition-transform flex-shrink-0 mt-1">
                  <span className="material-symbols-outlined text-xl">diversity_3</span>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-jakarta text-[0.55rem] font-bold text-[#6a1b9a] uppercase tracking-widest bg-[#f3e5f5] px-1.5 py-0.5 border border-[#6a1b9a] rounded-md inline-block">STUDENT PROMO</span>
                  <h4 className="font-newsreader font-black text-base text-[#1a1a1a] group-hover:text-[#00595c] transition-colors leading-tight mt-2">
                    Need an Exam Study Partner?
                  </h4>
                  <p className="font-jakarta text-[0.7rem] text-[#6e7979] mt-1 leading-snug">
                    Filter peers by academic interest, skills, or study goals. Direct message senior students or batchmates to prepare for final exams together.
                  </p>
                </div>
              </article>
            </Link>

          </div>
        </section>

      </main>
    </AppShell>
  )
}
