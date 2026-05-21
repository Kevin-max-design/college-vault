'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { isConfigured } from '@/lib/supabase/client'


type Role = 'student'

interface RoleOption {
  id: Role
  label: string
  icon: string
  description: string
}

/* ── Only the Student role is available for self-service registration ── */
/* ── Admin roles (Faculty, HOD, Principal, etc.) are pre-provisioned ── */
const ROLES: RoleOption[] = [
  {
    id: 'student',
    label: 'Student',
    icon: 'school',
    description: 'View bulletins, join classrooms, participate in discussions, and access the campus marketplace.',
  },
]

export default function RolePage() {
  const [selected] = useState<Role>('student')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleContinue() {
    setError('')

    if (!isConfigured) {
      router.push('/onboarding/profile')
      return
    }

    setLoading(true)
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      router.push('/onboarding/verify')
      return
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .upsert({ id: user.id, role: selected }, { onConflict: 'id' })

    setLoading(false)

    if (updateError) {
      setError(updateError.message)
    } else {
      router.push('/onboarding/profile')
    }
  }


  return (
    <div
      style={{
        backgroundColor: '#fbf9f4',
        minHeight: '100dvh',
        fontFamily: 'var(--font-jakarta)',
        color: '#1b1c19',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ── Top App Bar ───────────────────────────────────────── */}
      <header
        style={{
          backgroundColor: '#fbf9f4',
          borderBottom: '2px solid #00595c',
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          height: 56,
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <button
          onClick={() => router.push('/onboarding/verify')}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 6,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.2s',
          }}
          onMouseOver={(e) => (e.currentTarget.style.background = '#fea619')}
          onMouseOut={(e) => (e.currentTarget.style.background = 'none')}
          aria-label="Go back"
        >
          <span className="material-symbols-outlined" style={{ color: '#00595c', fontSize: 22 }}>arrow_back</span>
        </button>

        <div style={{ flex: 1, textAlign: 'center' }}>
          <span style={{
            fontFamily: 'var(--font-newsreader)',
            fontWeight: 800,
            fontSize: '1.1rem',
            color: '#00595c',
            letterSpacing: '-0.01em',
            fontStyle: 'italic',
            textTransform: 'uppercase',
          }}>
            Campus Gazette
          </span>
        </div>

        <div style={{ width: 34 }} />
      </header>

      {/* ── Main ──────────────────────────────────────────────── */}
      <main
        style={{
          flex: 1,
          maxWidth: 520,
          margin: '0 auto',
          width: '100%',
          padding: '32px 20px 140px',
          display: 'flex',
          flexDirection: 'column',
          gap: 32,
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          <span
            className="label-caps"
            style={{
              display: 'inline-block',
              background: '#0d7377',
              color: '#a2f5f9',
              padding: '5px 16px',
              borderRadius: 9999,
              border: '1px solid #00595c',
              boxShadow: '3px 3px 0 0 #00595c',
              marginBottom: 16,
            }}
          >
            Step 2 of 3
          </span>

          <h1
            style={{
              fontFamily: 'var(--font-newsreader)',
              fontWeight: 800,
              fontSize: '4rem',
              lineHeight: 1.05,
              color: '#00595c',
              letterSpacing: '-0.02em',
              marginBottom: 16,
            }}
          >
            Confirm<br />Your Role
          </h1>

          <p style={{ fontSize: '1rem', lineHeight: 1.6, color: '#3e4949', maxWidth: 340, margin: '0 auto' }}>
            You&#39;re signing up as a <strong style={{ color: '#00595c' }}>Student</strong>. Confirm below to continue setting up your campus profile.
          </p>
        </div>

        {/* Role Card — Student only, auto-selected */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {ROLES.map((role) => {
            const isSelected = selected === role.id
            return (
              <div
                key={role.id}
                className={`role-card${isSelected ? ' selected' : ''}`}
                style={{ textAlign: 'left', cursor: 'default' }}
              >
                {/* Check badge */}
                {isSelected && (
                  <>
                    <div
                      style={{
                        position: 'absolute',
                        top: -14,
                        right: -14,
                        width: 30,
                        height: 30,
                        background: '#fea619',
                        border: '2px solid #00595c',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '2px 2px 0 0 #00595c',
                        zIndex: 2,
                      }}
                    >
                      <span
                        className="material-symbols-outlined"
                        style={{
                          color: '#00595c',
                          fontSize: 16,
                          fontVariationSettings: "'FILL' 1, 'wght' 700",
                        }}
                      >
                        check
                      </span>
                    </div>
                  </>
                )}

                {/* Icon box */}
                <div
                  style={{
                    width: 48,
                    height: 48,
                    border: '2px solid #00595c',
                    background: isSelected ? '#fea619' : '#f5f3ee',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 14,
                    transition: 'background 0.2s',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ color: '#00595c', fontSize: 26 }}>
                    {role.icon}
                  </span>
                </div>

                <h3
                  style={{
                    fontFamily: 'var(--font-newsreader)',
                    fontWeight: 600,
                    fontSize: '1.75rem',
                    color: '#00595c',
                    marginBottom: 6,
                  }}
                >
                  {role.label}
                </h3>

                <p style={{ fontSize: '0.95rem', lineHeight: 1.5, color: '#3e4949', flex: 1 }}>
                  {role.description}
                </p>

                <div
                  className="label-caps"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    color: '#fea619',
                    marginTop: 14,
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  <span>Auto-selected</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Info note about admin roles */}
        <div className="flex items-start gap-2 px-1">
          <span className="material-symbols-outlined shrink-0 mt-0.5" style={{ color: '#fea619', fontSize: 18, fontVariationSettings: '"FILL" 1' }}>info</span>
          <p className="text-sm leading-snug" style={{ color: '#6e7979', fontFamily: 'var(--font-jakarta)' }}>
            Faculty, HOD, and admin roles are provisioned by the institution. If you&#39;re staff, use the <strong style={{ color: '#00595c' }}>Admin login</strong> instead.
          </p>
        </div>

        {error && (
          <p className="text-sm text-center" style={{ color: '#ba1a1a', fontFamily: 'var(--font-jakarta)' }}>
            {error}
          </p>
        )}
      </main>

      {/* ── Sticky Footer ─────────────────────────────────────── */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: '#fbf9f4',
          borderTop: '2px solid #00595c',
          padding: '14px 20px',
          display: 'flex',
          gap: 12,
          zIndex: 10,
        }}
      >
        {/* Max-width alignment with content */}
        <div style={{ maxWidth: 520, margin: '0 auto', width: '100%', display: 'flex', gap: 12 }}>
          <button
            onClick={handleContinue}
            disabled={loading}
            style={{
              flex: 1,
              background: '#fea619',
              border: '2px solid #00595c',
              color: '#684000',
              padding: '14px 16px',
              fontFamily: 'var(--font-jakarta)',
              fontSize: '0.72rem',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              boxShadow: '4px 4px 0 0 #00595c',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => { e.currentTarget.style.transform = 'translate(2px,2px)'; e.currentTarget.style.boxShadow = '2px 2px 0 0 #00595c' }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'translate(0,0)'; e.currentTarget.style.boxShadow = '4px 4px 0 0 #00595c' }}
          >
            {loading ? 'Saving…' : 'Continue to Profile'}
          </button>
        </div>
      </div>
    </div>
  )
}
