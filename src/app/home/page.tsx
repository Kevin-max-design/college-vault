'use client'

import React, { useState, useEffect } from 'react'
import AppShell from '@/app/components/AppShell'
import { createClient } from '@/utils/supabase/client'

export default function HomePage() {
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    async function fetchProfile() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data } = await supabase
            .from('profiles')
            .select('full_name, avatar_url, department, year_of_study')
            .eq('id', user.id)
            .single()
          if (data) {
            setProfile(data)
          }
        }
      } catch (err) {
        console.error('Error fetching profile on homepage:', err)
      }
    }
    fetchProfile()
  }, [])

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
            {profile?.department ? `${profile.department} (Yr ${profile.year_of_study})` : 'State University'}
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
                3 new messages about your Calculus textbook. Buyer wants to meet at the library.
              </p>
            </div>
          </div>
        </section>

        {/* ── Event Banner ────────────────────────────────────── */}
        <section className="bg-error-container text-on-error-container border-2 border-primary p-6 shadow-[4px_4px_0px_0px_#00595c] relative overflow-hidden flex flex-col gap-4">
          <div className="relative z-10 flex flex-col gap-2">
            <div className="bg-surface w-fit px-3 py-1 border border-primary shadow-[2px_2px_0px_0px_#00595c] font-jakarta font-black text-[0.65rem] uppercase tracking-widest text-primary">
              Campus Event
            </div>
            <h3 className="font-newsreader font-black text-4xl text-primary leading-tight">
              Graduating Senior Dump
            </h3>
            <p className="font-jakarta text-sm font-bold text-on-surface-variant max-w-[80%] leading-snug">
              Score cheap tech, furniture, and books before they move out this Friday.
            </p>
          </div>
          <div className="relative z-10">
            <button className="bg-surface text-primary border-2 border-primary px-6 py-2 font-jakarta font-black text-[0.65rem] uppercase tracking-widest shadow-[4px_4px_0px_0px_#00595c] hover:bg-surface-variant active:translate-x-1 active:translate-y-1 active:shadow-none transition-all">
              View Listings
            </button>
          </div>
          {/* Decor */}
          <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-secondary-container rounded-full border-4 border-primary opacity-40" />
          <span className="material-symbols-outlined absolute top-4 right-4 text-6xl text-primary opacity-20 transform rotate-12">
            recycling
          </span>
        </section>

        {/* ── Trending ────────────────────────────────────────── */}
        <section className="flex flex-col gap-6">
          <div className="border-b-4 border-primary pb-2 flex justify-between items-end">
            <h3 className="font-newsreader font-black text-3xl text-primary leading-tight">
              Trending in <br /> Mechanical Eng.
            </h3>
            <span className="material-symbols-outlined text-primary text-4xl">trending_up</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Card 1 */}
            <article className="bg-surface border-2 border-primary shadow-[4px_4px_0px_0px_#00595c] flex flex-col hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#00595c] transition-all cursor-pointer group">
              <div className="h-32 bg-surface-variant border-b-2 border-primary relative overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt="Engineering Textbook"
                  className="w-full h-full object-cover mix-blend-multiply opacity-90 group-hover:scale-105 transition-transform duration-500"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuC9ov3cyr9E0xYfdwDRbmPgCtBKQPgSNXB3d6x3D1r_wJGeJxYNxjlp6B6TNZJMkk-ppXx6w_KFKZfhgb3mrpacfhGGwunMPeug3JiPoEt6-u6SVKkCHjhsCm91muquy9C5JoKnNhSehCdarIep-LSBcQU4PAxjWUzo7KYMKTGavCiLr7UgmuiKNIufDoMxaOfTwhGdQyaXyk8ASL46s5agjMDm2kaJ6e3JSODMyloyCyvQ3eqhPXaT-epxzzqJ3ZNHla2StxgqDig"
                />
                <div className="absolute top-2 left-2 bg-surface border border-primary px-2 py-1 flex items-center gap-1 shadow-[2px_2px_0px_0px_#00595c]">
                  <span
                    className="material-symbols-outlined text-[14px] text-primary"
                    style={{ fontVariationSettings: '"FILL" 1' }}
                  >
                    verified
                  </span>
                  <span className="font-jakarta font-black text-[0.6rem] tracking-widest uppercase text-primary">
                    Trust 98
                  </span>
                </div>
              </div>
              <div className="p-3 flex flex-col gap-2 flex-grow justify-between bg-surface">
                <h4 className="font-jakarta font-bold text-sm text-on-surface line-clamp-2 leading-tight">
                  Engineering Mechanics: Dynamics (14th Ed)
                </h4>
                <div className="flex justify-between items-center mt-2">
                  <p className="font-newsreader font-black text-base text-primary bg-secondary-container px-2 border border-primary shadow-[2px_2px_0px_0px_#00595c]">
                    $45
                  </p>
                  <span className="material-symbols-outlined text-outline-variant">bookmark_border</span>
                </div>
              </div>
            </article>

            {/* Card 2 */}
            <article className="bg-surface border-2 border-primary shadow-[4px_4px_0px_0px_#00595c] flex flex-col hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#00595c] transition-all cursor-pointer group">
              <div className="h-32 bg-surface-variant border-b-2 border-primary relative overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt="Scientific Tools"
                  className="w-full h-full object-cover mix-blend-multiply opacity-90 group-hover:scale-105 transition-transform duration-500"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuC-JNXfjH2zGXjEhomhOsgc5NtmiFLRhLWXn9xKn5buv8cSWsiR4y3_cpWH8oZc0P3kkyQgsQ0xqO5ATuYEwPPlz5N54dZ5fEhJG1krB_tNgbgYCiohnuHVrR4Dxb-koEnITCCnohg3WREB2U84BteCrhwtv_LubrDdVlaBctkxKxhmOgyNdX850DDu_ieXazqFODVmba9c4cDWBfGDP5f9e243DkzcIn64fRr7_G0Ey1GHIilcLFcoqggbwEm9m8fDTXPrcufdar0"
                />
                <div className="absolute top-2 left-2 bg-surface border border-primary px-2 py-1 flex items-center gap-1 shadow-[2px_2px_0px_0px_#00595c]">
                  <span
                    className="material-symbols-outlined text-[14px] text-primary"
                    style={{ fontVariationSettings: '"FILL" 1' }}
                  >
                    verified
                  </span>
                  <span className="font-jakarta font-black text-[0.6rem] tracking-widest uppercase text-primary">
                    Trust 85
                  </span>
                </div>
              </div>
              <div className="p-3 flex flex-col gap-2 flex-grow justify-between bg-surface">
                <h4 className="font-jakarta font-bold text-sm text-on-surface line-clamp-2 leading-tight">
                  Precision Caliper Set &amp; Lab Goggles
                </h4>
                <div className="flex justify-between items-center mt-2">
                  <p className="font-newsreader font-black text-base text-primary bg-secondary-container px-2 border border-primary shadow-[2px_2px_0px_0px_#00595c]">
                    $15
                  </p>
                  <span className="material-symbols-outlined text-outline-variant">bookmark_border</span>
                </div>
              </div>
            </article>
          </div>
        </section>

      </main>
    </AppShell>
  )
}
