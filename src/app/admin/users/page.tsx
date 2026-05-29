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
          style={{ flex: 1, minWidth: 220, padding: '9px 14px', border: '1px solid #cbd5e1', borderRadius: '6px', fontFamily: 'var(--font-jakarta)', fontSize: '0.875rem', background: '#ffffff', outline: 'none' }} />
        <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
          style={{ padding: '9px 14px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#ffffff', fontFamily: 'var(--font-jakarta)', fontSize: '0.875rem', cursor: 'pointer', outline: 'none' }}>
          <option value="all">All Roles</option>
          {ROLES.map(r => <option key={r} value={r}>{r.toUpperCase()}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#64748b', fontFamily: 'var(--font-jakarta)' }}>Loading users…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#64748b', fontFamily: 'var(--font-jakarta)' }}>No users found.</div>
      ) : (
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
          {/* Table header */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px 120px 160px', gap: 0, padding: '14px 20px', background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
            {['Name', 'Email', 'Role', 'Dept', 'Change Role'].map(h => (
              <span key={h} style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#64748b' }}>{h}</span>
            ))}
          </div>
          {filtered.map((u, i) => (
            <div key={u.id} style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr 120px 120px 160px',
              gap: 0, padding: '14px 20px', alignItems: 'center',
              background: i % 2 === 0 ? '#ffffff' : '#f8fafc',
              borderBottom: i < filtered.length - 1 ? '1px solid #e2e8f0' : 'none',
            }}>
              <span style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 600, fontSize: '0.875rem', color: '#0f172a' }}>{u.full_name || '—'}</span>
              <span style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.8rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</span>
              <span style={{
                fontFamily: 'var(--font-jakarta)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
                padding: '3px 8px', background: u.role === 'faculty' ? '#e2f2f3' : u.role === 'hod' ? '#fef3c7' : '#f1f5f9', color: '#334155', borderRadius: '20px', display: 'inline-block', width: 'fit-content'
              }}>{u.role}</span>
              <span style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.8rem', color: '#334155' }}>{u.department}</span>
              <select
                value={u.role}
                disabled={changingId === u.id}
                onChange={e => changeRole(u.id, e.target.value)}
                style={{ padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontFamily: 'var(--font-jakarta)', fontSize: '0.75rem', cursor: 'pointer', background: '#ffffff', outline: 'none' }}
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
