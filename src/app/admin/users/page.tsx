'use client'

import { useState, useEffect, useMemo } from 'react'

interface User { id: string; full_name: string; email: string; role: string; department: string; year_of_study: number; created_at: string }

const ROLES = ['student', 'faculty', 'hod']

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [changingId, setChangingId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/users').then(r => r.json()).then(d => { setUsers(d.users ?? []); setLoading(false) })
  }, [])

  // Phase 8 Debouncing: Update debouncedSearch after 300ms of inactivity
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const filtered = useMemo(() => {
    return users.filter(u => {
      if (filterRole !== 'all' && u.role !== filterRole) return false
      if (
        debouncedSearch &&
        !u.full_name?.toLowerCase().includes(debouncedSearch.toLowerCase()) &&
        !u.email?.toLowerCase().includes(debouncedSearch.toLowerCase())
      ) {
        return false
      }
      return true
    })
  }, [users, filterRole, debouncedSearch])

  async function changeRole(userId: string, newRole: string) {
    setChangingId(userId)
    const res = await fetch('/api/admin/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, role: newRole }) })
    if (res.ok) setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
    setChangingId(null)
  }

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-newsreader)', fontWeight: 800, fontSize: '2rem', color: '#00595c', marginBottom: 24 }}>User Management</h1>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        <input type="text" placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 220, padding: '9px 14px', border: '2px solid #00595c', fontFamily: 'var(--font-jakarta)', fontSize: '0.875rem', background: '#fbf9f4', outline: 'none' }} />
        <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
          style={{ padding: '9px 14px', border: '2px solid #00595c', background: '#fbf9f4', fontFamily: 'var(--font-jakarta)', fontSize: '0.875rem', cursor: 'pointer' }}>
          <option value="all">All Roles</option>
          {ROLES.map(r => <option key={r} value={r}>{r.toUpperCase()}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#6e7979', fontFamily: 'var(--font-jakarta)' }}>Loading users…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#6e7979', fontFamily: 'var(--font-jakarta)' }}>No users found.</div>
      ) : (
        <div style={{ border: '2px solid #bec9c9', overflow: 'hidden' }}>
          {/* Table header */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px 120px 160px', gap: 0, padding: '10px 16px', background: '#00595c' }}>
            {['Name', 'Email', 'Role', 'Dept', 'Change Role'].map(h => (
              <span key={h} style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#a2f5f9' }}>{h}</span>
            ))}
          </div>
          {filtered.map((u, i) => (
            <div key={u.id} style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr 120px 120px 160px',
              gap: 0, padding: '12px 16px', alignItems: 'center',
              background: i % 2 === 0 ? '#fbf9f4' : '#f5f3ee',
              borderBottom: '1px solid #e4e2dd',
            }}>
              <span style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 600, fontSize: '0.875rem', color: '#1b1c19' }}>{u.full_name || '—'}</span>
              <span style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.8rem', color: '#6e7979', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</span>
              <span style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#00595c' }}>{u.role}</span>
              <span style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.8rem', color: '#3e4949' }}>{u.department}</span>
              <select
                value={u.role}
                disabled={changingId === u.id}
                onChange={e => changeRole(u.id, e.target.value)}
                style={{ padding: '5px 8px', border: '1.5px solid #bec9c9', fontFamily: 'var(--font-jakarta)', fontSize: '0.75rem', cursor: 'pointer', background: '#fbf9f4' }}
              >
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
