'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

interface AdminShellProps {
  children: React.ReactNode
  userRole: string
  userName: string
  department: string
}

const HOD_NAV = [
  { href: '/admin', label: 'Dashboard', icon: 'dashboard' },
  { href: '/admin/users', label: 'Users', icon: 'group' },
  { href: '/admin/classrooms', label: 'Classrooms', icon: 'school' },
  { href: '/admin/posts', label: 'Posts & Doubts', icon: 'forum' },
  { href: '/admin/vault', label: 'Vault Listings', icon: 'storefront' },
  { href: '/admin/bulletin', label: 'Bulletin', icon: 'campaign' },
]

const PRINCIPAL_NAV = [
  { href: '/admin/bulletin', label: 'Post News', icon: 'campaign' },
]

export default function AdminShell({ children, userRole, userName, department }: AdminShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const navItems = userRole === 'principal' ? PRINCIPAL_NAV : HOD_NAV
  const roleLabel = userRole === 'principal' ? 'Principal' : 'HOD'

  async function handleLogout() {
    const { createClient } = await import('@/lib/supabase/client')
    await createClient().auth.signOut()
    router.push('/onboarding/verify')
  }

  const Sidebar = () => (
    <aside style={{
      width: 240, flexShrink: 0, background: '#00595c',
      display: 'flex', flexDirection: 'column',
      borderRight: '1px solid rgba(255,255,255,0.1)',
      minHeight: '100dvh',
    }}>
      {/* Brand */}
      <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ fontFamily: 'var(--font-newsreader)', fontWeight: 800, fontSize: '1.5rem', color: '#fff', letterSpacing: '-0.01em', fontStyle: 'italic' }}>
          CampusVault
        </div>
        <div style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#a2f5f9', marginTop: 2 }}>
          Admin Portal
        </div>
      </div>

      {/* User info */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%', background: '#fea619',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#684000' }}>
              {userRole === 'principal' ? 'admin_panel_settings' : 'account_balance'}
            </span>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '0.8rem', color: '#fff' }}>{userName}</div>
            <div style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.65rem', color: '#a2f5f9', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {roleLabel}{userRole === 'hod' ? ` · ${department}` : ''}
            </div>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, padding: '16px 0', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {navItems.map(item => {
          const isActive = pathname ? (pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))) : false
          return (
            <Link key={item.href} href={item.href} style={{ textDecoration: 'none', margin: '0 12px' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', cursor: 'pointer',
                background: isActive ? 'rgba(255,255,255,0.12)' : 'transparent',
                borderRadius: '6px',
                transition: 'background-color 0.15s',
              }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: isActive ? '#fea619' : '#a2f5f9' }}>
                  {item.icon}
                </span>
                <span style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.8rem', fontWeight: isActive ? 700 : 500, color: isActive ? '#fea619' : '#e0f5f5' }}>
                  {item.label}
                </span>
              </div>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Link href="/classrooms" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, color: '#a2f5f9', fontFamily: 'var(--font-jakarta)', fontSize: '0.75rem', fontWeight: 600 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span>
          Back to App
        </Link>
        <button onClick={handleLogout} style={{
          width: '100%', padding: '10px', background: 'transparent',
          border: '1px solid rgba(255, 138, 128, 0.4)', borderRadius: '6px', color: '#ff8a80',
          fontFamily: 'var(--font-jakarta)', fontSize: '0.7rem', fontWeight: 700,
          textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          transition: 'all 0.15s',
        }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(255, 138, 128, 0.1)';
            e.currentTarget.style.borderColor = '#ff8a80';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.borderColor = 'rgba(255, 138, 128, 0.4)';
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>logout</span>
          Log Out
        </button>
      </div>
    </aside>
  )

  return (
    <div style={{ display: 'flex', minHeight: '100dvh', background: '#f8fafc' }}>
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <>
          <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex: 200 }} />
          <div style={{ position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 201 }}>
            <Sidebar />
          </div>
        </>
      )}

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Mobile top bar */}
        <div className="flex md:hidden" style={{
          background: '#00595c', padding: '0 16px', height: 52,
          alignItems: 'center', justifyContent: 'space-between',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          <button onClick={() => setSidebarOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff' }}>
            <span className="material-symbols-outlined">menu</span>
          </button>
          <span style={{ fontFamily: 'var(--font-newsreader)', fontWeight: 800, fontSize: '1.1rem', color: '#fff', fontStyle: 'italic' }}>
            Admin Portal
          </span>
          <div style={{ width: 32 }} />
        </div>

        <main style={{ flex: 1, overflowY: 'auto', maxWidth: 1100, width: '100%', padding: '32px 28px', margin: '0 auto' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
