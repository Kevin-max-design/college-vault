'use client'

import { useState, useEffect } from 'react'

interface Classroom { id: string; name: string; subject_type: string; year: number; department: string; description: string }

const YEARS = [1, 2, 3, 4]
const SUBJECT_TYPES = ['core', 'elective']

export default function AdminClassroomsPage() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', description: '', year: 1, subject_type: 'core' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/admin/classrooms').then(r => r.json()).then(d => { setClassrooms(d.classrooms ?? []); setLoading(false) })
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    const res = await fetch('/api/admin/classrooms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    if (res.ok) {
      const data = await res.json()
      setClassrooms(prev => [data, ...prev])
      setShowForm(false)
      setForm({ name: '', description: '', year: 1, subject_type: 'core' })
    } else {
      const d = await res.json()
      setError(d.error || 'Failed to create classroom')
    }
    setSubmitting(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this classroom? This cannot be undone.')) return
    setDeleting(id)
    const res = await fetch(`/api/admin/classrooms?id=${id}`, { method: 'DELETE' })
    if (res.ok) setClassrooms(prev => prev.filter(c => c.id !== id))
    setDeleting(null)
  }

  const byYear = YEARS.map(y => ({ year: y, rooms: classrooms.filter(c => c.year === y) }))

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-newsreader)', fontWeight: 800, fontSize: '2rem', color: '#00595c' }}>Classrooms</h1>
        <button onClick={() => setShowForm(v => !v)} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px',
          background: '#fea619', border: '2px solid #855300', boxShadow: '3px 3px 0 0 #855300',
          fontFamily: 'var(--font-jakarta)', fontSize: '0.7rem', fontWeight: 700,
          textTransform: 'uppercase', cursor: 'pointer', color: '#684000',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
          New Classroom
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <form onSubmit={handleCreate} style={{ background: '#fbf9f4', border: '2px solid #00595c', padding: 24, marginBottom: 28, boxShadow: '4px 4px 0 0 #00595c' }}>
          <h3 style={{ fontFamily: 'var(--font-newsreader)', fontWeight: 700, fontSize: '1.3rem', color: '#00595c', marginBottom: 16 }}>Create New Classroom</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: '#00595c', display: 'block', marginBottom: 6 }}>Name</label>
              <input required type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                style={{ width: '100%', padding: '9px 12px', border: '2px solid #00595c', fontFamily: 'var(--font-jakarta)', fontSize: '0.875rem', background: '#fbf9f4', outline: 'none' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: '#00595c', display: 'block', marginBottom: 6 }}>Year</label>
                <select value={form.year} onChange={e => setForm(f => ({ ...f, year: +e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', border: '2px solid #00595c', background: '#fbf9f4', fontFamily: 'var(--font-jakarta)' }}>
                  {YEARS.map(y => <option key={y} value={y}>Year {y}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: '#00595c', display: 'block', marginBottom: 6 }}>Type</label>
                <select value={form.subject_type} onChange={e => setForm(f => ({ ...f, subject_type: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', border: '2px solid #00595c', background: '#fbf9f4', fontFamily: 'var(--font-jakarta)' }}>
                  {SUBJECT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: '#00595c', display: 'block', marginBottom: 6 }}>Description</label>
            <textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              style={{ width: '100%', padding: '9px 12px', border: '2px solid #00595c', fontFamily: 'var(--font-jakarta)', fontSize: '0.875rem', background: '#fbf9f4', outline: 'none', resize: 'none' }} />
          </div>
          {error && <p style={{ color: '#ba1a1a', fontFamily: 'var(--font-jakarta)', fontSize: '0.8rem', marginBottom: 12 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" disabled={submitting} style={{ padding: '10px 20px', background: '#00595c', border: '2px solid #00595c', color: '#fff', fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', cursor: 'pointer' }}>
              {submitting ? 'Creating…' : 'Create'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} style={{ padding: '10px 20px', background: 'transparent', border: '2px solid #bec9c9', color: '#6e7979', fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#6e7979', fontFamily: 'var(--font-jakarta)' }}>Loading…</div>
      ) : (
        byYear.map(({ year, rooms }) => (
          <div key={year} style={{ marginBottom: 32 }}>
            <h2 style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6e7979', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ background: '#00595c', color: '#fff', padding: '2px 8px' }}>Year {year}</span>
              <span>{rooms.length} classroom{rooms.length !== 1 ? 's' : ''}</span>
            </h2>
            {rooms.length === 0 ? (
              <div style={{ padding: '16px 20px', background: '#f0eee9', border: '1.5px dashed #bec9c9', color: '#6e7979', fontFamily: 'var(--font-jakarta)', fontSize: '0.875rem' }}>No classrooms for Year {year} yet.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                {rooms.map(c => (
                  <div key={c.id} style={{ background: '#fbf9f4', border: '2px solid #00595c', padding: '16px 18px', boxShadow: '3px 3px 0 0 #bec9c9' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <span style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', color: '#6e7979' }}>{c.subject_type}</span>
                      <button onClick={() => handleDelete(c.id)} disabled={deleting === c.id} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ba1a1a' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                      </button>
                    </div>
                    <div style={{ fontFamily: 'var(--font-newsreader)', fontWeight: 700, fontSize: '1.1rem', color: '#1b1c19', marginBottom: 6 }}>{c.name}</div>
                    <p style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.8rem', color: '#6e7979', lineHeight: 1.5 }}>{c.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  )
}
