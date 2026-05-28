'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { signInAction, signUpAction, signInWithPasswordAction } from './actions'

/* ─── Decorative SVGs ────────────────────────────────────────────── */
function DoodleCircle() {
  return (
    <div className="absolute top-10 left-10 opacity-40 pointer-events-none hidden md:block" style={{ color: '#6e7979' }}>
      <svg fill="none" height={120} stroke="currentColor" strokeWidth={2} viewBox="0 0 100 100" width={120}>
        <circle cx="50" cy="50" r="40" strokeDasharray="8 4" />
        <path d="M50 10 L50 90 M10 50 L90 50" strokeDasharray="4 4" />
      </svg>
    </div>
  )
}

function DoodleCurve() {
  return (
    <div className="absolute bottom-16 right-10 opacity-40 pointer-events-none hidden md:block" style={{ color: '#fea619' }}>
      <svg fill="none" height={80} stroke="currentColor" strokeLinecap="round" strokeWidth={4} viewBox="0 0 150 80" width={150}>
        <path d="M10 70 Q 40 10 75 40 T 140 20" />
        <path d="M130 10 L145 20 L130 35" />
      </svg>
    </div>
  )
}

/* ─── Student Auth Form (Sign In + Sign Up) ──────────────────────── */
function StudentAuthForm() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [needsConfirmation, setNeedsConfirmation] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function validateEmail(e: string) {
    const lower = e.toLowerCase().trim()
    return lower.endsWith('@rgmcet.edu.in') || lower.endsWith('.rgmcet.edu.in')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const emailLower = email.toLowerCase().trim()

    if (!validateEmail(emailLower)) {
      setError('Only official RGMCET email addresses (@rgmcet.edu.in) are allowed.')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match. Please try again.')
      return
    }

    startTransition(async () => {
      if (mode === 'signin') {
        const result = await signInAction(emailLower, password)
        if (result.error) {
          setError(result.error)
        } else {
          router.refresh()
          router.push('/home')
        }
      } else {
        const result = await signUpAction(emailLower, password)
        if (result.error) {
          setError(result.error)
        } else if (result.needsConfirmation) {
          setNeedsConfirmation(true)
        } else {
          router.refresh()
          router.push('/onboarding/profile')
        }
      }
    })
  }

  if (needsConfirmation) {
    return (
      <div style={{ textAlign: 'center' }}>
        <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#00595c', marginBottom: 12, display: 'block' }}>
          mark_email_read
        </span>
        <h2 style={{ fontFamily: 'var(--font-newsreader)', fontSize: '1.4rem', fontWeight: 800, color: '#00595c', marginBottom: 8 }}>
          Check your inbox!
        </h2>
        <p style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.9rem', color: '#3e4949', lineHeight: 1.6, marginBottom: 16 }}>
          We sent a confirmation link to <strong style={{ color: '#00595c' }}>{email}</strong>.<br />
          Click it to activate your account.
        </p>
        <button
          onClick={() => { setNeedsConfirmation(false); setMode('signin') }}
          style={{
            fontFamily: 'var(--font-jakarta)', fontSize: '0.75rem', fontWeight: 700,
            letterSpacing: '0.06em', textTransform: 'uppercase',
            color: '#00595c', background: 'none', border: 'none',
            cursor: 'pointer', textDecoration: 'underline',
          }}
        >
          Back to Sign In
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {/* Mode toggle tabs */}
      <div style={{
        display: 'flex',
        border: '2px solid #00595c',
        marginBottom: 8,
        overflow: 'hidden',
      }}>
        <button
          type="button"
          onClick={() => { setMode('signin'); setError('') }}
          style={{
            flex: 1,
            padding: '9px 0',
            fontFamily: 'var(--font-jakarta)',
            fontSize: '0.75rem',
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            border: 'none',
            cursor: 'pointer',
            transition: 'background 0.2s, color 0.2s',
            background: mode === 'signin' ? '#00595c' : 'transparent',
            color: mode === 'signin' ? '#fff' : '#00595c',
          }}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => { setMode('signup'); setError('') }}
          style={{
            flex: 1,
            padding: '9px 0',
            fontFamily: 'var(--font-jakarta)',
            fontSize: '0.75rem',
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            border: 'none',
            borderLeft: '2px solid #00595c',
            cursor: 'pointer',
            transition: 'background 0.2s, color 0.2s',
            background: mode === 'signup' ? '#00595c' : 'transparent',
            color: mode === 'signup' ? '#fff' : '#00595c',
          }}
        >
          Create Account
        </button>
      </div>

      {/* Email */}
      <div className="flex flex-col gap-1.5">
        <label className="label-caps" htmlFor="student-email" style={{ color: '#00595c' }}>
          RGMCET Email Address
        </label>
        <input
          id="student-email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="student@rgmcet.edu.in"
          required
          autoComplete="email"
          className="cv-input"
        />
      </div>

      {/* Password */}
      <div className="flex flex-col gap-1.5">
        <label className="label-caps" htmlFor="student-password" style={{ color: '#00595c' }}>
          Password
        </label>
        <div style={{ position: 'relative' }}>
          <input
            id="student-password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Min. 6 characters"
            required
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            className="cv-input"
            style={{ paddingRight: 42 }}
          />
          <button
            type="button"
            onClick={() => setShowPassword(v => !v)}
            style={{
              position: 'absolute', right: 10, top: '50%',
              transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#6e7979', display: 'flex', alignItems: 'center',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              {showPassword ? 'visibility_off' : 'visibility'}
            </span>
          </button>
        </div>
      </div>

      {/* Confirm Password (signup only) */}
      {mode === 'signup' && (
        <div className="flex flex-col gap-1.5">
          <label className="label-caps" htmlFor="student-confirm-password" style={{ color: '#00595c' }}>
            Confirm Password
          </label>
          <input
            id="student-confirm-password"
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            placeholder="Re-enter your password"
            required
            autoComplete="new-password"
            className="cv-input"
          />
        </div>
      )}

      {/* Info notice */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 4px' }}>
        <span className="material-symbols-outlined shrink-0" style={{ color: '#fea619', fontSize: 16, fontVariationSettings: '"FILL" 1', marginTop: 1 }}>info</span>
        <p style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.78rem', lineHeight: 1.5, color: '#3e4949', margin: 0 }}>
          Access is restricted to verified{' '}
          <strong style={{ color: '#00595c' }}>@rgmcet.edu.in</strong> addresses only.
        </p>
      </div>

      {/* Error */}
      {error && (
        <p style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.82rem', color: '#ba1a1a', padding: '0 4px' }}>
          {error}
        </p>
      )}

      {/* Submit */}
      <div className="pt-1">
        <button type="submit" className="btn-amber" disabled={isPending}>
          <span>
            {isPending
              ? (mode === 'signin' ? 'Signing in…' : 'Creating account…')
              : (mode === 'signin' ? 'Sign In' : 'Create Account')}
          </span>
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
            {mode === 'signin' ? 'login' : 'person_add'}
          </span>
        </button>
      </div>
    </form>
  )
}

/* ─── Admin Password Form ────────────────────────────────────────── */
function AdminStep({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    startTransition(async () => {
      const result = await signInWithPasswordAction(email, password)
      if (result?.error) {
        setError(result.error)
      } else {
        router.refresh()
        router.push('/home')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-col gap-1.5">
        <label className="label-caps" htmlFor="admin-email" style={{ color: '#00595c' }}>
          Admin Email
        </label>
        <input
          id="admin-email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="admin@rgmcet.edu.in"
          required
          className="cv-input"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="label-caps" htmlFor="admin-password" style={{ color: '#00595c' }}>
          Password
        </label>
        <input
          id="admin-password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          className="cv-input"
        />
      </div>

      {error && (
        <p style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.82rem', color: '#ba1a1a', padding: '0 4px' }}>
          {error}
        </p>
      )}

      <div className="pt-1">
        <button type="submit" className="btn-amber" disabled={isPending}>
          <span>{isPending ? 'Authenticating…' : 'Log In Securely'}</span>
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>lock</span>
        </button>
      </div>

      <div className="text-center">
        <button
          type="button"
          onClick={onBack}
          className="label-caps underline decoration-2 underline-offset-4 transition-colors mt-2"
          style={{ color: '#6e7979', background: 'none', border: 'none', cursor: 'pointer' }}
          onMouseOver={e => (e.currentTarget.style.color = '#00595c')}
          onMouseOut={e => (e.currentTarget.style.color = '#6e7979')}
        >
          ← Back to student login
        </button>
      </div>
    </form>
  )
}

/* ─── Page ───────────────────────────────────────────────────────── */
export default function VerifyPage() {
  const [mode, setMode] = useState<'student' | 'admin'>('student')

  const headline = mode === 'admin'
    ? <><span>Admin</span><br />Portal.</>
    : <><span>Welcome to</span><br />CampusVault.</>

  const subtitle = mode === 'admin'
    ? 'Log in with your administrator credentials.'
    : 'Sign in or create your RGMCET student account.'

  return (
    <main
      className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden"
      style={{ backgroundColor: '#fbf9f4' }}
    >
      <DoodleCircle />
      <DoodleCurve />

      <div className="w-full max-w-sm relative z-10">

        {/* Back card stack layers */}
        <div className="absolute inset-0 top-0" style={{ background: '#dbdad5', border: '2px solid #9aadad', transform: 'rotate(4deg) translate(3px,3px)', borderRadius: 2 }} />
        <div className="absolute inset-0 top-0" style={{ background: '#e4e2dd', border: '2px solid #b0bcbc', transform: 'rotate(2deg) translate(1.5px,1.5px)', borderRadius: 2 }} />

        {/* Foreground pinned card */}
        <div
          style={{
            background: '#fbf9f4',
            border: '2px solid #00595c',
            boxShadow: '8px 8px 0 0 #00595c',
            transform: 'rotate(-1deg)',
            transition: 'transform 0.3s ease',
            borderRadius: 2,
            position: 'relative',
          }}
          onMouseEnter={e => (e.currentTarget.style.transform = 'rotate(0deg)')}
          onMouseLeave={e => (e.currentTarget.style.transform = 'rotate(-1deg)')}
        >
          {/* Teal header strip */}
          <div style={{ height: 8, background: '#00595c', borderRadius: '2px 2px 0 0' }} />

          {/* Pin graphic */}
          <div style={{
            position: 'absolute', top: -16, left: '50%',
            transform: 'translateX(-50%)',
            width: 32, height: 32, borderRadius: '50%',
            background: '#fea619', border: '2px solid #00595c',
            boxShadow: '2px 2px 0 0 #00595c',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 20,
          }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#00595c', opacity: 0.6 }} />
          </div>

          {/* Content */}
          <div style={{ padding: '40px 32px 32px' }}>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <h1 style={{
                fontFamily: 'var(--font-newsreader)',
                fontWeight: 800,
                fontSize: '2.6rem',
                lineHeight: 1.1,
                letterSpacing: '-0.02em',
                color: '#00595c',
                marginBottom: 12,
              }}>
                {headline}
              </h1>
              <p style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.9rem', lineHeight: 1.6, color: '#3e4949' }}>
                {subtitle}
              </p>
            </div>

            {mode === 'student' ? (
              <StudentAuthForm />
            ) : (
              <AdminStep onBack={() => setMode('student')} />
            )}

            {/* Admin link — only on student mode */}
            {mode === 'student' && (
              <div style={{ textAlign: 'center', marginTop: 20, paddingTop: 16, borderTop: '1px dashed #bec9c9' }}>
                <button
                  onClick={() => setMode('admin')}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontFamily: 'var(--font-jakarta)', fontSize: '0.8rem',
                    color: '#6e7979', letterSpacing: '0.02em', transition: 'color 0.2s',
                  }}
                  onMouseOver={e => (e.currentTarget.style.color = '#00595c')}
                  onMouseOut={e => (e.currentTarget.style.color = '#6e7979')}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: 'middle', marginRight: 4 }}>admin_panel_settings</span>
                  Administrator?{' '}
                  <span style={{ textDecoration: 'underline', fontWeight: 600 }}>Sign in here</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
