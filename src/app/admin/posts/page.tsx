'use client'

import { useState, useEffect } from 'react'

interface Post { id: string; content: string; type: string; resolved: boolean; created_at: string; classroom_id: string; author: { full_name: string } | null }

export default function AdminPostsPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/posts').then(r => r.json()).then(d => { setPosts(d.posts ?? []); setLoading(false) })
  }, [])

  const filtered = filter === 'all' ? posts : posts.filter(p => p.type === filter)

  async function handleDelete(id: string) {
    if (!confirm('Delete this post?')) return
    setDeleting(id)
    const res = await fetch(`/api/admin/posts?id=${id}`, { method: 'DELETE' })
    if (res.ok) setPosts(prev => prev.filter(p => p.id !== id))
    setDeleting(null)
  }

  async function handleResolve(id: string) {
    const res = await fetch(`/api/posts/${id}/resolve`, { method: 'PATCH' })
    if (res.ok) {
      const d = await res.json()
      setPosts(prev => prev.map(p => p.id === id ? { ...p, resolved: d.resolved } : p))
    }
  }

  const TYPE_COLORS: Record<string, string> = { doubt: '#ba1a1a', material: '#00595c', announcement: '#855300', thread: '#3e4949' }

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-newsreader)', fontWeight: 800, fontSize: '2rem', color: '#00595c', marginBottom: 24 }}>Posts & Doubts</h1>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {['all', 'doubt', 'thread', 'material', 'announcement'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '5px 14px', borderRadius: 9999, border: '2px solid', cursor: 'pointer',
            borderColor: filter === f ? '#00595c' : '#bec9c9',
            background: filter === f ? '#fea619' : 'transparent',
            color: filter === f ? '#684000' : '#6e7979',
            fontFamily: 'var(--font-jakarta)', fontSize: '0.65rem', fontWeight: 700,
            letterSpacing: '0.07em', textTransform: 'uppercase',
          }}>{f}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#6e7979', fontFamily: 'var(--font-jakarta)' }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#6e7979', fontFamily: 'var(--font-jakarta)' }}>No posts found.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(p => (
            <div key={p.id} style={{ background: '#fbf9f4', border: '2px solid #bec9c9', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: TYPE_COLORS[p.type] ?? '#6e7979', padding: '2px 8px', border: `1.5px solid ${TYPE_COLORS[p.type] ?? '#bec9c9'}` }}>
                    {p.type}
                  </span>
                  {p.resolved && <span style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.6rem', fontWeight: 700, color: '#6e7979', textTransform: 'uppercase' }}>✓ Resolved</span>}
                  <span style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.72rem', color: '#6e7979' }}>by {p.author?.full_name ?? 'Anonymous'}</span>
                </div>
                <p style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.875rem', color: '#1b1c19', lineHeight: 1.5, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as any }}>
                  {p.content}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                {p.type === 'doubt' && (
                  <button onClick={() => handleResolve(p.id)} style={{ padding: '5px 10px', border: `1.5px solid ${p.resolved ? '#bec9c9' : '#00595c'}`, background: p.resolved ? 'transparent' : '#00595c', color: p.resolved ? '#6e7979' : '#fff', fontFamily: 'var(--font-jakarta)', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase' }}>
                    {p.resolved ? 'Reopen' : 'Resolve'}
                  </button>
                )}
                <button onClick={() => handleDelete(p.id)} disabled={deleting === p.id} style={{ padding: '5px 10px', border: '1.5px solid #ba1a1a', background: 'transparent', color: '#ba1a1a', fontFamily: 'var(--font-jakarta)', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase' }}>
                  {deleting === p.id ? '…' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
