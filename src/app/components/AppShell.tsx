'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React from 'react'

/* ── Bottom nav tabs matching the PNG ───────────────────────────── */
interface NavItem {
  href: string
  label: string
  icon: string
}

const NAV_ITEMS: NavItem[] = [
  { href: '/home',       label: 'Home',    icon: 'home'          },
  { href: '/classrooms', label: 'Class',   icon: 'school'        },
  { href: '/bulletin',   label: 'Social',  icon: 'people'        },
  { href: '/vault',      label: 'Market',  icon: 'storefront'    },
  { href: '/profile',    label: 'Profile', icon: 'person'        },
]

interface AppShellProps {
  children: React.ReactNode
  pageTitle?: string
  userAvatarUrl?: string | null
  userInitials?: string
}

/* ── Palette ────────────────────────────────────────────────────── */
const C = {
  bg:         '#F4EFE6',
  surface:    '#FDFAF5',
  border:     '#E2D9C8',
  olive:      '#2D4A3E',
  oliveHover: '#3D6B5A',
  text:       '#1A1A1A',
  textMuted:  '#7A7A7A',
  white:      '#FFFFFF',
  activeTabBg:'#EAE4D8',
}

export default function AppShell({
  children,
  pageTitle = 'Campus Vault',
  userAvatarUrl,
  userInitials = 'CV',
}: AppShellProps) {
  const pathname = usePathname()

  return (
    <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* ── Top Navbar ───────────────────────────────────────────── */}
      <header style={{
        position: 'fixed',
        top: 0, left: 0, right: 0,
        zIndex: 100,
        background: C.surface,
        borderBottom: `1px solid ${C.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 20px',
        boxShadow: '0 1px 8px rgba(45,74,62,0.06)',
      }}>
        {/* Left: hamburger + wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            aria-label="Menu"
            style={{
              background: 'none', border: 'none',
              color: C.olive, cursor: 'pointer',
              display: 'flex', alignItems: 'center',
              padding: 4, borderRadius: 6,
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = C.activeTabBg)}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>menu</span>
          </button>
          <Link href="/home" style={{ textDecoration: 'none' }}>
            <span style={{
              fontFamily: 'var(--font-newsreader)',
              fontWeight: 800,
              fontSize: '1.15rem',
              color: C.olive,
              letterSpacing: '-0.3px',
            }}>
              Campus Vault
            </span>
          </Link>
        </div>

        {/* Right: bell + avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            aria-label="Notifications"
            style={{
              background: 'none', border: 'none',
              color: C.olive, cursor: 'pointer',
              display: 'flex', alignItems: 'center',
              padding: 6, borderRadius: '50%',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = C.activeTabBg)}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>notifications</span>
          </button>

          <Link
            href="/profile"
            style={{
              width: 34, height: 34,
              borderRadius: '50%',
              background: C.olive,
              border: `2px solid ${C.border}`,
              overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              textDecoration: 'none',
              flexShrink: 0,
              transition: 'border-color 0.15s',
            }}
          >
            {userAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} src={userAvatarUrl} />
            ) : (
              <span style={{
                fontFamily: 'var(--font-jakarta)',
                fontWeight: 700, fontSize: '0.6rem',
                color: C.white, letterSpacing: '0.5px',
              }}>
                {userInitials}
              </span>
            )}
          </Link>
        </div>
      </header>

      {/* ── Page Content ─────────────────────────────────────────── */}
      <div style={{ flex: 1, paddingTop: 58, paddingBottom: 72 }}>
        {children}
      </div>

      {/* ── Bottom Tab Bar ───────────────────────────────────────── */}
      <nav style={{
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        zIndex: 100,
        background: C.surface,
        borderTop: `1px solid ${C.border}`,
        display: 'flex',
        boxShadow: '0 -1px 8px rgba(45,74,62,0.07)',
      }}>
        {NAV_ITEMS.map(item => {
          const isActive = pathname.startsWith(item.href) || (pathname === '/' && item.href === '/home')
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
                padding: '8px 0 6px',
                textDecoration: 'none',
                color: isActive ? C.olive : C.textMuted,
                borderTop: isActive ? `2.5px solid ${C.olive}` : '2.5px solid transparent',
                background: isActive ? C.activeTabBg : 'transparent',
                gap: 2,
                transition: 'all 0.15s',
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize: 22,
                  fontVariationSettings: isActive ? '"FILL" 1' : '"FILL" 0',
                }}
              >
                {item.icon}
              </span>
              <span style={{
                fontFamily: 'var(--font-jakarta)',
                fontSize: '0.58rem',
                fontWeight: 700,
                letterSpacing: '0.8px',
                textTransform: 'uppercase',
              }}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>

    </div>
  )
}
