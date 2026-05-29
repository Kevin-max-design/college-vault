'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ClientCache } from '@/utils/cache'

interface Author { id: string; full_name: string; avatar_url: string | null; role: string }
interface Notice {
  id: string; title: string; body: string
  scope: 'global' | 'department' | 'personal'
  department: string | null; tag: 'academic' | 'event' | 'urgent' | 'general'
  pinned: boolean; created_at: string; author: Author | null
}
interface Props { initialNotices: Notice[]; userId: string; userRole: string; userDepartment: string }

function timeAgo(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000)
  if (m < 1) return 'just now'; if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`
  const dy = Math.floor(h / 24); if (dy < 7) return `${dy}d ago`
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

const TAG = {
  academic: { bg: '#e8f4f0', border: '#2d6a4f', color: '#2d6a4f', label: 'Academic' },
  event:    { bg: '#fff8e6', border: '#b5830a', color: '#b5830a', label: 'Event'    },
  urgent:   { bg: '#fde8e8', border: '#a61c0f', color: '#a61c0f', label: 'Urgent'   },
  general:  { bg: '#f0ece4', border: '#5c4a2a', color: '#5c4a2a', label: 'General'  },
}

// Thumbtack colors per role
const TACK = (role: string, pinned: boolean) => {
  if (pinned) return '#c0392b'
  if (role === 'principal' || role === 'super_admin') return '#c0392b'
  if (role === 'hod' || role === 'faculty') return '#d4ac0d'
  if (['ao_office', 'exam_cell', 'placement'].includes(role)) return '#1a7a5e'
  return '#8b6914'
}

// Slight random rotation for paper notes
const ROTATIONS = [-2.5, 1.8, -1.2, 2.1, -0.8, 1.5, -2.0, 0.9, -1.6, 2.4, -0.5, 1.1]

const DEPARTMENTS = [
  { value: 'CSE', label: 'Computer Science & Engineering (CSE)' },
  { value: 'CSE-DS', label: 'CSE (Data Science)' },
  { value: 'CSE-AIML', label: 'CSE (AI & Machine Learning)' },
  { value: 'CSE-CS', label: 'CSE (Cyber Security)' },
  { value: 'CSBS', label: 'CSE & Business Systems (CSBS)' },
  { value: 'ECE', label: 'Electronics & Communication Engineering (ECE)' },
  { value: 'EEE', label: 'Electrical & Electronics Engineering (EEE)' },
  { value: 'ME', label: 'Mechanical Engineering (ME)' },
  { value: 'CE', label: 'Civil Engineering (CE)' },
  { value: 'MCA', label: 'Master of Computer Applications (MCA)' },
  { value: 'MBA', label: 'Management Studies (MBA)' },
  { value: 'MATHS', label: 'Mathematics (S&H)' },
  { value: 'PHY', label: 'Physics (S&H)' },
  { value: 'CHEM', label: 'Chemistry (S&H)' },
  { value: 'ENG', label: 'English (S&H)' },
]

/* ── Post Modal ──────────────────────────────────────────────────── */
function PostNoticeModal({ userRole, userDepartment, onClose, onPosted }:
  { userRole: string; userDepartment: string; onClose: () => void; onPosted: (n: Notice) => void }) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [scope, setScope] = useState<'global' | 'department' | 'personal'>('personal')
  const [tag, setTag]     = useState<'academic' | 'event' | 'urgent' | 'general'>('general')
  const [selectedDept, setSelectedDept] = useState(userDepartment || 'CSE')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const canGlobal = userRole === 'principal' || userRole === 'admin'
  const canDept   = ['faculty', 'hod', 'principal', 'admin'].includes(userRole)
  const scopes    = [
    { v: 'personal', l: 'Personal', show: true },
    { v: 'department', l: 'Department', show: canDept },
    { v: 'global', l: 'College-wide', show: canGlobal },
  ].filter(o => o.show)

  const isHod = userRole === 'hod'
  const isHodMissingDept = isHod && (!userDepartment || userDepartment.trim() === '')
  const isSubmitDisabled = loading || (scope === 'department' && isHodMissingDept)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setError('Title required'); return }
    if (scope === 'department' && isHodMissingDept) {
      setError('Your HOD profile has no department assigned.');
      return;
    }
    setLoading(true)
    const targetDeptVal = scope === 'department' 
      ? (['principal', 'admin'].includes(userRole) ? selectedDept : userDepartment)
      : null;

    const res  = await fetch('/api/notices', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ 
        title: title.trim(), 
        body: body.trim(), 
        scope, 
        tag, 
        department: targetDeptVal 
      }) 
    })
    const data = await res.json(); setLoading(false)
    if (!res.ok) { setError(data.error ?? 'Error'); return }
    onPosted(data); onClose()
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(10,5,0,0.6)', zIndex: 200 }} />
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 440, zIndex: 201,
        background: '#fdf8ef', border: '3px solid #5c3a1e', borderBottom: 'none',
        boxShadow: '0 -6px 0 0 #3a1f0a', padding: '24px 20px 40px',
        animation: 'slideUp 0.2s ease',
      }}>
        <style>{`@keyframes slideUp{from{transform:translateX(-50%) translateY(100%)}to{transform:translateX(-50%) translateY(0)}}`}</style>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <span style={{ fontFamily: 'var(--font-newsreader)', fontWeight: 700, fontSize: '1.35rem', color: '#3a1f0a' }}>📌 Pin a Notice</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8b6914', fontSize: 20 }}>✕</button>
        </div>
        <form onSubmit={submit}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            {scopes.map(o => (
              <button key={o.v} type="button" onClick={() => setScope(o.v as typeof scope)}
                style={{ padding: '4px 12px', border: '2px solid', borderRadius: 4, cursor: 'pointer', fontSize: '0.65rem', fontFamily: 'var(--font-jakarta)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', transition: 'all 0.15s', borderColor: scope === o.v ? '#5c3a1e' : '#c9b99a', background: scope === o.v ? '#d4ac0d' : 'transparent', color: scope === o.v ? '#3a1f0a' : '#8b6914' }}>
                {o.l}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            {(['general', 'academic', 'event', 'urgent'] as const).map(t => (
              <button key={t} type="button" onClick={() => setTag(t)}
                style={{ padding: '3px 10px', border: `1.5px solid ${tag === t ? TAG[t].border : '#c9b99a'}`, borderRadius: 4, cursor: 'pointer', fontSize: '0.62rem', fontFamily: 'var(--font-jakarta)', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', background: tag === t ? TAG[t].bg : 'transparent', color: tag === t ? TAG[t].color : '#8b6914', transition: 'all 0.15s' }}>
                {TAG[t].label}
              </button>
            ))}
          </div>

          {scope === 'department' && (
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontFamily: 'var(--font-jakarta)', fontSize: '0.65rem', fontWeight: 700, color: '#8b6914', marginBottom: 4, textTransform: 'uppercase' }}>
                Department Notice Target
              </label>
              {['principal', 'admin'].includes(userRole) ? (
                <select value={selectedDept} onChange={e => setSelectedDept(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '2px solid #5c3a1e', background: '#fffdf5', fontFamily: 'var(--font-jakarta)', fontSize: '0.88rem', color: '#1a0f00', outline: 'none', boxShadow: '2px 2px 0 0 #5c3a1e' }}>
                  {DEPARTMENTS.map(d => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              ) : (
                <>
                  <input type="text" value={userDepartment ? (DEPARTMENTS.find(d => d.value === userDepartment)?.label || userDepartment) : ''} readOnly style={{ width: '100%', padding: '10px 12px', border: '2px solid #5c3a1e', background: '#e9e3d5', fontFamily: 'var(--font-jakarta)', fontSize: '0.88rem', fontWeight: 600, color: '#5c3a1e', outline: 'none', cursor: 'not-allowed', boxShadow: '2px 2px 0 0 #5c3a1e' }} />
                  {isHodMissingDept && (
                    <p style={{ marginTop: 4, fontFamily: 'var(--font-jakarta)', fontSize: '0.8rem', color: '#a61c0f', fontWeight: 600 }}>
                      Your HOD profile has no department assigned.
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Notice title…"
            style={{ width: '100%', padding: '10px 12px', marginBottom: 10, border: '2px solid #5c3a1e', background: '#fffdf5', fontFamily: 'var(--font-newsreader)', fontSize: '1rem', fontWeight: 600, color: '#1a0f00', outline: 'none', boxShadow: '2px 2px 0 0 #5c3a1e' }} />
          <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Write your notice here… (optional)" rows={4}
            style={{ width: '100%', padding: '10px 12px', border: '2px solid #5c3a1e', background: '#fffdf5', fontFamily: 'var(--font-jakarta)', fontSize: '0.88rem', lineHeight: 1.6, color: '#1a0f00', resize: 'none', outline: 'none', boxShadow: '2px 2px 0 0 #5c3a1e' }} />
          {error && <p style={{ marginTop: 6, fontFamily: 'var(--font-jakarta)', fontSize: '0.8rem', color: '#a61c0f' }}>{error}</p>}
          <button type="submit" disabled={isSubmitDisabled}
            style={{ marginTop: 14, width: '100%', padding: '12px', background: isSubmitDisabled ? '#ccc' : '#d4ac0d', border: '2px solid #5c3a1e', color: isSubmitDisabled ? '#777' : '#3a1f0a', fontFamily: 'var(--font-jakarta)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: isSubmitDisabled ? 'not-allowed' : 'pointer', boxShadow: isSubmitDisabled ? 'none' : '3px 3px 0 0 #5c3a1e', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Pinning…' : 'Pin to Board →'}
          </button>
        </form>
      </div>
    </>
  )
}

/* ── Notice Paper ────────────────────────────────────────────────── */
function NoticePaper({ notice, userId, rotation, onPin, onDelete }: {
  notice: Notice; userId: string; rotation: number
  onPin: (id: string, p: boolean) => void; onDelete: (id: string) => void
}) {
  const [hovered, setHovered] = useState(false)
  const tag     = TAG[notice.tag] ?? TAG.general
  const tackColor = TACK(notice.author?.role ?? 'student', notice.pinned)
  const isOwner = notice.author?.id === userId

  // Paper note colors per tag
  const paperBg = notice.tag === 'urgent'   ? '#fff0ee'
                : notice.tag === 'event'    ? '#fffce8'
                : notice.tag === 'academic' ? '#f0faf6'
                : '#fffdf0'

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        transform: `rotate(${hovered ? 0 : rotation}deg) translateY(${hovered ? -6 : 0}px)`,
        transition: 'transform 0.25s ease, box-shadow 0.25s ease',
        zIndex: hovered ? 10 : 1,
        cursor: 'default',
      }}
    >
      {/* Thumbtack */}
      <div style={{
        position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
        zIndex: 20, display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        <div style={{
          width: 18, height: 18, borderRadius: '50%',
          background: `radial-gradient(circle at 35% 35%, ${tackColor}ee, ${tackColor}88)`,
          border: `1.5px solid ${tackColor}99`,
          boxShadow: `0 2px 4px rgba(0,0,0,0.4), inset 0 -1px 2px rgba(0,0,0,0.3)`,
        }} />
        <div style={{ width: 2, height: 8, background: tackColor, opacity: 0.7 }} />
      </div>

      {/* Paper */}
      <div style={{
        background: paperBg,
        backgroundImage: `repeating-linear-gradient(transparent, transparent 22px, rgba(180,160,100,0.18) 22px, rgba(180,160,100,0.18) 23px)`,
        border: `1px solid rgba(90,60,20,0.2)`,
        padding: '22px 14px 14px',
        width: '100%',
        boxShadow: hovered
          ? `0 14px 28px rgba(0,0,0,0.35), 2px 2px 0 rgba(0,0,0,0.1)`
          : `3px 5px 12px rgba(0,0,0,0.22), 1px 1px 0 rgba(0,0,0,0.08)`,
        position: 'relative',
        minHeight: 120,
      }}>
        {/* Tag chip */}
        <div style={{
          display: 'inline-block', padding: '2px 8px', marginBottom: 8,
          background: tag.bg, border: `1px solid ${tag.border}`,
          color: tag.color, fontSize: '0.58rem', fontFamily: 'var(--font-jakarta)',
          fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
        }}>{tag.label}</div>

        {/* Title */}
        <p style={{
          fontFamily: 'var(--font-newsreader)', fontWeight: 700,
          fontSize: '0.95rem', lineHeight: 1.3, color: '#1a0f00', marginBottom: 6,
        }}>{notice.title}</p>

        {/* Body */}
        {notice.body && (
          <p style={{
            fontFamily: 'var(--font-jakarta)', fontSize: '0.72rem',
            lineHeight: 1.55, color: '#3a2a10', marginBottom: 10,
            display: '-webkit-box', WebkitLineClamp: 4,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>{notice.body}</p>
        )}

        {/* Footer */}
        <div style={{ borderTop: '1px dashed rgba(90,60,20,0.25)', paddingTop: 8, marginTop: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.62rem', fontWeight: 700, color: '#5c3a1e' }}>
              {notice.author?.full_name ?? 'Anonymous'}
            </p>
            <p style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.58rem', color: '#8b6914' }}>
              {timeAgo(notice.created_at)}
            </p>
          </div>
          {isOwner && (
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => onPin(notice.id, !notice.pinned)} title={notice.pinned ? 'Unpin' : 'Pin'}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: notice.pinned ? '#c0392b' : '#8b6914', fontSize: 14, padding: 2 }}>
                📌
              </button>
              <button onClick={() => onDelete(notice.id)} title="Delete"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a61c0f', fontSize: 14, padding: 2 }}>
                🗑
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Main ────────────────────────────────────────────────────────── */
export default function BulletinClient({ initialNotices, userId, userRole, userDepartment }: Props) {
  // Stateful SWR caching of bulletin notices
  const [notices, setNotices] = useState<Notice[]>(() => {
    const cached = ClientCache.get<Notice[]>('bulletin_notices')
    return cached || initialNotices
  })

  useEffect(() => {
    // Seed and sync background cache
    ClientCache.set('bulletin_notices', initialNotices)
    setNotices(initialNotices)
  }, [initialNotices])

  const [showModal, setShowModal] = useState(false)
  const [filter, setFilter]       = useState<'all' | 'global' | 'department' | 'personal'>('all')
  const router = useRouter()

  async function handlePin(id: string, pinned: boolean) {
    const res = await fetch(`/api/notices/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pinned }) })
    if (res.ok) {
      const updated = [...notices.map(n => n.id === id ? { ...n, pinned } : n)].sort((a, b) => Number(b.pinned) - Number(a.pinned))
      setNotices(updated)
      ClientCache.set('bulletin_notices', updated)
    }
  }
  async function handleDelete(id: string) {
    const res = await fetch(`/api/notices/${id}`, { method: 'DELETE' })
    if (res.ok) {
      const updated = notices.filter(n => n.id !== id)
      setNotices(updated)
      ClientCache.set('bulletin_notices', updated)
    }
  }
  function handlePosted(notice: Notice) {
    const updated = [notice, ...notices]
    setNotices(updated)
    ClientCache.set('bulletin_notices', updated)
    router.refresh()
  }

  const filtered = filter === 'all' ? notices : notices.filter(n => n.scope === filter)

  return (
    <div style={{ padding: '16px 0 32px', minHeight: '100%' }}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={{ padding: '0 18px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <span style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8b6914', display: 'block', marginBottom: 2 }}>Campus Bulletin</span>
          <h1 style={{ fontFamily: 'var(--font-newsreader)', fontWeight: 800, fontSize: '2rem', lineHeight: 1, color: '#3a1f0a' }}>Notice Board</h1>
        </div>
        <button onClick={() => setShowModal(true)} style={{
          display: 'flex', alignItems: 'center', gap: 5, padding: '9px 14px',
          background: '#d4ac0d', border: '2px solid #5c3a1e', color: '#3a1f0a',
          fontFamily: 'var(--font-jakarta)', fontSize: '0.65rem', fontWeight: 700,
          letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
          boxShadow: '3px 3px 0 0 #5c3a1e',
        }}>
          📌 Post
        </button>
      </div>

      {/* ── Filter pills ───────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, padding: '0 18px 20px', flexWrap: 'wrap' }}>
        {([{ k: 'all', l: 'All' }, { k: 'global', l: 'College-wide' }, { k: 'department', l: userDepartment || 'Dept' }, { k: 'personal', l: 'Personal' }] as const).map(f => (
          <button key={f.k} onClick={() => setFilter(f.k)} style={{
            padding: '4px 12px', border: '2px solid', cursor: 'pointer',
            borderColor: filter === f.k ? '#5c3a1e' : '#c9b99a',
            background: filter === f.k ? '#d4ac0d' : 'transparent',
            color: filter === f.k ? '#3a1f0a' : '#8b6914',
            fontFamily: 'var(--font-jakarta)', fontSize: '0.62rem', fontWeight: 700,
            letterSpacing: '0.07em', textTransform: 'uppercase', transition: 'all 0.15s',
          }}>{f.l}</button>
        ))}
      </div>

      {/* ── Wooden Notice Board ─────────────────────────────────── */}
      <div style={{
        margin: '0 12px',
        /* Outer wooden frame */
        background: `linear-gradient(160deg, #6b3a1f 0%, #4a2510 40%, #5c3015 70%, #3d1e0a 100%)`,
        borderRadius: 6,
        padding: '14px 14px 18px',
        boxShadow: `
          0 8px 32px rgba(0,0,0,0.55),
          inset 0 1px 0 rgba(255,220,120,0.25),
          inset 0 -2px 0 rgba(0,0,0,0.4),
          inset 2px 0 0 rgba(255,200,80,0.1),
          inset -2px 0 0 rgba(0,0,0,0.3)
        `,
        position: 'relative',
      }}>
        {/* Wood grain overlay */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 6, pointerEvents: 'none',
          background: `repeating-linear-gradient(92deg, transparent 0px, transparent 18px, rgba(0,0,0,0.04) 18px, rgba(0,0,0,0.04) 19px)`,
          mixBlendMode: 'multiply',
        }} />

        {/* Corner screws */}
        {[{ top: 8, left: 8 }, { top: 8, right: 8 }, { bottom: 8, left: 8 }, { bottom: 8, right: 8 }].map((pos, i) => (
          <div key={i} style={{
            position: 'absolute', ...pos, width: 10, height: 10, borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 35%, #c0a060, #7a6030)',
            border: '1px solid #3a2000',
            boxShadow: '0 1px 2px rgba(0,0,0,0.5)',
          }}>
            <div style={{ position: 'absolute', inset: '40% 10%', borderTop: '1px solid rgba(0,0,0,0.5)' }} />
          </div>
        ))}

        {/* Cork board surface */}
        <div style={{
          background: `
            radial-gradient(ellipse at 20% 30%, rgba(200,160,80,0.15) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 70%, rgba(160,100,40,0.12) 0%, transparent 50%),
            repeating-linear-gradient(
              45deg,
              #c8a45a 0px, #c8a45a 1px,
              transparent 1px, transparent 8px
            ),
            repeating-linear-gradient(
              -45deg,
              #b8943a 0px, #b8943a 1px,
              transparent 1px, transparent 8px
            ),
            linear-gradient(160deg, #d4a84b 0%, #c09040 30%, #b07830 60%, #c89848 100%)
          `,
          borderRadius: 3,
          padding: filtered.length === 0 ? '40px 16px' : '24px 10px 18px',
          border: '2px solid #7a5020',
          boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.35), inset 0 -1px 4px rgba(0,0,0,0.2)',
          minHeight: 200,
          position: 'relative',
        }}>

          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontFamily: 'var(--font-newsreader)', fontSize: '1.1rem', color: '#5c3a1e', fontWeight: 700, marginBottom: 6 }}>
                Board is empty
              </p>
              <p style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.75rem', color: '#8b6030' }}>
                Be the first to pin a notice!
              </p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '28px 16px',
              paddingTop: 8,
            }}>
              {filtered.map((n, i) => (
                <NoticePaper
                  key={n.id}
                  notice={n}
                  userId={userId}
                  rotation={ROTATIONS[i % ROTATIONS.length]}
                  onPin={handlePin}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>

        {/* Bottom frame label */}
        <div style={{
          textAlign: 'center', marginTop: 10,
          fontFamily: 'var(--font-newsreader)', fontStyle: 'italic',
          fontSize: '0.65rem', color: 'rgba(255,210,100,0.55)',
          letterSpacing: '0.15em', textTransform: 'uppercase',
        }}>
          Campus Notice Board
        </div>
      </div>

      {showModal && (
        <PostNoticeModal
          userRole={userRole}
          userDepartment={userDepartment}
          onClose={() => setShowModal(false)}
          onPosted={handlePosted}
        />
      )}
    </div>
  )
}
