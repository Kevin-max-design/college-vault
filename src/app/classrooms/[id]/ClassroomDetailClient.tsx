'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

/* ── Types ─────────────────────────────────────────────────────────── */
interface Author { id: string; full_name: string; avatar_url: string | null; role: string }
interface Reaction { emoji: string; user_id: string }

export interface Post {
  id: string
  content: string
  type: 'doubt' | 'material' | 'announcement' | 'thread'
  resolved: boolean
  created_at: string
  parent_id: string | null
  author: Author | null
  reactions: Reaction[]
  replies?: Post[]
}

interface Classroom {
  id: string; name: string; subject_type: string; type: string
  department: string; year: number; description: string; entry_code: string
}

interface Props {
  classroom: Classroom
  initialPosts: Post[]
  doubtCount: number
  userId: string
  userRole: string
}

interface ChatMessage {
  id: string
  sender: 'me' | 'other'
  text: string
  time: string
}

/* ── Helpers ────────────────────────────────────────────────────────── */
function timeAgo(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}
function initials(name = '') { 
  if (name.startsWith('u/')) {
    return name.replace('u/', '').substring(0, 2).toUpperCase()
  }
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() || '?' 
}

const TYPE_META: Record<string, { label: string; color: string; icon: string }> = {
  doubt:        { label: 'Doubt',        color: '#ba1a1a', icon: 'help' },
  material:     { label: 'Material',     color: '#00595c', icon: 'book' },
  announcement: { label: 'Announcement', color: '#855300', icon: 'campaign' },
  thread:       { label: 'Thread',       color: '#3e4949', icon: 'forum' },
}

/* ── Build tree from flat list ──────────────────────────────────────── */
function buildTree(posts: Post[]): Post[] {
  const map = new Map<string, Post>()
  const roots: Post[] = []
  posts.forEach(p => map.set(p.id, { ...p, replies: [] }))
  map.forEach(p => {
    if (p.parent_id && map.has(p.parent_id)) {
      map.get(p.parent_id)!.replies!.push(p)
    } else {
      roots.push(p)
    }
  })
  return roots
}

/* ── Direct Chat Widget (Floating Panel) ────────────────────────────── */
function DirectChatWidget({ 
  currentUserHandle, 
  recipient, 
  onClose, 
  classroomId 
}: {
  currentUserHandle: string
  recipient: { id: string; handle: string }
  onClose: () => void
  classroomId: string
}) {
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
          text: `Hey! I saw your post in the ${recipient.handle.includes('Guru') ? 'subject thread' : 'classroom discussion'}. Do you want to discuss it or compare notes?`,
          time: new Date().toISOString()
        }
      ]
      setMessages(initial)
      localStorage.setItem(storageKey, JSON.stringify(initial))
    }
  }, [storageKey, recipient.handle])

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
      time: new Date().toISOString()
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
        time: new Date().toISOString()
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
        borderBottom: '2px solid #00595c'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{recipient.handle}</span>
            <span style={{
              width: 8, height: 8, borderRadius: '50%', background: '#4caf50',
              display: 'inline-block', boxShadow: '0 0 4px #4caf50'
            }} />
          </div>
          <span style={{ fontSize: '0.65rem', color: '#a2f5f9', opacity: 0.9 }}>Direct Chat Session</span>
        </div>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', color: '#fff', cursor: 'pointer',
          display: 'flex', alignItems: 'center'
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
        background: '#fbf9f4'
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

/* ── Inline Reply Input ─────────────────────────────────────────────── */
function ReplyInput({ classroomId, parentId, onPosted, onCancel, isSeedClassroom, currentUserHandle, currentUserId }: {
  classroomId: string; parentId: string
  onPosted: (p: Post) => void; onCancel: () => void; isSeedClassroom?: boolean
  currentUserHandle: string; currentUserId: string
}) {
  const [text, setText] = useState('')
  const [pending, start] = useTransition()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    start(async () => {
      if (isSeedClassroom) {
        const mockReply: Post = {
          id: Math.random().toString(36).substring(2, 11),
          content: text.trim(),
          type: 'thread',
          resolved: false,
          created_at: new Date().toISOString(),
          parent_id: parentId,
          author: { id: currentUserId, full_name: currentUserHandle, avatar_url: null, role: 'student' },
          reactions: [],
        }
        onPosted(mockReply)
        setText('')
        onCancel()
        return
      }
      const res = await fetch(`/api/classrooms/${classroomId}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text.trim(), type: 'thread', parent_id: parentId }),
      })
      if (res.ok) { onPosted(await res.json()); setText(''); onCancel() }
    })
  }

  return (
    <form onSubmit={submit} style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'flex-end' }}>
      <textarea
        value={text} onChange={e => setText(e.target.value)} rows={2} autoFocus
        placeholder="Write a reply..."
        style={{
          flex: 1, padding: '8px 12px', border: '2px solid #00595c',
          fontFamily: 'var(--font-jakarta)', fontSize: '0.875rem', resize: 'none',
          background: '#fbf9f4', outline: 'none', color: '#1b1c19',
        }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <button type="submit" disabled={pending || !text.trim()} style={{
          padding: '6px 14px', background: '#00595c', border: '2px solid #00595c',
          color: '#fff', fontFamily: 'var(--font-jakarta)', fontSize: '0.65rem',
          fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer',
        }}>
          {pending ? '…' : 'Reply'}
        </button>
        <button type="button" onClick={onCancel} style={{
          padding: '6px 14px', background: 'transparent', border: '2px solid #bec9c9',
          color: '#6e7979', fontFamily: 'var(--font-jakarta)', fontSize: '0.65rem',
          fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer',
        }}>
          Cancel
        </button>
      </div>
    </form>
  )
}

/* ── Thread Node (recursive) ────────────────────────────────────────── */
function ThreadNode({ 
  post, 
  depth, 
  classroomId, 
  userId, 
  currentUserHandle,
  currentUserId,
  onNewReply, 
  onResolve, 
  onVote, 
  onOpenChat,
  isSeedClassroom 
}: {
  post: Post; depth: number; classroomId: string; userId: string
  currentUserHandle: string; currentUserId: string
  onNewReply: (parentId: string, newPost: Post) => void
  onResolve: (id: string) => void
  onVote: (id: string, direction: 'up' | 'down') => void
  onOpenChat: (recipientId: string, handle: string) => void
  isSeedClassroom?: boolean
}) {
  const [showReplyBox, setShowReplyBox] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const meta = TYPE_META[post.type] ?? TYPE_META.thread
  const isDoubt = post.type === 'doubt'
  const hasReplies = (post.replies?.length ?? 0) > 0

  // Format existing author names deterministically into Reddit-style handles
  const rawAuthorName = post.author?.full_name ?? 'Anonymous'
  const authorId = post.author?.id ?? 'mock-author'
  
  let authorHandle = rawAuthorName
  if (!rawAuthorName.startsWith('u/')) {
    if (authorId === currentUserId || authorId === userId || authorId === 'mock-user' || rawAuthorName === 'You (Student)') {
      authorHandle = currentUserHandle
    } else {
      // Deterministic Reddit handles for classmates
      const cleanName = rawAuthorName.replace(/\s+/g, '_')
      authorHandle = `u/${cleanName}_${authorId.substring(0, 4)}`
    }
  }

  const isMe = authorHandle === currentUserHandle || authorId === currentUserId || authorId === userId || authorId === 'mock-user'

  // Upvotes and Downvotes evaluation
  const myUpvoted = post.reactions.some(r => r.user_id === userId && r.emoji === 'up')
  const myDownvoted = post.reactions.some(r => r.user_id === userId && r.emoji === 'down')
  
  const upVotes = post.reactions.filter(r => r.emoji === 'up').length
  const downVotes = post.reactions.filter(r => r.emoji === 'down').length
  const legacyLikes = post.reactions.filter(r => r.emoji === '👍').length
  
  // Set beautiful base scores depending on nesting depth so threads look active and real
  const score = legacyLikes + upVotes - downVotes + (depth === 0 ? 6 : Math.max(1, 4 - depth))

  // Depth-based indent track line colors
  const borderColors = ['#00595c', '#0d7377', '#855300', '#6e7979']
  const indentColor = borderColors[Math.min(depth, borderColors.length - 1)]

  // Reddit Collapsed Mode
  if (collapsed) {
    return (
      <div style={{
        marginLeft: depth > 0 ? 16 : 0,
        borderLeft: depth > 0 ? `2px dashed #bec9c9` : 'none',
        paddingLeft: depth > 0 ? 12 : 0,
        marginTop: depth > 0 ? 10 : 0,
      }}>
        <div style={{
          border: '2.5px solid #bec9c9',
          background: '#f5f3ee',
          padding: '8px 12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 15, color: '#6e7979' }}>expand_more</span>
            <span style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.72rem', fontWeight: 600, color: '#6e7979' }}>
              Comment by {authorHandle} collapsed ({post.replies?.length || 0} replies)
            </span>
          </div>
          <button 
            onClick={() => setCollapsed(false)}
            style={{
              background: 'transparent', border: 'none', color: '#00595c',
              fontFamily: 'var(--font-jakarta)', fontSize: '0.65rem', fontWeight: 700,
              textTransform: 'uppercase', cursor: 'pointer',
            }}
          >
            Expand
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      marginLeft: depth > 0 ? 12 : 0,
      marginTop: depth > 0 ? 10 : 0,
      display: 'flex',
      gap: 10,
    }}>
      {/* Clickable Reddit Left Collapsible Track Line */}
      {depth > 0 && (
        <div 
          onClick={() => setCollapsed(true)}
          title="Collapse thread"
          style={{
            width: 12,
            cursor: 'pointer',
            borderRight: `2px solid ${indentColor}`,
            marginRight: 2,
            transition: 'border-color 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#fea619'}
          onMouseLeave={e => e.currentTarget.style.borderColor = indentColor}
        />
      )}

      {/* Main Comment Node Wrapper */}
      <div style={{ flex: 1 }}>
        <div style={{
          border: `2px solid ${post.resolved ? '#bec9c9' : depth === 0 ? '#00595c' : indentColor}`,
          background: post.resolved ? '#f5f3ee' : depth === 0 ? '#fbf9f4' : '#fdfcf8',
          padding: '12px 14px',
          boxShadow: post.resolved ? 'none' : depth === 0 ? '4px 4px 0 0 #00595c' : 'none',
        }}>
          {/* Header: type badge + time */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14, color: post.resolved ? '#6e7979' : meta.color }}>
                {post.resolved ? 'check_circle' : meta.icon}
              </span>
              <span style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: post.resolved ? '#6e7979' : meta.color }}>
                {post.resolved ? 'Resolved' : meta.label}
              </span>
            </div>
            <span style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.65rem', color: '#6e7979' }}>{timeAgo(post.created_at)}</span>
          </div>

          {/* Content */}
          <p style={{ fontFamily: 'var(--font-jakarta)', fontSize: depth === 0 ? '0.95rem' : '0.875rem', lineHeight: 1.6, color: '#1b1c19', marginBottom: 10 }}>
            {post.content}
          </p>

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
            {/* Author Name + Direct Chat Link */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%', background: isMe ? '#fea619' : '#0d7377',
                border: '1.5px solid #00595c', display: 'flex', alignItems: 'center',
                justifyContent: 'center', overflow: 'hidden', flexShrink: 0,
              }}>
                <span style={{ color: isMe ? '#684000' : '#a2f5f9', fontSize: '0.55rem', fontWeight: 700 }}>
                  {initials(authorHandle)}
                </span>
              </div>
              <span style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.72rem', fontWeight: 700, color: isMe ? '#855300' : '#3e4949' }}>
                {authorHandle} {isMe && '(You)'}
              </span>
              
              {/* Floating DM triggering Chat button next to classmates */}
              {!isMe && (
                <button
                  onClick={() => onOpenChat(authorId, authorHandle)}
                  title={`Start Direct Chat with ${authorHandle}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 3,
                    background: 'transparent',
                    border: 'none',
                    color: '#00595c',
                    fontFamily: 'var(--font-jakarta)',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    padding: '2px 6px',
                    borderRadius: 4,
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#e8f5f5'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 13 }}>chat_bubble</span>
                  Chat
                </button>
              )}
            </div>

            {/* Actions: Upvote/Downvote Reddit block & Reply trigger */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {/* Reddit Style Vote Box */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 0, border: '1.5px solid #bec9c9', borderRadius: 20, overflow: 'hidden', background: '#fff' }}>
                <button 
                  onClick={() => onVote(post.id, 'up')} 
                  title="Upvote"
                  style={{
                    background: myUpvoted ? '#ff4500' : 'transparent',
                    border: 'none',
                    color: myUpvoted ? '#fff' : '#6e7979',
                    padding: '3px 8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: '0.75rem',
                    transition: 'background 0.2s, color 0.2s',
                  }}
                  onMouseEnter={e => { if(!myUpvoted) e.currentTarget.style.background = '#ffebeb' }}
                  onMouseLeave={e => { if(!myUpvoted) e.currentTarget.style.background = 'transparent' }}
                >
                  ▲
                </button>
                <span style={{ 
                  fontFamily: 'var(--font-jakarta)', 
                  fontSize: '0.7rem', 
                  fontWeight: 700, 
                  padding: '0 6px',
                  color: myUpvoted ? '#ff4500' : myDownvoted ? '#7193ff' : '#1b1c19',
                }}>
                  {score}
                </span>
                <button 
                  onClick={() => onVote(post.id, 'down')} 
                  title="Downvote"
                  style={{
                    background: myDownvoted ? '#7193ff' : 'transparent',
                    border: 'none',
                    color: myDownvoted ? '#fff' : '#6e7979',
                    padding: '3px 8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: '0.75rem',
                    transition: 'background 0.2s, color 0.2s',
                  }}
                  onMouseEnter={e => { if(!myDownvoted) e.currentTarget.style.background = '#ebeeff' }}
                  onMouseLeave={e => { if(!myDownvoted) e.currentTarget.style.background = 'transparent' }}
                >
                  ▼
                </button>
              </div>

              {/* Only Others Can Comment Lock */}
              {!isMe ? (
                <button onClick={() => setShowReplyBox(v => !v)} style={{
                  display: 'flex', alignItems: 'center', gap: 3, padding: '4px 8px',
                  border: '1.5px solid #bec9c9', background: 'transparent',
                  color: '#00595c', fontFamily: 'var(--font-jakarta)', fontSize: '0.65rem',
                  fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer',
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 13 }}>reply</span>
                  Reply
                </button>
              ) : (
                <span style={{
                  fontFamily: 'var(--font-jakarta)', fontSize: '0.62rem', color: '#bec9c9',
                  fontStyle: 'italic', padding: '4px 8px'
                }}>
                  Only classmates can comment
                </span>
              )}

              {isDoubt && (
                <button onClick={() => onResolve(post.id)} style={{
                  padding: '4px 8px', border: `1.5px solid ${post.resolved ? '#bec9c9' : '#00595c'}`,
                  background: post.resolved ? 'transparent' : '#00595c',
                  color: post.resolved ? '#6e7979' : '#fff',
                  fontFamily: 'var(--font-jakarta)', fontSize: '0.65rem',
                  fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer',
                }}>
                  {post.resolved ? 'Reopen' : 'Resolve'}
                </button>
              )}
            </div>
          </div>

          {/* Inline reply input */}
          {showReplyBox && (
            <ReplyInput
              classroomId={classroomId}
              parentId={post.id}
              currentUserHandle={currentUserHandle}
              currentUserId={currentUserId}
              onPosted={newPost => { onNewReply(post.id, newPost); setShowReplyBox(false) }}
              onCancel={() => setShowReplyBox(false)}
              isSeedClassroom={isSeedClassroom}
            />
          )}
        </div>

        {/* Nested replies */}
        {hasReplies && post.replies!.map(reply => (
          <ThreadNode
            key={reply.id}
            post={reply}
            depth={depth + 1}
            classroomId={classroomId}
            userId={userId}
            currentUserHandle={currentUserHandle}
            currentUserId={currentUserId}
            onNewReply={onNewReply}
            onResolve={onResolve}
            onVote={onVote}
            onOpenChat={onOpenChat}
            isSeedClassroom={isSeedClassroom}
          />
        ))}
      </div>
    </div>
  )
}

/* ── Post Doubt Modal ───────────────────────────────────────────────── */
function PostDoubtModal({ 
  classroomId, 
  userRole, 
  onClose, 
  onPosted, 
  isSeedClassroom,
  currentUserHandle,
  currentUserId
}: {
  classroomId: string; userRole: string; onClose: () => void; onPosted: (p: Post) => void; isSeedClassroom?: boolean
  currentUserHandle: string; currentUserId: string
}) {
  const [content, setContent] = useState('')
  const [type, setType] = useState<'doubt' | 'thread' | 'material' | 'announcement'>('doubt')
  const [error, setError] = useState('')
  const [pending, start] = useTransition()
  const canPostMaterial = ['faculty', 'hod', 'principal'].includes(userRole)
  const typeOptions = [
    { value: 'doubt', label: 'Doubt' },
    { value: 'thread', label: 'Thread' },
    ...(canPostMaterial ? [{ value: 'material', label: 'Material' }, { value: 'announcement', label: 'Announcement' }] : []),
  ]

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) { setError('Please enter content.'); return }
    setError('')
    start(async () => {
      if (isSeedClassroom) {
        const mockPost: Post = {
          id: Math.random().toString(36).substring(2, 11),
          content: content.trim(),
          type,
          resolved: false,
          created_at: new Date().toISOString(),
          parent_id: null,
          author: { id: currentUserId, full_name: currentUserHandle, avatar_url: null, role: userRole },
          reactions: [],
        }
        onPosted(mockPost)
        onClose()
        return
      }
      const res = await fetch(`/api/classrooms/${classroomId}/posts`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim(), type }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Something went wrong.'); return }
      onPosted({ ...data, reactions: [], replies: [] })
      onClose()
    })
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100 }} />
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 430, zIndex: 101, background: '#fbf9f4',
        border: '2px solid #00595c', borderBottom: 'none',
        boxShadow: '0 -6px 0 0 #00595c', padding: '24px 20px 32px',
        animation: 'slideUp 0.2s ease',
      }}>
        <style>{`@keyframes slideUp { from { transform: translateX(-50%) translateY(100%); } to { transform: translateX(-50%) translateY(0); } }`}</style>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <span style={{ fontFamily: 'var(--font-newsreader)', fontWeight: 700, fontSize: '1.4rem', color: '#00595c' }}>New Post</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6e7979' }}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            {typeOptions.map(opt => (
              <button key={opt.value} type="button" onClick={() => setType(opt.value as typeof type)} style={{
                padding: '5px 14px', borderRadius: 9999, border: '2px solid', cursor: 'pointer',
                borderColor: type === opt.value ? '#00595c' : '#bec9c9',
                background: type === opt.value ? '#fea619' : 'transparent',
                color: type === opt.value ? '#684000' : '#6e7979',
                fontFamily: 'var(--font-jakarta)', fontSize: '0.65rem',
                fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
              }}>
                {opt.label}
              </button>
            ))}
          </div>

          <textarea value={content} onChange={e => setContent(e.target.value)}
            placeholder={type === 'doubt' ? "What's your doubt or question?" : type === 'material' ? 'Share a resource or note...' : type === 'announcement' ? 'Write an announcement...' : 'Start a discussion...'}
            rows={5}
            style={{
              width: '100%', padding: '12px 14px', border: '2px solid #00595c',
              background: '#fbf9f4', fontFamily: 'var(--font-jakarta)', fontSize: '0.95rem',
              lineHeight: 1.6, color: '#1b1c19', resize: 'none', outline: 'none',
              boxShadow: '3px 3px 0 0 #00595c',
            }}
          />
          {error && <p style={{ marginTop: 8, fontFamily: 'var(--font-jakarta)', fontSize: '0.8rem', color: '#ba1a1a' }}>{error}</p>}
          <button type="submit" disabled={pending} style={{
            marginTop: 14, width: '100%', padding: '14px',
            background: '#fea619', border: '2px solid #00595c', color: '#684000',
            fontFamily: 'var(--font-jakarta)', fontSize: '0.75rem', fontWeight: 700,
            letterSpacing: '0.1em', textTransform: 'uppercase', cursor: pending ? 'not-allowed' : 'pointer',
            boxShadow: '4px 4px 0 0 #00595c', opacity: pending ? 0.7 : 1,
          }}>
            {pending ? 'Posting…' : 'Post →'}
          </button>
        </form>
      </div>
    </>
  )
}

/* ── Main ───────────────────────────────────────────────────────────── */
export default function ClassroomDetailClient({ classroom, initialPosts, doubtCount: initDC, userId, userRole }: Props) {
  const [posts, setPosts] = useState<Post[]>(initialPosts)
  const [showModal, setShowModal] = useState(false)
  const [filter, setFilter] = useState<'all' | 'doubt' | 'material' | 'thread'>('all')
  const [seatCode, setSeatCode] = useState<string | null>(null)
  
  // Custom unique identifiers (Reddit style) per classroom entry
  const [currentUserId, setCurrentUserId] = useState<string>(userId || 'mock-user')
  const [currentUserHandle, setCurrentUserHandle] = useState<string>('u/Student_Scholar')
  
  // Floating Peer-to-Peer direct chat panel status
  const [activeChatUser, setActiveChatUser] = useState<{ id: string; handle: string } | null>(null)

  const router = useRouter()

  // Seed classrooms have non-UUID IDs (e.g. "y2-1") — disable DB operations
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  const isSeedClassroom = !UUID_RE.test(classroom.id)

  // Initialize dynamic session nickname upon classroom entry
  useEffect(() => {
    let storedId = localStorage.getItem(`cv_unique_id_${classroom.id}`)
    let storedHandle = localStorage.getItem(`cv_unique_handle_${classroom.id}`)
    
    if (!storedId) {
      storedId = 'u_' + Math.random().toString(36).substring(2, 11)
      localStorage.setItem(`cv_unique_id_${classroom.id}`, storedId)
    }
    if (!storedHandle) {
      const adjectives = ['Curious', 'Studious', 'Analytical', 'Bright', 'Clever', 'Mindful', 'Academic', 'Creative']
      const nouns = ['Scholar', 'Mind', 'Explorer', 'Thinker', 'Learner', 'Guru', 'Innovator']
      const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
      const noun = nouns[Math.floor(Math.random() * nouns.length)]
      const randNum = Math.floor(100 + Math.random() * 900)
      storedHandle = `u/${adj}_${noun}_${randNum}`
      localStorage.setItem(`cv_unique_handle_${classroom.id}`, storedHandle)
    }
    
    setCurrentUserId(storedId)
    setCurrentUserHandle(storedHandle)
  }, [classroom.id])

  // Load posts from localStorage if it's a seed classroom
  useEffect(() => {
    if (isSeedClassroom) {
      const stored = localStorage.getItem(`cv_seed_posts_${classroom.id}`)
      if (stored) {
        try {
          setPosts(JSON.parse(stored))
        } catch (e) {
          console.error(e)
        }
      }
    }
  }, [classroom.id, isSeedClassroom])

  const saveLocalPosts = (updatedPosts: Post[]) => {
    setPosts(updatedPosts)
    localStorage.setItem(`cv_seed_posts_${classroom.id}`, JSON.stringify(updatedPosts))
  }

  // Auto-enroll on first visit and get seat code
  useEffect(() => {
    fetch(`/api/classrooms/${classroom.id}/enroll`, { method: 'POST' })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.seat_code) setSeatCode(data.seat_code) })
      .catch(() => {})
  }, [classroom.id])

  const openDoubtCount = posts.filter(p => p.type === 'doubt' && !p.resolved && !p.parent_id).length

  /* Add a reply into the tree in-memory */
  function addReply(parentId: string, newPost: Post) {
    function insertInto(list: Post[]): Post[] {
      return list.map(p => {
        if (p.id === parentId) return { ...p, replies: [{ ...newPost, replies: [] }, ...(p.replies ?? [])] }
        return { ...p, replies: insertInto(p.replies ?? []) }
      })
    }
    const updated = insertInto(posts)
    if (isSeedClassroom) {
      saveLocalPosts(updated)
    } else {
      setPosts(updated)
    }
  }

  async function handleResolve(postId: string) {
    if (isSeedClassroom) {
      const updated = posts.map(p => p.id === postId ? { ...p, resolved: !p.resolved } : p)
      saveLocalPosts(updated)
      return
    }
    const res = await fetch(`/api/posts/${postId}/resolve`, { method: 'PATCH' })
    if (res.ok) {
      const updated = await res.json()
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, resolved: updated.resolved } : p))
    }
  }

  async function handleVote(postId: string, direction: 'up' | 'down') {
    if (isSeedClassroom) {
      function updateVote(list: Post[]): Post[] {
        return list.map(p => {
          if (p.id === postId) {
            let reactions = p.reactions.filter(r => r.user_id !== userId)
            const clickedBefore = p.reactions.find(r => r.user_id === userId && r.emoji === direction)
            if (!clickedBefore) {
              reactions.push({ emoji: direction, user_id: userId })
            }
            return { ...p, reactions }
          }
          if (p.replies) return { ...p, replies: updateVote(p.replies) }
          return p
        })
      }
      const updated = updateVote(posts)
      saveLocalPosts(updated)
      return
    }
    const res = await fetch(`/api/posts/${postId}/react`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emoji: direction }),
    })
    if (res.ok) {
      const result = await res.json()
      function updateVote(list: Post[]): Post[] {
        return list.map(p => {
          if (p.id === postId) {
            let reactions = p.reactions.filter(r => r.user_id !== userId)
            if (result.action !== 'removed') {
              reactions.push({ emoji: direction, user_id: userId })
            }
            return { ...p, reactions }
          }
          if (p.replies) return { ...p, replies: updateVote(p.replies) }
          return p
        })
      }
      setPosts(prev => updateVote(prev))
    }
  }

  function handlePosted(newPost: Post) {
    let updated = posts
    if (isSeedClassroom) {
      updated = [{ ...newPost, replies: [] }, ...posts]
      saveLocalPosts(updated)
    } else {
      setPosts(prev => [{ ...newPost, replies: [] }, ...prev])
      router.refresh()
    }

    // "Only others can comment" simulation trigger
    // Automatically generates classmates' response to the user's thread after 2 seconds
    setTimeout(() => {
      const replyId = Math.random().toString(36).substring(2, 11)
      const dynamicReplies = [
        "Thanks for raising this doubt! I was struggling with the exact same unit syllabus problem.",
        "Exactly! The lecture on this was a bit rushed. The formula is actually covered in Chapter 4, section 2.",
        "Excellent thread! Let's check with the faculty during our seminar session tomorrow.",
        "I have a handwritten PDF note on this exact derivation. Let's start a Direct Chat and I'll send it!",
        "Yes! Try rewriting the equations in polar coordinates first; they simplify immediately."
      ]
      const dynamicAuthors = [
        { id: 'sim-user-1', full_name: 'u/Maths_Guru_88', avatar_url: null, role: 'student' },
        { id: 'sim-user-2', full_name: 'u/ECE_Explorer_9', avatar_url: null, role: 'student' },
        { id: 'sim-user-3', full_name: 'u/Theory_Scholar', avatar_url: null, role: 'student' },
        { id: 'sim-user-4', full_name: 'u/Analytical_Mind_42', avatar_url: null, role: 'student' },
      ]
      const randReply = dynamicReplies[Math.floor(Math.random() * dynamicReplies.length)]
      const randAuthor = dynamicAuthors[Math.floor(Math.random() * dynamicAuthors.length)]

      const mockReply: Post = {
        id: replyId,
        content: randReply,
        type: 'thread',
        resolved: false,
        created_at: new Date().toISOString(),
        parent_id: newPost.id,
        author: randAuthor,
        reactions: [{ emoji: 'up', user_id: 'other-user' }],
      }

      addReply(newPost.id, mockReply)
    }, 2000)
  }

  function openChat(recipientId: string, handle: string) {
    setActiveChatUser({ id: recipientId, handle })
  }

  // Build thread tree, then filter top-level posts
  const tree = buildTree(posts)
  const filtered = filter === 'all' ? tree : tree.filter(p => p.type === filter)

  return (
    <div style={{ padding: '20px 18px 0' }}>
      {/* Back */}
      <Link href="/classrooms" style={{
        display: 'inline-flex', alignItems: 'center', gap: 5, textDecoration: 'none',
        color: '#6e7979', fontFamily: 'var(--font-jakarta)', fontSize: '0.75rem',
        fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 20,
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span>
        Classrooms
      </Link>

      {/* Header card */}
      <div style={{ border: '2px solid #00595c', boxShadow: '5px 5px 0 0 #00595c', marginBottom: 28, overflow: 'hidden' }}>
        <div style={{ background: '#00595c', height: 6 }} />
        <div style={{ padding: '20px 20px 18px', background: '#fbf9f4' }}>
          <span style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6e7979', display: 'block', marginBottom: 4 }}>
            {classroom.subject_type === 'core' ? 'Core Subject' : 'Elective'} · Year {classroom.year}
          </span>
          <h1 style={{ fontFamily: 'var(--font-newsreader)', fontWeight: 800, fontSize: '2rem', lineHeight: 1.15, color: '#00595c', marginBottom: 8 }}>
            {classroom.name}
          </h1>
          <p style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.875rem', lineHeight: 1.6, color: '#3e4949' }}>
            {classroom.description}
          </p>
          <div style={{ display: 'flex', gap: 16, marginTop: 14, paddingTop: 12, borderTop: '1.5px solid #bec9c9', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 16 }}>
              <span style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.72rem', fontWeight: 700, color: openDoubtCount > 0 ? '#ba1a1a' : '#6e7979', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>help</span>
                {openDoubtCount} open {openDoubtCount === 1 ? 'doubt' : 'doubts'}
              </span>
              <span style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.72rem', fontWeight: 700, color: '#6e7979', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>group</span>
                {classroom.department}
              </span>
            </div>

            {/* Active Identity & Seat Code Badges */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                background: '#e8f5f5', border: '2px solid #00595c',
                padding: '3px 10px',
              }}>
                <span style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.65rem', fontWeight: 800, color: '#00595c' }}>
                  👤 ID: {currentUserHandle}
                </span>
              </div>
              {seatCode && (
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  background: '#fea619', border: '2px solid #855300',
                  padding: '3px 10px', boxShadow: '2px 2px 0 0 #855300',
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 13, color: '#684000' }}>badge</span>
                  <span style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.65rem', fontWeight: 800, color: '#684000', letterSpacing: '0.08em' }}>
                    {seatCode}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Demo banner for seed classrooms */}
      {isSeedClassroom && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: '#ffddb8', border: '2px solid #855300',
          padding: '10px 14px', marginBottom: 20,
          fontFamily: 'var(--font-jakarta)', fontSize: '0.8rem', color: '#4a2800',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#855300', fontVariationSettings: '"FILL" 1' }}>info</span>
          <span>✨ <strong>Interactive Reddit-style Class</strong> — posts show collapsible tracks, Upvote/Downvote actions, only others replying restrictions, and floating Direct Chat channels with classmates.</span>
        </div>
      )}

      {/* Section header + Post button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h2 style={{ fontFamily: 'var(--font-newsreader)', fontWeight: 700, fontSize: '1.5rem', color: '#1b1c19' }}>
          Doubts &amp; Threads
        </h2>
        <button
          onClick={() => setShowModal(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '9px 14px',
            background: '#fea619',
            border: '2px solid #00595c', color: '#684000',
            fontFamily: 'var(--font-jakarta)', fontSize: '0.65rem', fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            cursor: 'pointer',
            boxShadow: '3px 3px 0 0 #00595c',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 15 }}>add</span>
          Post Doubt
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {[{ key: 'all', label: 'All' }, { key: 'doubt', label: 'Doubts' }, { key: 'thread', label: 'Threads' }, { key: 'material', label: 'Materials' }].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key as typeof filter)} style={{
            padding: '4px 12px', borderRadius: 9999, border: '2px solid', cursor: 'pointer',
            borderColor: filter === f.key ? '#00595c' : '#bec9c9',
            background: filter === f.key ? '#fea619' : 'transparent',
            color: filter === f.key ? '#684000' : '#6e7979',
            fontFamily: 'var(--font-jakarta)', fontSize: '0.65rem', fontWeight: 700,
            letterSpacing: '0.07em', textTransform: 'uppercase',
            boxShadow: filter === f.key ? '2px 2px 0 0 #00595c' : 'none',
          }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Thread list */}
      {filtered.length === 0 ? (
        <div style={{ border: '2px dashed #bec9c9', padding: '40px 20px', textAlign: 'center', marginBottom: 20 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 40, color: '#bec9c9', display: 'block', marginBottom: 10 }}>forum</span>
          <p style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.85rem', color: '#6e7979' }}>No posts yet — tap "Post Doubt" to start the conversation.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 40 }}>
          {filtered.map(post => (
            <ThreadNode
              key={post.id}
              post={post}
              depth={0}
              classroomId={classroom.id}
              userId={userId}
              currentUserHandle={currentUserHandle}
              currentUserId={currentUserId}
              onNewReply={addReply}
              onResolve={handleResolve}
              onVote={handleVote}
              onOpenChat={openChat}
              isSeedClassroom={isSeedClassroom}
            />
          ))}
        </div>
      )}

      {/* Floating DM Chat Panel */}
      {activeChatUser && (
        <DirectChatWidget
          currentUserHandle={currentUserHandle}
          recipient={activeChatUser}
          onClose={() => setActiveChatUser(null)}
          classroomId={classroom.id}
        />
      )}

      {/* Create Post Modal */}
      {showModal && (
        <PostDoubtModal
          classroomId={classroom.id}
          userRole={userRole}
          currentUserHandle={currentUserHandle}
          currentUserId={currentUserId}
          onClose={() => setShowModal(false)}
          onPosted={handlePosted}
          isSeedClassroom={isSeedClassroom}
        />
      )}
    </div>
  )
}
