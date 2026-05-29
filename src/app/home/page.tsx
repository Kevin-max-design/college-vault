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
      .select('full_name, avatar_url, department, year_of_study')
      .eq('id', user.id)
      .single()
    profile = data
  } catch (err) {
    console.error('Error fetching profile server-side on homepage:', err)
  }

  const fullName = profile?.full_name?.trim() || ''
  const firstName = fullName ? (fullName.split(' ')[0] || 'Student') : 'Student'
  const initials = fullName
    ? (fullName.split(' ').slice(0, 2).map((n: string) => n ? n[0] : '').join('').toUpperCase() || 'U')
    : 'U'

  return (
    <AppShell pageTitle="Campus Vault" userAvatarUrl={profile?.avatar_url} userInitials={initials}>
      <main className="px-4 md:px-gutter max-w-5xl mx-auto flex flex-col gap-8 py-5">

        {/* ── Greeting ────────────────────────────────────────── */}
        <section className="flex flex-col gap-1">
          <h2 className="font-newsreader font-black text-[2.4rem] leading-none text-primary tracking-tight">
            Hey {firstName}!
          </h2>
          <p className="font-jakarta text-sm text-outline flex items-center gap-2">
            <span className="material-symbols-outlined text-base">school</span>
            {profile?.department ? `${profile.department} (Yr ${profile.year_of_study})` : 'RGMCET Student'}
          </p>
        </section>

        {/* ── Notification Strip ──────────────────────────────── */}
        <section className="bg-secondary-container text-on-secondary-container border-2 border-primary p-4 shadow-[4px_4px_0px_0px_#00595c] -rotate-1 transform transition-transform hover:rotate-0">
          <div className="flex items-start gap-3">
            <span
              className="material-symbols-outlined text-primary mt-1"
              style={{ fontVariationSettings: '"FILL" 1' }}
            >
              notifications
            </span>
            <div>
              <h3 className="font-newsreader font-bold text-xl text-primary leading-tight mb-1">
                Reminders &amp; Messages
              </h3>
              <p className="font-jakarta text-sm text-on-secondary-container leading-snug">
                Doubt resolved in Classrooms, 1 new message in Market about your textbook listing, and new Principal notice posted in Social.
              </p>
            </div>
          </div>
        </section>

        {/* ── Core Feature 1: Classrooms ──────────────────────── */}
        <section className="bg-error-container text-on-error-container border-2 border-primary p-6 shadow-[4px_4px_0px_0px_#00595c] relative overflow-hidden flex flex-col gap-4">
          <div className="relative z-10 flex flex-col gap-2">
            <div className="bg-surface w-fit px-3 py-1 border border-primary shadow-[2px_2px_0px_0px_#00595c] font-jakarta font-black text-[0.65rem] uppercase tracking-widest text-primary">
              ACADEMIC HUB
            </div>
            <h3 className="font-newsreader font-black text-4xl text-primary leading-tight">
              Classrooms &amp; Doubts
            </h3>
            <p className="font-jakarta text-sm font-bold text-on-surface-variant max-w-[85%] leading-snug">
              Ask doubts, share lecture materials, download study PDFs, and collaborate on syllabus topics with classmates and faculty.
            </p>
          </div>
          <div className="relative z-10">
            <Link href="/classrooms">
              <button className="bg-surface text-primary border-2 border-primary px-6 py-2.5 font-jakarta font-black text-[0.65rem] uppercase tracking-widest shadow-[4px_4px_0px_0px_#00595c] hover:bg-surface-variant active:translate-x-1 active:translate-y-1 active:shadow-none cv-transition-btn cursor-pointer">
                Enter Classrooms
              </button>
            </Link>
          </div>
          {/* Decor */}
          <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-secondary-container rounded-full border-4 border-primary opacity-40 pointer-events-none" />
          <span className="material-symbols-outlined absolute top-4 right-4 text-6xl text-primary opacity-20 transform rotate-12 pointer-events-none">
            school
          </span>
        </section>

        {/* ── Pillars Grid: Market & Social ────────────────────── */}
        <section className="flex flex-col gap-6">
          <div className="border-b-4 border-primary pb-2 flex justify-between items-end">
            <h3 className="font-newsreader font-black text-3xl text-primary leading-tight">
              Explore Campus Hubs
            </h3>
            <span className="material-symbols-outlined text-primary text-4xl">hub</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Market Card */}
            <article className="bg-surface border-2 border-primary shadow-[4px_4px_0px_0px_#00595c] flex flex-col justify-between hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#00595c] cv-transition-card bg-surface p-5 gap-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-xl">storefront</span>
                  <span className="font-jakarta font-black text-[0.65rem] tracking-widest uppercase text-outline">
                    Marketplace
                  </span>
                </div>
                <h4 className="font-newsreader font-black text-2xl text-primary leading-tight">
                  P2P Campus Market
                </h4>
                <p className="font-jakarta text-xs text-outline leading-relaxed">
                  Buy, rent, or sell textbooks, scientific calculators, lab coats, and college gear directly to and from your fellow RGMCET peers.
                </p>
              </div>
              <div>
                <Link href="/vault">
                  <button className="bg-primary text-on-primary font-jakarta font-black text-[0.65rem] uppercase tracking-widest px-4 py-2 border-2 border-primary shadow-[3px_3px_0px_0px_#00595c] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_0px_#00595c] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cv-transition-btn cursor-pointer">
                    Explore Market
                  </button>
                </Link>
              </div>
            </article>

            {/* Social Card */}
            <article className="bg-surface border-2 border-primary shadow-[4px_4px_0px_0px_#00595c] flex flex-col justify-between hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#00595c] cv-transition-card bg-surface p-5 gap-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-xl">people</span>
                  <span className="font-jakarta font-black text-[0.65rem] tracking-widest uppercase text-outline">
                    Bulletin Board
                  </span>
                </div>
                <h4 className="font-newsreader font-black text-2xl text-primary leading-tight">
                  Social &amp; Notices
                </h4>
                <p className="font-jakarta text-xs text-outline leading-relaxed">
                  Stay updated with official Principal notices, HOD department updates, faculty announcements, and student bulletin boards.
                </p>
              </div>
              <div>
                <Link href="/bulletin">
                  <button className="bg-primary text-on-primary font-jakarta font-black text-[0.65rem] uppercase tracking-widest px-4 py-2 border-2 border-primary shadow-[3px_3px_0px_0px_#00595c] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_0px_#00595c] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cv-transition-btn cursor-pointer">
                    Open Social
                  </button>
                </Link>
              </div>
            </article>
          </div>
        </section>

      </main>
    </AppShell>
  )
}
