'use client'

import { useState, useEffect, useRef } from 'react'

export interface ChatMessage {
  id: string
  sender: 'me' | 'other'
  text: string
  time: string
}

interface DirectChatWidgetProps {
  currentUserHandle: string
  recipient: { id: string; handle: string }
  onClose: () => void
  classroomId: string
  initialMessage?: string
}

export default function DirectChatWidget({
  currentUserHandle,
  recipient,
  onClose,
  classroomId,
  initialMessage,
}: DirectChatWidgetProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [text, setText] = useState('')
  const bodyRef = useRef<HTMLDivElement>(null)
  const storageKey = `cv_chat_${classroomId}_${recipient.id}`

  // Load existing messages or seed an initial ice-breaker
  useEffect(() => {
    const stored = localStorage.getItem(storageKey)
    if (stored) {
      try {
        setMessages(JSON.parse(stored))
      } catch (e) {
        console.error(e)
      }
    } else {
      const initial = [
        {
          id: 'init',
          sender: 'other' as const,
          text: initialMessage || `Hey! I saw your post in the ${recipient.handle.includes('Guru') ? 'subject thread' : 'classroom discussion'}. Do you want to discuss it or compare notes?`,
          time: new Date().toISOString(),
        },
      ]
      setMessages(initial)
      localStorage.setItem(storageKey, JSON.stringify(initial))
    }
  }, [storageKey, recipient.handle, initialMessage])

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

  function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return

    const newMsg: ChatMessage = {
      id: Math.random().toString(36).substring(2, 11),
      sender: 'me',
      text: text.trim(),
      time: new Date().toISOString(),
    }
    const updated = [...messages, newMsg]
    saveMessages(updated)
    const userText = text.trim().toLowerCase()
    setText('')

    // Trigger simulated reply after 1 second
    setTimeout(() => {
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
