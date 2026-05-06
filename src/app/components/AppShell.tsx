'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavItem {
  href: string
  label: string
  icon: string
}

const NAV_ITEMS: NavItem[] = [
  { href: '/bulletin', label: 'Bulletin', icon: 'newspaper' },
  { href: '/classrooms', label: 'Classes', icon: 'school' },
  { href: '/projects', label: 'Projects', icon: 'architecture' },
  { href: '/profile', label: 'Profile', icon: 'person' },
]

interface AppShellProps {
  children: React.ReactNode
  pageTitle?: string
  userAvatarUrl?: string | null
  userInitials?: string
}

export default function AppShell({
  children,
  pageTitle = 'CAMPUSVAULT',
  userAvatarUrl,
  userInitials = 'CV',
}: AppShellProps) {
  const pathname = usePathname()

  return (
    /* Outer: fills viewport, centres the app column */
    <div style={{
      minHeight: '100dvh',
      background: '#f0eee9',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start',
    }}>

      {/* App column — fixed mobile-app width */}
      <div style={{
        width: '100%',
        maxWidth: 430,
        minHeight: '100dvh',
        background: '#fbf9f4',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        boxShadow: '0 0 40px rgba(0,0,0,0.12)',
      }}>

        {/* ── Top App Bar ─────────────────────────────────────── */}
        <header style={{
          background: '#fdfcf8',
          borderBottom: '2px solid #0D7377',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '14px 20px',
          position: 'sticky',
          top: 0,
          zIndex: 50,
          flexShrink: 0,
        }}>
          <span
            className="material-symbols-outlined"
            style={{ color: '#0D7377', fontSize: 24, cursor: 'pointer' }}
          >
            menu
          </span>

          <span style={{
            fontFamily: 'var(--font-newsreader)',
            fontStyle: 'italic',
            fontWeight: 900,
            fontSize: '1.3rem',
            color: '#0D7377',
            textTransform: 'uppercase',
            letterSpacing: '-0.02em',
          }}>
            {pageTitle}
          </span>

          {/* Avatar */}
          <div style={{
            width: 34,
            height: 34,
            borderRadius: '50%',
            border: '2px solid #0D7377',
            overflow: 'hidden',
            background: '#0d7377',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            {userAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={userAvatarUrl}
                alt="Profile"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <span style={{
                fontFamily: 'var(--font-jakarta)',
                fontWeight: 700,
                fontSize: '0.65rem',
                color: '#a2f5f9',
                letterSpacing: '0.04em',
              }}>
                {userInitials}
              </span>
            )}
          </div>
        </header>

        {/* ── Scrollable content ───────────────────────────────── */}
        <main style={{
          flex: 1,
          overflowY: 'auto',
          paddingBottom: 80, /* space for bottom nav */
        }}>
          {children}
        </main>

        {/* ── Bottom Navigation ────────────────────────────────── */}
        <nav style={{
          position: 'sticky',
          bottom: 0,
          left: 0,
          right: 0,
          background: '#fdfcf8',
          borderTop: '2px solid #0D7377',
          display: 'flex',
          zIndex: 50,
          flexShrink: 0,
        }}>
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '10px 4px 12px',
                  textDecoration: 'none',
                  color: isActive ? '#0D7377' : 'rgba(13,115,119,0.45)',
                  background: isActive ? '#FFBF00' : 'transparent',
                  borderLeft: isActive ? '2px solid #0D7377' : '2px solid transparent',
                  borderRight: isActive ? '2px solid #0D7377' : '2px solid transparent',
                  gap: 3,
                  transition: 'background 0.15s',
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: 22,
                    fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0",
                  }}
                >
                  {item.icon}
                </span>
                <span style={{
                  fontFamily: 'var(--font-jakarta)',
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  lineHeight: 1,
                }}>
                  {item.label}
                </span>
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
