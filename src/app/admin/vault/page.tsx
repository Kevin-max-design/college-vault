'use client'

import { useState, useEffect } from 'react'

interface Listing { id: string; title: string; price: number; type: string; category: string; status: string; created_at: string; seller: { full_name: string } | null }

export default function AdminVaultPage() {
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('all')
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/listings').then(r => r.json()).then(d => { setListings(d.listings ?? []); setLoading(false) })
  }, [])

  const filtered = filterStatus === 'all' ? listings : listings.filter(l => l.status === filterStatus)

  async function handleDelete(id: string) {
    if (!confirm('Remove this listing?')) return
    setDeleting(id)
    const res = await fetch(`/api/listings/${id}`, { method: 'DELETE' })
    if (res.ok) setListings(prev => prev.filter(l => l.id !== id))
    setDeleting(null)
  }

  async function handleMarkSold(id: string) {
    const res = await fetch(`/api/listings/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'sold' }) })
    if (res.ok) setListings(prev => prev.map(l => l.id === id ? { ...l, status: 'sold' } : l))
  }

  const STATUS_COLOR: Record<string, string> = { available: '#00595c', sold: '#6e7979', rented: '#855300' }

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-newsreader)', fontWeight: 800, fontSize: '2rem', color: '#00595c', marginBottom: 24 }}>Vault Listings</h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['all', 'available', 'sold', 'rented'].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)} style={{
            padding: '6px 14px', borderRadius: '20px', border: '1px solid', cursor: 'pointer',
            borderColor: filterStatus === s ? '#00595c' : '#cbd5e1',
            background: filterStatus === s ? '#fea619' : '#ffffff',
            color: filterStatus === s ? '#684000' : '#64748b',
            fontFamily: 'var(--font-jakarta)', fontSize: '0.65rem', fontWeight: 700,
            letterSpacing: '0.07em', textTransform: 'uppercase',
            transition: 'all 0.15s',
          }}>{s}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#64748b', fontFamily: 'var(--font-jakarta)' }}>Loading…</div>
      ) : (
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
          {filtered.map((l, i) => (
            <div key={l.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '16px 20px', gap: 12,
              background: i % 2 === 0 ? '#ffffff' : '#f8fafc',
              borderBottom: i < filtered.length - 1 ? '1px solid #e2e8f0' : 'none',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-newsreader)', fontWeight: 700, fontSize: '1.05rem', color: '#0f172a', marginBottom: 3 }}>{l.title}</div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.72rem', fontWeight: 700, color: '#00595c' }}>${l.price.toFixed(2)}</span>
                  <span style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.72rem', color: '#64748b' }}>{l.category} · {l.type}</span>
                  <span style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.72rem', color: '#64748b' }}>by {l.seller?.full_name ?? '—'}</span>
                  <span style={{
                    fontFamily: 'var(--font-jakarta)', fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase',
                    padding: '2px 8px', borderRadius: '20px', background: l.status === 'available' ? '#e0f5f6' : '#f1f5f9', color: STATUS_COLOR[l.status] ?? '#64748b'
                  }}>{l.status}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {l.status === 'available' && (
                  <button onClick={() => handleMarkSold(l.id)} style={{ padding: '6px 12px', border: '1px solid #d97706', borderRadius: '6px', background: 'transparent', color: '#d97706', fontFamily: 'var(--font-jakarta)', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', transition: 'all 0.15s' }}>
                    Mark Sold
                  </button>
                )}
                <button onClick={() => handleDelete(l.id)} disabled={deleting === l.id} style={{ padding: '6px 12px', border: '1px solid #fee2e2', borderRadius: '6px', background: 'transparent', color: '#ba1a1a', fontFamily: 'var(--font-jakarta)', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', transition: 'all 0.15s' }}>
                  {deleting === l.id ? '…' : 'Remove'}
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: '#64748b', fontFamily: 'var(--font-jakarta)' }}>No listings found.</div>
          )}
        </div>
      )}
    </div>
  )
}
