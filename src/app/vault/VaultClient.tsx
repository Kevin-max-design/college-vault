'use client'

import React, { useState, useMemo, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { ClientCache } from '@/utils/cache'
import { createClient } from '@/utils/supabase/client'

const MarketChatDrawer = dynamic(() => import('@/app/components/MarketChatDrawer'), {
  ssr: false,
})

interface Seller {
  id: string
  full_name: string
  avatar_url: string | null
  department: string | null
}

interface Listing {
  id: string
  seller_id: string
  title: string
  description: string
  price: number
  type: 'buy' | 'rent'
  category: 'books' | 'electronics' | 'lab' | 'clothing' | 'other'
  status: 'available' | 'sold' | 'rented'
  images: string[]
  created_at: string
  seller?: Seller
}

interface ProjectsClientProps {
  currentUser: {
    id: string
    email: string
  }
  initialListings: Listing[]
}

const CATEGORIES = ['all', 'books', 'electronics', 'lab', 'clothing', 'other'] as const
const TYPES = ['all', 'buy', 'rent'] as const

export default function VaultClient({ currentUser, initialListings }: ProjectsClientProps) {
  // Stateful SWR caching of market listings
  const [listings, setListings] = useState<Listing[]>(() => {
    const cached = ClientCache.get<Listing[]>('market_listings')
    return cached || initialListings
  })

  useEffect(() => {
    // Seed and sync background cache
    ClientCache.set('market_listings', initialListings)
    setListings(initialListings)
  }, [initialListings])

  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [activeType, setActiveType] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchVal, setSearchVal] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // State for real conversations & inbox
  const [view, setView] = useState<'browse' | 'inbox'>('browse')
  const [conversations, setConversations] = useState<any[]>([])
  const [userProfile, setUserProfile] = useState<{ full_name: string; avatar_url: string | null } | null>(null)
  const [isInboxLoading, setIsInboxLoading] = useState(false)
  const [activeChat, setActiveChat] = useState<{ conversationId: string; recipientName: string; listingTitle: string } | null>(null)
  
  // Phase 9 & Phase 11 persistent states
  const [savedListings, setSavedListings] = useState<string[]>([])
  const [requestedListings, setRequestedListings] = useState<string[]>([])
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Phase 11 LocalStorage and Supabase DB sync
  useEffect(() => {
    try {
      const saved = localStorage.getItem("savedListings")
      if (saved) setSavedListings(JSON.parse(saved))
      const requested = localStorage.getItem("requestedListings")
      if (requested) setRequestedListings(JSON.parse(requested))
    } catch (e) {
      console.error(e)
    }

    // Persist real bookmarks in Supabase
    fetch("/api/listings/saved")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.savedIds) {
          setSavedListings(data.savedIds)
          localStorage.setItem("savedListings", JSON.stringify(data.savedIds))
        }
      })
      .catch(() => {})

    // Persist real buy/rent requests in Supabase
    fetch("/api/listings/requested")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.requestedIds) {
          setRequestedListings(data.requestedIds)
          localStorage.setItem("requestedListings", JSON.stringify(data.requestedIds))
        }
      })
      .catch(() => {})
  }, [])

  // Fetch current user's profile on mount
  useEffect(() => {
    fetch('/api/profile')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) setUserProfile(data)
      })
      .catch(err => console.error(err))
  }, [])

  // Fetch conversations function
  const fetchConversations = useCallback(async () => {
    setIsInboxLoading(true)
    try {
      const res = await fetch('/api/conversations')
      if (res.ok) {
        const data = await res.json()
        setConversations(data.conversations || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsInboxLoading(false)
    }
  }, [])

  // Fetch conversations when view changes to inbox
  useEffect(() => {
    if (view === 'inbox') {
      fetchConversations()
    }
  }, [view, fetchConversations])

  // Real-time conversations sync
  useEffect(() => {
    const supabaseClient = createClient()
    const channel = supabaseClient
      .channel('realtime-conversations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations'
        },
        async (payload) => {
          const newConv = (payload.new || payload.old) as any
          if (newConv && (newConv.buyer_id === currentUser.id || newConv.seller_id === currentUser.id)) {
            fetchConversations()
          }
        }
      )
      .subscribe()

    return () => {
      supabaseClient.removeChannel(channel)
    }
  }, [currentUser.id, fetchConversations])

  // Optimistic Bookmark Save Toggle
  const handleToggleSave = useCallback(async (listing: Listing) => {
    const isCurrentlySaved = savedListings.includes(listing.id)
    const previousSavedListings = savedListings

    // Step 1: Save previous state
    // Step 2: Update UI instantly
    const newSaved = isCurrentlySaved
      ? savedListings.filter(id => id !== listing.id)
      : [...savedListings, listing.id]
    
    setSavedListings(newSaved)
    localStorage.setItem("savedListings", JSON.stringify(newSaved))
    
    setToast({
      type: 'success',
      message: isCurrentlySaved ? 'Listing removed from saved.' : 'Listing saved to bookmarks!'
    })
    const t = setTimeout(() => setToast(null), 3000)

    try {
      // Step 3: Send API request
      const res = await fetch(`/api/listings/${listing.id}/save`, {
        method: isCurrentlySaved ? 'DELETE' : 'POST'
      })
      if (!res.ok) {
        // Step 5: Rollback on error
        setSavedListings(previousSavedListings)
        localStorage.setItem("savedListings", JSON.stringify(previousSavedListings))
        const err = await res.json().catch(() => ({}))
        setToast({ type: 'error', message: err.error || 'Failed to update saved status.' })
        setTimeout(() => setToast(null), 4000)
      }
    } catch (err: any) {
      // Step 5: Rollback on connection loss
      setSavedListings(previousSavedListings)
      localStorage.setItem("savedListings", JSON.stringify(previousSavedListings))
      setToast({ type: 'error', message: err.message || 'Network error — failed to update saved status.' })
      setTimeout(() => setToast(null), 4000)
    }
  }, [savedListings])

  // Optimistic Rent/Buy request
  const handleRentBuyRequest = useCallback(async (listing: Listing) => {
    if (listing.seller_id === currentUser.id) {
      setToast({ type: 'error', message: 'You cannot submit a request for your own listing!' })
      setTimeout(() => setToast(null), 4000)
      return
    }

    if (requestedListings.includes(listing.id)) {
      setToast({ type: 'error', message: 'You have already requested this listing!' })
      setTimeout(() => setToast(null), 4000)
      return
    }

    const previousRequested = requestedListings

    // Step 1: Save previous state
    // Step 2: Update UI instantly
    const newRequested = [...requestedListings, listing.id]
    setRequestedListings(newRequested)
    localStorage.setItem("requestedListings", JSON.stringify(newRequested))

    setToast({ type: 'success', message: `Submitted request to ${listing.type} instantly!` })
    setTimeout(() => setToast(null), 3000)

    try {
      // Step 3: Send API request
      const res = await fetch(`/api/listings/${listing.id}/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_type: listing.type })
      })
      if (!res.ok) {
        // Step 5: Rollback on failure
        setRequestedListings(previousRequested)
        localStorage.setItem("requestedListings", JSON.stringify(previousRequested))
        const err = await res.json().catch(() => ({}))
        setToast({ type: 'error', message: err.error || 'Failed to submit request.' })
        setTimeout(() => setToast(null), 4000)
      } else {
        const data = await res.json()
        if (data.conversation_id) {
          const otherUser = listing.seller?.full_name || 'Seller'
          setActiveChat({
            conversationId: data.conversation_id,
            recipientName: otherUser,
            listingTitle: listing.title
          })
          setView('inbox')
        }
      }
    } catch (err: any) {
      // Step 5: Rollback on connection loss
      setRequestedListings(previousRequested)
      localStorage.setItem("requestedListings", JSON.stringify(previousRequested))
      setToast({ type: 'error', message: err.message || 'Network error — failed to submit request.' })
      setTimeout(() => setToast(null), 4000)
    }
  }, [currentUser.id, requestedListings])

  // Stable handler to message listing seller, preventing cards from re-rendering
  const handleMessageSeller = useCallback(async (listing: Listing) => {
    if (listing.seller_id === currentUser.id) {
      setToast({ type: 'error', message: 'You cannot message your own listing.' })
      setTimeout(() => setToast(null), 4000)
      return
    }

    const initialBody = `Hi! I'm interested in your listing: "${listing.title}"`

    try {
      const res = await fetch('/api/conversations/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listing_id: listing.id,
          body: initialBody,
          request_type: 'message'
        }),
      })

      if (res.ok) {
        const data = await res.json()
        const otherUser = data.conversation.seller_id === currentUser.id 
          ? data.conversation.buyer?.full_name 
          : data.conversation.seller?.full_name

        setActiveChat({
          conversationId: data.conversation.id,
          recipientName: otherUser || 'Seller',
          listingTitle: listing.title
        })

        setView('inbox')
      } else {
        const err = await res.json().catch(() => ({}))
        setToast({ type: 'error', message: err.error || 'Could not start conversation.' })
        setTimeout(() => setToast(null), 4000)
      }
    } catch {
      setToast({ type: 'error', message: 'Network error — please try again.' })
      setTimeout(() => setToast(null), 4000)
    }
  }, [currentUser.id])

  // Debounce search input to avoid heavy calculations on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchVal)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchVal])

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    type: 'buy',
    category: 'books',
  })

  // Memoize filtered listings to avoid repeated filtering on unrelated state updates
  const filteredListings = useMemo(() => {
    return listings.filter((listing) => {
      if (activeCategory !== 'all' && listing.category !== activeCategory) return false
      if (activeType !== 'all' && listing.type !== activeType) return false
      if (searchQuery && !listing.title.toLowerCase().includes(searchQuery.toLowerCase())) return false
      return true
    })
  }, [listings, activeCategory, activeType, searchQuery])

  async function handlePostListing(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.title || !formData.price) return

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          price: parseFloat(formData.price),
        }),
      })

      if (res.ok) {
        const newListing = await res.json()
        const updated = [newListing, ...listings]
        setListings(updated)
        ClientCache.set('market_listings', updated)
        setIsModalOpen(false)
        setFormData({ title: '', description: '', price: '', type: 'buy', category: 'books' })
        // Show success toast
        setToast({ type: 'success', message: 'Listing posted successfully!' })
        setTimeout(() => setToast(null), 3000)
      } else {
        const error = await res.json()
        setToast({ type: 'error', message: error.error || 'Failed to post listing' })
        setTimeout(() => setToast(null), 4000)
      }
    } catch (err) {
      alert('An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative min-h-screen">
      {/* ── Premium Neobrutalist Toast Alert ────────────────── */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 200,
          background: toast.type === 'success' ? '#00595c' : '#ba1a1a',
          color: '#fff',
          border: '2px solid #002021',
          padding: '12px 20px',
          fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '0.9rem',
          display: 'flex', alignItems: 'center', gap: 8,
          boxShadow: '4px 4px 0 0 #002021',
          animation: 'toastSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
            {toast.type === 'success' ? 'check_circle' : 'error'}
          </span>
          {toast.message}
          <style>{`
            @keyframes toastSlideIn {
              from { transform: translateX(120%); }
              to { transform: translateX(0); }
            }
          `}</style>
        </div>
      )}

      {/* ── Search & Filter Header ───────────────────────────────── */}
      <div className="sticky top-0 z-40" style={{ background: '#fdfcf8', borderBottom: '2px solid #00595c', padding: '16px 20px' }}>
        {/* Neobrutalist View Tabs */}
        <div style={{
          display: 'flex',
          background: '#f0eee9',
          border: '2px solid #00595c',
          boxShadow: '3px 3px 0 0 #00595c',
          marginBottom: view === 'browse' ? 16 : 0,
          borderRadius: 2,
          overflow: 'hidden',
        }}>
          <button
            onClick={() => setView('browse')}
            style={{
              flex: 1,
              padding: '10px 14px',
              fontFamily: 'var(--font-jakarta)',
              fontWeight: 800,
              fontSize: '0.8rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              background: view === 'browse' ? '#00595c' : 'transparent',
              color: view === 'browse' ? '#ffffff' : '#00595c',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            Browse Market
          </button>
          <button
            onClick={() => setView('inbox')}
            style={{
              flex: 1,
              padding: '10px 14px',
              fontFamily: 'var(--font-jakarta)',
              fontWeight: 800,
              fontSize: '0.8rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              background: view === 'inbox' ? '#00595c' : 'transparent',
              color: view === 'inbox' ? '#ffffff' : '#00595c',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            My Inbox
          </button>
        </div>

        {view === 'browse' && (
          <>
            <input
              type="text"
              placeholder="Search textbooks, lab coats, laptops..."
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: '#fbf9f4',
                border: '2px solid #00595c',
                borderRadius: 2,
                fontFamily: 'var(--font-jakarta)',
                fontSize: '0.95rem',
                color: '#1b1c19',
                outline: 'none',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.04)',
                marginBottom: 12,
              }}
            />
            
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide" style={{ margin: '0 -20px', padding: '0 20px' }}>
              {/* Types */}
              <div className="flex gap-2 pr-4" style={{ borderRight: '2px solid #e4e2dd' }}>
                {TYPES.map(type => (
                  <button
                    key={type}
                    onClick={() => setActiveType(type)}
                    className="label-caps"
                    style={{
                      background: activeType === type ? '#fea619' : '#f0eee9',
                      color: activeType === type ? '#684000' : '#3e4949',
                      border: `2px solid ${activeType === type ? '#855300' : 'transparent'}`,
                      padding: '4px 12px',
                      borderRadius: 16,
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    {type}
                  </button>
                ))}
              </div>

              {/* Categories */}
              <div className="flex gap-2 pl-2">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className="label-caps"
                    style={{
                      background: activeCategory === cat ? '#00595c' : '#f0eee9',
                      color: activeCategory === cat ? '#ffffff' : '#3e4949',
                      border: `2px solid ${activeCategory === cat ? '#002021' : 'transparent'}`,
                      padding: '4px 12px',
                      borderRadius: 16,
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Content Area ───────────────────────────────────────── */}
      {view === 'browse' ? (
        <>
          {/* Listings Grid */}
          <div style={{ padding: '20px' }}>
            {filteredListings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6e7979' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 56, marginBottom: 16, opacity: 0.4, display: 'block', color: '#00595c' }}>inventory_2</span>
                <p style={{ fontFamily: 'var(--font-newsreader)', fontSize: '1.4rem', fontWeight: 700, color: '#1b1c19', marginBottom: 8 }}>
                  {listings.length === 0 ? 'Nothing listed yet' : 'No items match your filters'}
                </p>
                <p style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.9rem', color: '#6e7979', marginBottom: 24 }}>
                  {listings.length === 0
                    ? 'Be the first to sell or rent something to your classmates!'
                    : 'Try clearing your filters or searching for something else.'}
                </p>
                {listings.length === 0 && (
                  <button
                    onClick={() => setIsModalOpen(true)}
                    style={{
                      background: '#fea619', color: '#684000',
                      border: '2px solid #855300', padding: '10px 24px',
                      fontFamily: 'var(--font-jakarta)', fontWeight: 700,
                      fontSize: '0.9rem', cursor: 'pointer', borderRadius: 2,
                      boxShadow: '3px 3px 0 0 #855300', display: 'inline-flex',
                      alignItems: 'center', gap: 6,
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add_circle</span>
                    Post Your First Listing
                  </button>
                )}
              </div>
            ) : (
              <div className="grid gap-6">
                {filteredListings.map(listing => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    currentUserId={currentUser.id}
                    onMessage={handleMessageSeller}
                    isSaved={savedListings.includes(listing.id)}
                    isRequested={requestedListings.includes(listing.id)}
                    onToggleSave={handleToggleSave}
                    onRequest={handleRentBuyRequest}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Floating Action Button */}
          <button
            onClick={() => setIsModalOpen(true)}
            style={{
              position: 'fixed',
              bottom: 100, // Above bottom nav
              right: 20,
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: '#fea619',
              color: '#684000',
              border: '2px solid #855300',
              boxShadow: '4px 4px 0 0 #855300',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 50,
              transition: 'transform 0.1s',
            }}
            onPointerDown={(e: any) => e.currentTarget.style.transform = 'translate(2px, 2px)'}
            onPointerUp={(e: any) => e.currentTarget.style.transform = 'none'}
            onPointerLeave={(e: any) => e.currentTarget.style.transform = 'none'}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 28, fontVariationSettings: "'wght' 600" }}>add</span>
          </button>
        </>
      ) : (
        /* Inbox View */
        <div style={{ padding: '20px' }}>
          {isInboxLoading ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#00595c' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 36, animation: 'spin 1s linear infinite', marginBottom: 12 }}>sync</span>
              <p style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.9rem', fontWeight: 600 }}>Loading your conversations...</p>
            </div>
          ) : conversations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6e7979' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 56, marginBottom: 16, opacity: 0.4, display: 'block', color: '#00595c' }}>chat_bubble</span>
              <p style={{ fontFamily: 'var(--font-newsreader)', fontSize: '1.4rem', fontWeight: 700, color: '#1b1c19', marginBottom: 8 }}>
                No conversations yet
              </p>
              <p style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.9rem', color: '#6e7979', marginBottom: 24 }}>
                When you message sellers or receive requests on your items, they will appear here.
              </p>
              <button
                onClick={() => setView('browse')}
                style={{
                  background: '#fea619', color: '#684000',
                  border: '2px solid #855300', padding: '10px 24px',
                  fontFamily: 'var(--font-jakarta)', fontWeight: 700,
                  fontSize: '0.9rem', cursor: 'pointer', borderRadius: 2,
                  boxShadow: '3px 3px 0 0 #855300',
                }}
              >
                Browse Marketplace
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {conversations.map((conv) => {
                const isBuyer = conv.buyer_id === currentUser.id
                const otherUser = isBuyer ? conv.seller : conv.buyer
                const otherUserName = otherUser?.full_name || 'Anonymous'
                const formattedTime = new Date(conv.updated_at).toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + new Date(conv.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

                return (
                  <div
                    key={conv.id}
                    onClick={() => {
                      setActiveChat({
                        conversationId: conv.id,
                        recipientName: otherUserName,
                        listingTitle: conv.listing?.title || 'Item'
                      })
                    }}
                    style={{
                      background: '#fbf9f4',
                      border: '2px solid #00595c',
                      boxShadow: '4px 4px 0 0 #00595c',
                      padding: '16px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      position: 'relative',
                      transition: 'transform 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translate(-2px, -2px)'
                      e.currentTarget.style.boxShadow = '6px 6px 0 0 #00595c'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'none'
                      e.currentTarget.style.boxShadow = '4px 4px 0 0 #00595c'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: '50%', background: '#dbdad5',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden'
                        }}>
                          {otherUser?.avatar_url ? (
                            <img src={otherUser.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#6e7979' }}>person</span>
                          )}
                        </div>
                        <span style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 800, fontSize: '0.85rem', color: '#1b1c19' }}>
                          {otherUserName}
                        </span>
                        <span style={{
                          background: isBuyer ? '#e8f5f5' : '#fef5e7',
                          color: isBuyer ? '#00595c' : '#855300',
                          border: `1.5px solid ${isBuyer ? '#00595c' : '#855300'}`,
                          padding: '1px 6px',
                          fontSize: '0.55rem',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>
                          {isBuyer ? 'Buying' : 'Selling'}
                        </span>
                      </div>
                      <span style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.65rem', color: '#6e7979' }}>
                        {formattedTime}
                      </span>
                    </div>

                    <div style={{
                      fontFamily: 'var(--font-newsreader)',
                      fontWeight: 800,
                      fontSize: '1.05rem',
                      color: '#00595c',
                    }}>
                      {conv.listing?.title || 'Unknown Item'}
                    </div>

                    <div style={{
                      fontFamily: 'var(--font-jakarta)',
                      fontSize: '0.78rem',
                      color: '#3e4949',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {conv.last_message || 'No messages yet.'}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Create Listing Modal ────────────────────────────────── */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,32,33,0.75)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
        }}>
          <div style={{
            width: '100%', maxWidth: 430, background: '#fbf9f4',
            borderTop: '2px solid #00595c', borderLeft: '2px solid #00595c', borderRight: '2px solid #00595c',
            borderRadius: '12px 12px 0 0', padding: '24px 20px',
            animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            <div className="flex justify-between items-center mb-6">
              <h2 style={{ fontFamily: 'var(--font-newsreader)', fontSize: '1.8rem', fontWeight: 800, color: '#00595c' }}>
                New Listing
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="material-symbols-outlined"
                style={{ background: 'none', border: 'none', color: '#6e7979', cursor: 'pointer', fontSize: 24 }}
              >
                close
              </button>
            </div>

            <form onSubmit={handlePostListing} className="space-y-4">
              <div>
                <label className="label-caps mb-1 block" style={{ color: '#00595c' }}>Title</label>
                <input required type="text" className="cv-input" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="E.g. Physics 101 Textbook" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-caps mb-1 block" style={{ color: '#00595c' }}>Price ($)</label>
                  <input required type="number" step="0.01" min="0" className="cv-input" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} placeholder="0.00" />
                </div>
                <div>
                  <label className="label-caps mb-1 block" style={{ color: '#00595c' }}>Type</label>
                  <select className="cv-input" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})}>
                    <option value="buy">Sell</option>
                    <option value="rent">Rent Out</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label-caps mb-1 block" style={{ color: '#00595c' }}>Category</label>
                <select className="cv-input" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value as any})}>
                  <option value="books">Books & Textbooks</option>
                  <option value="electronics">Electronics</option>
                  <option value="lab">Lab Equipment</option>
                  <option value="clothing">Clothing / Merch</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="label-caps mb-1 block" style={{ color: '#00595c' }}>Description (Optional)</label>
                <textarea className="cv-input" rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Condition, edition, specs..."></textarea>
              </div>

              <div className="pt-4">
                <button type="submit" className="btn-amber" disabled={isSubmitting} style={{ width: '100%' }}>
                  <span>{isSubmitting ? 'Posting...' : 'Post Listing'}</span>
                  <span className="material-symbols-outlined">add_circle</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeChat && (
        <MarketChatDrawer
          conversationId={activeChat.conversationId}
          currentUserId={currentUser.id}
          currentUserFullName={userProfile?.full_name || 'You'}
          currentUserAvatarUrl={userProfile?.avatar_url || null}
          recipientName={activeChat.recipientName}
          listingTitle={activeChat.listingTitle}
          onClose={() => setActiveChat(null)}
        />
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}} />
    </div>
  )
}

interface ListingCardProps {
  listing: Listing
  currentUserId: string
  onMessage: (listing: Listing) => void
  isSaved: boolean
  isRequested: boolean
  onToggleSave: (listing: Listing) => void
  onRequest: (listing: Listing) => void
}

const ListingCard = React.memo(function ListingCard({ 
  listing, 
  currentUserId, 
  onMessage,
  isSaved,
  isRequested,
  onToggleSave,
  onRequest
}: ListingCardProps) {
  return (
    <div 
      style={{
        background: '#fbf9f4',
        border: '2px solid #00595c',
        borderRadius: 2,
        boxShadow: '4px 4px 0 0 #00595c',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      {/* Status/Type Badge */}
      <div style={{
        position: 'absolute',
        top: 12,
        right: 12,
        background: listing.type === 'buy' ? '#81d4d8' : '#ffddb8',
        color: listing.type === 'buy' ? '#004f52' : '#855300',
        border: `2px solid ${listing.type === 'buy' ? '#00595c' : '#855300'}`,
        padding: '2px 8px',
        borderRadius: 2,
        fontFamily: 'var(--font-jakarta)',
        fontWeight: 800,
        fontSize: '0.65rem',
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
      }}>
        {listing.type === 'buy' ? 'For Sale' : 'For Rent'}
      </div>

      <div style={{ padding: '20px 20px 16px' }}>
        <div style={{
          color: '#6e7979',
          fontFamily: 'var(--font-jakarta)',
          fontSize: '0.7rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: 8
        }}>
          {listing.category}
        </div>
        
        <h3 style={{
          fontFamily: 'var(--font-newsreader)',
          fontSize: '1.4rem',
          fontWeight: 800,
          lineHeight: 1.2,
          color: '#1b1c19',
          marginBottom: 8,
          paddingRight: 80 // leave space for badge
        }}>
          {listing.title}
        </h3>

        <div style={{
          fontFamily: 'var(--font-jakarta)',
          fontSize: '1.2rem',
          fontWeight: 800,
          color: '#00595c',
          marginBottom: 16
        }}>
          ${listing.price.toFixed(2)}
        </div>

        {listing.description && (
          <p style={{
            fontFamily: 'var(--font-jakarta)',
            fontSize: '0.9rem',
            lineHeight: 1.5,
            color: '#3e4949',
            marginBottom: 20
          }}>
            {listing.description}
          </p>
        )}

        {/* Seller Info */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          paddingTop: 16,
          borderTop: '2px dashed #bec9c9'
        }}>
          <div className="flex items-center gap-2">
            <div style={{
              width: 24, height: 24, borderRadius: '50%', background: '#dbdad5',
              display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden'
            }}>
              {listing.seller?.avatar_url ? (
                <img src={listing.seller.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#6e7979' }}>person</span>
              )}
            </div>
            <span style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.8rem', fontWeight: 600, color: '#3e4949' }}>
              {listing.seller?.full_name || 'Anonymous'}
            </span>
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {/* Save Listing Toggle Button */}
            <button 
              onClick={() => onToggleSave(listing)}
              title={isSaved ? "Unsave Listing" : "Save Listing"}
              style={{
                background: 'none',
                border: 'none',
                color: isSaved ? '#fea619' : '#bec9c9',
                display: 'flex',
                alignItems: 'center',
                padding: 0,
                cursor: 'pointer',
                transition: 'color 0.2s',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20, fontVariationSettings: isSaved ? "'FILL' 1" : "'FILL' 0" }}>
                star
              </span>
            </button>

            {/* Request Button */}
            {listing.seller_id !== currentUserId && (
              <button 
                onClick={() => onRequest(listing)}
                disabled={isRequested}
                style={{
                  background: isRequested ? '#dbdad5' : '#fea619',
                  border: `2px solid ${isRequested ? '#bec9c9' : '#855300'}`,
                  color: isRequested ? '#8b949e' : '#684000',
                  fontFamily: 'var(--font-jakarta)',
                  fontWeight: 700,
                  fontSize: '0.68rem',
                  textTransform: 'uppercase',
                  padding: '4px 10px',
                  boxShadow: isRequested ? 'none' : '2px 2px 0 0 #855300',
                  cursor: isRequested ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                }}
              >
                {isRequested ? 'Requested ✓' : listing.type === 'buy' ? 'Request to Buy' : 'Request to Rent'}
              </button>
            )}

            {/* Message Button */}
            <button 
              onClick={() => onMessage(listing)}
              style={{
                background: 'none',
                border: 'none',
                color: '#0D7377',
                fontFamily: 'var(--font-jakarta)',
                fontWeight: 700,
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                cursor: 'pointer'
              }}
            >
              Message
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chat_bubble</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
})
