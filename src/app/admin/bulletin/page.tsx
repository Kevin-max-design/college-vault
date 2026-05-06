'use client'

import { useState, useEffect, useTransition } from 'react'

interface Notice { id: string; title: string; body: string; scope: string; tag: string; pinned: boolean; created_at: string; author: { full_name: string } | null }

const SCOPES = ['global', 'department', 'personal']
const TAGS = ['general', 'academic', 'event', 'urgent', 'holiday', 'exam']

export default function AdminBulletinPage() {
  const [notices, setNotices] = useState<Notice[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', body: '', scope: 'global', tag: 'general', pinned: false })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/notices').then(r => r.json()).then(d => { setNotices(d.notices ?? d ?? []); setLoading(false) })
  }, [])

  async function handlePost(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    const res = await fetch('/api/notices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    if (res.ok) {
      const data = await res.json()
      setNotices(prev => [data, ...prev])
      setShowForm(false)
      setForm({ title: '', body: '', scope: 'global', tag: 'general', pinned: false })
    } else {
      const d = await res.json()
      setError(d.error || 'Failed to post notice')
    }
    setSubmitting(false)
  }

  async function handlePin(id: string, pinned: boolean) {
    const res = await fetch(`/api/notices/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pinned: !pinned }) })
    if (res.ok) setNotices(prev => prev.map(n => n.id === id ? { ...n, pinned: !pinned } : n))
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this notice?')) return
    setDeleting(id)
    const res = await fetch(`/api/notices/${id}`, { method: 'DELETE' })
    if (res.ok) setNotices(prev => prev.filter(n => n.id !== id))
    setDeleting(null)
  }

  const SCOPE_COLOR: Record<string, string> = { global: '#00595c', department: '#855300', personal: '#3e4949' }
  const TAG_COLOR: Record<string, string> = { urgent: '#ba1a1a', exam: '#855300', event: '#0d7377', academic: '#00595c', general: '#6e7979', holiday: '#3e4949' }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-newsreader)', fontWeight: 800, fontSize: '2rem', color: '#00595c' }}>Bulletin Board</h1>
          <p style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.8rem', color: '#6e7979', marginTop: 4 }}>Post campus-wide news and notices.</p>
        </div>
        <button onClick={() => setShowForm(v => !v)} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px',
          background: '#fea619', border: '2px solid #855300', boxShadow: '3px 3px 0 0 #855300',
          fontFamily: 'var(--font-jakarta)', fontSize: '0.7rem', fontWeight: 700,
          textTransform: 'uppercase', cursor: 'pointer', color: '#684000',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
          Post Notice
        </button>
      </div>

      {showForm && (
        <form onSubmit={handlePost} style={{ background: '#fbf9f4', border: '2px solid #00595c', padding: 24, marginBottom: 28, boxShadow: '4px 4px 0 0 #00595c' }}>
          <h3 style={{ fontFamily: 'var(--font-newsreader)', fontWeight: 700, fontSize: '1.3rem', color: '#00595c', marginBottom: 16 }}>New Notice</h3>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: '#00595c', display: 'block', marginBottom: 6 }}>Title</label>
            <input required type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              style={{ width: '100%', padding: '9px 12px', border: '2px solid #00595c', fontFamily: 'var(--font-jakarta)', fontSize: '0.9rem', background: '#fbf9f4', outline: 'none' }} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: '#00595c', display: 'block', marginBottom: 6 }}>Body</label>
            <textarea required rows={4} value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
              style={{ width: '100%', padding: '9px 12px', border: '2px solid #00595c', fontFamily: 'var(--font-jakarta)', fontSize: '0.875rem', background: '#fbf9f4', outline: 'none', resize: 'vertical' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 16 }}>
            <div>
              <label style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: '#00595c', display: 'block', marginBottom: 6 }}>Scope</label>
              <select value={form.scope} onChange={e => setForm(f => ({ ...f, scope: e.target.value }))}
                style={{ width: '100%', padding: '9px 12px', border: '2px solid #00595c', background: '#fbf9f4', fontFamily: 'var(--font-jakarta)' }}>
                {SCOPES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: '#00595c', display: 'block', marginBottom: 6 }}>Tag</label>
              <select value={form.tag} onChange={e => setForm(f => ({ ...f, tag: e.target.value }))}
                style={{ width: '100%', padding: '9px 12px', border: '2px solid #00595c', background: '#fbf9f4', fontFamily: 'var(--font-jakarta)' }}>
                {TAGS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 2 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontFamily: 'var(--font-jakarta)', fontSize: '0.8rem', fontWeight: 600, color: '#3e4949' }}>
                <input type="checkbox" checked={form.pinned} onChange={e => setForm(f => ({ ...f, pinned: e.target.checked }))} />
                Pin to top
              </label>
            </div>
          </div>
          {error && <p style={{ color: '#ba1a1a', fontFamily: 'var(--font-jakarta)', fontSize: '0.8rem', marginBottom: 12 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" disabled={submitting} style={{ padding: '10px 20px', background: '#00595c', border: '2px solid #00595c', color: '#fff', fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', cursor: 'pointer' }}>
              {submitting ? 'Posting…' : 'Post Notice'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} style={{ padding: '10px 20px', background: 'transparent', border: '2px solid #bec9c9', color: '#6e7979', fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#6e7979', fontFamily: 'var(--font-jakarta)' }}>Loading…</div>
      ) : notices.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#6e7979', fontFamily: 'var(--font-jakarta)' }}>No notices yet. Post your first one!</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {notices.map(n => (
            <div key={n.id} style={{ background: '#fbf9f4', border: `2px solid ${n.pinned ? '#855300' : '#bec9c9'}`, padding: '16px 18px', boxShadow: n.pinned ? '4px 4px 0 0 #855300' : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 10 }}>
                <div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                    {n.pinned && <span style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.6rem', fontWeight: 700, color: '#855300', background: '#ffddb8', padding: '2px 7px', border: '1.5px solid #855300' }}>📌 Pinned</span>}
                    <span style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', color: SCOPE_COLOR[n.scope] ?? '#6e7979', border: `1.5px solid ${SCOPE_COLOR[n.scope] ?? '#bec9c9'}`, padding: '2px 7px' }}>{n.scope}</span>
                    <span style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', color: TAG_COLOR[n.tag] ?? '#6e7979', border: `1.5px solid ${TAG_COLOR[n.tag] ?? '#bec9c9'}`, padding: '2px 7px' }}>{n.tag}</span>
                  </div>
                  <div style={{ fontFamily: 'var(--font-newsreader)', fontWeight: 700, fontSize: '1.15rem', color: '#1b1c19' }}>{n.title}</div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => handlePin(n.id, n.pinned)} style={{ padding: '5px 10px', border: `1.5px solid ${n.pinned ? '#bec9c9' : '#855300'}`, background: 'transparent', color: n.pinned ? '#6e7979' : '#855300', fontFamily: 'var(--font-jakarta)', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase' }}>
                    {n.pinned ? 'Unpin' : 'Pin'}
                  </button>
                  <button onClick={() => handleDelete(n.id)} disabled={deleting === n.id} style={{ padding: '5px 10px', border: '1.5px solid #ba1a1a', background: 'transparent', color: '#ba1a1a', fontFamily: 'var(--font-jakarta)', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase' }}>
                    {deleting === n.id ? '…' : 'Delete'}
                  </button>
                </div>
              </div>
              <p style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.875rem', color: '#3e4949', lineHeight: 1.55 }}>{n.body}</p>
              <div style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.7rem', color: '#6e7979', marginTop: 10 }}>By {n.author?.full_name ?? 'Admin'}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
