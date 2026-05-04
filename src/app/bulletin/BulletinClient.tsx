'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

/* ── Types ─────────────────────────────────────────────────────── */
interface Author {
  id: string
  full_name: string
  avatar_url: string | null
  role: string
}

interface Notice {
  id: string
  title: string
  body: string
  scope: 'global' | 'department' | 'personal'
  department: string | null
  tag: 'academic' | 'event' | 'urgent' | 'general'
  pinned: boolean
  created_at: string
  author: Author | null
}

interface Props {
  initialNotices: Notice[]
  userId: string
  userRole: string
  userDepartment: string
}

/* ── Helpers ────────────────────────────────────────────────────── */
function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

const TAG_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  academic: { bg: '#e8f5f5', color: '#00595c', label: 'Academic' },
  event:    { bg: '#ffddb8', color: '#855300', label: 'Event' },
  urgent:   { bg: '#ffdad6', color: '#ba1a1a', label: 'Urgent' },
  general:  { bg: '#e4e2dd', color: '#3e4949', label: 'General' },
}

const SCOPE_STYLES: Record<string, { icon: string; label: string; color: string }> = {
  global:     { icon: 'public',     label: 'College-wide',  color: '#00595c' },
  department: { icon: 'apartment',  label: 'Department',    color: '#855300' },
  personal:   { icon: 'person',     label: 'Personal',      color: '#465062' },
}

/* ── Post Notice Modal ──────────────────────────────────────────── */
function PostNoticeModal({
  userRole,
  userDepartment,
  onClose,
  onPosted,
}: {
  userRole: string
  userDepartment: string
  onClose: () => void
  onPosted: (notice: Notice) => void
}) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [scope, setScope] = useState<'global' | 'department' | 'personal'>('personal')
  const [tag, setTag] = useState<'academic' | 'event' | 'urgent' | 'general'>('general')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const canPostGlobal = userRole === 'principal'
  const canPostDept   = ['faculty', 'hod', 'principal'].includes(userRole)

  const scopeOptions = [
    { value: 'personal', label: 'Personal', show: true },
    { value: 'department', label: 'Department', show: canPostDept },
    { value: 'global', label: 'College-wide', show: canPostGlobal },
  ].filter(o => o.show)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setError('Title is required.'); return }
    setError('')
    setLoading(true)

    const res = await fetch('/api/notices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim(), body: body.trim(), scope, tag }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) { setError(data.error ?? 'Something went wrong.'); return }
    onPosted(data)
    onClose()
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100 }} />
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 430, zIndex: 101,
        background: '#fbf9f4', border: '2px solid #00595c', borderBottom: 'none',
        boxShadow: '0 -6px 0 0 #00595c', padding: '24px 20px 36px',
        animation: 'slideUp 0.2s ease',
      }}>
        <style>{`@keyframes slideUp { from { transform: translateX(-50%) translateY(100%); } to { transform: translateX(-50%) translateY(0); } }`}</style>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontFamily: 'var(--font-newsreader)', fontWeight: 700, fontSize: '1.4rem', color: '#00595c' }}>
            New Notice
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6e7979' }}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Scope */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            {scopeOptions.map(opt => (
              <button key={opt.value} type="button" onClick={() => setScope(opt.value as typeof scope)}
                style={{
                  padding: '4px 12px', borderRadius: 9999, border: '2px solid', cursor: 'pointer',
                  borderColor: scope === opt.value ? '#00595c' : '#bec9c9',
                  background: scope === opt.value ? '#fea619' : 'transparent',
                  color: scope === opt.value ? '#684000' : '#6e7979',
                  fontFamily: 'var(--font-jakarta)', fontSize: '0.65rem', fontWeight: 700,
                  letterSpacing: '0.08em', textTransform: 'uppercase', transition: 'all 0.15s',
                  boxShadow: scope === opt.value ? '2px 2px 0 0 #00595c' : 'none',
                }}>
                {opt.label}
              </button>
            ))}
          </div>

          {/* Tag */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {(['general', 'academic', 'event', 'urgent'] as const).map(t => (
              <button key={t} type="button" onClick={() => setTag(t)}
                style={{
                  padding: '3px 10px', borderRadius: 9999, border: '1.5px solid', cursor: 'pointer',
                  borderColor: tag === t ? TAG_STYLES[t].color : '#bec9c9',
                  background: tag === t ? TAG_STYLES[t].bg : 'transparent',
                  color: tag === t ? TAG_STYLES[t].color : '#6e7979',
                  fontFamily: 'var(--font-jakarta)', fontSize: '0.62rem', fontWeight: 700,
                  letterSpacing: '0.07em', textTransform: 'uppercase', transition: 'all 0.15s',
                }}>
                {TAG_STYLES[t].label}
              </button>
            ))}
          </div>

          {/* Title */}
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Notice title…"
            style={{
              width: '100%', padding: '10px 12px', marginBottom: 10,
              border: '2px solid #00595c', background: '#fbf9f4',
              fontFamily: 'var(--font-newsreader)', fontSize: '1.05rem', fontWeight: 600,
              color: '#1b1c19', outline: 'none', boxShadow: '3px 3px 0 0 #00595c',
            }}
          />

          {/* Body */}
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Write your notice here… (optional)"
            rows={4}
            style={{
              width: '100%', padding: '10px 12px',
              border: '2px solid #00595c', background: '#fbf9f4',
              fontFamily: 'var(--font-jakarta)', fontSize: '0.9rem',
              lineHeight: 1.6, color: '#1b1c19', resize: 'none', outline: 'none',
              boxShadow: '3px 3px 0 0 #00595c',
            }}
          />

          {error && <p style={{ marginTop: 6, fontFamily: 'var(--font-jakarta)', fontSize: '0.8rem', color: '#ba1a1a' }}>{error}</p>}

          <button type="submit" disabled={loading}
            style={{
              marginTop: 14, width: '100%', padding: '13px',
              background: '#fea619', border: '2px solid #00595c', color: '#684000',
              fontFamily: 'var(--font-jakarta)', fontSize: '0.72rem', fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase', cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '4px 4px 0 0 #00595c', opacity: loading ? 0.7 : 1, transition: 'all 0.15s',
            }}>
            {loading ? 'Posting…' : 'Post Notice →'}
          </button>
        </form>
      </div>
    </>
  )
}

/* ── Notice Card ────────────────────────────────────────────────── */
function NoticeCard({
  notice,
  userId,
  onPin,
  onDelete,
}: {
  notice: Notice
  userId: string
  onPin: (id: string, pinned: boolean) => void
  onDelete: (id: string) => void
}) {
  const tagStyle  = TAG_STYLES[notice.tag] ?? TAG_STYLES.general
  const scopeMeta = SCOPE_STYLES[notice.scope] ?? SCOPE_STYLES.personal
  const isOwner   = notice.author?.id === userId

  return (
    <div style={{
      border: '2px solid',
      borderColor: notice.pinned ? '#00595c' : '#bec9c9',
      background: '#fbf9f4',
      boxShadow: notice.pinned ? '5px 5px 0 0 #00595c' : '3px 3px 0 0 #e4e2dd',
      overflow: 'hidden',
      transition: 'all 0.15s',
      position: 'relative',
    }}>
      {/* Pinned strip */}
      {notice.pinned && (
        <div style={{ background: '#00595c', height: 4 }} />
      )}

      <div style={{ padding: '16px 18px' }}>
        {/* Top row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, gap: 8 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {/* Scope badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '2px 8px', borderRadius: 9999, border: '1.5px solid',
              borderColor: scopeMeta.color, color: scopeMeta.color,
              fontFamily: 'var(--font-jakarta)', fontSize: '0.6rem', fontWeight: 700,
              letterSpacing: '0.07em', textTransform: 'uppercase',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 11 }}>{scopeMeta.icon}</span>
              {notice.scope === 'department' && notice.department ? notice.department : scopeMeta.label}
            </div>
            {/* Tag badge */}
            <div style={{
              padding: '2px 8px', borderRadius: 9999,
              background: tagStyle.bg, color: tagStyle.color,
              fontFamily: 'var(--font-jakarta)', fontSize: '0.6rem', fontWeight: 700,
              letterSpacing: '0.07em', textTransform: 'uppercase',
            }}>
              {tagStyle.label}
            </div>
            {notice.pinned && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 3,
                padding: '2px 8px', borderRadius: 9999,
                background: '#e8f5f5', color: '#00595c',
                fontFamily: 'var(--font-jakarta)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.07em',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 11, fontVariationSettings: "'FILL' 1" }}>push_pin</span>
                Pinned
              </div>
            )}
          </div>
          <span style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.68rem', color: '#6e7979', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {timeAgo(notice.created_at)}
          </span>
        </div>

        {/* Title */}
        <h3 style={{
          fontFamily: 'var(--font-newsreader)', fontWeight: 700,
          fontSize: '1.15rem', lineHeight: 1.25, color: '#1b1c19', marginBottom: 6,
        }}>
          {notice.title}
        </h3>

        {/* Body */}
        {notice.body && (
          <p style={{
            fontFamily: 'var(--font-jakarta)', fontSize: '0.875rem',
            lineHeight: 1.6, color: '#3e4949', marginBottom: 12,
          }}>
            {notice.body}
          </p>
        )}

        {/* Footer */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          paddingTop: 10, borderTop: '1.5px solid #e4e2dd',
        }}>
          {/* Author */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 24, height: 24, borderRadius: '50%',
              background: '#0d7377', border: '1.5px solid #00595c',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden', flexShrink: 0,
            }}>
              {notice.author?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={notice.author.avatar_url} alt="" style={{ width: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ color: '#a2f5f9', fontSize: '0.55rem', fontWeight: 700 }}>
                  {(notice.author?.full_name ?? '?').split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
                </span>
              )}
            </div>
            <span style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.72rem', fontWeight: 600, color: '#3e4949' }}>
              {notice.author?.full_name ?? 'Anonymous'}
            </span>
          </div>

          {/* Actions (owner only) */}
          {isOwner && (
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => onPin(notice.id, !notice.pinned)}
                title={notice.pinned ? 'Unpin' : 'Pin'}
                style={{
                  width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '1.5px solid #bec9c9', background: 'transparent', cursor: 'pointer',
                  color: notice.pinned ? '#00595c' : '#6e7979', transition: 'all 0.15s',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 14, fontVariationSettings: notice.pinned ? "'FILL' 1" : "'FILL' 0" }}>push_pin</span>
              </button>
              <button
                onClick={() => onDelete(notice.id)}
                title="Delete"
                style={{
                  width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '1.5px solid #ffdad6', background: 'transparent', cursor: 'pointer',
                  color: '#ba1a1a', transition: 'all 0.15s',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>delete</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Main Client ────────────────────────────────────────────────── */
export default function BulletinClient({ initialNotices, userId, userRole, userDepartment }: Props) {
  const [notices, setNotices] = useState<Notice[]>(initialNotices)
  const [showModal, setShowModal] = useState(false)
  const [filter, setFilter] = useState<'all' | 'global' | 'department' | 'personal'>('all')
  const router = useRouter()

  async function handlePin(id: string, pinned: boolean) {
    const res = await fetch(`/api/notices/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinned }),
    })
    if (res.ok) {
      setNotices(prev => {
        const updated = prev.map(n => n.id === id ? { ...n, pinned } : n)
        return [...updated].sort((a, b) => Number(b.pinned) - Number(a.pinned))
      })
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/notices/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setNotices(prev => prev.filter(n => n.id !== id))
    }
  }

  function handlePosted(notice: Notice) {
    setNotices(prev => [notice, ...prev])
    router.refresh()
  }

  const filtered = filter === 'all' ? notices : notices.filter(n => n.scope === filter)

  const pinned    = filtered.filter(n => n.pinned)
  const unpinned  = filtered.filter(n => !n.pinned)

  return (
    <div style={{ padding: '20px 18px 24px' }}>

      {/* Page header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        paddingBottom: 16, borderBottom: '2px solid #00595c', marginBottom: 24,
      }}>
        <div>
          <span style={{
            fontFamily: 'var(--font-jakarta)', fontSize: '0.65rem', fontWeight: 700,
            letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6e7979',
            display: 'block', marginBottom: 4,
          }}>
            Campus Bulletin
          </span>
          <h1 style={{
            fontFamily: 'var(--font-newsreader)', fontWeight: 800,
            fontSize: '2rem', lineHeight: 1.1, color: '#1b1c19',
          }}>
            Notice Board
          </h1>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '9px 14px', marginTop: 6,
            background: '#fea619', border: '2px solid #00595c',
            color: '#684000', fontFamily: 'var(--font-jakarta)',
            fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em',
            textTransform: 'uppercase', cursor: 'pointer',
            boxShadow: '3px 3px 0 0 #00595c', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translate(-1px,-1px)'; e.currentTarget.style.boxShadow = '4px 4px 0 0 #00595c' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translate(0,0)'; e.currentTarget.style.boxShadow = '3px 3px 0 0 #00595c' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 15 }}>add</span>
          Post
        </button>
      </div>

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {([
          { key: 'all',        label: 'All' },
          { key: 'global',     label: 'College-wide' },
          { key: 'department', label: userDepartment || 'Department' },
          { key: 'personal',   label: 'Personal' },
        ] as const).map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            style={{
              padding: '5px 12px', borderRadius: 9999, border: '2px solid', cursor: 'pointer',
              borderColor: filter === f.key ? '#00595c' : '#bec9c9',
              background: filter === f.key ? '#fea619' : 'transparent',
              color: filter === f.key ? '#684000' : '#6e7979',
              fontFamily: 'var(--font-jakarta)', fontSize: '0.65rem', fontWeight: 700,
              letterSpacing: '0.07em', textTransform: 'uppercase', transition: 'all 0.15s',
              boxShadow: filter === f.key ? '2px 2px 0 0 #00595c' : 'none',
            }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Pinned section */}
      {pinned.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <div style={{ height: 20, width: 4, background: '#fea619', border: '1px solid #00595c' }} />
            <span style={{
              fontFamily: 'var(--font-jakarta)', fontSize: '0.65rem', fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase', color: '#00595c',
            }}>
              Pinned
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {pinned.map(n => (
              <NoticeCard key={n.id} notice={n} userId={userId} onPin={handlePin} onDelete={handleDelete} />
            ))}
          </div>
        </section>
      )}

      {/* All notices */}
      {unpinned.length > 0 ? (
        <section>
          {pinned.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <div style={{ height: 20, width: 4, background: '#1b1c19', border: '1px solid #00595c' }} />
              <span style={{
                fontFamily: 'var(--font-jakarta)', fontSize: '0.65rem', fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase', color: '#3e4949',
              }}>
                Recent
              </span>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {unpinned.map(n => (
              <NoticeCard key={n.id} notice={n} userId={userId} onPin={handlePin} onDelete={handleDelete} />
            ))}
          </div>
        </section>
      ) : notices.length === 0 ? (
        <div style={{ border: '2px dashed #bec9c9', padding: '48px 20px', textAlign: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 44, color: '#bec9c9', display: 'block', marginBottom: 12 }}>newspaper</span>
          <p style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.85rem', color: '#6e7979', marginBottom: 6 }}>
            No notices yet
          </p>
          <p style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.78rem', color: '#bec9c9' }}>
            Be the first to post on the bulletin.
          </p>
        </div>
      ) : null}

      {/* Modal */}
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
