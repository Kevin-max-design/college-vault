'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Profile {
  full_name: string
  department: string
  year_of_study: number
  role: string
  avatar_url: string | null
}

interface Listing {
  id: string
  title: string
  price: number
  type: string
  status: string
  created_at: string
}

interface GameSession {
  id: string
  score: number
  completed_at: string
  game?: { title: string; type: string }
}

interface ProfileClientProps {
  profile: Profile
  email: string
  listings: Listing[]
  gameSessions: GameSession[]
}

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

export default function ProfileClient({ profile, email, listings, gameSessions }: ProfileClientProps) {
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [editName, setEditName] = useState(profile.full_name)
  const [editDept, setEditDept] = useState(profile.department)
  const [editYear, setEditYear] = useState(profile.year_of_study)
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')

  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile.avatar_url)
  const [hoverAvatar, setHoverAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const totalTrustPoints = gameSessions.reduce((acc, curr) => acc + curr.score, 0)
  const trustLevel = totalTrustPoints > 500 ? 'Gold' : totalTrustPoints > 100 ? 'Silver' : 'Bronze'

  async function handleLogout() {
    setIsLoggingOut(true)
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    await supabase.auth.signOut()
    router.refresh()
    router.push('/onboarding/verify')
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    setEditSaving(true)
    setEditError('')
    try {
      let finalAvatarUrl = profile.avatar_url

      // If a new avatar file was chosen, upload it to Supabase first
      if (avatarFile) {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError || !user) {
          throw new Error('Please login again')
        }

        console.log("Current User ID:", user.id)
        console.log("Bucket Name: avatars")

        const filePath = `${user.id}/${Date.now()}-${avatarFile.name}`
        console.log("File Path:", filePath)

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatarFile, {
            cacheControl: '3600',
            upsert: true,
          })

        if (uploadError) {
          console.log("Upload Error:", uploadError)
          throw new Error(`Profile pic upload failed: ${uploadError.message}`)
        } else {
          const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath)
          console.log("Public Avatar URL:", urlData.publicUrl)
          finalAvatarUrl = `${urlData.publicUrl}?t=${Date.now()}`
        }
      }

      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: editName.trim(),
          department: editDept,
          year_of_study: editYear,
          avatar_url: finalAvatarUrl,
        }),
      })
      if (res.ok) {
        setShowEdit(false)
        router.refresh()
      } else {
        const data = await res.json()
        console.log("Profile Update Error:", data.error)
        setEditError(data.error || 'Failed to update profile.')
      }
    } catch (err: any) {
      setEditError(err.message || 'Network error.')
    } finally {
      setEditSaving(false)
    }
  }

  return (
    <div className="p-5" style={{ paddingBottom: '100px' }}>
      
      {/* ── User Header ────────────────────────────────────────── */}
      <div style={{
        background: '#00595c', borderRadius: 4, padding: '24px',
        color: '#ffffff', display: 'flex', alignItems: 'center', gap: 16,
        boxShadow: '4px 4px 0 0 #855300', marginBottom: 32, position: 'relative'
      }}>
        <div style={{
          position: 'absolute', top: -12, right: -12,
          background: '#fea619', width: 40, height: 40, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '2px solid #855300', boxShadow: '2px 2px 0 0 #855300'
        }}>
          <span className="material-symbols-outlined" style={{ color: '#684000', fontSize: 20 }}>verified</span>
        </div>

        <div style={{
          width: 72, height: 72, borderRadius: '50%', background: '#dbdad5',
          border: '2px solid #a2f5f9', flexShrink: 0, overflow: 'hidden'
        }}>
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6e7979' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 32 }}>person</span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h1 style={{ fontFamily: 'var(--font-newsreader)', fontSize: '1.8rem', fontWeight: 800, lineHeight: 1.1, marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {profile.full_name || 'Anonymous'}
          </h1>
          <div style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.8rem', opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {profile.role} • {profile.department} (Yr {profile.year_of_study})
          </div>
          <div style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.75rem', opacity: 0.7, marginTop: 4 }}>
            {email}
          </div>
        </div>
      </div>

      {/* ── Gamification / Trust Stats ───────────────────────────── */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', color: '#00595c', letterSpacing: '0.05em', marginBottom: 12 }}>
          Trust & Gamification
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div style={{ background: '#fbf9f4', border: '2px solid #00595c', padding: 16, borderRadius: 2, boxShadow: '3px 3px 0 0 #00595c' }}>
            <div style={{ color: '#6e7979', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>Total Points</div>
            <div style={{ fontFamily: 'var(--font-newsreader)', fontSize: '2rem', fontWeight: 800, color: '#00595c', lineHeight: 1 }}>{totalTrustPoints}</div>
          </div>
          <div style={{ background: '#fbf9f4', border: '2px solid #855300', padding: 16, borderRadius: 2, boxShadow: '3px 3px 0 0 #855300' }}>
            <div style={{ color: '#6e7979', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>Trust Level</div>
            <div style={{ fontFamily: 'var(--font-newsreader)', fontSize: '1.6rem', fontWeight: 800, color: '#855300', lineHeight: 1.2 }}>{trustLevel}</div>
          </div>
        </div>
      </div>

      {/* ── Active Listings ──────────────────────────────────────── */}
      <div style={{ marginBottom: 40 }}>
        <h2 style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', color: '#00595c', letterSpacing: '0.05em', marginBottom: 12 }}>
          My Vault Listings
        </h2>
        {listings.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', background: '#f0eee9', borderRadius: 2, color: '#6e7979', fontFamily: 'var(--font-jakarta)', fontSize: '0.9rem' }}>
            You haven&apos;t listed any items yet.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {listings.map(listing => (
              <div key={listing.id} style={{
                background: '#fbf9f4', border: '2px solid #bec9c9', padding: '12px 16px', borderRadius: 2,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-newsreader)', fontWeight: 700, fontSize: '1.1rem', color: '#1b1c19' }}>{listing.title}</div>
                  <div style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.75rem', color: '#6e7979', marginTop: 2, textTransform: 'uppercase' }}>
                    {listing.type} • {listing.status}
                  </div>
                </div>
                <div style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 800, color: '#00595c' }}>
                  ${listing.price.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Action Buttons ─────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        {/* Admin Portal — HOD and Principal only */}
        {(profile.role === 'hod' || profile.role === 'principal') && (
          <Link href="/admin" style={{ textDecoration: 'none' }}>
            <div style={{
              width: '100%', padding: '12px', background: '#00595c', color: '#fff',
              border: '2px solid #002021', display: 'flex',
              alignItems: 'center', justifyContent: 'center', gap: 8,
              fontFamily: 'var(--font-jakarta)', fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.05em', cursor: 'pointer', boxShadow: '3px 3px 0 0 #002021',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>admin_panel_settings</span>
              <span>Admin Portal</span>
            </div>
          </Link>
        )}

        <button onClick={() => setShowEdit(true)} style={{
          width: '100%', padding: '12px', background: '#f0eee9', color: '#1b1c19',
          border: '2px solid #bec9c9', borderRadius: 2, display: 'flex',
          alignItems: 'center', justifyContent: 'center', gap: 8,
          fontFamily: 'var(--font-jakarta)', fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.05em', cursor: 'pointer',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>edit</span>
          <span>Edit Profile</span>
        </button>

        <button 
          onClick={handleLogout}
          disabled={isLoggingOut}
          style={{
            width: '100%', padding: '12px', background: 'transparent', border: '2px solid #ba1a1a', 
            color: '#ba1a1a', fontFamily: 'var(--font-jakarta)', fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.05em', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            cursor: 'pointer'
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>logout</span>
          <span>{isLoggingOut ? 'Logging out...' : 'Log Out'}</span>
        </button>
      </div>

      {/* ── Edit Profile Modal ──────────────────────────────────── */}
      {showEdit && (
        <>
          <div onClick={() => setShowEdit(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100 }} />
          <div style={{
            position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
            width: '100%', maxWidth: 430, zIndex: 101, background: '#fbf9f4',
            border: '2px solid #00595c', borderBottom: 'none',
            boxShadow: '0 -6px 0 0 #00595c', padding: '24px 20px 32px',
            animation: 'slideUp 0.2s ease',
          }}>
            <style>{`@keyframes slideUp { from { transform: translateX(-50%) translateY(100%); } to { transform: translateX(-50%) translateY(0); } }`}</style>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <span style={{ fontFamily: 'var(--font-newsreader)', fontWeight: 700, fontSize: '1.4rem', color: '#00595c' }}>Edit Profile</span>
              <button onClick={() => setShowEdit(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6e7979' }}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              
              {/* Avatar Edit Section */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ position: 'relative', width: 90, height: 90, marginBottom: 8 }}>
                  
                  {/* Spinning dashed amber ring */}
                  <svg
                    className="spin-slow"
                    viewBox="0 0 106 106"
                    style={{ position: 'absolute', inset: -8, width: 106, height: 106, color: '#fea619', zIndex: 0 }}
                  >
                    <circle cx="53" cy="53" r="48" fill="none" stroke="currentColor" strokeWidth={2.5} strokeDasharray="10 8" strokeLinecap="round" />
                  </svg>
                  <style>{`
                    .spin-slow {
                      animation: spin-anim 20s linear infinite;
                    }
                    @keyframes spin-anim {
                      from { transform: rotate(0deg); }
                      to { transform: rotate(360deg); }
                    }
                  `}</style>

                  {/* Avatar Frame */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onMouseEnter={() => setHoverAvatar(true)}
                    onMouseLeave={() => setHoverAvatar(false)}
                    style={{
                      width: 90,
                      height: 90,
                      borderRadius: '50%',
                      border: '2px solid #00595c',
                      overflow: 'hidden',
                      position: 'relative',
                      zIndex: 1,
                      boxShadow: '3px 3px 0 0 #00595c',
                      cursor: 'pointer',
                      background: '#eae8e3',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Avatar Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6e7979' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 28 }}>person</span>
                      </div>
                    )}

                    {/* Camera Hover Overlay */}
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(0,89,92,0.85)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: hoverAvatar ? 1 : 0,
                        transition: 'opacity 0.2s',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ color: '#ffffff', fontSize: 18 }}>photo_camera</span>
                      <span style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.52rem', fontWeight: 800, color: '#ffffff', marginTop: 1, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Change</span>
                    </div>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      setAvatarFile(file)
                      setAvatarPreview(URL.createObjectURL(file))
                    }}
                  />
                </div>

                {/* Explicit Photo Upload Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    background: '#FDFAF5',
                    border: '1.5px solid #00595c',
                    boxShadow: '2px 2px 0 0 #00595c',
                    color: '#00595c',
                    fontFamily: 'var(--font-jakarta)',
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    padding: '6px 14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = '#00595c'
                    e.currentTarget.style.color = '#ffffff'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = '#FDFAF5'
                    e.currentTarget.style.color = '#00595c'
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>upload</span>
                  <span>Upload Photo</span>
                </button>
              </div>

              <div>
                <label className="label-caps mb-1 block" style={{ color: '#00595c' }}>Full Name</label>
                <input type="text" className="cv-input" value={editName} onChange={e => setEditName(e.target.value)} required />
              </div>
              <div>
                <label className="label-caps mb-1 block" style={{ color: '#00595c' }}>Department</label>
                <select className="cv-input" value={editDept} onChange={e => {
                  const newDept = e.target.value
                  setEditDept(newDept)
                  const allowed = ['MATHS', 'PHY', 'CHEM', 'ENG'].includes(newDept)
                    ? [1]
                    : ['MCA', 'MBA'].includes(newDept) ? [1, 2] : [1, 2, 3, 4]
                  if (!allowed.includes(editYear)) {
                    setEditYear(1)
                  }
                }}>
                  {DEPARTMENTS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label-caps mb-1 block" style={{ color: '#00595c' }}>Year of Study</label>
                <select className="cv-input" value={editYear} onChange={e => setEditYear(Number(e.target.value))}>
                  {(['MATHS', 'PHY', 'CHEM', 'ENG'].includes(editDept)
                    ? [1]
                    : ['MCA', 'MBA'].includes(editDept) ? [1, 2] : [1, 2, 3, 4]).map(y => <option key={y} value={y}>Year {y}</option>)}
                </select>
              </div>
              {editError && <p style={{ color: '#ba1a1a', fontFamily: 'var(--font-jakarta)', fontSize: '0.8rem' }}>{editError}</p>}
              <button type="submit" disabled={editSaving} style={{
                width: '100%', padding: '14px', background: '#fea619', border: '2px solid #00595c',
                color: '#684000', fontFamily: 'var(--font-jakarta)', fontSize: '0.75rem', fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase', cursor: editSaving ? 'not-allowed' : 'pointer',
                boxShadow: '4px 4px 0 0 #00595c', opacity: editSaving ? 0.7 : 1,
              }}>
                {editSaving ? 'Saving…' : 'Save Changes'}
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  )
}
