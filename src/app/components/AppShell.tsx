'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import React, { useState, useEffect, useRef } from 'react'

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

/* ── Notification Model ─────────────────────────────────────────── */
interface NotificationItem {
  id: string
  type: 'classroom_post' | 'comment_reply' | 'message' | 'project_update' | 'admin_announcement' | 'social_update'
  title: string
  body: string
  time: string
  read: boolean
  link: string
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

const NOTIFICATION_ICONS: Record<NotificationItem['type'], { icon: string; color: string; bg: string }> = {
  classroom_post:     { icon: 'school', color: '#00595c', bg: '#e8f5f5' },
  comment_reply:      { icon: 'forum', color: '#855300', bg: '#fef5e7' },
  message:            { icon: 'mail', color: '#fea619', bg: '#fffdf5' },
  project_update:     { icon: 'rocket_launch', color: '#0d7377', bg: '#eafaf9' },
  admin_announcement: { icon: 'campaign', color: '#ba1a1a', bg: '#fdf2f2' },
  social_update:      { icon: 'diversity_3', color: '#3e4949', bg: '#f0eee9' },
}

const DEFAULT_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'n-1',
    type: 'message',
    title: 'Personal Message',
    body: 'u/Maths_Guru_88: "Hey Alex! Is that Engineering Dynamics textbook still available for $45? I can meet you at the library today."',
    time: 'just now',
    read: false,
    link: '/vault',
  },
  {
    id: 'n-2',
    type: 'comment_reply',
    title: 'Reply to Comment',
    body: 'u/Frontend_Ninja replied to your thread in Campus Vault Redesign: "We just replaced it with email/password auth under /onboarding/verify so you do not need OTPs!"',
    time: '5m ago',
    read: false,
    link: '/classrooms/proj-vault-redesign',
  },
  {
    id: 'n-3',
    type: 'admin_announcement',
    title: 'Admin Announcement',
    body: 'Administrator: "All campus registers have been cleared of legacy OTP entries. Direct student password registrations are now live college-wide!"',
    time: '1h ago',
    read: false,
    link: '/home',
  },
  {
    id: 'n-4',
    type: 'project_update',
    title: 'Project Update',
    body: 'Campus Vault Redesign: "Lead Architect u/Lead_Architect_99 enabled dynamic imports & route-splitting for all router views."',
    time: '2h ago',
    read: true,
    link: '/classrooms/proj-vault-redesign',
  },
  {
    id: 'n-5',
    type: 'classroom_post',
    title: 'New Classroom Post',
    body: 'New doubt in Data Structures & Algorithms: "How does Dijkstra\'s algorithm handle negative weights? Is Bellman-Ford required?"',
    time: '1d ago',
    read: true,
    link: '/classrooms',
  },
  {
    id: 'n-6',
    type: 'social_update',
    title: 'Social Feed Update',
    body: 'Social: "Your post about the Precision Caliper Set has received 15 new upvotes and is now trending!"',
    time: '2d ago',
    read: true,
    link: '/bulletin',
  }
]

interface AppShellProps {
  children: React.ReactNode
  pageTitle?: string
  userAvatarUrl?: string | null
  userInitials?: string
}

function AvatarImage({ src, initials }: { src?: string | null; initials?: string }) {
  const [imageFailed, setImageFailed] = useState(false)

  useEffect(() => {
    setImageFailed(false)
  }, [src])

  if (src && src.trim() !== '' && !imageFailed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        alt="Profile"
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        src={src}
        onError={() => setImageFailed(true)}
      />
    )
  }

  return (
    <span style={{
      fontFamily: 'var(--font-jakarta)',
      fontWeight: 700, fontSize: '0.6rem',
      color: '#FFFFFF', letterSpacing: '0.5px',
    }}>
      {initials || 'U'}
    </span>
  )
}

export default function AppShell({
  children,
  pageTitle = 'Campus Vault',
  userAvatarUrl,
  userInitials = 'U',
}: AppShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [showPanel, setShowPanel] = useState(false)
  const [toast, setToast] = useState<NotificationItem | null>(null)
  
  const panelRef = useRef<HTMLDivElement>(null)

  // Initialize and synchronize with LocalStorage
  useEffect(() => {
    const stored = localStorage.getItem('cv_notifications')
    if (stored) {
      try {
        setNotifications(JSON.parse(stored))
      } catch {
        setNotifications(DEFAULT_NOTIFICATIONS)
      }
    } else {
      setNotifications(DEFAULT_NOTIFICATIONS)
      localStorage.setItem('cv_notifications', JSON.stringify(DEFAULT_NOTIFICATIONS))
    }
  }, [])

  // Auto-close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setShowPanel(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Dynamic simulation of real-time incoming classmate updates
  useEffect(() => {
    // 1st simulated update: a live personal message after 12 seconds
    const timer1 = setTimeout(() => {
      const pm: NotificationItem = {
        id: 'sim-' + Date.now(),
        type: 'message',
        title: 'New Personal Message',
        body: 'u/Theory_Scholar: "Hey, do you want to join our study group at the library? We are working on discrete math."',
        time: 'just now',
        read: false,
        link: '/vault',
      }
      pushNewNotification(pm)
    }, 12000)

    // 2nd simulated update: a new classroom doubt in project classrooms after 35 seconds
    const timer2 = setTimeout(() => {
      const dbPost: NotificationItem = {
        id: 'sim-' + (Date.now() + 1),
        type: 'classroom_post',
        title: 'New Classroom Post',
        body: 'u/Curious_Neural_Net posted a new doubt in ML Fundamentals: "ReLU vs Leaky ReLU convergence speed."',
        time: 'just now',
        read: false,
        link: '/classrooms/proj-ml-fundamentals',
      }
      pushNewNotification(dbPost)
    }, 35000)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
    }
  }, [])

  const pushNewNotification = (item: NotificationItem) => {
    setNotifications(prev => {
      if (prev.some(n => n.body === item.body)) return prev // dedupe
      const updated = [item, ...prev]
      localStorage.setItem('cv_notifications', JSON.stringify(updated))
      return updated
    })
    setToast(item)
    // Clear toast automatically after 5 seconds
    setTimeout(() => setToast(null), 5000)
  }

  const markAllRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }))
    setNotifications(updated)
    localStorage.setItem('cv_notifications', JSON.stringify(updated))
  }

  const handleNotificationClick = (item: NotificationItem) => {
    const updated = notifications.map(n => n.id === item.id ? { ...n, read: true } : n)
    setNotifications(updated)
    localStorage.setItem('cv_notifications', JSON.stringify(updated))
    setShowPanel(false)
    router.push(item.link)
  }

  const unreadCount = notifications.filter(n => !n.read).length

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative' }}>
          
          {/* Notifications Bell */}
          <button
            aria-label="Notifications"
            onClick={() => setShowPanel(p => !p)}
            style={{
              background: 'none', border: 'none',
              color: C.olive, cursor: 'pointer',
              display: 'flex', alignItems: 'center',
              padding: 6, borderRadius: '50%',
              transition: 'background 0.15s',
              position: 'relative',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = C.activeTabBg)}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>notifications</span>
            
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: 3, right: 3,
                width: 9, height: 9, borderRadius: '50%',
                background: '#ba1a1a', border: `1.5px solid ${C.surface}`,
              }} />
            )}
          </button>

          {/* ── Premium Notifications Panel ───────────────────────── */}
          {showPanel && (
            <div
              ref={panelRef}
              style={{
                position: 'absolute', top: 46, right: 0,
                width: 320, maxHeight: 420,
                background: '#ffffff',
                border: '2px solid #00595c',
                boxShadow: '4px 4px 0 0 #00595c',
                display: 'flex', flexDirection: 'column',
                zIndex: 150,
                animation: 'panelSlide 0.18s ease-out',
              }}
            >
              <style>{`
                @keyframes panelSlide {
                  from { opacity: 0; transform: translateY(-5px); }
                  to { opacity: 1; transform: translateY(0); }
                }
              `}</style>

              {/* Panel Header */}
              <div style={{
                padding: '12px 14px', borderBottom: '2px solid #00595c',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: '#fbf9f4',
              }}>
                <span style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.72rem', fontWeight: 800, color: '#00595c', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Notifications ({unreadCount} new)
                </span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    style={{
                      background: 'none', border: 'none', color: '#6e7979',
                      fontFamily: 'var(--font-jakarta)', fontSize: '0.65rem',
                      fontWeight: 700, textDecoration: 'underline', cursor: 'pointer',
                    }}
                  >
                    Mark read
                  </button>
                )}
              </div>

              {/* Panel Body */}
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '40px 20px', textAlign: 'center', color: '#6e7979', fontFamily: 'var(--font-jakarta)', fontSize: '0.8rem' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 32, display: 'block', marginBottom: 6 }}>notifications_off</span>
                    All caught up! No notifications.
                  </div>
                ) : (
                  notifications.map(item => {
                    const cfg = NOTIFICATION_ICONS[item.type] ?? NOTIFICATION_ICONS.social_update
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleNotificationClick(item)}
                        style={{
                          padding: '12px 14px',
                          borderBottom: '1px dashed #bec9c9',
                          background: item.read ? '#ffffff' : '#fffdf5',
                          cursor: 'pointer',
                          display: 'flex', gap: 10,
                          transition: 'background 0.2s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#fcfbf7'}
                        onMouseLeave={e => e.currentTarget.style.background = item.read ? '#ffffff' : '#fffdf5'}
                      >
                        {/* Icon */}
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%',
                          background: cfg.bg, display: 'flex', alignItems: 'center',
                          justifyContent: 'center', flexShrink: 0,
                          border: `1.5px solid ${cfg.color}`,
                        }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 16, color: cfg.color }}>{cfg.icon}</span>
                        </div>

                        {/* Text details */}
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 }}>
                            <span style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.72rem', fontWeight: 800, color: item.read ? '#3e4949' : '#00595c' }}>
                              {item.title}
                            </span>
                            <span style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.58rem', color: '#6e7979' }}>
                              {item.time}
                            </span>
                          </div>
                          <p style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.75rem', lineHeight: 1.4, color: item.read ? '#6e7979' : '#1b1c19', margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {item.body}
                          </p>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}

          {/* User Profile Avatar */}
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
            <AvatarImage src={userAvatarUrl} initials={userInitials} />
          </Link>
        </div>
      </header>

      {/* ── Premium Realtime Slide-in Toast Alert ────────────────── */}
      {toast && (
        <div
          onClick={() => {
            router.push(toast.link)
            setToast(null)
          }}
          style={{
            position: 'fixed', top: 70, right: 20,
            width: 300, background: '#ffffff',
            border: '2px solid #00595c',
            boxShadow: '6px 6px 0 0 #00595c',
            padding: '12px 14px',
            display: 'flex', gap: 10,
            zIndex: 999,
            cursor: 'pointer',
            animation: 'toastSlide 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          }}
        >
          <style>{`
            @keyframes toastSlide {
              from { opacity: 0; transform: translateX(120%); }
              to { opacity: 1; transform: translateX(0); }
            }
          `}</style>
          
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: NOTIFICATION_ICONS[toast.type].bg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: `1.5px solid ${NOTIFICATION_ICONS[toast.type].color}`,
            flexShrink: 0,
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: NOTIFICATION_ICONS[toast.type].color }}>
              {NOTIFICATION_ICONS[toast.type].icon}
            </span>
          </div>

          <div style={{ flex: 1 }}>
            <span style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.72rem', fontWeight: 800, color: '#00595c', display: 'block', marginBottom: 2 }}>
              {toast.title}
            </span>
            <p style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.72rem', color: '#1b1c19', margin: 0, lineHeight: 1.4 }}>
              {toast.body}
            </p>
          </div>
        </div>
      )}

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
                transition: 'color 0.15s, border-top-color 0.15s, background-color 0.15s',
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
