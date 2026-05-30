'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface MessageStudentButtonProps {
  peerId: string
  peerName: string
  dmPrivacy: string
}

export default function MessageStudentButton({ peerId, peerName, dmPrivacy }: MessageStudentButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  if (dmPrivacy === 'no_one') return null

  const handleClick = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/direct-conversations/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiver_id: peerId }),
      })
      
      const data = await res.json()
      if (res.ok && data.conversation) {
        // Redirect to unified inbox and open chat overlay instantly using resolved conversation state
        router.push(`/vault?view=inbox&type=direct_dm&conversationId=${data.conversation.id}&recipientId=${peerId}&recipientName=${encodeURIComponent(peerName)}`)
      } else {
        alert(data.error || 'Failed to start conversation.')
      }
    } catch {
      alert('Error starting conversation.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      style={{
        background: '#fea619',
        color: '#684000',
        border: '2px solid #00595c',
        padding: '12px 0',
        fontFamily: 'var(--font-jakarta)',
        fontWeight: 900,
        fontSize: '0.75rem',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        cursor: loading ? 'not-allowed' : 'pointer',
        boxShadow: '3px 3px 0 0 #00595c',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
      }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chat</span>
      <span>{loading ? 'Initializing DM...' : `Message ${peerName.split(' ')[0]}`}</span>
    </button>
  )
}
