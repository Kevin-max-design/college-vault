'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import React, { useState, useEffect, useRef, useMemo } from 'react'

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
  type: string
  title: string
  body: string
  time: string
  read: boolean
  link: string
  category?: string
  priority?: string
  source?: string
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

/* ── Category → Icon / Color mapping ──────────────────────────── */
const CATEGORY_ICONS: Record<string, { icon: string; color: string; bg: string }> = {
  principal_announcement: { icon: 'campaign',      color: '#ba1a1a', bg: '#fdf2f2' },
  hod_notice:            { icon: 'shield',        color: '#6a1b9a', bg: '#f3e5f5' },
  faculty_announcement:  { icon: 'school',        color: '#00595c', bg: '#e8f5f5' },
  deadline:              { icon: 'schedule',       color: '#e65100', bg: '#fff3e0' },
  market_message:        { icon: 'mail',           color: '#fea619', bg: '#fffdf5' },
  listing_request:       { icon: 'shopping_bag',   color: '#855300', bg: '#fef5e7' },
  classroom_reply:       { icon: 'forum',          color: '#0d7377', bg: '#eafaf9' },
  material_upload:       { icon: 'upload_file',    color: '#2e7d32', bg: '#e8f5e9' },
  doubt_resolved:        { icon: 'check_circle',   color: '#1b5e20', bg: '#e8f5e9' },
  general:               { icon: 'notifications',  color: '#3e4949', bg: '#f0eee9' },
}

/* Fallback map for old type-based notifications that don't have a category */
const TYPE_TO_CATEGORY: Record<string, string> = {
  message:            'market_message',
  request:            'listing_request',
  resolved:           'doubt_resolved',
  classroom_reply:    'classroom_reply',
  classroom_doubt:    'classroom_reply',
  announcement:       'faculty_announcement',
  material:           'material_upload',
  notice:             'general',
  classroom_post:     'classroom_reply',
  comment_reply:      'classroom_reply',
  project_update:     'general',
  admin_announcement: 'principal_announcement',
  social_update:      'general',
}

function getCategoryIcon(item: NotificationItem) {
  const cat = item.category || TYPE_TO_CATEGORY[item.type] || 'general'
  return CATEGORY_ICONS[cat] || CATEGORY_ICONS.general
}

/* ── Priority accent colors ───────────────────────────────────── */
const PRIORITY_STYLES: Record<string, { border: string; label: string; labelColor: string; labelBg: string }> = {
  urgent: { border: '#d32f2f', label: 'URGENT', labelColor: '#fff', labelBg: '#d32f2f' },
  high:   { border: '#f57c00', label: 'HIGH',   labelColor: '#fff', labelBg: '#f57c00' },
  normal: { border: 'transparent', label: '',   labelColor: '', labelBg: '' },
  low:    { border: 'transparent', label: '',   labelColor: '', labelBg: '' },
}

/* ── Notification filter tabs ─────────────────────────────────── */
type FilterTab = 'all' | 'important' | 'academic' | 'market' | 'classroom'

const FILTER_TABS: { key: FilterTab; label: string; icon: string }[] = [
  { key: 'all',        label: 'All',        icon: 'list' },
  { key: 'important',  label: 'Important',  icon: 'priority_high' },
  { key: 'academic',   label: 'Academic',   icon: 'school' },
  { key: 'market',     label: 'Market',     icon: 'storefront' },
  { key: 'classroom',  label: 'Classroom',  icon: 'forum' },
]

const ACADEMIC_CATEGORIES = new Set(['principal_announcement', 'hod_notice', 'faculty_announcement', 'deadline', 'material_upload'])
const MARKET_CATEGORIES = new Set(['market_message', 'listing_request'])
const CLASSROOM_CATEGORIES = new Set(['classroom_reply', 'material_upload', 'doubt_resolved'])

const DEFAULT_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'n-1',
    type: 'message',
    title: 'New Market Message',
    body: 'u/Maths_Guru_88: "Hey Alex! Is that Engineering Dynamics textbook still available for $45? I can meet you at the library today."',
    time: 'just now',
    read: false,
    link: '/vault?view=inbox',
    category: 'market_message',
    priority: 'normal',
    source: 'market',
  },
  {
    id: 'n-2',
    type: 'classroom_reply',
    title: 'Reply to Your Doubt',
    body: 'u/Frontend_Ninja replied to your doubt in Campus Vault Redesign: "We just replaced it with email/password auth under /onboarding/verify so you do not need OTPs!"',
    time: '5m ago',
    read: false,
    link: '/classrooms/proj-vault-redesign',
    category: 'classroom_reply',
    priority: 'normal',
    source: 'classroom',
  },
  {
    id: 'n-3',
    type: 'notice',
    title: '📢 Principal: Important Announcement',
    body: 'Administrator: "All campus registers have been cleared of legacy OTP entries. Direct student password registrations are now live college-wide!"',
    time: '1h ago',
    read: false,
    link: '/home',
    category: 'principal_announcement',
    priority: 'urgent',
    source: 'principal',
  },
  {
    id: 'n-4',
    type: 'material',
    title: 'New Study Material',
    body: 'New study resource shared in Data Structures: "Dijkstra vs Bellman-Ford comparison chart with examples"',
    time: '2h ago',
    read: true,
    link: '/classrooms',
    category: 'material_upload',
    priority: 'normal',
    source: 'classroom',
  },
  {
    id: 'n-5',
    type: 'request',
    title: 'New Buy Request',
    body: 'u/StudyBuddy_99 requested to buy your listing: "Engineering Dynamics Textbook (Meriam, 9th Ed)"',
    time: '1d ago',
    read: true,
    link: '/vault?view=inbox',
    category: 'listing_request',
    priority: 'high',
    source: 'market',
  },
  {
    id: 'n-6',
    type: 'resolved',
    title: 'Doubt Resolved ✓',
    body: 'Your doubt about Dijkstra\'s algorithm has been marked as resolved by Prof. Kumar.',
    time: '2d ago',
    read: true,
    link: '/classrooms',
    category: 'doubt_resolved',
    priority: 'normal',
    source: 'classroom',
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
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all')
  const [toast, setToast] = useState<NotificationItem | null>(null)
  
  const panelRef = useRef<HTMLDivElement>(null)

  // Web Push Subscription States
  const [pushSupported, setPushSupported] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [subscribing, setSubscribing] = useState(false)

  // Helper to convert base64 VAPID public key
  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const handleSubscribe = async () => {
    if (!pushSupported) return;
    setSubscribing(true);

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert('Notification permission denied. Please allow notifications in your browser settings.');
        setSubscribing(false);
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        throw new Error('VAPID public key is missing in client environment.');
      }

      const convertedVapidKey = urlBase64ToUint8Array(vapidKey);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      });

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription })
      });

      if (!res.ok) {
        throw new Error('Server subscription registration failed.');
      }

      setIsSubscribed(true);
    } catch (err: any) {
      console.error('Push subscription failed:', err);
      alert(`Could not enable push notifications: ${err.message || err}`);
    } finally {
      setSubscribing(false);
    }
  };

  const handleUnsubscribe = async () => {
    if (!pushSupported) return;
    setSubscribing(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint })
        });

        await subscription.unsubscribe();
      }
      setIsSubscribed(false);
    } catch (err: any) {
      console.error('Failed to unsubscribe:', err);
    } finally {
      setSubscribing(false);
    }
  };

  // Initialize and synchronize with LocalStorage + Supabase
  useEffect(() => {
    // Detect iOS and Standalone status
    if (typeof window !== 'undefined') {
      const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      setIsIOS(ios);
      
      const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
      setIsStandalone(!!standalone);

      if ('serviceWorker' in navigator && 'PushManager' in window) {
        setPushSupported(true);
        navigator.serviceWorker.ready.then((registration) => {
          registration.pushManager.getSubscription().then((subscription) => {
            setIsSubscribed(!!subscription);
          });
        });
      }
    }

    // 1. Immediate fallback to LocalStorage cache
    const stored = localStorage.getItem('cv_notifications')
    if (stored) {
      try {
        setNotifications(JSON.parse(stored))
      } catch {
        setNotifications([])
      }
    }

    // 2. Fetch function to get fresh notifications from Supabase
    const fetchFreshNotifications = () => {
      fetch('/api/notifications')
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data && Array.isArray(data.notifications)) {
            setNotifications(data.notifications)
            localStorage.setItem('cv_notifications', JSON.stringify(data.notifications))
          }
        })
        .catch(err => console.error('Failed to sync notifications:', err))
    }

    // Initial load
    fetchFreshNotifications()

    // 3. Periodic Background Sync (Poll every 15 seconds)
    const interval = setInterval(fetchFreshNotifications, 15000)

    return () => clearInterval(interval)
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

  const pushNewNotification = async (item: NotificationItem) => {
    setNotifications(prev => {
      if (prev.some(n => n.body === item.body)) return prev // dedupe
      const updated = [item, ...prev]
      localStorage.setItem('cv_notifications', JSON.stringify(updated))
      return updated
    })
    setToast(item)
    // Clear toast automatically after 5 seconds
    setTimeout(() => setToast(null), 5000)

    // Persist in Supabase
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: item.type,
          title: item.title,
          body: item.body,
          link: item.link
        })
      })
    } catch (e) {
      console.error('Failed to persist notification in Supabase:', e)
    }
  }

  const markAllRead = async () => {
    const previous = notifications
    const updated = notifications.map(n => ({ ...n, read: true }))
    setNotifications(updated)
    localStorage.setItem('cv_notifications', JSON.stringify(updated))

    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })
      if (!res.ok) {
        setNotifications(previous)
        localStorage.setItem('cv_notifications', JSON.stringify(previous))
      }
    } catch (e) {
      setNotifications(previous)
      localStorage.setItem('cv_notifications', JSON.stringify(previous))
      console.error(e)
    }
  }

  const handleNotificationClick = async (item: NotificationItem) => {
    const previous = notifications
    const updated = notifications.map(n => n.id === item.id ? { ...n, read: true } : n)
    setNotifications(updated)
    localStorage.setItem('cv_notifications', JSON.stringify(updated))
    setShowPanel(false)
    router.push(item.link)

    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id })
      })
      if (!res.ok) {
        setNotifications(previous)
        localStorage.setItem('cv_notifications', JSON.stringify(previous))
      }
    } catch (e) {
      setNotifications(previous)
      localStorage.setItem('cv_notifications', JSON.stringify(previous))
      console.error(e)
    }
  }

  const unreadCount = notifications.filter(n => !n.read).length

  // Memoized filtered notifications based on active tab
  const filteredNotifications = useMemo(() => {
    if (activeFilter === 'all') return notifications
    if (activeFilter === 'important') {
      return notifications.filter(n => n.priority === 'urgent' || n.priority === 'high')
    }
    return notifications.filter(n => {
      const cat = n.category || TYPE_TO_CATEGORY[n.type] || 'general'
      if (activeFilter === 'academic') return ACADEMIC_CATEGORIES.has(cat)
      if (activeFilter === 'market') return MARKET_CATEGORIES.has(cat)
      if (activeFilter === 'classroom') return CLASSROOM_CATEGORIES.has(cat)
      return true
    })
  }, [notifications, activeFilter])

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

              {/* ── Filter Tabs ──────────────────────────────────── */}
              <div style={{
                display: 'flex', gap: 0,
                borderBottom: '1.5px solid #bec9c9',
                background: '#faf8f3',
                overflowX: 'auto',
              }}>
                {FILTER_TABS.map(tab => {
                  const isActive = activeFilter === tab.key
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveFilter(tab.key)}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 3,
                        padding: '7px 4px',
                        background: 'none',
                        border: 'none',
                        borderBottom: isActive ? '2.5px solid #00595c' : '2.5px solid transparent',
                        color: isActive ? '#00595c' : '#7A7A7A',
                        fontFamily: 'var(--font-jakarta)',
                        fontSize: '0.6rem',
                        fontWeight: isActive ? 800 : 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        whiteSpace: 'nowrap',
                        letterSpacing: '0.03em',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 13 }}>{tab.icon}</span>
                      {tab.label}
                    </button>
                  )
                })}
              </div>

              {/* Panel Body */}
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                
                {/* ── Web Push PWA Settings Panel ────────────────── */}
                {pushSupported && (
                  <>
                    {isIOS && !isStandalone ? (
                      <div style={{
                        padding: '12px 14px',
                        background: '#fffdf5',
                        borderBottom: '2px solid #00595c',
                        fontFamily: 'var(--font-jakarta)',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#00595c' }}>phone_iphone</span>
                          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#00595c' }}>Enable iOS Push Alerts</span>
                        </div>
                        <p style={{ fontSize: '0.68rem', margin: 0, color: '#1A1A1A', lineHeight: 1.35 }}>
                          Add Campus Vault to Home Screen, open it from Home Screen, then enable notifications.
                        </p>
                      </div>
                    ) : !isSubscribed ? (
                      <div style={{
                        padding: '12px 14px',
                        background: '#fffdf5',
                        borderBottom: '2px solid #00595c',
                        fontFamily: 'var(--font-jakarta)',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#00595c', display: 'block', marginBottom: 2 }}>
                              Lock Screen Alerts
                            </span>
                            <span style={{ fontSize: '0.65rem', color: '#7A7A7A' }}>
                              Get real-time push alerts outside the app!
                            </span>
                          </div>
                          <button
                            disabled={subscribing}
                            onClick={handleSubscribe}
                            style={{
                              background: '#00595c',
                              border: 'none',
                              color: '#FFFFFF',
                              padding: '6px 12px',
                              fontFamily: 'var(--font-jakarta)',
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              boxShadow: '2px 2px 0 0 #003a3d',
                              transition: 'all 0.1s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.transform = 'translate(-1px, -1px)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                          >
                            {subscribing ? 'Enabling...' : 'Enable'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{
                        padding: '8px 14px',
                        background: '#f8faf9',
                        borderBottom: '1px solid #bec9c9',
                        fontFamily: 'var(--font-jakarta)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#2D4A3E' }}>check_circle</span>
                          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#2D4A3E' }}>Push notifications active</span>
                        </div>
                        <button
                          onClick={handleUnsubscribe}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#7A7A7A',
                            fontFamily: 'var(--font-jakarta)',
                            fontSize: '0.62rem',
                            textDecoration: 'underline',
                            cursor: 'pointer',
                          }}
                        >
                          Opt-out
                        </button>
                      </div>
                    )}
                  </>
                )}
                {filteredNotifications.length === 0 ? (
                  <div style={{ padding: '40px 20px', textAlign: 'center', color: '#6e7979', fontFamily: 'var(--font-jakarta)', fontSize: '0.8rem' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 32, display: 'block', marginBottom: 6 }}>notifications_off</span>
                    {activeFilter === 'all' ? 'All caught up! No notifications.' : `No ${activeFilter} notifications.`}
                  </div>
                ) : (
                  filteredNotifications.map(item => {
                    const cfg = getCategoryIcon(item)
                    const pri = PRIORITY_STYLES[item.priority ?? 'normal'] ?? PRIORITY_STYLES.normal
                    const isUrgentOrHigh = item.priority === 'urgent' || item.priority === 'high'
                    const isLow = item.priority === 'low'
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleNotificationClick(item)}
                        style={{
                          padding: '12px 14px',
                          borderBottom: '1px dashed #bec9c9',
                          borderLeft: isUrgentOrHigh ? `3.5px solid ${pri.border}` : '3.5px solid transparent',
                          background: item.read ? '#ffffff' : (item.priority === 'urgent' ? '#fff8f8' : '#fffdf5'),
                          cursor: 'pointer',
                          display: 'flex', gap: 10,
                          transition: 'background 0.2s',
                          opacity: isLow && item.read ? 0.7 : 1,
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#fcfbf7'}
                        onMouseLeave={e => e.currentTarget.style.background = item.read ? '#ffffff' : (item.priority === 'urgent' ? '#fff8f8' : '#fffdf5')}
                      >
                        {/* Category Icon */}
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
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2, gap: 4 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0, flex: 1 }}>
                              <span style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.72rem', fontWeight: 800, color: item.read ? '#3e4949' : '#00595c', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {item.title}
                              </span>
                              {isUrgentOrHigh && pri.label && (
                                <span style={{
                                  fontSize: '0.5rem',
                                  fontWeight: 900,
                                  fontFamily: 'var(--font-jakarta)',
                                  color: pri.labelColor,
                                  background: pri.labelBg,
                                  padding: '1px 5px',
                                  borderRadius: 3,
                                  letterSpacing: '0.05em',
                                  flexShrink: 0,
                                  lineHeight: 1.5,
                                }}>
                                  {pri.label}
                                </span>
                              )}
                            </div>
                            <span style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.58rem', color: '#6e7979', flexShrink: 0 }}>
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
          
          {(() => {
            const toastCfg = getCategoryIcon(toast)
            const toastPri = PRIORITY_STYLES[toast.priority ?? 'normal'] ?? PRIORITY_STYLES.normal
            return (
              <>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: toastCfg.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: `1.5px solid ${toastCfg.color}`,
                  flexShrink: 0,
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: toastCfg.color }}>
                    {toastCfg.icon}
                  </span>
                </div>
                {toastPri.label && (
                  <div style={{ position: 'absolute', top: -6, right: -6, fontSize: '0.48rem', fontWeight: 900, color: toastPri.labelColor, background: toastPri.labelBg, padding: '1px 5px', borderRadius: 3, letterSpacing: '0.05em', fontFamily: 'var(--font-jakarta)' }}>
                    {toastPri.label}
                  </div>
                )}
              </>
            )
          })()}

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
