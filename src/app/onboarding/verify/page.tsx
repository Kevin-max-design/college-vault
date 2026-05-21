'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { verifyOtpAction, sendOtpAction, signInWithPasswordAction } from './actions'

/* ─────────────────────────────────────────────────────────────── */
/*  Decorative SVGs                                                */
/* ─────────────────────────────────────────────────────────────── */
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

/* ─────────────────────────────────────────────────────────────── */
/*  Student Email Step                                             */
/* ─────────────────────────────────────────────────────────────── */
function EmailStep({ onOtpSent }: { onOtpSent: (email: string) => void }) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const emailLower = email.toLowerCase().trim()
    if (!emailLower.endsWith('@rgmcet.edu.in') && !emailLower.endsWith('.rgmcet.edu.in')) {
      setError('Only official RGMCET institutional email addresses (@rgmcet.edu.in) are allowed.')
      return
    }

    startTransition(async () => {
      const result = await sendOtpAction(emailLower)
      if (result?.error) {
        setError(result.error)
      } else {
        onOtpSent(emailLower)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex flex-col gap-1.5">
        <label className="label-caps" htmlFor="college-email" style={{ color: '#00595c' }}>
          RGMCET Email Address
        </label>

        <input
          id="college-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="student@rgmcet.edu.in"
          required
          className="cv-input"
        />

        <div className="flex items-start gap-2 mt-1 px-1">
          <span className="material-symbols-outlined shrink-0 mt-0.5" style={{ color: '#fea619', fontSize: 18, fontVariationSettings: '"FILL" 1' }}>info</span>
          <p className="text-sm leading-snug" style={{ color: '#3e4949', fontFamily: 'var(--font-jakarta)' }}>
            Student access is strictly limited to verified{' '}
            <strong style={{ color: '#00595c', fontWeight: 700 }}>@rgmcet.edu.in</strong> email addresses.
          </p>
        </div>

        {error && (
          <p className="text-sm px-1" style={{ color: '#ba1a1a', fontFamily: 'var(--font-jakarta)' }}>
            {error}
          </p>
        )}
      </div>

      <div className="pt-3">
        <button type="submit" className="btn-amber" disabled={isPending}>
          <span>{isPending ? 'Sending…' : 'Log In / Sign Up'}</span>
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>send</span>
        </button>
      </div>
    </form>
  )
}

/* ─────────────────────────────────────────────────────────────── */
/*  Student OTP Step                                               */
/* ─────────────────────────────────────────────────────────────── */
function OtpStep({ email, onBack }: { email: string; onBack: () => void }) {
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [resent, setResent] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [isResending, startResendTransition] = useTransition()
  const router = useRouter()

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    startTransition(async () => {
      const result = await verifyOtpAction(email, otp)
      if (result.error) {
        setError(result.error)
        return
      }
      router.refresh()
      router.push('/onboarding/profile')
    })
  }

  async function handleResend() {
    setError('')
    setResent(false)
    startResendTransition(async () => {
      const result = await sendOtpAction(email)
      if (result?.error) {
        setError(result.error)
      } else {
        setResent(true)
        setOtp('')
      }
    })
  }

  return (
    <form onSubmit={handleVerify} className="space-y-5">
      <p className="text-sm leading-relaxed" style={{ color: '#3e4949', fontFamily: 'var(--font-jakarta)' }}>
        We sent a code to <strong style={{ color: '#00595c' }}>{email}</strong>. Enter it below.
      </p>

      <div className="flex flex-col gap-1.5">
        <label className="label-caps" htmlFor="otp" style={{ color: '#00595c' }}>
          One-Time Password
        </label>
        <input
          id="otp"
          type="text"
          inputMode="numeric"
          maxLength={8}
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
          placeholder="••••••••"
          required
          className="cv-input text-center"
          style={{ fontSize: '1.5rem', letterSpacing: '0.4em', fontFamily: 'var(--font-newsreader)', fontWeight: 700 }}
          autoFocus
        />

        {error && (
          <div style={{ marginTop: 4 }}>
            <p className="text-sm px-1" style={{ color: '#ba1a1a', fontFamily: 'var(--font-jakarta)', marginBottom: 8 }}>
              {error}
            </p>
            <button
              type="button"
              onClick={handleResend}
              disabled={isResending}
              style={{
                fontFamily: 'var(--font-jakarta)', fontSize: '0.75rem', fontWeight: 700,
                letterSpacing: '0.06em', textTransform: 'uppercase',
                color: '#00595c', background: 'none', border: 'none',
                cursor: 'pointer', textDecoration: 'underline', padding: '2px 4px',
              }}
            >
              {isResending ? 'Sending…' : 'Resend new code →'}
            </button>
          </div>
        )}

        {resent && (
          <p className="text-sm px-1" style={{ color: '#00595c', fontFamily: 'var(--font-jakarta)', marginTop: 4 }}>
            ✓ New code sent — check your inbox.
          </p>
        )}

        {process.env.NODE_ENV === 'development' && (
          <p style={{
            marginTop: 8, padding: '6px 10px',
            background: '#ffddb8', border: '1px solid #855300',
            fontFamily: 'var(--font-jakarta)', fontSize: '0.72rem', color: '#2a1700', lineHeight: 1.5,
          }}>
            <strong>Dev mode:</strong> enter <code style={{ background: '#fea619', padding: '1px 4px' }}>000000</code> to bypass OTP emails
          </p>
        )}
      </div>

      <div className="pt-3">
        <button type="submit" className="btn-amber" disabled={isPending}>
          <span>{isPending ? 'Verifying…' : 'Verify & Continue'}</span>
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>verified</span>
        </button>
      </div>

      <div className="text-center">
        <button
          type="button"
          onClick={onBack}
          className="label-caps underline decoration-2 underline-offset-4 transition-colors mt-2"
          style={{ color: '#6e7979', background: 'none', border: 'none', cursor: 'pointer' }}
          onMouseOver={(e) => (e.currentTarget.style.color = '#00595c')}
          onMouseOut={(e) => (e.currentTarget.style.color = '#6e7979')}
        >
          ← Use a different email
        </button>
      </div>
    </form>
  )
}

/* ─────────────────────────────────────────────────────────────── */
/*  Admin Password Step                                            */
/* ─────────────────────────────────────────────────────────────── */
function AdminStep({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    startTransition(async () => {
      const result = await signInWithPasswordAction(email, password)
      if (result?.error) {
        setError(result.error)
      } else {
        router.refresh()
        // Admins skip role selection because they're pre-provisioned
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
          onChange={(e) => setEmail(e.target.value)}
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
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          className="cv-input"
        />
      </div>

      {error && (
        <p className="text-sm px-1" style={{ color: '#ba1a1a', fontFamily: 'var(--font-jakarta)' }}>
          {error}
        </p>
      )}

      <div className="pt-3">
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
          onMouseOver={(e) => (e.currentTarget.style.color = '#00595c')}
          onMouseOut={(e) => (e.currentTarget.style.color = '#6e7979')}
        >
          ← Back to student login
        </button>
      </div>
    </form>
  )
}

/* ─────────────────────────────────────────────────────────────── */
/*  Page                                                           */
/* ─────────────────────────────────────────────────────────────── */
export default function VerifyPage() {
  const [mode, setMode] = useState<'student' | 'admin'>('student')
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [sentEmail, setSentEmail] = useState('')

  function handleOtpSent(email: string) {
    setSentEmail(email)
    setStep('otp')
  }

  // Determine headline based on mode and step
  let headline = <>Welcome to<br />CampusVault.</>
  let subtitle = 'Enter your @rgmcet.edu.in email to log in or create your account.'

  if (mode === 'admin') {
    headline = <>Admin<br />Portal.</>
    subtitle = 'Log in with your administrator credentials.'
  } else if (step === 'otp') {
    headline = <>Check your<br />inbox.</>
    subtitle = 'Enter the code we just emailed you.'
  }

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
          style={{ background: '#fbf9f4', border: '2px solid #00595c', boxShadow: '8px 8px 0 0 #00595c', transform: 'rotate(-1deg)', transition: 'transform 0.3s ease', borderRadius: 2, position: 'relative' }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'rotate(0deg)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'rotate(-1deg)')}
        >
          {/* Teal header strip */}
          <div style={{ height: 8, background: '#00595c', borderRadius: '2px 2px 0 0' }} />

          {/* Pin graphic */}
          <div style={{ position: 'absolute', top: -16, left: '50%', transform: 'translateX(-50%)', width: 32, height: 32, borderRadius: '50%', background: '#fea619', border: '2px solid #00595c', boxShadow: '2px 2px 0 0 #00595c', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#00595c', opacity: 0.6 }} />
          </div>

          {/* Content */}
          <div style={{ padding: '40px 32px 32px' }}>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <h1 style={{ fontFamily: 'var(--font-newsreader)', fontWeight: 800, fontSize: '3rem', lineHeight: 1.1, letterSpacing: '-0.02em', color: '#00595c', marginBottom: 16 }}>
                {headline}
              </h1>
              <p style={{ fontFamily: 'var(--font-jakarta)', fontSize: '1rem', lineHeight: 1.6, color: '#3e4949' }}>
                {subtitle}
              </p>
            </div>

            {mode === 'student' ? (
              step === 'email' ? (
                <EmailStep onOtpSent={handleOtpSent} />
              ) : (
                <OtpStep
                  email={sentEmail}
                  onBack={() => setStep('email')}
                />
              )
            ) : (
              <AdminStep onBack={() => { setMode('student'); setStep('email') }} />
            )}

            {/* Subtle admin link — only show on student email step */}
            {mode === 'student' && step === 'email' && (
              <div style={{ textAlign: 'center', marginTop: 24, paddingTop: 16, borderTop: '1px dashed #bec9c9' }}>
                <button
                  onClick={() => setMode('admin')}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-jakarta)',
                    fontSize: '0.8rem',
                    color: '#6e7979',
                    letterSpacing: '0.02em',
                    transition: 'color 0.2s',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.color = '#00595c')}
                  onMouseOut={(e) => (e.currentTarget.style.color = '#6e7979')}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: 'middle', marginRight: 4 }}>admin_panel_settings</span>
                  Administrator? <span style={{ textDecoration: 'underline', fontWeight: 600 }}>Sign in here</span>
                </button>
              </div>
            )}

          </div>
        </div>
      </div>
    </main>
  )
}
