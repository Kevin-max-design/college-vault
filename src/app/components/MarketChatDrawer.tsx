'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'

interface Profile {
  id: string
  full_name: string
  avatar_url: string | null
}

interface Message {
  id: string
  conversation_id: string
  listing_id: string
  sender_id: string
  receiver_id: string
  body: string
  created_at: string
  sender?: Profile
}

interface MarketChatDrawerProps {
  conversationId: string
  currentUserId: string
  currentUserFullName: string
  currentUserAvatarUrl: string | null
  recipientName: string
  listingTitle: string
  onClose: () => void
}

export default function MarketChatDrawer({
  conversationId,
  currentUserId,
  currentUserFullName,
  currentUserAvatarUrl,
  recipientName,
  listingTitle,
  onClose,
}: MarketChatDrawerProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const bodyRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // 1. Fetch initial messages from API
  useEffect(() => {
    let active = true
    setIsLoading(true)

    async function loadMessages() {
      try {
        const res = await fetch(`/api/conversations/${conversationId}/messages`)
        if (!res.ok) throw new Error('Failed to load messages')
        const data = await res.json()
        if (active) {
          setMessages(data.messages || [])
        }
      } catch (err) {
        console.error(err)
      } finally {
        if (active) setIsLoading(false)
      }
    }

    loadMessages()

    return () => {
      active = false
    }
  }, [conversationId])

  // 2. Scroll to bottom on updates
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight
    }
  }, [messages, isLoading])

  // 3. Setup Supabase Realtime channel subscription
  useEffect(() => {
    if (!conversationId) return

    const channel = supabase
      .channel(`realtime-messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const newMsg = payload.new as any

          // Fetch sender details to get full profile join
          const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .eq('id', newMsg.sender_id)
            .single()

          const messageWithSender: Message = {
            ...newMsg,
            sender: data || { id: newMsg.sender_id, full_name: 'User', avatar_url: null }
          }

          setMessages((prev) => {
            // Avoid duplicate message insert if already in list
            if (prev.some((m) => m.id === messageWithSender.id)) return prev
            // Remove any matching optimistic messages
            const filtered = prev.filter(m => m.id !== newMsg.id && !(m.id.startsWith('temp-') && m.body === newMsg.body))
            return [...filtered, messageWithSender]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId, supabase])

  // 4. Send Message Handler
  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return

    const bodyText = text.trim()
    setText('')

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    
    // Create optimistic message
    const optimisticMessage: Message = {
      id: tempId,
      conversation_id: conversationId,
      listing_id: '',
      sender_id: currentUserId,
      receiver_id: '',
      body: bodyText,
      created_at: new Date().toISOString(),
      sender: {
        id: currentUserId,
        full_name: currentUserFullName,
        avatar_url: currentUserAvatarUrl,
      },
    }

    setMessages((prev) => [...prev, optimisticMessage])

    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: bodyText }),
      })

      if (!res.ok) {
        throw new Error('Could not send message')
      }

      const realMessage = await res.json()
      
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? realMessage : m))
      )
    } catch (err) {
      console.error(err)
      // Rollback optimistic message on failure
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
      alert('Failed to send message. Please try again.')
    }
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      right: 20,
      width: 340,
      height: 440,
      background: '#fbf9f4',
      border: '2.5px solid #00595c',
      boxShadow: '6px 6px 0 0 #00595c',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 1000,
      fontFamily: 'var(--font-jakarta)',
    }}>
      {/* Header */}
      <div style={{
        background: '#00595c',
        color: '#fff',
        padding: '12px 14px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '2.5px solid #00595c',
      }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontWeight: 800, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {recipientName}
            </span>
            <span style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#4caf50',
              display: 'inline-block',
              boxShadow: '0 0 4px #4caf50',
              flexShrink: 0,
            }} />
          </div>
          <span style={{ fontSize: '0.65rem', color: '#a2f5f9', opacity: 0.9, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Listing: {listingTitle}
          </span>
        </div>
        <button onClick={onClose} style={{
          background: 'none',
          border: 'none',
          color: '#fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          padding: 4,
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
        </button>
      </div>

      {/* Messages body */}
      <div
        ref={bodyRef}
        style={{
          flex: 1,
          padding: 12,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          background: '#fcfbf7',
        }}
      >
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', gap: 6, color: '#00595c' }}>
            <span className="material-symbols-outlined" style={{ animation: 'spin 1s linear infinite', fontSize: 18 }}>sync</span>
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Loading chat...</span>
          </div>
        ) : messages.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#6e7979', fontSize: '0.78rem' }}>
            No messages yet. Send a message to start the conversation!
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === currentUserId
            const isTemp = msg.id.startsWith('temp-')
            return (
              <div key={msg.id} style={{
                alignSelf: isMe ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: isMe ? 'flex-end' : 'flex-start',
              }}>
                <div style={{
                  background: isMe ? '#fea619' : '#eef2f2',
                  color: isMe ? '#684000' : '#1b1c19',
                  padding: '8px 12px',
                  borderRadius: 8,
                  fontSize: '0.8rem',
                  lineHeight: 1.4,
                  border: isMe ? '1.5px solid #855300' : '1.5px solid #bec9c9',
                  opacity: isTemp ? 0.7 : 1,
                  wordBreak: 'break-word',
                }}>
                  {msg.body}
                </div>
                <span style={{ fontSize: '0.58rem', color: '#6e7979', marginTop: 2, padding: '0 4px' }}>
                  {isTemp ? 'Sending...' : new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )
          })
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSend} style={{
        padding: 10,
        borderTop: '2px solid #bec9c9',
        display: 'flex',
        gap: 6,
        background: '#fbf9f4',
      }}>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
          disabled={isLoading}
          style={{
            flex: 1,
            padding: '6px 10px',
            border: '2.5px solid #00595c',
            outline: 'none',
            fontSize: '0.8rem',
            background: '#fff',
            fontFamily: 'var(--font-jakarta)',
          }}
        />
        <button type="submit" disabled={!text.trim() || isLoading} style={{
          background: '#fea619',
          border: '2.5px solid #00595c',
          color: '#684000',
          padding: '6px 12px',
          fontWeight: 700,
          fontSize: '0.75rem',
          cursor: (!text.trim() || isLoading) ? 'default' : 'pointer',
          opacity: (!text.trim() || isLoading) ? 0.6 : 1,
        }}>
          Send
        </button>
      </form>
    </div>
  )
}
