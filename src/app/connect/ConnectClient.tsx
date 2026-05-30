'use client'

import React, { useState, useEffect, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import DirectDMWidget from '@/app/components/DirectDMWidget'

interface StudentUser {
  id: string
  full_name: string
  avatar_url: string | null
  department: string
  year_of_study: number
  role: string
  bio: string | null
  interests: string[]
  skills: string[]
  study_goals: string[]
  looking_for: string[]
  dm_privacy: string
  match_score: number
  match_reasons: string[]
}

const DEPARTMENTS = [
  { value: '', label: 'All Departments' },
  { value: 'CSE', label: 'CSE' },
  { value: 'CSE-DS', label: 'CSE (Data Science)' },
  { value: 'CSE-AIML', label: 'CSE (AIML)' },
  { value: 'CSE-CS', label: 'CSE (Cyber Security)' },
  { value: 'CSBS', label: 'CSBS' },
  { value: 'ECE', label: 'ECE' },
  { value: 'EEE', label: 'EEE' },
  { value: 'ME', label: 'Mechanical' },
  { value: 'CE', label: 'Civil' },
  { value: 'MCA', label: 'MCA' },
  { value: 'MBA', label: 'MBA' },
]

export default function ConnectClient() {
  const [users, setUsers] = useState<StudentUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Search & Filter State
  const [search, setSearch] = useState('')
  const [dept, setDept] = useState('')
  const [year, setYear] = useState('')
  const [tag, setTag] = useState('')

  // Selected User for Profile Preview Drawer
  const [selectedUser, setSelectedUser] = useState<StudentUser | null>(null)

  // Active Chat Session
  const [activeChat, setActiveChat] = useState<{ conversationId: string; receiverName: string; receiverId: string } | null>(null)

  // Fetch users on mount or filter change
  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true)
      try {
        const queryParams = new URLSearchParams()
        if (search) queryParams.append('search', search)
        if (dept) queryParams.append('department', dept)
        if (year) queryParams.append('year', year)
        if (tag) queryParams.append('tag', tag)

        const res = await fetch(`/api/connect/users?${queryParams.toString()}`)
        if (res.ok) {
          const data = await res.json()
          setUsers(data.users || [])
        } else {
          setError('Failed to load peers.')
        }
      } catch (err) {
        setError('Network error.')
      } finally {
        setLoading(false)
      }
    }

    const timer = setTimeout(fetchUsers, 300)
    return () => clearTimeout(timer)
  }, [search, dept, year, tag])

  // Initiate message flow
  const handleStartMessage = async (peer: StudentUser) => {
    try {
      const res = await fetch('/api/direct-conversations/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiver_id: peer.id }),
      })

      const data = await res.json()
      if (!res.ok) {
        alert(data.error || 'Failed to start conversation.')
        return
      }

      // Close profile drawer if open
      setSelectedUser(null)

      // Open Chat Widget overlay
      setActiveChat({
        conversationId: data.conversation.id,
        receiverName: peer.full_name,
        receiverId: peer.id,
      })
    } catch (err) {
      alert('Error starting chat session.')
    }
  }

  return (
    <div style={{ padding: '20px 0', fontFamily: 'var(--font-jakarta)', paddingBottom: '100px' }}>
      
      {/* ── Title Hero ─────────────────────────────────────────── */}
      <div style={{
        background: '#FDFAF5', border: '3px solid #00595c', padding: '24px 20px',
        boxShadow: '6px 6px 0 0 #00595c', marginBottom: 28, position: 'relative', overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute', top: -20, right: -20, background: '#fea619',
          width: 80, height: 80, transform: 'rotate(45deg)', opacity: 0.2
        }} />
        <h1 style={{ fontFamily: 'var(--font-newsreader)', fontSize: '2.2rem', fontWeight: 800, color: '#00595c', margin: '0 0 6px 0', lineHeight: 1.1 }}>
          Campus Connect
        </h1>
        <p style={{ margin: 0, fontSize: '0.85rem', color: '#6e7979', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Discover RGMCET peers, study partners, and skills collaborators
        </p>
      </div>

      {/* ── Search & Filter Controls ───────────────────────────── */}
      <div style={{
        background: '#fbf9f4', border: '2px solid #bec9c9', padding: '16px',
        marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 12
      }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              type="text"
              placeholder="Search by name, bio..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px', background: '#FDFAF5',
                border: '2.5px solid #00595c', fontSize: '0.85rem', color: '#1a1a1a',
                outline: 'none', fontFamily: 'var(--font-jakarta)'
              }}
            />
          </div>
          <input
            type="text"
            placeholder="Filter by interest/skill tag..."
            value={tag}
            onChange={e => setTag(e.target.value)}
            style={{
              width: '150px', padding: '10px 12px', background: '#FDFAF5',
              border: '2.5px solid #00595c', fontSize: '0.85rem', color: '#1a1a1a',
              outline: 'none', fontFamily: 'var(--font-jakarta)'
            }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <select
            value={dept}
            onChange={e => setDept(e.target.value)}
            style={{
              padding: '10px', background: '#FDFAF5', border: '2px solid #bec9c9',
              fontSize: '0.82rem', fontFamily: 'var(--font-jakarta)', color: '#1a1a1a', outline: 'none'
            }}
          >
            {DEPARTMENTS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>

          <select
            value={year}
            onChange={e => setYear(e.target.value)}
            style={{
              padding: '10px', background: '#FDFAF5', border: '2px solid #bec9c9',
              fontSize: '0.82rem', fontFamily: 'var(--font-jakarta)', color: '#1a1a1a', outline: 'none'
            }}
          >
            <option value="">All Years</option>
            <option value="1">1st Year</option>
            <option value="2">2nd Year</option>
            <option value="3">3rd Year</option>
            <option value="4">4th Year</option>
          </select>
        </div>
      </div>

      {/* ── Discovery Grid ────────────────────────────────────── */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0' }}>
          <div style={{
            width: 32, height: 32, border: '4px solid #f0eee9', borderTop: '4px solid #00595c',
            borderRadius: '50%', animation: 'spin 1s linear infinite'
          }} />
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          <span style={{ fontSize: '0.85rem', color: '#6e7979', marginTop: 12, fontWeight: 700 }}>Searching peers...</span>
        </div>
      ) : error ? (
        <div style={{ padding: 20, textAlign: 'center', color: '#ba1a1a', border: '2px solid #ba1a1a', background: '#fdf2f2' }}>
          {error}
        </div>
      ) : users.length === 0 ? (
        <div style={{
          padding: '40px 20px', textAlign: 'center', background: '#f0eee9',
          color: '#6e7979', fontSize: '0.9rem', fontWeight: 700
        }}>
          No matching students found. Try broadening your filters!
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {users.map(user => {
            const hasMatch = user.match_score > 0
            const fullName = user.full_name || 'Anonymous'
            const initials = fullName.split(' ').slice(0, 2).map(n => n ? n[0] : '').join('').toUpperCase() || 'U'

            return (
              <div
                key={user.id}
                style={{
                  background: '#FDFAF5', border: '2.5px solid #00595c',
                  boxShadow: '4px 4px 0 0 #00595c', padding: 18,
                  display: 'flex', flexDirection: 'column', gap: 12,
                  position: 'relative', transition: 'transform 0.15s ease'
                }}
              >
                {/* Match Score Badge */}
                {hasMatch && (
                  <div style={{
                    position: 'absolute', top: 12, right: 12,
                    background: '#eafaf9', color: '#0d7377', border: '1.5px solid #0d7377',
                    padding: '2px 8px', fontSize: '0.68rem', fontWeight: 800, borderRadius: 20
                  }}>
                    +{user.match_score} Match Score
                  </div>
                )}

                {/* Profile Core Row */}
                <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: '50%', background: '#dbdad5',
                    border: '2px solid #00595c', overflow: 'hidden', flexShrink: 0
                  }}>
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00595c', fontWeight: 800, fontSize: '1rem' }}>
                        {initials}
                      </div>
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3
                      onClick={() => setSelectedUser(user)}
                      style={{
                        margin: '0 0 2px 0', fontFamily: 'var(--font-newsreader)', fontSize: '1.25rem',
                        fontWeight: 800, color: '#1b1c19', cursor: 'pointer', textDecoration: 'underline'
                      }}
                    >
                      {fullName}
                    </h3>
                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#00595c', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                      {user.department} • Year {user.year_of_study}
                    </div>
                  </div>
                </div>

                {/* Bio Snippet */}
                {user.bio && (
                  <p style={{
                    margin: 0, fontSize: '0.82rem', color: '#1a1a1a', lineHeight: 1.35,
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
                  }}>
                    {user.bio}
                  </p>
                )}

                {/* Match Reasons List */}
                {user.match_reasons.length > 0 && (
                  <div style={{
                    background: '#fcfcfc', border: '1px dashed #bec9c9', padding: '6px 10px',
                    fontSize: '0.72rem', color: '#6e7979'
                  }}>
                    <span style={{ fontWeight: 800, color: '#00595c' }}>Match Reasons: </span>
                    {user.match_reasons.join(' · ')}
                  </div>
                )}

                {/* Tag Chips Preview */}
                {user.interests.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                    {user.interests.slice(0, 4).map(t => (
                      <span key={t} style={{
                        background: '#f0eee9', color: '#3e4949', border: '1px solid #3e4949',
                        padding: '1px 6px', fontSize: '0.68rem', fontWeight: 700, borderRadius: 12
                      }}>
                        {t}
                      </span>
                    ))}
                    {user.interests.length > 4 && (
                      <span style={{ fontSize: '0.68rem', color: '#6e7979', fontWeight: 800, alignSelf: 'center' }}>
                        +{user.interests.length - 4} more
                      </span>
                    )}
                  </div>
                )}

                {/* Action CTA Row */}
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <button
                    onClick={() => setSelectedUser(user)}
                    style={{
                      flex: 1, padding: '8px 12px', background: 'transparent',
                      border: '1.5px solid #bec9c9', color: '#3e4949',
                      fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase',
                      cursor: 'pointer'
                    }}
                  >
                    View Details
                  </button>

                  {user.dm_privacy !== 'no_one' && (
                    <button
                      onClick={() => handleStartMessage(user)}
                      style={{
                        padding: '8px 16px', background: '#fea619',
                        border: '2px solid #00595c', color: '#684000',
                        fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase',
                        cursor: 'pointer', boxShadow: '2px 2px 0 0 #00595c',
                        display: 'flex', alignItems: 'center', gap: 6
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chat</span>
                      <span>Message</span>
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Student Profile Preview Drawer (Modal) ──────────────── */}
      {selectedUser && (
        <>
          <div onClick={() => setSelectedUser(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100 }} />
          <div style={{
            position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
            width: '100%', maxWidth: 430, zIndex: 101, background: '#fbf9f4',
            border: '2px solid #00595c', borderBottom: 'none',
            boxShadow: '0 -6px 0 0 #00595c', padding: '24px 20px 32px',
            maxHeight: '85vh', overflowY: 'auto', animation: 'slideUp 0.18s ease-out'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%', background: '#dbdad5',
                  border: '2px solid #00595c', overflow: 'hidden'
                }}>
                  {selectedUser.avatar_url ? (
                    <img src={selectedUser.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00595c', fontWeight: 800 }}>
                      {selectedUser.full_name?.substring(0, 2).toUpperCase() || 'U'}
                    </div>
                  )}
                </div>
                <div>
                  <h2 style={{ margin: 0, fontFamily: 'var(--font-newsreader)', fontSize: '1.45rem', fontWeight: 800, color: '#1a1a1a' }}>
                    {selectedUser.full_name}
                  </h2>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#00595c', textTransform: 'uppercase' }}>
                    {selectedUser.department} • Year {selectedUser.year_of_study}
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedUser(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6e7979' }}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {selectedUser.bio && (
              <div style={{ marginBottom: 18 }}>
                <div style={{ color: '#6e7979', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: 4 }}>Bio</div>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#1a1a1a', lineHeight: 1.4 }}>{selectedUser.bio}</p>
              </div>
            )}

            {[
              { label: 'Interests', tags: selectedUser.interests, color: '#0d7377', bg: '#eafaf9' },
              { label: 'Skills', tags: selectedUser.skills, color: '#855300', bg: '#fef5e7' },
              { label: 'Study Goals', tags: selectedUser.study_goals, color: '#2e7d32', bg: '#e8f5e9' },
              { label: 'Looking For', tags: selectedUser.looking_for, color: '#6a1b9a', bg: '#f3e5f5' },
            ].map(group => group.tags && group.tags.length > 0 && (
              <div key={group.label} style={{ marginBottom: 16 }}>
                <div style={{ color: '#6e7979', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: 6 }}>{group.label}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {group.tags.map(t => (
                    <span key={t} style={{
                      background: group.bg, color: group.color, border: `1.5px solid ${group.color}`,
                      padding: '2px 8px', fontSize: '0.72rem', fontWeight: 700, borderRadius: 20
                    }}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ))}

            <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
              <button
                onClick={() => setSelectedUser(null)}
                style={{
                  flex: 1, padding: '12px', background: 'transparent',
                  border: '1.5px solid #bec9c9', color: '#6e7979',
                  fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase',
                  cursor: 'pointer'
                }}
              >
                Close Profile
              </button>

              {selectedUser.dm_privacy !== 'no_one' && (
                <button
                  onClick={() => handleStartMessage(selectedUser)}
                  style={{
                    flex: 1, padding: '12px', background: '#fea619',
                    border: '2px solid #00595c', color: '#684000',
                    fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase',
                    cursor: 'pointer', boxShadow: '3px 3px 0 0 #00595c',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chat</span>
                  <span>Send Message</span>
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Active Direct Message Chat Widget Drawer ────────────── */}
      {activeChat && (
        <DirectDMWidget
          conversationId={activeChat.conversationId}
          receiverName={activeChat.receiverName}
          receiverId={activeChat.receiverId}
          onClose={() => setActiveChat(null)}
        />
      )}
    </div>
  )
}
