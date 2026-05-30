'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'

export interface ChatMessage {
  id: string
  sender: 'me' | 'other'
  text: string
  time: string
}

interface DirectDMWidgetProps {
  conversationId: string
  receiverName: string
  receiverId: string
  onClose: () => void
}

export default function DirectDMWidget({
  conversationId,
  receiverName,
  receiverId,
  onClose,
}: DirectDMWidgetProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [text, setText] = useState('')
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const bodyRef = useRef<HTMLDivElement>(null)
  
  const storageKey = `cv_direct_chat_${conversationId}`

  // 1. Resolve current user ID
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUserId(user.id)
      }
    })
  }, [])

  // 2. Load existing messages (from cache first, then API)
  useEffect(() => {
    if (!currentUserId) return

    const stored = localStorage.getItem(storageKey)
    if (stored) {
      try {
        setMessages(JSON.parse(stored))
      } catch (e) {
        console.error(e)
      }
    }

    // Fetch fresh history
    fetch(`/api/direct-conversations/${conversationId}/messages`)
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (data && Array.isArray(data.messages)) {
          const dbMsgs: ChatMessage[] = data.messages.map((m: any) => ({
            id: m.id,
            sender: m.sender_id === currentUserId ? 'me' : 'other',
            text: m.body,
            time: m.created_at,
          }))
          setMessages(dbMsgs)
          localStorage.setItem(storageKey, JSON.stringify(dbMsgs))
        }
      })
      .catch(err => console.error('[DIRECT_DM] Failed to sync message history:', err))
  }, [conversationId, currentUserId, storageKey])

  // 3. Supabase Realtime channel subscription for direct messages
  useEffect(() => {
    if (!currentUserId || !conversationId) return

    const supabase = createClient()
    const channel = supabase
      .channel(`direct-messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as any
          console.log('[DIRECT_DM] Realtime insert payload:', payload)

          const uiMsg: ChatMessage = {
            id: newMsg.id,
            sender: newMsg.sender_id === currentUserId ? 'me' : 'other',
            text: newMsg.body,
            time: newMsg.created_at,
          }

          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some((m) => m.id === uiMsg.id)) return prev
            // Remove matching optimistic message if any
            const filtered = prev.filter(
              (m) => m.id !== uiMsg.id && !(m.id.startsWith('temp-') && m.text === uiMsg.text)
            )
            const updated = [...filtered, uiMsg]
            localStorage.setItem(storageKey, JSON.stringify(updated))
            return updated
          })
        }
      )
      .subscribe((status) => {
        console.log('[DIRECT_DM] Realtime subscription status:', status)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId, currentUserId, storageKey])

  // 4. Scroll to bottom on updates
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight
    }
  }, [messages])

  const saveMessages = (msgs: ChatMessage[]) => {
    setMessages(msgs)
    localStorage.setItem(storageKey, JSON.stringify(msgs))
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim() || !currentUserId) return

    const messageText = text.trim()
    const tempId = `temp-${Date.now()}`

    const newMsg: ChatMessage = {
      id: tempId,
      sender: 'me',
      text: messageText,
      time: new Date().toISOString(),
    }

    const previousMessages = messages
    const updated = [...messages, newMsg]
    saveMessages(updated)
    setText('')

    try {
      const res = await fetch(`/api/direct-conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: messageText }),
      })

      if (!res.ok) {
        saveMessages(previousMessages)
        const errData = await res.json().catch(() => ({}))
        alert(errData.error || 'Failed to send message.')
      } else {
        const data = await res.json()
        if (data?.message) {
          const dbMsg: ChatMessage = {
            id: data.message.id,
            sender: 'me',
            text: data.message.body,
            time: data.message.created_at,
          }
          // Replace temp with official
          setMessages((prev) => {
            const filtered = prev.filter((m) => m.id !== tempId)
            const next = [...filtered, dbMsg]
            localStorage.setItem(storageKey, JSON.stringify(next))
            return next
          })
        }
      }
    } catch (err: any) {
      saveMessages(previousMessages)
      alert(err.message || 'Network error — failed to send message.')
    }
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      right: 20,
      width: 330,
      height: 400,
      background: '#fbf9f4',
      border: '2px solid #00595c',
      boxShadow: '4px 4px 0 0 #00595c',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 1000,
      fontFamily: 'var(--font-jakarta)',
    }}>
      {/* Header */}
      <div style={{
        background: '#00595c',
        color: '#fff',
        padding: '10px 14px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '2px solid #00595c',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{receiverName}</span>
            <span style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#4caf50',
              display: 'inline-block',
              boxShadow: '0 0 4px #4caf50',
            }} />
          </div>
          <span style={{ fontSize: '0.65rem', color: '#a2f5f9', opacity: 0.9 }}>General DM</span>
        </div>
        <button onClick={onClose} style={{
          background: 'none',
          border: 'none',
          color: '#fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
        </button>
      </div>

      {/* Message Body */}
      <div
        ref={bodyRef}
        style={{
          flex: 1,
          padding: 12,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          background: '#fcfbf7',
        }}
      >
        {messages.length === 0 ? (
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#6e7979', fontSize: '0.75rem', textAlign: 'center', padding: 20
          }}>
            No messages yet. Send a message to start the general conversation!
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender === 'me'
            return (
              <div key={msg.id} style={{
                alignSelf: isMe ? 'flex-end' : 'flex-start',
                maxWidth: '80%',
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
                }}>
                  {msg.text}
                </div>
                <span style={{ fontSize: '0.6rem', color: '#6e7979', marginTop: 2, padding: '0 4px' }}>
                  {new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )
          })
        )}
      </div>

      {/* Input Footer */}
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
          onChange={e => setText(e.target.value)}
          placeholder="Type a message..."
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
        <button type="submit" disabled={!text.trim() || !currentUserId} style={{
          background: '#fea619',
          border: '2.5px solid #00595c',
          color: '#684000',
          padding: '6px 12px',
          fontWeight: 700,
          fontSize: '0.75rem',
          cursor: 'pointer',
        }}>
          Send
        </button>
      </form>
    </div>
  )
}
