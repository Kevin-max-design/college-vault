'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Profile {
  full_name: string
  department: string
  year_of_study: number
  role: string
  avatar_url: string | null
  bio?: string | null
  interests?: string[] | null
  skills?: string[] | null
  study_goals?: string[] | null
  looking_for?: string[] | null
  profile_visibility?: string | null
  dm_privacy?: string | null
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
  isClubLead?: boolean
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

interface TagEditorProps {
  tags: string[]
  onChange: (tags: string[]) => void
  label: string
  placeholder: string
}

function TagEditor({ tags, onChange, label, placeholder }: TagEditorProps) {
  const [input, setInput] = useState('')

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const val = input.trim().replace(/^,+|,+$/g, '')
      if (val && !tags.includes(val)) {
        if (tags.length >= 10) {
          alert('You can add up to 10 tags only.')
          return
        }
        onChange([...tags, val])
        setInput('')
      }
    }
  }

  const handleRemove = (tag: string) => {
    onChange(tags.filter(t => t !== tag))
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <label className="label-caps mb-1 block" style={{ color: '#00595c', fontSize: '0.65rem', fontWeight: 800 }}>
        {label} ({tags.length}/10)
      </label>
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 6, padding: '6px 8px',
        background: '#FDFAF5', border: '1.5px solid #bec9c9', borderRadius: 2,
        minHeight: 40, alignItems: 'center'
      }}>
        {tags.map(t => (
          <span key={t} style={{
            background: '#eafaf9', color: '#0d7377', border: '1.5px solid #0d7377',
            padding: '2px 8px', fontSize: '0.7rem', fontWeight: 700, borderRadius: 20,
            display: 'inline-flex', alignItems: 'center', gap: 4
          }}>
            {t}
            <span 
              onClick={() => handleRemove(t)} 
              className="material-symbols-outlined" 
              style={{ fontSize: 12, cursor: 'pointer', fontWeight: 800 }}
            >
              close
            </span>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length < 10 ? placeholder : 'Max tags reached'}
          disabled={tags.length >= 10}
          style={{
            border: 'none', outline: 'none', background: 'transparent',
            flex: 1, minWidth: 100, fontSize: '0.8rem', color: '#1a1a1a',
            fontFamily: 'var(--font-jakarta)'
          }}
        />
      </div>
    </div>
  )
}

export default function ProfileClient({ profile, email, listings, gameSessions, isClubLead = false }: ProfileClientProps) {
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [editName, setEditName] = useState(profile.full_name)
  const [editDept, setEditDept] = useState(profile.department)
  const [editYear, setEditYear] = useState(profile.year_of_study)
  const [editBio, setEditBio] = useState(profile.bio || '')
  const [editInterests, setEditInterests] = useState<string[]>(profile.interests || [])
  const [editSkills, setEditSkills] = useState<string[]>(profile.skills || [])
  const [editStudyGoals, setEditStudyGoals] = useState<string[]>(profile.study_goals || [])
  const [editLookingFor, setEditLookingFor] = useState<string[]>(profile.looking_for || [])
  const [editVisibility, setEditVisibility] = useState(profile.profile_visibility || 'college')
  const [editDmPrivacy, setEditDmPrivacy] = useState(profile.dm_privacy || 'everyone')
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')

  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile.avatar_url)
  const [hoverAvatar, setHoverAvatar] = useState(false)
  const [avatarDeleted, setAvatarDeleted] = useState(false)
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null)
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

      if (avatarDeleted) {
        finalAvatarUrl = null
      } else if (avatarFile) {
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
          year_of_study: profile.role === 'student' ? editYear : undefined,
          avatar_url: finalAvatarUrl,
          bio: editBio.trim(),
          interests: editInterests,
          skills: editSkills,
          study_goals: editStudyGoals,
          looking_for: editLookingFor,
          profile_visibility: editVisibility,
          dm_privacy: editDmPrivacy,
        }),
      })
      if (res.ok) {
        // Cache profile data locally on successful save
        const { ClientCache } = await import('@/utils/cache')
        ClientCache.set('profile', {
          full_name: editName.trim(),
          department: editDept,
          year_of_study: profile.role === 'student' ? editYear : profile.year_of_study,
          avatar_url: finalAvatarUrl,
          bio: editBio.trim(),
          interests: editInterests,
          skills: editSkills,
          study_goals: editStudyGoals,
          looking_for: editLookingFor,
          profile_visibility: editVisibility,
          dm_privacy: editDmPrivacy,
        })
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

  // Seed cache with latest server profile data on initial render
  useEffect(() => {
    const seedCache = async () => {
      const { ClientCache } = await import('@/utils/cache')
      ClientCache.set('profile', profile)
    }
    seedCache()
  }, [profile])

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
            {profile.role} • {profile.department}{profile.role === 'student' ? ` (Yr ${profile.year_of_study})` : ''}
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

      {/* ── Discoverability / Peer Info ─────────────────────────── */}
      <div style={{
        background: '#fbf9f4', border: '2px solid #00595c', padding: 20, borderRadius: 2,
        boxShadow: '4px 4px 0 0 #00595c', marginBottom: 32
      }}>
        <h2 style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', color: '#00595c', letterSpacing: '0.05em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>diversity_3</span>
          <span>Campus Connect Profile</span>
        </h2>
        
        {profile.bio ? (
          <div style={{ marginBottom: 16 }}>
            <div style={{ color: '#6e7979', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Bio</div>
            <p style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.85rem', color: '#1a1a1a', margin: 0, lineHeight: 1.4 }}>
              {profile.bio}
            </p>
          </div>
        ) : (
          <p style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.8rem', color: '#6e7979', margin: '0 0 16px 0', fontStyle: 'italic' }}>
            No bio added yet. Tell peers about your interests, skills, or what you are looking for!
          </p>
        )}

        {[
          { label: 'Interests', data: profile.interests },
          { label: 'Skills', data: profile.skills },
          { label: 'Study Goals', data: profile.study_goals },
          { label: 'Looking For', data: profile.looking_for },
        ].map(sect => sect.data && sect.data.length > 0 && (
          <div key={sect.label} style={{ marginBottom: 12 }}>
            <div style={{ color: '#6e7979', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>{sect.label}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {sect.data.map(t => (
                <span key={t} style={{
                  background: '#f0eee9', color: '#3e4949', border: '1.5px solid #3e4949',
                  padding: '2px 8px', fontSize: '0.7rem', fontWeight: 700, borderRadius: 20
                }}>
                  {t}
                </span>
              ))}
            </div>
          </div>
        ))}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, borderTop: '1px dashed #bec9c9', paddingTop: 12, marginTop: 12 }}>
          <div>
            <div style={{ color: '#6e7979', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>Visibility</div>
            <div style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.8rem', fontWeight: 700, color: '#0d7377', textTransform: 'capitalize' }}>
              {profile.profile_visibility || 'college'}
            </div>
          </div>
          <div>
            <div style={{ color: '#6e7979', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>DM Privacy</div>
            <div style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.8rem', fontWeight: 700, color: '#855300', textTransform: 'capitalize' }}>
              {profile.dm_privacy || 'everyone'}
            </div>
          </div>
        </div>
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

        {/* Club Lead Portal */}
        {isClubLead && (
          <Link href="/club-lead" style={{ textDecoration: 'none' }}>
            <div style={{
              width: '100%', padding: '12px', background: '#2e7d32', color: '#fff',
              border: '2px solid #002021', display: 'flex',
              alignItems: 'center', justifyContent: 'center', gap: 8,
              fontFamily: 'var(--font-jakarta)', fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.05em', cursor: 'pointer', boxShadow: '3px 3px 0 0 #002021',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>assignment_ind</span>
              <span>Club Lead Portal</span>
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
            maxHeight: '85vh', overflowY: 'auto',
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
                      setCropImageSrc(URL.createObjectURL(file))
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
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
                      transition: 'background-color 0.15s, color 0.15s'
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

                  {/* Remove Photo Button */}
                  {(avatarPreview || profile.avatar_url) && (
                    <button
                      type="button"
                      onClick={() => {
                        setAvatarFile(null)
                        setAvatarPreview(null)
                        setAvatarDeleted(true)
                      }}
                      style={{
                        background: '#FDFAF5',
                        border: '1.5px solid #ba1a1a',
                        boxShadow: '2px 2px 0 0 #ba1a1a',
                        color: '#ba1a1a',
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
                        transition: 'background-color 0.15s, color 0.15s'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = '#ba1a1a'
                        e.currentTarget.style.color = '#ffffff'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = '#FDFAF5'
                        e.currentTarget.style.color = '#ba1a1a'
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>delete</span>
                      <span>Remove Photo</span>
                    </button>
                  )}
                </div>
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
              {profile.role === 'student' && (
                <div>
                  <label className="label-caps mb-1 block" style={{ color: '#00595c' }}>Year of Study</label>
                  <select className="cv-input" value={editYear} onChange={e => setEditYear(Number(e.target.value))}>
                    {(['MATHS', 'PHY', 'CHEM', 'ENG'].includes(editDept)
                      ? [1]
                      : ['MCA', 'MBA'].includes(editDept) ? [1, 2] : [1, 2, 3, 4]).map(y => <option key={y} value={y}>Year {y}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="label-caps mb-1 block" style={{ color: '#00595c' }}>Short Bio</label>
                <textarea 
                  className="cv-input" 
                  value={editBio} 
                  onChange={e => setEditBio(e.target.value)} 
                  placeholder="Tell peers about yourself..."
                  maxLength={250}
                  rows={3}
                  style={{ resize: 'none', height: 'auto' }}
                />
              </div>

              <TagEditor tags={editInterests} onChange={setEditInterests} label="Interests" placeholder="e.g. AI/ML, UI/UX (Enter to add)" />
              <TagEditor tags={editSkills} onChange={setEditSkills} label="Skills" placeholder="e.g. Python, Figma (Enter to add)" />
              <TagEditor tags={editStudyGoals} onChange={setEditStudyGoals} label="Study Goals" placeholder="e.g. Hackathons, Placements (Enter to add)" />
              <TagEditor tags={editLookingFor} onChange={setEditLookingFor} label="Looking For" placeholder="e.g. Study Partner, Projects (Enter to add)" />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <label className="label-caps mb-1 block" style={{ color: '#00595c' }}>Profile Visibility</label>
                  <select className="cv-input" value={editVisibility} onChange={e => setEditVisibility(e.target.value)}>
                    <option value="college">College Only</option>
                    <option value="public">Public</option>
                    <option value="hidden">Hidden</option>
                  </select>
                </div>
                <div>
                  <label className="label-caps mb-1 block" style={{ color: '#00595c' }}>Direct DMs</label>
                  <select className="cv-input" value={editDmPrivacy} onChange={e => setEditDmPrivacy(e.target.value)}>
                    <option value="everyone">Everyone</option>
                    <option value="college">College Only</option>
                    <option value="same_department">Same Dept Only</option>
                    <option value="no_one">No One</option>
                  </select>
                </div>
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

      {cropImageSrc && (
        <CropModal
          src={cropImageSrc}
          onCancel={() => setCropImageSrc(null)}
          onCrop={(croppedFile) => {
            setAvatarFile(croppedFile)
            setAvatarPreview(URL.createObjectURL(croppedFile))
            setAvatarDeleted(false)
            setCropImageSrc(null)
          }}
        />
      )}
    </div>
  )
}

/* ── Premium HTML5 Canvas Avatar Crop Modal ───────────────────────── */
interface CropModalProps {
  src: string;
  onCancel: () => void;
  onCrop: (croppedFile: File) => void;
}

function CropModal({ src, onCancel, onCrop }: CropModalProps) {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hasError, setHasError] = useState(false);

  const handleStart = (clientX: number, clientY: number) => {
    setIsDragging(true);
    setDragStart({ x: clientX - position.x, y: clientY - position.y });
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!isDragging) return;
    setPosition({
      x: clientX - dragStart.x,
      y: clientY - dragStart.y
    });
  };

  const handleEnd = () => {
    setIsDragging(false);
  };

  const handleCrop = () => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = src;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, 512, 512);

      const r = img.naturalWidth / img.naturalHeight;
      let w = 220;
      let h = 220;
      if (r > 1) {
        w = 220 * r;
      } else {
        h = 220 / r;
      }

      const imgX = (220 - w) / 2;
      const imgY = (220 - h) / 2;

      const w_zoomed = w * zoom;
      const h_zoomed = h * zoom;

      const zoomShiftX = (w - w_zoomed) / 2;
      const zoomShiftY = (h - h_zoomed) / 2;

      const fx = imgX + zoomShiftX + position.x;
      const fy = imgY + zoomShiftY + position.y;

      const S = 512 / 220;

      const cx = fx * S;
      const cy = fy * S;
      const cw = w_zoomed * S;
      const ch = h_zoomed * S;

      ctx.drawImage(img, cx, cy, cw, ch);

      canvas.toBlob((blob) => {
        if (blob) {
          const croppedFile = new File([blob], "avatar.png", { type: "image/png" });
          onCrop(croppedFile);
        }
      }, "image/png");
    };
    img.onerror = () => {
      setHasError(true);
    };
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,89,92,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
    }}>
      <div style={{
        background: '#FDFAF5', border: '3px solid #00595c',
        boxShadow: '6px 6px 0 0 #00595c', padding: 24,
        maxWidth: 380, width: '100%', display: 'flex',
        flexDirection: 'column', alignItems: 'center',
        fontFamily: 'var(--font-jakarta)'
      }}>
        <h3 style={{ fontFamily: 'var(--font-newsreader)', fontSize: '1.4rem', fontWeight: 800, color: '#00595c', margin: '0 0 4px 0', textTransform: 'uppercase' }}>
          Crop Avatar
        </h3>
        <p style={{ fontSize: '0.72rem', color: '#6e7979', margin: '0 0 16px 0', fontWeight: 700 }}>
          DRAG TO PAN · SLIDE TO ZOOM
        </p>

        {hasError ? (
          <div style={{ width: 220, height: 220, border: '3px solid #ba1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffebeb', color: '#ba1a1a', textAlign: 'center', padding: 16, fontSize: '0.8rem' }}>
            Could not load image. Please select a valid photo.
          </div>
        ) : (
          <div 
            onMouseDown={e => handleStart(e.clientX, e.clientY)}
            onMouseMove={e => handleMove(e.clientX, e.clientY)}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
            onTouchStart={e => { const t = e.touches[0]; handleStart(t.clientX, t.clientY) }}
            onTouchMove={e => { const t = e.touches[0]; handleMove(t.clientX, t.clientY) }}
            onTouchEnd={handleEnd}
            style={{
              position: 'relative', width: 220, height: 220,
              border: '3px solid #00595c', borderRadius: '50%',
              overflow: 'hidden', cursor: isDragging ? 'grabbing' : 'grab',
              background: '#eae8e3', userSelect: 'none'
            }}
          >
            <img
              src={src}
              alt="To Crop"
              draggable={false}
              style={{
                position: 'absolute',
                transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                transformOrigin: 'center center',
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                userSelect: 'none',
                pointerEvents: 'none'
              }}
            />
          </div>
        )}

        <div style={{ width: '100%', marginTop: 20, marginBottom: 20 }}>
          <label style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.68rem', fontWeight: 800, color: '#00595c', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Zoom Control
          </label>
          <input
            type="range"
            min="1"
            max="3"
            step="0.05"
            value={zoom}
            onChange={e => setZoom(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: '#fea619', cursor: 'pointer' }}
          />
        </div>

        <div style={{ display: 'flex', gap: 12, width: '100%' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              flex: 1, padding: '10px', background: 'transparent',
              border: '2px solid #bec9c9', color: '#6e7979',
              fontFamily: 'var(--font-jakarta)', fontSize: '0.72rem',
              fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCrop}
            disabled={hasError}
            style={{
              flex: 1, padding: '10px', background: '#fea619',
              border: '2px solid #00595c', color: '#684000',
              fontFamily: 'var(--font-jakarta)', fontSize: '0.72rem',
              fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer',
              boxShadow: '3px 3px 0 0 #00595c'
            }}
          >
            Apply Crop
          </button>
        </div>
      </div>
    </div>
  );
}
