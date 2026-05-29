'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { isConfigured } from '@/lib/supabase/client'

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

const getAvailableYears = (dept: string) => {
  if (['MATHS', 'PHY', 'CHEM', 'ENG'].includes(dept)) {
    return [1]
  }
  if (['MCA', 'MBA'].includes(dept)) {
    return [1, 2]
  }
  return [1, 2, 3, 4]
}

export default function ProfileSetupPage() {
  const [fullName, setFullName] = useState('')
  const [department, setDepartment] = useState('')
  const [year, setYear] = useState<number | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hoverAvatar, setHoverAvatar] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  /* ── Avatar picker ──────────────────────────────────────────── */
  function handleAvatarClick() {
    fileInputRef.current?.click()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    const url = URL.createObjectURL(file)
    setAvatarPreview(url)
  }

  /* ── Submit ─────────────────────────────────────────────────── */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!fullName.trim()) { setError('Please enter your full name.'); return }
    if (!department)      { setError('Please select your department.'); return }
    if (!year)            { setError('Please select your year of study.'); return }

    setError('')

    if (!isConfigured) {
      // Demo mode — skip Supabase, go straight to vault
      router.push('/classrooms')
      return
    }

    setLoading(true)
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      setError('Please login again')
      setLoading(false)
      return
    }

    console.log("Current User ID:", user.id)
    console.log("Bucket Name: avatars")

    let avatarUrl: string | null = null

    /* Upload avatar if provided */
    if (avatarFile) {
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
        console.warn(`Avatar upload failed: ${uploadError.message}. Proceeding with default avatar.`)
      } else {
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath)
        console.log("Public Avatar URL:", urlData.publicUrl)
        avatarUrl = urlData.publicUrl
      }
    }

    /* Upsert profile */
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert(
        {
          id: user.id,
          full_name: fullName.trim(),
          department,
          year_of_study: year,
          ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
        },
        { onConflict: 'id' }
      )

    setLoading(false)

    if (profileError) {
      console.log("Profile Update Error:", profileError)
      setError(profileError.message)
    } else {
      router.push('/classrooms')
    }
  }


  /* ── Avatar src ─────────────────────────────────────────────── */
  const avatarSrc = avatarPreview ?? '/student_avatar.png'

  return (
    <main
      style={{
        backgroundColor: '#fbf9f4',
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '32px 16px',
      }}
    >
      {/* Background blob */}
      <svg
        viewBox="0 0 200 200"
        style={{
          position: 'fixed',
          top: 30,
          left: 30,
          width: 280,
          height: 280,
          color: '#bec9c9',
          opacity: 0.18,
          transform: 'rotate(-12deg)',
          pointerEvents: 'none',
        }}
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M45.7,-76.3C58.9,-69.3,69,-55.4,76.6,-41.1C84.2,-26.8,89.3,-12.1,87.6,1.9C85.9,15.9,77.4,29.3,67.8,40.9C58.2,52.5,47.5,62.3,34.8,69.5C22.1,76.7,7.4,81.3,-6.5,80.7C-20.4,80.1,-33.5,74.3,-45.3,66.4C-57.1,58.5,-67.6,48.5,-75.4,36.2C-83.2,23.9,-88.3,9.3,-87.3,-4.9C-86.3,-19.1,-79.2,-32.9,-70,-44.6C-60.8,-56.3,-49.5,-65.9,-36.8,-73.4C-24.1,-80.9,-10,-86.3,3.3,-88.4C16.6,-90.5,32.5,-83.3,45.7,-76.3Z" transform="translate(100 100)" />
      </svg>

      {/* Card */}
      <div
        style={{
          width: '100%',
          maxWidth: 500,
          background: '#ffffff',
          border: '2px solid #00595c',
          boxShadow: '8px 8px 0 0 #00595c',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Teal top strip */}
        <div style={{ height: 6, background: '#00595c' }} />

        <div style={{ padding: '32px 28px 40px' }}>

          {/* Step chip */}
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <span
              className="label-caps"
              style={{
                display: 'inline-block',
                padding: '6px 20px',
                border: '1.5px solid #6e7979',
                borderRadius: 9999,
                color: '#3e4949',
                background: '#fbf9f4',
              }}
            >
              Step 3 of 3
            </span>
          </div>

          {/* Title */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <h1
              style={{
                fontFamily: 'var(--font-newsreader)',
                fontWeight: 800,
                fontSize: '2.75rem',
                lineHeight: 1.1,
                letterSpacing: '-0.02em',
                color: '#00595c',
                marginBottom: 14,
              }}
            >
              Final Details
            </h1>
            <p style={{ fontFamily: 'var(--font-jakarta)', fontSize: '1rem', lineHeight: 1.6, color: '#3e4949', maxWidth: 340, margin: '0 auto' }}>
              Pin your identity to the board. We need a few more details to complete your campus profile.
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Avatar */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
              <div style={{ position: 'relative', width: 140, height: 140 }}>

                {/* Spinning dashed amber ring */}
                <svg
                  className="spin-slow"
                  viewBox="0 0 156 156"
                  style={{ position: 'absolute', inset: -8, width: 156, height: 156, color: '#fea619', zIndex: 0 }}
                >
                  <circle cx="78" cy="78" r="70" fill="none" stroke="currentColor" strokeWidth={3} strokeDasharray="12 10" strokeLinecap="round" />
                </svg>

                {/* Photo */}
                <div
                  onClick={handleAvatarClick}
                  onMouseEnter={() => setHoverAvatar(true)}
                  onMouseLeave={() => setHoverAvatar(false)}
                  style={{
                    width: 140,
                    height: 140,
                    borderRadius: 12,
                    border: '2px solid #00595c',
                    overflow: 'hidden',
                    position: 'relative',
                    zIndex: 1,
                    boxShadow: '4px 4px 0 0 #00595c',
                    cursor: 'pointer',
                    background: '#eae8e3',
                  }}
                >
                  <Image src={avatarSrc} alt="Profile avatar" fill style={{ objectFit: 'cover' }} />

                  {/* Hover overlay */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(0,89,92,0.82)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: hoverAvatar ? 1 : 0,
                      transition: 'opacity 0.2s',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ color: '#ffffff', fontSize: 28 }}>photo_camera</span>
                    <span className="label-caps" style={{ color: '#ffffff', marginTop: 6 }}>Upload</span>
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
              </div>
            </div>

            {/* Full Name */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label className="label-caps" htmlFor="fullName" style={{ color: '#00595c' }}>Full Name</label>
              <input
                id="fullName"
                type="text"
                className="cv-input"
                placeholder="e.g. Jane Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            {/* Department */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label className="label-caps" htmlFor="department" style={{ color: '#00595c' }}>Department</label>
              <div style={{ position: 'relative' }}>
                <select
                  id="department"
                  className="cv-input"
                  value={department}
                  onChange={(e) => {
                    const newDept = e.target.value
                    setDepartment(newDept)
                    const allowed = getAvailableYears(newDept)
                    if (year && !allowed.includes(year)) {
                      setYear(null)
                    }
                  }}
                  style={{ cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none' }}
                >
                  <option value="" disabled>Select your discipline</option>
                  {DEPARTMENTS.map((d) => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
                <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#00595c' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 22, display: 'block' }}>expand_more</span>
                </div>
              </div>
            </div>

            {/* Year of Study */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label className="label-caps" style={{ color: '#00595c' }}>Year of Study</label>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                {getAvailableYears(department).map((y) => (
                  <button
                    key={y}
                    type="button"
                    onClick={() => setYear(y)}
                    style={{
                      width: 64,
                      height: 64,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px solid',
                      borderColor: year === y ? '#00595c' : '#6e7979',
                      background: year === y ? '#fea619' : '#ffffff',
                      color: year === y ? '#00595c' : '#3e4949',
                      fontFamily: 'var(--font-newsreader)',
                      fontSize: '1.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      boxShadow: year === y ? '4px 4px 0 0 #00595c' : 'none',
                      transform: year === y ? 'translate(-2px,-2px)' : 'none',
                      transition: 'all 0.2s ease',
                      borderRadius: 0,
                    }}
                    onMouseOver={(e) => {
                      if (year !== y) {
                        e.currentTarget.style.borderColor = '#00595c'
                        e.currentTarget.style.background = '#f0eee9'
                      }
                    }}
                    onMouseOut={(e) => {
                      if (year !== y) {
                        e.currentTarget.style.borderColor = '#6e7979'
                        e.currentTarget.style.background = '#ffffff'
                      }
                    }}
                  >
                    {y}
                  </button>
                ))}
              </div>
            </div>

            {/* Error */}
            {error && (
              <p style={{ color: '#ba1a1a', fontSize: '0.875rem', fontFamily: 'var(--font-jakarta)' }}>{error}</p>
            )}

            {/* CTA */}
            <button type="submit" className="btn-amber" disabled={loading} style={{ marginTop: 16 }}>
              <span>{loading ? 'Saving…' : 'Enter the Vault'}</span>
              <span className="material-symbols-outlined" style={{ fontSize: 22 }}>arrow_forward</span>
            </button>

          </form>
        </div>

        {/* Teal bottom strip */}
        <div style={{ height: 6, background: '#00595c' }} />
      </div>
    </main>
  )
}
