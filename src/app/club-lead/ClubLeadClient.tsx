'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'

/* ── Types ──────────────────────────────────────────────────────── */
interface YearLimit {
  id: string
  year: number
  max_slots: number
  filled: number
}

interface Member {
  id: string
  club_id: string
  user_id: string
  year: number
  status: string
  reserved_at: string
  profile: {
    full_name: string
    email: string
    department: string
    year_of_study: number
    college_id: string
  } | null
  payment: {
    id: string
    status: string
    amount: number
    proof_url: string | null
    payment_note: string
    notes: string
    created_at: string
  } | null
}

interface WaitlistEntry {
  id: string
  club_id: string
  user_id: string
  year: number
  position: number
  joined_at: string
  profile: {
    full_name: string
    email: string
    department: string
    year_of_study: number
    college_id: string
  } | null
}

interface Club {
  id: string
  name: string
  description: string
  lead_id: string | null
  lead_name: string | null
  is_open: boolean
  semester_label: string
  year_limits: YearLimit[]
  members: Member[]
  waitlist: WaitlistEntry[]
  member_stats: { reserved: number; active: number; rejected: number }
  payment_stats: { pending: number; verified: number }
  waitlist_count: number
  estimated_collection: number
}

/* ── Palette & Styles (Neobrutalism match) ─────────────────────── */
const C = {
  primary: '#00595c',
  onPrimary: '#FFFFFF',
  secondary: '#EAE4D8',
  bg: '#F4EFE6',
  surface: '#FDFAF5',
  border: '#002021',
  text: '#1A1A1A',
  textMuted: '#7A7A7A',
  error: '#ba1a1a',
  errorContainer: '#ffdad6',
  success: '#2e7d32',
  successContainer: '#e8f5e9',
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

export default function ClubLeadClient() {
  const [clubs, setClubs] = useState<Club[]>([])
  const [selectedClubId, setSelectedClubId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Limit edits state
  const [editLimits, setEditLimits] = useState<Record<number, number>>({ 2: 0, 3: 0, 4: 0 })
  const [savingLimits, setSavingLimits] = useState(false)
  const [togglingStatus, setTogglingStatus] = useState(false)

  // Payment Verification Modal / Action state
  const [verifyingPaymentId, setVerifyingPaymentId] = useState<string | null>(null)
  const [rejectingPaymentId, setRejectingPaymentId] = useState<string | null>(null)
  const [rejectNotes, setRejectNotes] = useState('')
  const [selectedProofUrl, setSelectedProofUrl] = useState<string | null>(null)
  const [selectedProofNote, setSelectedProofNote] = useState<string | null>(null)

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch('/api/club-lead/dashboard')
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to fetch dashboard.')
        return
      }
      const loadedClubs = data.clubs || []
      setClubs(loadedClubs)

      if (loadedClubs.length > 0) {
        // Maintain selection or default to first club
        setSelectedClubId(prev => {
          const exists = loadedClubs.some((c: Club) => c.id === prev)
          return exists ? prev : loadedClubs[0].id
        })
      }
    } catch {
      setError('Failed to connect to dashboard API.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  // Set limits editing state when active club changes
  useEffect(() => {
    const activeClub = clubs.find(c => c.id === selectedClubId)
    if (activeClub) {
      const initialLimits: Record<number, number> = {}
      activeClub.year_limits.forEach(l => {
        initialLimits[l.year] = l.max_slots
      })
      setEditLimits(initialLimits)
    }
  }, [selectedClubId, clubs])

  // Realtime update hook
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('club-lead-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'club_members' }, () => {
        fetchDashboard()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'club_year_limits' }, () => {
        fetchDashboard()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'club_waitlist' }, () => {
        fetchDashboard()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'club_payments' }, () => {
        fetchDashboard()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchDashboard])

  const handleSaveLimits = async () => {
    if (!selectedClubId) return
    setSavingLimits(true)
    setError('')
    setSuccess('')
    const limits = Object.entries(editLimits).map(([yr, max]) => ({
      year: Number(yr),
      max_slots: Number(max),
    }))

    try {
      const res = await fetch(`/api/club-lead/clubs/${selectedClubId}/limits`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limits }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to update limits.')
        return
      }
      setSuccess('Limits updated successfully.')
      fetchDashboard()
    } catch {
      setError('An error occurred while saving limits.')
    } finally {
      setSavingLimits(false)
    }
  }

  const handleToggleStatus = async (currentOpen: boolean) => {
    if (!selectedClubId) return
    setTogglingStatus(true)
    setError('')
    setSuccess('')
    try {
      const res = await fetch(`/api/club-lead/clubs/${selectedClubId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_open: !currentOpen }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to update registration status.')
        return
      }
      setSuccess(data.message || 'Status updated.')
      fetchDashboard()
    } catch {
      setError('Failed to update registration status.')
    } finally {
      setTogglingStatus(false)
    }
  }

  const handleVerifyPayment = async (paymentId: string) => {
    if (!selectedClubId) return
    setVerifyingPaymentId(paymentId)
    setError('')
    setSuccess('')
    try {
      const res = await fetch(`/api/club-lead/clubs/${selectedClubId}/payments/${paymentId}/verify`, {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to verify payment.')
        return
      }
      setSuccess('Payment verified successfully! Student has been promoted to Active.')
      fetchDashboard()
    } catch {
      setError('An error occurred during verification.')
    } finally {
      setVerifyingPaymentId(null)
    }
  }

  const handleRejectPayment = async () => {
    if (!selectedClubId || !rejectingPaymentId) return
    const paymentId = rejectingPaymentId
    setError('')
    setSuccess('')
    try {
      const res = await fetch(`/api/club-lead/clubs/${selectedClubId}/payments/${paymentId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: rejectNotes }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to reject payment.')
        return
      }
      setSuccess('Payment rejected and student notified.')
      setRejectingPaymentId(null)
      setRejectNotes('')
      fetchDashboard()
    } catch {
      setError('An error occurred during rejection.')
    }
  }

  const handleExport = () => {
    if (!selectedClubId) return
    window.open(`/api/club-lead/clubs/${selectedClubId}/export`, '_blank')
  }

  if (loading) {
    return (
      <main className="px-4 md:px-gutter max-w-5xl mx-auto py-12 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-3xl animate-spin">progress_activity</span>
          <p className="font-jakarta text-sm text-outline">Loading dashboard data...</p>
        </div>
      </main>
    )
  }

  if (clubs.length === 0) {
    return (
      <main className="px-4 md:px-gutter max-w-5xl mx-auto py-16 text-center flex flex-col items-center gap-4">
        <span className="material-symbols-outlined text-outline text-5xl">groups_3</span>
        <p className="font-newsreader font-black text-2xl text-primary">No Clubs Found</p>
        <p className="font-jakarta text-sm text-outline">You are not designated as a lead for any club.</p>
      </main>
    )
  }

  const activeClub = clubs.find(c => c.id === selectedClubId) || clubs[0]
  const accentColor = CLUB_COLORS[activeClub.name] || C.primary

  const pendingPayments = activeClub.members.filter(m => m.payment && m.payment.status === 'pending')
  const verifiedMembers = activeClub.members.filter(m => m.status === 'active')

  return (
    <main className="px-4 md:px-gutter max-w-5xl mx-auto py-5 flex flex-col gap-6">
      
      {/* ── Title / Club Selector Header ────────────────────────── */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b-2 border-primary pb-4">
        <div className="flex flex-col gap-1.5">
          <span className="font-jakarta text-[0.62rem] font-black uppercase tracking-widest text-outline">Club Lead Portal</span>
          {clubs.length > 1 ? (
            <div className="flex items-center gap-2">
              <h1 className="font-newsreader font-black text-3xl text-primary">{activeClub.name}</h1>
              <select
                value={selectedClubId}
                onChange={(e) => setSelectedClubId(e.target.value)}
                className="font-jakarta text-xs border-2 border-primary p-1 bg-surface font-bold text-primary shadow-[2px_2px_0px_0px_#00595c] cursor-pointer"
              >
                {clubs.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <h1 className="font-newsreader font-black text-[2.2rem] leading-none text-primary tracking-tight">
              {activeClub.name} Dashboard
            </h1>
          )}
          <p className="font-jakarta text-xs text-outline leading-relaxed mt-1">
            Manage slots limits, verify payment receipts, view waitlists, and download member data.
          </p>
        </div>

        <div className="flex gap-2.5">
          <button
            onClick={() => handleToggleStatus(activeClub.is_open)}
            disabled={togglingStatus}
            className={`font-jakarta font-black text-[0.65rem] uppercase tracking-widest px-4 py-2 border-2 border-primary shadow-[3px_3px_0px_0px_#002021] hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_#002021] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cv-transition-btn cursor-pointer ${
              activeClub.is_open ? 'bg-error-container text-error' : 'bg-secondary-container text-primary'
            }`}
          >
            {activeClub.is_open ? 'Close Registration' : 'Open Registration'}
          </button>

          <button
            onClick={handleExport}
            className="bg-surface text-primary border-2 border-primary px-4 py-2 font-jakarta font-black text-[0.65rem] uppercase tracking-widest shadow-[3px_3px_0px_0px_#002021] hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_#002021] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cv-transition-btn cursor-pointer flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-sm">download</span>
            Export Excel
          </button>
        </div>
      </section>

      {/* ── Alerts ─────────────────────────────────────────────── */}
      {error && (
        <div className="bg-error-container text-on-error-container border-2 border-error p-3.5 font-jakarta text-xs flex items-center gap-2">
          <span className="material-symbols-outlined text-error text-lg">error</span>
          <span className="flex-1">{error}</span>
          <button onClick={() => setError('')} className="text-error font-black cursor-pointer bg-none border-none">✕</button>
        </div>
      )}
      {success && (
        <div className="bg-secondary-container text-on-secondary-container border-2 border-primary p-3.5 font-jakarta text-xs flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-lg">check_circle</span>
          <span className="flex-1">{success}</span>
          <button onClick={() => setSuccess('')} className="text-primary font-black cursor-pointer bg-none border-none">✕</button>
        </div>
      )}

      {/* ── Overview Statistics Cards ───────────────────────────── */}
      <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-surface border-2 border-primary p-4 shadow-[3px_3px_0px_0px_#00595c]">
          <span className="font-jakarta text-[0.58rem] font-bold text-outline uppercase tracking-wider block">Total Reserved</span>
          <span className="font-newsreader font-black text-3xl text-primary block mt-1">{activeClub.member_stats.reserved}</span>
        </div>
        <div className="bg-surface border-2 border-primary p-4 shadow-[3px_3px_0px_0px_#00595c]">
          <span className="font-jakarta text-[0.58rem] font-bold text-outline uppercase tracking-wider block">Verified Members</span>
          <span className="font-newsreader font-black text-3xl text-success block mt-1">{activeClub.member_stats.active}</span>
        </div>
        <div className="bg-surface border-2 border-primary p-4 shadow-[3px_3px_0px_0px_#00595c]">
          <span className="font-jakarta text-[0.58rem] font-bold text-outline uppercase tracking-wider block">Pending Pay</span>
          <span className="font-newsreader font-black text-3xl text-primary block mt-1" style={{ color: '#d97706' }}>{activeClub.payment_stats.pending}</span>
        </div>
        <div className="bg-surface border-2 border-primary p-4 shadow-[3px_3px_0px_0px_#00595c]">
          <span className="font-jakarta text-[0.58rem] font-bold text-outline uppercase tracking-wider block">Waitlist Count</span>
          <span className="font-newsreader font-black text-3xl text-primary block mt-1" style={{ color: '#7c3aed' }}>{activeClub.waitlist_count}</span>
        </div>
        <div className="bg-surface border-2 border-primary p-4 shadow-[3px_3px_0px_0px_#00595c] col-span-2 md:col-span-1">
          <span className="font-jakarta text-[0.58rem] font-bold text-outline uppercase tracking-wider block">Collection (Est)</span>
          <span className="font-newsreader font-black text-3xl text-primary block mt-1">₹{activeClub.estimated_collection}</span>
        </div>
      </section>

      {/* ── Mid Section: Slot Limits Configuration ───────────────── */}
      <section className="bg-surface border-2 border-primary p-5 shadow-[4px_4px_0px_0px_#00595c] flex flex-col gap-4">
        <div>
          <h3 className="font-newsreader font-black text-xl text-primary">Year-Wise Slots limits</h3>
          <p className="font-jakarta text-xs text-outline mt-0.5">Configure the maximum number of students allowed for each year.</p>
        </div>

        <div className="flex flex-wrap gap-4 items-end">
          {activeClub.year_limits.map((yl) => (
            <div key={yl.year} className="flex flex-col gap-1 border border-outline-variant p-3 bg-surface-variant min-w-[120px]">
              <span className="font-jakarta text-[0.55rem] font-black uppercase tracking-widest text-outline">Year {yl.year} Slots</span>
              <input
                type="number"
                min={0}
                value={editLimits[yl.year] ?? yl.max_slots}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 0
                  setEditLimits(prev => ({ ...prev, [yl.year]: val }))
                }}
                className="font-jakarta text-sm border border-outline-variant bg-surface p-1 text-center font-bold text-primary w-full"
              />
              <span className="font-jakarta text-[0.55rem] text-outline-variant text-center mt-1">
                {yl.filled} / {yl.max_slots} filled
              </span>
            </div>
          ))}

          <button
            onClick={handleSaveLimits}
            disabled={savingLimits}
            className="bg-primary text-on-primary font-jakarta font-black text-[0.62rem] uppercase tracking-widest px-5 py-3 border-2 border-primary shadow-[3px_3px_0px_0px_#002021] hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_#002021] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cv-transition-btn cursor-pointer disabled:opacity-50 h-[44px]"
          >
            {savingLimits ? 'Saving...' : 'Save Limits'}
          </button>
        </div>
      </section>

      {/* ── Pending Payments Section ────────────────────────────── */}
      <section className="bg-surface border-2 border-primary p-5 shadow-[4px_4px_0px_0px_#00595c] flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-newsreader font-black text-xl text-primary">Pending Payments ({pendingPayments.length})</h3>
            <p className="font-jakarta text-xs text-outline mt-0.5">Verify uploaded screenshots/receipts to activate memberships.</p>
          </div>
          <span className="material-symbols-outlined text-outline">payments</span>
        </div>

        {pendingPayments.length > 0 ? (
          <div className="overflow-x-auto border border-outline-variant">
            <table className="w-full border-collapse font-jakarta text-xs text-left bg-surface">
              <thead>
                <tr className="bg-surface-variant border-b border-outline-variant font-bold text-[0.62rem] uppercase tracking-widest text-outline">
                  <th className="p-3">Student Info</th>
                  <th className="p-3">Details</th>
                  <th className="p-3 text-center">Proof / Attachments</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingPayments.map((m) => (
                  <tr key={m.id} className="border-b border-outline-variant hover:bg-surface-variant/35">
                    <td className="p-3">
                      <div className="font-bold text-primary">{m.profile?.full_name || '—'}</div>
                      <div className="text-[0.65rem] text-outline">{m.profile?.college_id || ''} • {m.profile?.email || ''}</div>
                    </td>
                    <td className="p-3">
                      <div>Year {m.year} • {m.profile?.department || '—'}</div>
                      <div className="text-[0.65rem] text-outline-variant">Reserved: {new Date(m.reserved_at).toLocaleDateString()}</div>
                    </td>
                    <td className="p-3 text-center">
                      {m.payment?.proof_url ? (
                        <div className="flex flex-col gap-1 items-center">
                          <button
                            onClick={() => {
                              setSelectedProofUrl(m.payment!.proof_url)
                              setSelectedProofNote(m.payment!.payment_note || null)
                            }}
                            className="text-primary underline font-bold cursor-pointer hover:text-primary/85 text-[0.7rem]"
                          >
                            View Receipt/Proof
                          </button>
                          {m.payment.payment_note && (
                            <span className="text-[0.6rem] text-outline max-w-[150px] overflow-hidden text-ellipsis whitespace-nowrap italic">
                              "{m.payment.payment_note}"
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-outline-variant italic">No proof uploaded</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => handleVerifyPayment(m.payment!.id)}
                          disabled={verifyingPaymentId !== null}
                          className="bg-surface-variant text-success border border-primary font-black text-[0.55rem] uppercase tracking-wider px-2.5 py-1.5 shadow-[1.5px_1.5px_0px_0px_#002021] hover:bg-success hover:text-white cursor-pointer disabled:opacity-50"
                        >
                          {verifyingPaymentId === m.payment!.id ? '...' : '✓ Verify'}
                        </button>
                        <button
                          onClick={() => setRejectingPaymentId(m.payment!.id)}
                          disabled={verifyingPaymentId !== null}
                          className="bg-surface-variant text-error border border-primary font-black text-[0.55rem] uppercase tracking-wider px-2.5 py-1.5 shadow-[1.5px_1.5px_0px_0px_#002021] hover:bg-error hover:text-white cursor-pointer disabled:opacity-50"
                        >
                          ✕ Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="font-jakarta text-xs text-outline italic py-4">No pending payment verification requests.</p>
        )}
      </section>

      {/* ── Active Members & Waitlist Split Grid ────────────────── */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Verified Members list */}
        <article className="bg-surface border-2 border-primary p-5 shadow-[4px_4px_0px_0px_#00595c] flex flex-col gap-4">
          <div>
            <h3 className="font-newsreader font-black text-xl text-primary">Active Members ({verifiedMembers.length})</h3>
            <p className="font-jakarta text-xs text-outline mt-0.5">Students with verified active registrations.</p>
          </div>

          {verifiedMembers.length > 0 ? (
            <div className="overflow-x-auto border border-outline-variant max-h-[350px] overflow-y-auto">
              <table className="w-full border-collapse font-jakarta text-xs text-left bg-surface">
                <thead>
                  <tr className="bg-surface-variant border-b border-outline-variant font-bold text-[0.58rem] uppercase tracking-widest text-outline">
                    <th className="p-2.5">Name</th>
                    <th className="p-2.5">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {verifiedMembers.map((m) => (
                    <tr key={m.id} className="border-b border-outline-variant hover:bg-surface-variant/35">
                      <td className="p-2.5">
                        <div className="font-bold text-primary">{m.profile?.full_name || '—'}</div>
                        <div className="text-[0.62rem] text-outline-variant">{m.profile?.college_id || ''}</div>
                      </td>
                      <td className="p-2.5">
                        <div>Year {m.year} • {m.profile?.department || '—'}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="font-jakarta text-xs text-outline italic py-4">No verified active members yet.</p>
          )}
        </article>

        {/* Waitlist list */}
        <article className="bg-surface border-2 border-primary p-5 shadow-[4px_4px_0px_0px_#00595c] flex flex-col gap-4">
          <div>
            <h3 className="font-newsreader font-black text-xl text-primary">Waitlisted Students ({activeClub.waitlist.length})</h3>
            <p className="font-jakarta text-xs text-outline mt-0.5">Students queued in waitlist. First-come first-served order.</p>
          </div>

          {activeClub.waitlist.length > 0 ? (
            <div className="overflow-x-auto border border-outline-variant max-h-[350px] overflow-y-auto">
              <table className="w-full border-collapse font-jakarta text-xs text-left bg-surface">
                <thead>
                  <tr className="bg-surface-variant border-b border-outline-variant font-bold text-[0.58rem] uppercase tracking-widest text-outline">
                    <th className="p-2.5 text-center">Pos</th>
                    <th className="p-2.5">Student</th>
                    <th className="p-2.5">Year / Dept</th>
                  </tr>
                </thead>
                <tbody>
                  {activeClub.waitlist.map((w) => (
                    <tr key={w.id} className="border-b border-outline-variant hover:bg-surface-variant/35">
                      <td className="p-2.5 text-center font-bold text-primary">#{w.position}</td>
                      <td className="p-2.5">
                        <div className="font-bold text-primary">{w.profile?.full_name || '—'}</div>
                        <div className="text-[0.62rem] text-outline-variant">{w.profile?.email || ''}</div>
                      </td>
                      <td className="p-2.5">
                        <div>Year {w.year} • {w.profile?.department || '—'}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="font-jakarta text-xs text-outline italic py-4">Waitlist is currently empty.</p>
          )}
        </article>
      </section>

      {/* ── Modal: View Proof Attachment ────────────────────────── */}
      {selectedProofUrl && (
        <div className="fixed inset-0 bg-primary/45 flex items-center justify-center p-4 z-[999]" onClick={() => setSelectedProofUrl(null)}>
          <div className="bg-surface border-2 border-primary shadow-[6px_6px_0px_0px_#002021] max-w-xl w-full p-5 flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-outline-variant pb-2">
              <h3 className="font-newsreader font-black text-lg text-primary text-uppercase">Payment Proof Attachment</h3>
              <button onClick={() => setSelectedProofUrl(null)} className="text-outline font-bold cursor-pointer bg-none border-none">✕</button>
            </div>
            {selectedProofNote && (
              <div className="bg-surface-variant p-2.5 border border-outline-variant font-jakarta text-xs text-outline">
                <strong>Student Note:</strong> "{selectedProofNote}"
              </div>
            )}
            <div className="border border-outline-variant max-h-[60vh] overflow-auto flex items-center justify-center bg-surface-variant">
              {selectedProofUrl.endsWith('.pdf') ? (
                <iframe src={selectedProofUrl} className="w-full h-[400px] border-none" title="PDF proof" />
              ) : (
                <img src={selectedProofUrl} alt="Payment Receipt" className="max-w-full h-auto object-contain" />
              )}
            </div>
            <button
              onClick={() => setSelectedProofUrl(null)}
              className="bg-primary text-on-primary font-jakarta font-black text-[0.65rem] uppercase tracking-widest px-4 py-2 border-2 border-primary shadow-[2px_2px_0px_0px_#002021] self-end cursor-pointer"
            >
              Close Receipt
            </button>
          </div>
        </div>
      )}

      {/* ── Modal: Reject Payment Reason Form ────────────────────── */}
      {rejectingPaymentId && (
        <div className="fixed inset-0 bg-primary/45 flex items-center justify-center p-4 z-[999]" onClick={() => setRejectingPaymentId(null)}>
          <div className="bg-surface border-2 border-primary shadow-[6px_6px_0px_0px_#002021] max-w-md w-full p-5 flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-outline-variant pb-2">
              <h3 className="font-newsreader font-black text-lg text-primary">Reject Payment Request</h3>
              <button onClick={() => setRejectingPaymentId(null)} className="text-outline font-bold cursor-pointer bg-none border-none">✕</button>
            </div>
            <div className="flex flex-col gap-2">
              <label className="font-jakarta text-xs font-bold text-outline">Reason for rejection (Will be shown to student)</label>
              <textarea
                rows={4}
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                placeholder="e.g. Transaction ID mismatch, upload not clear, or amount is incorrect..."
                className="font-jakarta text-xs text-outline border border-outline-variant p-2.5 bg-surface resize-none focus:outline-none focus:border-primary"
              />
            </div>
            <div className="flex gap-3 justify-end mt-2">
              <button
                onClick={() => setRejectingPaymentId(null)}
                className="bg-surface text-primary border border-outline-variant px-4 py-2 font-jakarta font-black text-[0.62rem] uppercase tracking-widest cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectPayment}
                className="bg-error text-on-primary border border-primary px-4 py-2 font-jakarta font-black text-[0.62rem] uppercase tracking-widest shadow-[2px_2px_0px_0px_#002021] cursor-pointer"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  )
}
