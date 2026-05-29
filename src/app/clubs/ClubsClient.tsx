'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'

/* ── Types ──────────────────────────────────────────────────────── */
interface YearLimit {
  year: number
  max_slots: number
  filled: number
}

interface Club {
  id: string
  name: string
  description: string
  icon_url: string | null
  lead_id: string | null
  lead_name: string | null
  is_open: boolean
  semester_label: string
  year_limits: YearLimit[]
  my_membership: { id: string; status: string; reserved_at: string } | null
  my_payment: { id: string; status: string } | null
  my_waitlist: { id: string; position: number } | null
}

/* ── Club Icons ─────────────────────────────────────────────────── */
const CLUB_ICONS: Record<string, string> = {
  'Art House': 'palette',
  'Codes Club': 'code',
  'Hydra': 'fitness_center',
  'Jignasa': 'science',
  'Shield Prep': 'shield',
  'Vedic Vox': 'mic',
  'Yuga Spark': 'celebration',
}

const CLUB_COLORS: Record<string, string> = {
  'Art House': '#E91E63',
  'Codes Club': '#2196F3',
  'Hydra': '#FF5722',
  'Jignasa': '#4CAF50',
  'Shield Prep': '#9C27B0',
  'Vedic Vox': '#FF9800',
  'Yuga Spark': '#F44336',
}

export default function ClubsClient() {
  const [clubs, setClubs] = useState<Club[]>([])
  const [userYear, setUserYear] = useState(1)
  const [userRole, setUserRole] = useState('student')
  const [loading, setLoading] = useState(true)
  const [reserving, setReserving] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const fetchClubs = useCallback(async () => {
    try {
      const res = await fetch('/api/clubs')
      if (!res.ok) throw new Error('Failed to fetch clubs')
      const data = await res.json()
      setClubs(data.clubs || [])
      setUserYear(data.user_year)
      setUserRole(data.user_role)
    } catch {
      setError('Failed to load clubs.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchClubs()
  }, [fetchClubs])

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('clubs-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'club_members' }, () => {
        fetchClubs()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'club_year_limits' }, () => {
        fetchClubs()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'club_waitlist' }, () => {
        fetchClubs()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchClubs])

  const handleReserve = async (clubId: string) => {
    setReserving(clubId)
    setError('')
    setSuccess('')
    try {
      const res = await fetch(`/api/clubs/${clubId}/reserve`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to reserve slot.')
        return
      }
      setSuccess(data.message || 'Slot reserved!')
      fetchClubs()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setReserving(null)
    }
  }

  const isEligible = userRole === 'student' && userYear >= 2 && userYear <= 4

  if (loading) {
    return (
      <main className="px-4 md:px-gutter max-w-5xl mx-auto py-5 flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-3xl animate-spin">progress_activity</span>
          <p className="font-jakarta text-sm text-outline">Loading clubs...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="px-4 md:px-gutter max-w-5xl mx-auto py-5 flex flex-col gap-6">
      {/* ── Header ─────────────────────────────────────────────── */}
      <section className="flex flex-col gap-1">
        <h1 className="font-newsreader font-black text-[2rem] leading-none text-primary tracking-tight">
          Clubs &amp; Communities
        </h1>
        <p className="font-jakarta text-sm text-outline">
          Reserve your semester club slot. First-come-first-serve • ₹200 per club
        </p>
      </section>

      {/* ── Eligibility Notice ─────────────────────────────────── */}
      {userRole === 'student' && userYear < 2 && (
        <section className="bg-tertiary-container text-on-tertiary-container border-2 border-primary p-4 shadow-[4px_4px_0px_0px_#00595c]">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-primary mt-0.5" style={{ fontVariationSettings: '"FILL" 1' }}>
              info
            </span>
            <div>
              <h3 className="font-newsreader font-bold text-lg text-primary leading-tight mb-1">
                Not Eligible Yet
              </h3>
              <p className="font-jakarta text-sm leading-snug">
                Club registrations are open only for 2nd, 3rd, and 4th year students. You can explore the clubs below but cannot reserve slots yet.
              </p>
            </div>
          </div>
        </section>
      )}

      {userRole !== 'student' && (
        <section className="bg-secondary-container text-on-secondary-container border-2 border-primary p-4 shadow-[4px_4px_0px_0px_#00595c]">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-primary mt-0.5">visibility</span>
            <p className="font-jakarta text-sm leading-snug">
              You are viewing clubs as <strong>{userRole}</strong>. Only students can reserve slots.
            </p>
          </div>
        </section>
      )}

      {/* ── Alerts ─────────────────────────────────────────────── */}
      {error && (
        <div className="bg-error-container text-on-error-container border-2 border-error p-3 font-jakarta text-sm flex items-center gap-2">
          <span className="material-symbols-outlined text-error text-lg">error</span>
          {error}
          <button onClick={() => setError('')} className="ml-auto text-error font-bold cursor-pointer">✕</button>
        </div>
      )}
      {success && (
        <div className="bg-secondary-container text-on-secondary-container border-2 border-primary p-3 font-jakarta text-sm flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-lg">check_circle</span>
          {success}
          <button onClick={() => setSuccess('')} className="ml-auto text-primary font-bold cursor-pointer">✕</button>
        </div>
      )}

      {/* ── Club Cards ─────────────────────────────────────────── */}
      <section className="flex flex-col gap-5">
        {clubs.map((club) => {
          const icon = CLUB_ICONS[club.name] || 'groups'
          const accentColor = CLUB_COLORS[club.name] || '#00595c'
          const myYearLimit = club.year_limits.find((l) => l.year === userYear)
          const hasSlot = myYearLimit && myYearLimit.filled < myYearLimit.max_slots
          const isMember = !!club.my_membership
          const isWaitlisted = !!club.my_waitlist

          return (
            <article
              key={club.id}
              className="bg-surface border-2 border-primary shadow-[4px_4px_0px_0px_#00595c] overflow-hidden relative"
            >
              {/* Color accent bar */}
              <div className="h-1.5" style={{ backgroundColor: accentColor }} />

              <div className="p-5 flex flex-col gap-4">
                {/* Top row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 flex items-center justify-center border-2 border-primary shadow-[2px_2px_0px_0px_#00595c]"
                      style={{ backgroundColor: `${accentColor}18` }}
                    >
                      <span className="material-symbols-outlined text-2xl" style={{ color: accentColor, fontVariationSettings: '"FILL" 1' }}>
                        {icon}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-newsreader font-black text-xl text-primary leading-tight">
                        {club.name}
                      </h3>
                      {club.lead_name && (
                        <p className="font-jakarta text-xs text-outline mt-0.5">
                          Lead: {club.lead_name}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className={`px-2 py-0.5 border text-[0.6rem] font-jakarta font-black uppercase tracking-widest ${
                    club.is_open
                      ? 'bg-secondary-container text-primary border-primary'
                      : 'bg-surface-variant text-outline border-outline'
                  }`}>
                    {club.is_open ? 'Open' : 'Closed'}
                  </div>
                </div>

                {/* Description */}
                <p className="font-jakarta text-xs text-outline leading-relaxed">
                  {club.description}
                </p>

                {/* Year-wise slots */}
                <div className="flex gap-3 flex-wrap">
                  {club.year_limits.map((yl) => {
                    const isFull = yl.max_slots > 0 && yl.filled >= yl.max_slots
                    const isMyYear = yl.year === userYear
                    return (
                      <div
                        key={yl.year}
                        className={`flex-1 min-w-[80px] border p-2 text-center ${
                          isMyYear
                            ? 'border-primary bg-secondary-container'
                            : 'border-outline-variant bg-surface-variant'
                        }`}
                      >
                        <p className="font-jakarta text-[0.6rem] font-black uppercase tracking-widest text-outline">
                          Year {yl.year}{isMyYear ? ' (You)' : ''}
                        </p>
                        {yl.max_slots > 0 ? (
                          <>
                            <p className={`font-newsreader font-black text-lg leading-tight ${
                              isFull ? 'text-error' : 'text-primary'
                            }`}>
                              {yl.filled}/{yl.max_slots}
                            </p>
                            <p className="font-jakarta text-[0.55rem] text-outline">
                              {isFull ? 'Full' : `${yl.max_slots - yl.filled} left`}
                            </p>
                          </>
                        ) : (
                          <p className="font-jakarta text-xs text-outline mt-1">Not set</p>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Status Badges */}
                {isMember && (
                  <div className={`flex items-center gap-2 p-3 border ${
                    club.my_membership!.status === 'active'
                      ? 'bg-secondary-container border-primary'
                      : 'bg-tertiary-container border-tertiary'
                  }`}>
                    <span className="material-symbols-outlined text-primary text-lg" style={{ fontVariationSettings: '"FILL" 1' }}>
                      {club.my_membership!.status === 'active' ? 'verified' : 'hourglass_top'}
                    </span>
                    <div>
                      <p className="font-jakarta text-sm font-bold text-primary">
                        {club.my_membership!.status === 'active' ? 'Active Member' : 'Slot Reserved'}
                      </p>
                      {club.my_payment && (
                        <p className="font-jakarta text-xs text-outline">
                          Payment: <span className={
                            club.my_payment.status === 'verified' ? 'text-primary font-bold' :
                            club.my_payment.status === 'rejected' ? 'text-error font-bold' :
                            'text-tertiary font-bold'
                          }>
                            {club.my_payment.status === 'verified' ? '✓ Verified' :
                             club.my_payment.status === 'rejected' ? '✕ Rejected' :
                             '⏳ Pending — pay ₹200 to club lead'}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {isWaitlisted && (
                  <div className="flex items-center gap-2 p-3 border border-outline-variant bg-surface-variant">
                    <span className="material-symbols-outlined text-outline text-lg">schedule</span>
                    <p className="font-jakarta text-sm text-outline">
                      Waitlisted at position <strong className="text-primary">#{club.my_waitlist!.position}</strong>
                    </p>
                  </div>
                )}

                {/* Reserve Button */}
                {isEligible && club.is_open && !isMember && !isWaitlisted && (
                  <button
                    onClick={() => handleReserve(club.id)}
                    disabled={reserving === club.id}
                    className="bg-primary text-on-primary font-jakarta font-black text-[0.65rem] uppercase tracking-widest px-5 py-2.5 border-2 border-primary shadow-[3px_3px_0px_0px_#00595c] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_0px_#00595c] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cv-transition-btn cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed self-start"
                  >
                    {reserving === club.id ? (
                      <span className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                        Reserving...
                      </span>
                    ) : hasSlot ? (
                      'Reserve My Slot'
                    ) : myYearLimit && myYearLimit.max_slots > 0 ? (
                      'Join Waitlist'
                    ) : (
                      'Reserve My Slot'
                    )}
                  </button>
                )}

                {!club.is_open && !isMember && !isWaitlisted && (
                  <p className="font-jakarta text-xs text-outline italic">
                    Registration is currently closed for this club.
                  </p>
                )}
              </div>
            </article>
          )
        })}
      </section>
    </main>
  )
}
