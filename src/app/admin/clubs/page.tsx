'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'

/* ── Types ──────────────────────────────────────────────────────── */
interface YearLimit {
  id: string
  year: number
  max_slots: number
  filled: number
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
  member_stats: { reserved: number; active: number; rejected: number }
  payment_stats: { pending: number; verified: number; rejected: number }
  waitlist_count: number
}

interface Member {
  id: string
  club_id: string
  user_id: string
  year: number
  status: string
  reserved_at: string
  profile: { full_name: string; email: string; department: string; year_of_study: number; college_id: string } | null
  payment: { id: string; status: string; amount: number; created_at: string } | null
}

interface WaitlistEntry {
  id: string
  club_id: string
  user_id: string
  year: number
  position: number
  profile: { full_name: string; email: string; department: string; year_of_study: number; college_id: string } | null
}

/* ── Style Constants ────────────────────────────────────────────── */
const cardStyle: React.CSSProperties = {
  background: '#ffffff', border: '1px solid #e2e8f0',
  borderRadius: '10px', padding: '16px',
  boxShadow: '0 2px 4px -1px rgba(0,0,0,0.04)',
}

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-jakarta)', fontSize: '0.62rem',
  fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.06em', color: '#64748b',
}

const headingStyle: React.CSSProperties = {
  fontFamily: 'var(--font-newsreader)', fontSize: '1.1rem',
  fontWeight: 800, color: '#0f172a', lineHeight: 1.2,
}

const btnPrimary: React.CSSProperties = {
  fontFamily: 'var(--font-jakarta)', fontSize: '0.65rem',
  fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em',
  background: '#00595c', color: '#fff', border: 'none',
  borderRadius: '6px', padding: '6px 14px', cursor: 'pointer',
}

const btnOutline: React.CSSProperties = {
  ...btnPrimary,
  background: '#fff', color: '#00595c',
  border: '1px solid #00595c',
}

const btnDanger: React.CSSProperties = {
  ...btnPrimary,
  background: '#dc2626',
}

const inputStyle: React.CSSProperties = {
  fontFamily: 'var(--font-jakarta)', fontSize: '0.8rem',
  border: '1px solid #e2e8f0', borderRadius: '6px',
  padding: '5px 8px', width: '70px', textAlign: 'center',
}

const badgeStyle = (color: string, bg: string): React.CSSProperties => ({
  fontFamily: 'var(--font-jakarta)', fontSize: '0.55rem',
  fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em',
  color, background: bg, borderRadius: '4px', padding: '2px 6px',
  display: 'inline-block',
})

export default function AdminClubsPage() {
  const [clubs, setClubs] = useState<Club[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editLimits, setEditLimits] = useState<Record<string, Record<number, number>>>({})
  const [savingLimits, setSavingLimits] = useState<string | null>(null)
  const [togglingStatus, setTogglingStatus] = useState<string | null>(null)
  const [users, setUsers] = useState<any[]>([])
  const [assigningLead, setAssigningLead] = useState<string | null>(null)

  // Drill-down
  const [selectedClub, setSelectedClub] = useState<string | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [verifying, setVerifying] = useState<string | null>(null)

  const fetchClubs = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/clubs')
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setClubs(data.clubs || [])
    } catch {
      setError('Failed to load clubs.')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users')
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users || [])
      }
    } catch (e) {
      console.error("Failed to load users:", e)
    }
  }

  useEffect(() => {
    fetchClubs()
    fetchUsers()
  }, [fetchClubs])

  // Initialize edit limits from fetched data
  useEffect(() => {
    const init: Record<string, Record<number, number>> = {}
    clubs.forEach((c) => {
      init[c.id] = {}
      c.year_limits.forEach((l) => { init[c.id][l.year] = l.max_slots })
    })
    setEditLimits(init)
  }, [clubs])



  const handleSaveLimits = async (clubId: string) => {
    setSavingLimits(clubId)
    setError('')
    setSuccess('')
    const limits = Object.entries(editLimits[clubId] || {}).map(([yr, max]) => ({
      year: Number(yr),
      max_slots: Number(max),
    }))
    try {
      const res = await fetch(`/api/admin/clubs/${clubId}/limits`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limits }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setSuccess('Limits saved.')
      fetchClubs()
    } catch {
      setError('Failed to save limits.')
    } finally {
      setSavingLimits(null)
    }
  }

  const handleToggleStatus = async (clubId: string, currentOpen: boolean) => {
    setTogglingStatus(clubId)
    setError('')
    setSuccess('')
    try {
      const res = await fetch(`/api/admin/clubs/${clubId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_open: !currentOpen }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setSuccess(data.message)
      fetchClubs()
    } catch {
      setError('Failed to toggle status.')
    } finally {
      setTogglingStatus(null)
    }
  }

  const handleAssignLead = async (clubId: string, leadId: string | null) => {
    setAssigningLead(clubId)
    setError('')
    setSuccess('')
    try {
      const res = await fetch(`/api/admin/clubs/${clubId}/lead`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: leadId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to assign lead.')
        return
      }
      setSuccess('Club lead updated successfully.')
      fetchClubs()
    } catch {
      setError('An error occurred while assigning lead.')
    } finally {
      setAssigningLead(null)
    }
  }

  const fetchMembers = useCallback(async (clubId: string) => {
    setSelectedClub(clubId)
    setLoadingMembers(true)
    try {
      const res = await fetch(`/api/admin/clubs/${clubId}/members`)
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setMembers(data.members || [])
      setWaitlist(data.waitlist || [])
    } catch {
      setError('Failed to load members.')
    } finally {
      setLoadingMembers(false)
    }
  }, [])

  // Cache selected club ID in a ref to keep realtime subscription stable
  const selectedClubRef = useRef(selectedClub)
  useEffect(() => {
    selectedClubRef.current = selectedClub
  }, [selectedClub])

  // Realtime subscription in admin/clubs
  useEffect(() => {
    const supabase = createClient()

    let refreshTimer: ReturnType<typeof setTimeout> | null = null

    const scheduleRefresh = () => {
      console.log("CLUBS_REFETCH_START")
      if (refreshTimer) clearTimeout(refreshTimer)
      refreshTimer = setTimeout(async () => {
        await fetchClubs()
        // If a club modal is open, also refresh members & waitlist
        const currentClubId = selectedClubRef.current
        if (currentClubId) {
          await fetchMembers(currentClubId)
        }
        console.log("CLUBS_REFETCH_DONE")
      }, 250)
    }

    const channel = supabase
      .channel("admin-clubs-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clubs" },
        (payload) => {
          console.log("CLUBS_REALTIME_EVENT", payload)
          scheduleRefresh()
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "club_year_limits" },
        (payload) => {
          console.log("CLUBS_REALTIME_EVENT", payload)
          scheduleRefresh()
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "club_members" },
        (payload) => {
          console.log("CLUBS_REALTIME_EVENT", payload)
          scheduleRefresh()
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "club_payments" },
        (payload) => {
          console.log("CLUBS_REALTIME_EVENT", payload)
          scheduleRefresh()
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "club_waitlist" },
        (payload) => {
          console.log("CLUBS_REALTIME_EVENT", payload)
          scheduleRefresh()
        }
      )
      .subscribe((status) => {
        console.log("CLUBS_REALTIME_STATUS", status)
      })

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer)
      supabase.removeChannel(channel)
    }
  }, [fetchClubs, fetchMembers])

  const handleVerifyPayment = async (clubId: string, paymentId: string) => {
    setVerifying(paymentId)
    try {
      const res = await fetch(`/api/clubs/${clubId}/payments/${paymentId}/verify`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setSuccess('Payment verified!')
      fetchMembers(clubId)
      fetchClubs()
    } catch {
      setError('Failed to verify payment.')
    } finally {
      setVerifying(null)
    }
  }

  const handleRejectPayment = async (clubId: string, paymentId: string) => {
    setVerifying(paymentId)
    try {
      const res = await fetch(`/api/clubs/${clubId}/payments/${paymentId}/reject`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setSuccess('Payment rejected.')
      fetchMembers(clubId)
      fetchClubs()
    } catch {
      setError('Failed to reject payment.')
    } finally {
      setVerifying(null)
    }
  }

  const handleExport = () => {
    window.open('/api/admin/clubs/export', '_blank')
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 24 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#00595c', animation: 'spin 1s linear infinite' }}>progress_activity</span>
        <span style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.8rem', color: '#64748b' }}>Loading clubs...</span>
      </div>
    )
  }

  const selectedClubData = clubs.find((c) => c.id === selectedClub)

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      {/* ── Header ────────────────────────────────────────────── */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={labelStyle}>Club Management</div>
          <h1 style={{ fontFamily: 'var(--font-newsreader)', fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>
            Clubs & Communities
          </h1>
        </div>
        <button style={btnOutline} onClick={handleExport}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>download</span>
            Export Excel
          </span>
        </button>
      </div>

      {/* ── Alerts ────────────────────────────────────────────── */}
      {error && (
        <div style={{ ...cardStyle, borderColor: '#fecaca', background: '#fef2f2', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#dc2626' }}>error</span>
          <span style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.75rem', color: '#dc2626', flex: 1 }}>{error}</span>
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontWeight: 800 }}>✕</button>
        </div>
      )}
      {success && (
        <div style={{ ...cardStyle, borderColor: '#a7f3d0', background: '#ecfdf5', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#059669' }}>check_circle</span>
          <span style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.75rem', color: '#059669', flex: 1 }}>{success}</span>
          <button onClick={() => setSuccess('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#059669', fontWeight: 800 }}>✕</button>
        </div>
      )}

      {/* ── Overview Stats ────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8, marginBottom: 16 }}>
        <div style={cardStyle}>
          <div style={labelStyle}>Total Clubs</div>
          <div style={{ fontFamily: 'var(--font-newsreader)', fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>{clubs.length}</div>
        </div>
        <div style={cardStyle}>
          <div style={labelStyle}>Open</div>
          <div style={{ fontFamily: 'var(--font-newsreader)', fontSize: '1.5rem', fontWeight: 800, color: '#059669' }}>{clubs.filter(c => c.is_open).length}</div>
        </div>
        <div style={cardStyle}>
          <div style={labelStyle}>Active Members</div>
          <div style={{ fontFamily: 'var(--font-newsreader)', fontSize: '1.5rem', fontWeight: 800, color: '#2563eb' }}>{clubs.reduce((s, c) => s + c.member_stats.active, 0)}</div>
        </div>
        <div style={cardStyle}>
          <div style={labelStyle}>Pending Payments</div>
          <div style={{ fontFamily: 'var(--font-newsreader)', fontSize: '1.5rem', fontWeight: 800, color: '#d97706' }}>{clubs.reduce((s, c) => s + c.payment_stats.pending, 0)}</div>
        </div>
      </div>

      {/* ── Club Cards ────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {clubs.map((club) => (
          <div key={club.id} style={cardStyle}>
            {/* Club header row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 12 }}>
              <div>
                <h3 style={headingStyle}>{club.name}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Lead:</span>
                  <select
                    value={club.lead_id || ''}
                    onChange={(e) => handleAssignLead(club.id, e.target.value || null)}
                    disabled={assigningLead === club.id}
                    style={{
                      fontFamily: 'var(--font-jakarta)',
                      fontSize: '0.7rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '4px',
                      padding: '2px 4px',
                      background: '#fff',
                      color: '#334155',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="">Unassigned</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.full_name} ({u.role}{u.department ? ` - ${u.department}` : ''})
                      </option>
                    ))}
                  </select>
                  {club.semester_label && (
                    <span style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.7rem', color: '#94a3b8' }}>
                      • {club.semester_label}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button
                  style={club.is_open ? btnDanger : btnPrimary}
                  onClick={() => handleToggleStatus(club.id, club.is_open)}
                  disabled={togglingStatus === club.id}
                >
                  {togglingStatus === club.id ? '...' : club.is_open ? 'Close' : 'Open'}
                </button>
                <button style={btnOutline} onClick={() => fetchMembers(club.id)}>
                  Members
                </button>
              </div>
            </div>

            {/* Inline stats */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              <span style={badgeStyle('#059669', '#ecfdf5')}>Active {club.member_stats.active}</span>
              <span style={badgeStyle('#d97706', '#fffbeb')}>Reserved {club.member_stats.reserved}</span>
              <span style={badgeStyle('#2563eb', '#eff6ff')}>Pending Pay {club.payment_stats.pending}</span>
              <span style={badgeStyle('#dc2626', '#fef2f2')}>Rejected {club.member_stats.rejected}</span>
              <span style={badgeStyle('#7c3aed', '#f5f3ff')}>Waitlist {club.waitlist_count}</span>
            </div>

            {/* Year-wise limits editor */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end' }}>
              {club.year_limits.map((yl) => (
                <div key={yl.year} style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
                  <span style={{ ...labelStyle, fontSize: '0.55rem' }}>Yr {yl.year}</span>
                  <input
                    type="number"
                    min={0}
                    style={inputStyle}
                    value={editLimits[club.id]?.[yl.year] ?? yl.max_slots}
                    onChange={(e) => {
                      setEditLimits((prev) => ({
                        ...prev,
                        [club.id]: {
                          ...prev[club.id],
                          [yl.year]: parseInt(e.target.value) || 0,
                        },
                      }))
                    }}
                  />
                  <span style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.55rem', color: '#94a3b8' }}>
                    {yl.filled} filled
                  </span>
                </div>
              ))}
              <button
                style={{ ...btnPrimary, alignSelf: 'center' }}
                onClick={() => handleSaveLimits(club.id)}
                disabled={savingLimits === club.id}
              >
                {savingLimits === club.id ? 'Saving...' : 'Save Limits'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ── Members Drill-down Modal ──────────────────────────── */}
      {selectedClub && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: 16,
        }}>
          <div style={{
            background: '#fff', borderRadius: '12px', width: '100%',
            maxWidth: 700, maxHeight: '85vh', overflow: 'auto', padding: 20,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontFamily: 'var(--font-newsreader)', fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>
                {selectedClubData?.name} — Members
              </h2>
              <button onClick={() => setSelectedClub(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#64748b' }}>✕</button>
            </div>

            {loadingMembers ? (
              <p style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.8rem', color: '#94a3b8' }}>Loading...</p>
            ) : (
              <>
                {/* Members Table */}
                <div style={labelStyle}>Members ({members.length})</div>
                {members.length > 0 ? (
                  <div style={{ overflowX: 'auto', marginBottom: 16, marginTop: 6 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-jakarta)', fontSize: '0.72rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                          <th style={{ padding: '6px 8px', ...labelStyle }}>Name</th>
                          <th style={{ padding: '6px 8px', ...labelStyle }}>Year</th>
                          <th style={{ padding: '6px 8px', ...labelStyle }}>Status</th>
                          <th style={{ padding: '6px 8px', ...labelStyle }}>Payment</th>
                          <th style={{ padding: '6px 8px', ...labelStyle }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {members.map((m) => (
                          <tr key={m.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '6px 8px' }}>
                              <div style={{ fontWeight: 600, color: '#0f172a' }}>{m.profile?.full_name || '—'}</div>
                              <div style={{ fontSize: '0.6rem', color: '#94a3b8' }}>{m.profile?.email || ''}</div>
                            </td>
                            <td style={{ padding: '6px 8px' }}>Yr {m.year}</td>
                            <td style={{ padding: '6px 8px' }}>
                              <span style={badgeStyle(
                                m.status === 'active' ? '#059669' : m.status === 'reserved' ? '#d97706' : '#dc2626',
                                m.status === 'active' ? '#ecfdf5' : m.status === 'reserved' ? '#fffbeb' : '#fef2f2'
                              )}>
                                {m.status}
                              </span>
                            </td>
                            <td style={{ padding: '6px 8px' }}>
                              {m.payment ? (
                                <span style={badgeStyle(
                                  m.payment.status === 'verified' ? '#059669' : m.payment.status === 'pending' ? '#d97706' : '#dc2626',
                                  m.payment.status === 'verified' ? '#ecfdf5' : m.payment.status === 'pending' ? '#fffbeb' : '#fef2f2'
                                )}>
                                  ₹{m.payment.amount} {m.payment.status}
                                </span>
                              ) : '—'}
                            </td>
                            <td style={{ padding: '6px 8px' }}>
                              {m.payment && m.payment.status === 'pending' && (
                                <div style={{ display: 'flex', gap: 4 }}>
                                  <button
                                    style={{ ...btnPrimary, fontSize: '0.55rem', padding: '3px 8px' }}
                                    onClick={() => handleVerifyPayment(m.club_id, m.payment!.id)}
                                    disabled={verifying === m.payment!.id}
                                  >
                                    {verifying === m.payment!.id ? '...' : '✓ Verify'}
                                  </button>
                                  <button
                                    style={{ ...btnDanger, fontSize: '0.55rem', padding: '3px 8px' }}
                                    onClick={() => handleRejectPayment(m.club_id, m.payment!.id)}
                                    disabled={verifying === m.payment!.id}
                                  >
                                    ✕ Reject
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.75rem', color: '#94a3b8', marginBottom: 16 }}>No members yet.</p>
                )}

                {/* Waitlist Table */}
                <div style={labelStyle}>Waitlist ({waitlist.length})</div>
                {waitlist.length > 0 ? (
                  <div style={{ overflowX: 'auto', marginTop: 6 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-jakarta)', fontSize: '0.72rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                          <th style={{ padding: '6px 8px', ...labelStyle }}>#</th>
                          <th style={{ padding: '6px 8px', ...labelStyle }}>Name</th>
                          <th style={{ padding: '6px 8px', ...labelStyle }}>Year</th>
                          <th style={{ padding: '6px 8px', ...labelStyle }}>Email</th>
                        </tr>
                      </thead>
                      <tbody>
                        {waitlist.map((w) => (
                          <tr key={w.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '6px 8px', fontWeight: 700 }}>#{w.position}</td>
                            <td style={{ padding: '6px 8px', fontWeight: 600 }}>{w.profile?.full_name || '—'}</td>
                            <td style={{ padding: '6px 8px' }}>Yr {w.year}</td>
                            <td style={{ padding: '6px 8px', fontSize: '0.6rem', color: '#94a3b8' }}>{w.profile?.email || ''}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.75rem', color: '#94a3b8' }}>No waitlist entries.</p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
