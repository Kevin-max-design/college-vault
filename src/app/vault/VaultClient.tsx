'use client'

import { useState } from 'react'

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
  const [listings, setListings] = useState<Listing[]>(initialListings)
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [activeType, setActiveType] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    type: 'buy',
    category: 'books',
  })

  // Filter listings
  const filteredListings = listings.filter((listing) => {
    if (activeCategory !== 'all' && listing.category !== activeCategory) return false
    if (activeType !== 'all' && listing.type !== activeType) return false
    if (searchQuery && !listing.title.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

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
        setListings([newListing, ...listings])
        setIsModalOpen(false)
        setFormData({ title: '', description: '', price: '', type: 'buy', category: 'books' })
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to post listing')
      }
    } catch (err) {
      alert('An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative min-h-screen">
      {/* ── Search & Filter Header ───────────────────────────────── */}
      <div className="sticky top-0 z-40" style={{ background: '#fdfcf8', borderBottom: '2px solid #00595c', padding: '16px 20px' }}>
        <input
          type="text"
          placeholder="Search textbooks, lab coats, laptops..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
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
      </div>

      {/* ── Listings Grid ───────────────────────────────────────── */}
      <div style={{ padding: '20px' }}>
        {filteredListings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6e7979' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }}>inventory_2</span>
            <p style={{ fontFamily: 'var(--font-jakarta)' }}>No items found. Try adjusting your filters.</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredListings.map(listing => (
              <div 
                key={listing.id}
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

                    <button 
                      onClick={async () => {
                        if (listing.seller_id === currentUser.id) {
                          alert('This is your own listing!')
                          return
                        }
                        try {
                          const res = await fetch('/api/messages', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              listing_id: listing.id,
                              receiver_id: listing.seller_id,
                              content: `Hi! I'm interested in your listing: "${listing.title}"`,
                            }),
                          })
                          if (res.ok) {
                            alert(`Message sent to ${listing.seller?.full_name || 'the seller'}!`)
                          } else {
                            const err = await res.json()
                            alert(err.error || 'Could not send message.')
                          }
                        } catch {
                          alert('Network error — please try again.')
                        }
                      }}
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
            ))}
          </div>
        )}
      </div>

      {/* ── Floating Action Button ──────────────────────────────── */}
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

      {/* ── Create Listing Modal ────────────────────────────────── */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,32,33,0.6)', backdropFilter: 'blur(4px)',
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

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}} />
    </div>
  )
}
