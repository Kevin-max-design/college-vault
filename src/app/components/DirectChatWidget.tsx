'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'

export interface ChatMessage {
  id: string
  sender: 'me' | 'other'
  text: string
  time: string
}

interface DirectChatWidgetProps {
  currentUserHandle: string
  currentUserId: string
  recipient: { id: string; handle: string }
  onClose: () => void
  classroomId: string
  initialMessage?: string
}

export default function DirectChatWidget({
  currentUserHandle,
  currentUserId,
  recipient,
  onClose,
  classroomId,
  initialMessage,
}: DirectChatWidgetProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [text, setText] = useState('')
  const bodyRef = useRef<HTMLDivElement>(null)
  const storageKey = `cv_chat_${classroomId}_${recipient.id}`

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  const isRealUser = UUID_RE.test(recipient.id) && UUID_RE.test(currentUserId)

  // Load existing messages (fallback/cache first, then fetch from Supabase)
  useEffect(() => {
    // 1. Fallback to localStorage cache immediately
    const stored = localStorage.getItem(storageKey)
    let cachedMessages: ChatMessage[] = []
    if (stored) {
      try {
        cachedMessages = JSON.parse(stored)
        setMessages(cachedMessages)
      } catch (e) {
        console.error(e)
      }
    } else {
      const initial = [
        {
          id: 'init',
          sender: 'other' as const,
          text: initialMessage || `Hey! I saw your post in the ${recipient.handle.includes('Guru') ? 'subject doubt' : 'classroom discussion'}. Do you want to discuss it or compare notes?`,
          time: new Date().toISOString(),
        },
      ]
      setMessages(initial)
      localStorage.setItem(storageKey, JSON.stringify(initial))
      cachedMessages = initial
    }

    // 2. Fetch fresh chat history from Supabase source of truth
    if (isRealUser) {
      fetch(`/api/classrooms/${classroomId}/chat`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data && Array.isArray(data.messages)) {
            // Map DB messages to UI ChatMessages
            const dbMsgs: ChatMessage[] = data.messages.map((m: any) => ({
              id: m.id,
              sender: m.sender_id === currentUserId ? 'me' : 'other',
              text: m.body,
              time: m.created_at,
            }))

            // Combine with initial greeting if no peer replies exist
            const finalMsgs = dbMsgs.length > 0 ? dbMsgs : cachedMessages
            setMessages(finalMsgs)
            localStorage.setItem(storageKey, JSON.stringify(finalMsgs))
          }
        })
        .catch(err => console.error('Failed to sync chat history:', err))
    }
  }, [storageKey, classroomId, recipient.id, currentUserId, isRealUser, initialMessage, recipient.handle])

  // 3. Supabase Realtime channel subscription for peer messages
  useEffect(() => {
    if (!isRealUser || !classroomId || !recipient.id) return

    const supabase = createClient()
    const channel = supabase
      .channel(`classroom-peer-chat:${classroomId}:${recipient.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'peer_messages',
          filter: `classroom_id=eq.${classroomId}`,
        },
        (payload) => {
          const newMsg = payload.new as any
          console.log('REALTIME_EVENT (peer_messages)', payload)

          // Check if this message belongs to the current conversation
          if (
            (newMsg.sender_id === currentUserId && newMsg.receiver_id === recipient.id) ||
            (newMsg.sender_id === recipient.id && newMsg.receiver_id === currentUserId)
          ) {
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
              const filtered = prev.filter(m => m.id !== uiMsg.id && !(m.id.startsWith('temp-') && m.text === uiMsg.text))
              const updated = [...filtered, uiMsg]
              // Update localStorage cache as well
              localStorage.setItem(storageKey, JSON.stringify(updated))
              return updated
            })
          }
        }
      )
      .subscribe((status) => {
        console.log("REALTIME_SUBSCRIBED (peer_messages)", status)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [classroomId, recipient.id, currentUserId, isRealUser, storageKey])

  // Scroll to bottom on message updates
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
    if (!text.trim()) return

    const messageText = text.trim()
    const tempId = `temp-${Date.now()}`
    
    const newMsg: ChatMessage = {
      id: tempId,
      sender: 'me',
      text: messageText,
      time: new Date().toISOString(),
    }
    
    // Save state before sending for rollback on error
    const previousMessages = messages
    const updated = [...messages, newMsg]
    saveMessages(updated)
    setText('')

    if (isRealUser) {
      try {
        const res = await fetch(`/api/classrooms/${classroomId}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ receiver_id: recipient.id, body: messageText }),
        })
        if (!res.ok) {
          // Rollback on error
          saveMessages(previousMessages)
          const errData = await res.json().catch(() => ({}))
          alert(errData.error || 'Failed to send message.')
          return
        } else {
          const data = await res.json()
          if (data?.message) {
            // Replace temporary client message with official DB record
            const dbMsg: ChatMessage = {
              id: data.message.id,
              sender: 'me',
              text: data.message.body,
              time: data.message.created_at,
            }
            saveMessages([...previousMessages, dbMsg])
          }
        }
      } catch (err: any) {
        saveMessages(previousMessages)
        alert(err.message || 'Network error — failed to send message.')
        return
      }
    }

    // Trigger simulated response (demo/fallback mode or for simulated users)
    if (!isRealUser) {
      setTimeout(() => {
        const userText = messageText.toLowerCase()
        let responseText = `That's interesting! Let's check our textbook notes or compare in the library tomorrow.`
        if (userText.includes('hi') || userText.includes('hello') || userText.includes('hey')) {
          responseText = `Hey there! How is the revision going? Let me know if you are stuck on any topic.`
        } else if (userText.includes('help') || userText.includes('doubt') || userText.includes('explain') || userText.includes('understand')) {
          responseText = `Sure! I reviewed this unit yesterday. Let me know which formula or theorem is confusing you.`
        } else if (userText.includes('thanks') || userText.includes('thank you') || userText.includes('ty')) {
          responseText = `Anytime! We are all in this together. Let's secure these grades!`
        } else if (userText.includes('math') || userText.includes('formula') || userText.includes('solve')) {
          responseText = `Ah! For that formula, make sure to apply the integration by parts or check JNTU's model papers.`
        } else if (userText.includes('class') || userText.includes('notes') || userText.includes('slide')) {
          responseText = `Yes, I have high-res photos of the chalkboard! I can send them over later tonight.`
        }

        const reply: ChatMessage = {
          id: Math.random().toString(36).substring(2, 11),
          sender: 'other',
          text: responseText,
          time: new Date().toISOString(),
        }
        saveMessages([...updated, reply])
      }, 1000)
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
      {/* Chat Header */}
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
            <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{recipient.handle}</span>
            <span style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#4caf50',
              display: 'inline-block',
              boxShadow: '0 0 4px #4caf50',
            }} />
          </div>
          <span style={{ fontSize: '0.65rem', color: '#a2f5f9', opacity: 0.9 }}>Direct Chat Session</span>
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

      {/* Messages body */}
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
        {messages.map(msg => {
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
        })}
      </div>

      {/* Input form */}
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
        <button type="submit" disabled={!text.trim()} style={{
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
