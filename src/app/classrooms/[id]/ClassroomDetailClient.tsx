'use client'

import { useState, useTransition, useEffect, useMemo, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

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
  attachments?: { name: string; url: string; type: string }[]
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
  if (!Array.isArray(posts)) return []
  
  posts.forEach(p => {
    if (p && p.id) {
      map.set(p.id, { ...p, replies: [] })
    }
  })
  
  map.forEach(p => {
    if (p.parent_id && map.has(p.parent_id)) {
      map.get(p.parent_id)!.replies!.push(p)
    } else {
      roots.push(p)
    }
  })
  return roots
}

/* Recursive count of all replies */
function countReplies(post: Post): number {
  let count = post.replies?.length ?? 0
  post.replies?.forEach(r => {
    count += countReplies(r)
  })
  return count
}

/* Helper to flatten posts (recursively extracts nested replies from seed arrays) */
export function flattenPosts(posts: Post[]): Post[] {
  const result: Post[] = []
  function recurse(list: Post[]) {
    if (!Array.isArray(list)) return
    list.forEach(p => {
      if (!p) return
      const { replies, ...rest } = p
      result.push({ ...rest, replies: [] })
      if (replies && replies.length > 0) {
        recurse(replies)
      }
    })
  }
  recurse(posts)
  return result
}

/* ── Clean Doubt Dashboard Card ─────────────────────────────────────── */
function PostCard({ 
  post, 
  classroomId, 
  userId, 
  currentUserHandle,
  currentUserId,
  onResolve, 
  onVote 
}: {
  post: Post; classroomId: string; userId: string
  currentUserHandle: string; currentUserId: string
  onResolve: (id: string) => void
  onVote: (id: string, direction: 'up' | 'down') => void
}) {
  const router = useRouter()
  const meta = TYPE_META[post.type] ?? TYPE_META.thread
  const isDoubt = post.type === 'doubt'

  // Format existing author names deterministically into Reddit-style handles
  const rawAuthorName = post.author?.full_name ?? 'Anonymous'
  const authorId = post.author?.id ?? 'mock-author'
  
  let authorHandle = rawAuthorName
  if (!rawAuthorName.startsWith('u/')) {
    if (authorId === currentUserId || authorId === userId || authorId === 'mock-user' || rawAuthorName === 'You (Student)') {
      authorHandle = currentUserHandle
    } else {
      const cleanName = rawAuthorName.replace(/\s+/g, '_')
      authorHandle = `u/${cleanName}_${authorId.substring(0, 4)}`
    }
  }

  const isMe = authorHandle === currentUserHandle || authorId === currentUserId || authorId === userId || authorId === 'mock-user'

  // Upvotes and Downvotes
  const myUpvoted = post.reactions.some(r => r.user_id === userId && r.emoji === 'up')
  const myDownvoted = post.reactions.some(r => r.user_id === userId && r.emoji === 'down')
  
  const upVotes = post.reactions.filter(r => r.emoji === 'up').length
  const downVotes = post.reactions.filter(r => r.emoji === 'down').length
  const legacyLikes = post.reactions.filter(r => r.emoji === '👍').length
  const score = legacyLikes + upVotes - downVotes + 6 // Beautiful positive baseline score

  const totalComments = countReplies(post)

  function navigateToPost() {
    router.push(`/classrooms/${classroomId}/posts/${post.id}`)
  }

  return (
    <div style={{
      border: `2px solid ${post.resolved ? '#bec9c9' : '#00595c'}`,
      background: post.resolved ? '#f5f3ee' : '#fbf9f4',
      padding: '16px 18px',
      boxShadow: post.resolved ? 'none' : '4px 4px 0 0 #00595c',
      cursor: 'pointer',
      transition: 'transform 0.15s ease, box-shadow 0.15s ease',
    }}
    onClick={navigateToPost}
    onMouseEnter={e => {
      if (!post.resolved) {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = '6px 6px 0 0 #00595c'
      }
    }}
    onMouseLeave={e => {
      if (!post.resolved) {
        e.currentTarget.style.transform = 'none'
        e.currentTarget.style.boxShadow = '4px 4px 0 0 #00595c'
      }
    }}
    >
      {/* Header: type badge + time */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
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

      {/* Content preview */}
      <p style={{ 
        fontFamily: 'var(--font-jakarta)', 
        fontSize: '0.95rem', 
        lineHeight: 1.6, 
        color: '#1b1c19', 
        marginBottom: post.attachments && post.attachments.length > 0 ? 10 : 14,
        display: '-webkit-box',
        WebkitLineClamp: 3,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}>
        {post.content}
      </p>

      {/* Render attachments */}
      {post.attachments && post.attachments.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: -6, marginBottom: 14 }}>
          {post.attachments.map((att, i) => {
            const isPdf = att.name.toLowerCase().endsWith('.pdf')
            const isPpt = att.name.toLowerCase().endsWith('.ppt') || att.name.toLowerCase().endsWith('.pptx')
            const icon = isPdf ? 'picture_as_pdf' : isPpt ? 'present_to_all' : 'description'
            const iconColor = isPdf ? '#ba1a1a' : isPpt ? '#fea619' : '#00595c'
            return (
              <a 
                key={i}
                href={att.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()} // prevent card navigation trigger
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '5px 10px', border: '1.5px solid #00595c',
                  background: '#ffffff', color: '#1b1c19',
                  fontFamily: 'var(--font-jakarta)', fontSize: '0.7rem',
                  fontWeight: 700, textDecoration: 'none',
                  boxShadow: '2px 2px 0 0 #00595c',
                  transition: 'transform 0.1s, box-shadow 0.1s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-1px)'
                  e.currentTarget.style.boxShadow = '3px 3px 0 0 #00595c'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'none'
                  e.currentTarget.style.boxShadow = '2px 2px 0 0 #00595c'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 15, color: iconColor }}>{icon}</span>
                <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name}</span>
              </a>
            )
          })}
        </div>
      )}

      {/* Footer controls */}
      <div 
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}
        onClick={e => e.stopPropagation()} // Prevent card navigation when clicking specific buttons
      >
        {/* Author badge */}
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
        </div>

        {/* Dashboard actions */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Upvote/Downvote Reddit block */}
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
              }}
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
              }}
            >
              ▼
            </button>
          </div>

          {/* Separate thread page link */}
          <button 
            onClick={navigateToPost}
            style={{
              display: 'flex', alignItems: 'center', gap: 3, padding: '5px 10px',
              border: '1.5px solid #00595c', background: '#fea619',
              color: '#684000', fontFamily: 'var(--font-jakarta)', fontSize: '0.65rem',
              fontWeight: 800, textTransform: 'uppercase', cursor: 'pointer',
              boxShadow: '2px 2px 0 0 #00595c',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 13 }}>forum</span>
            View Discussion ({totalComments})
          </button>

          {isDoubt && (
            <button 
              onClick={() => onResolve(post.id)} 
              style={{
                padding: '5px 10px', border: `1.5px solid ${post.resolved ? '#bec9c9' : '#00595c'}`,
                background: post.resolved ? 'transparent' : '#00595c',
                color: post.resolved ? '#6e7979' : '#fff',
                fontFamily: 'var(--font-jakarta)', fontSize: '0.65rem',
                fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer',
              }}
            >
              {post.resolved ? 'Reopen' : 'Resolve'}
            </button>
          )}
        </div>
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
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canPostMaterial = ['faculty', 'hod', 'principal'].includes(userRole)
  const typeOptions = [
    { value: 'doubt', label: 'Doubt' },
    { value: 'thread', label: 'Thread' },
    ...(canPostMaterial ? [{ value: 'material', label: 'Material' }, { value: 'announcement', label: 'Announcement' }] : []),
  ]

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files) return
    const arr = Array.from(files)
    setAttachedFiles(prev => [...prev, ...arr])
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) { setError('Please enter content.'); return }
    setError('')
    start(async () => {
      let uploadedAttachments: { name: string; url: string; type: string }[] = []

      try {
        if (attachedFiles.length > 0 && !isSeedClassroom) {
          const { createClient } = await import('@/lib/supabase/client')
          const supabase = createClient()
          
          for (const file of attachedFiles) {
            const filePath = `${classroomId}/${Date.now()}-${file.name}`
            const { error: uploadError } = await supabase.storage
              .from('attachments')
              .upload(filePath, file, { cacheControl: '3600', upsert: true })
            
            if (!uploadError) {
              const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(filePath)
              uploadedAttachments.push({
                name: file.name,
                url: urlData.publicUrl,
                type: file.type || 'application/octet-stream'
              })
            } else {
              console.error('File upload failed:', uploadError)
              throw new Error(`Upload failed: ${uploadError.message}`)
            }
          }
        }
      } catch (err: any) {
        setError(err.message || 'File upload failed.')
        return
      }

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
          attachments: attachedFiles.map(file => ({
            name: file.name,
            url: '#',
            type: file.type || 'application/octet-stream'
          }))
        }
        onPosted(mockPost)
        onClose()
        return
      }

      const res = await fetch(`/api/classrooms/${classroomId}/posts`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim(), type, attachments: uploadedAttachments }),
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

          {/* Hidden File Input */}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            multiple 
            accept=".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.zip" 
            style={{ display: 'none' }} 
          />

          {/* Neobrutalist Attachment Button */}
          <button 
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              marginTop: 12, display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', border: '2px solid #00595c', background: '#e8f5f5',
              color: '#00595c', fontFamily: 'var(--font-jakarta)', fontSize: '0.7rem',
              fontWeight: 800, textTransform: 'uppercase', cursor: 'pointer',
              boxShadow: '2px 2px 0 0 #00595c',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>attach_file</span>
            Attach Docs / Slides
          </button>

          {/* Attached Files List */}
          {attachedFiles.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
              {attachedFiles.map((file, idx) => (
                <div key={idx} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '6px 10px', border: '1.5px solid #00595c', background: '#fff',
                  fontFamily: 'var(--font-jakarta)', fontSize: '0.75rem',
                }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '85%' }}>
                    📎 {file.name}
                  </span>
                  <button 
                    type="button" 
                    onClick={() => setAttachedFiles(prev => prev.filter((_, i) => i !== idx))}
                    style={{ background: 'none', border: 'none', color: '#ba1a1a', fontWeight: 800, cursor: 'pointer' }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

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

/* ── Main Dashboard ─────────────────────────────────────────────────── */
export default function ClassroomDetailClient({ classroom, initialPosts, doubtCount: initDC, userId, userRole }: Props) {
  const [posts, setPosts] = useState<Post[]>(() => flattenPosts(initialPosts))
  const [showModal, setShowModal] = useState(false)
  const [filter, setFilter] = useState<'all' | 'doubt' | 'material' | 'thread'>('all')
  const [seatCode, setSeatCode] = useState<string | null>(null)
  
  // Custom unique identifiers (Reddit style) per classroom entry
  const [currentUserId, setCurrentUserId] = useState<string>(userId || 'mock-user')
  const [currentUserHandle, setCurrentUserHandle] = useState<string>('u/Student_Scholar')
  const [mounted, setMounted] = useState(false)

  const router = useRouter()

  // Seed classrooms have non-UUID IDs (e.g. "y2-1") — disable DB operations
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  const isSeedClassroom = !UUID_RE.test(classroom.id)
  // Debounce timer ref for localStorage writes
  const lsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Initialize dynamic session nickname upon classroom entry
  useEffect(() => {
    setMounted(true)
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
          setPosts(flattenPosts(JSON.parse(stored)))
        } catch (e) {
          console.error(e)
        }
      }
    }
  }, [classroom.id, isSeedClassroom])

  // Auto-enroll on first visit and get seat code
  useEffect(() => {
    fetch(`/api/classrooms/${classroom.id}/enroll`, { method: 'POST' })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.seat_code) setSeatCode(data.seat_code) })
      .catch(() => {})
  }, [classroom.id])

  // ── Supabase Realtime: live new-post subscription (real classrooms only) ──
  useEffect(() => {
    if (isSeedClassroom) return // seed classrooms use localStorage, no Realtime

    const supabase = createClient()
    const channel = supabase
      .channel(`classroom-posts-${classroom.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts', filter: `classroom_id=eq.${classroom.id}` },
        async (payload) => {
          const newPost = payload.new as { id: string; parent_id: string | null }
          // Fetch full post with author + reactions
          const { data } = await supabase
            .from('posts')
            .select('id, content, type, resolved, created_at, parent_id, attachments, author:profiles!posts_author_id_fkey(id, full_name, avatar_url, role), reactions(emoji, user_id)')
            .eq('id', newPost.id)
            .single()
          if (!data) return
          const fullPost = {
            ...data,
            author: Array.isArray(data.author) ? data.author[0] : data.author,
            reactions: data.reactions ?? [],
            replies: []
          } as Post
          setPosts(prev => {
            if (prev.some(p => p.id === fullPost.id)) return prev // dedupe
            if (fullPost.parent_id) return prev // replies handled separately
            return [fullPost, ...prev]
          })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [classroom.id, isSeedClassroom])

  const saveLocalPosts = useCallback((updatedPosts: Post[]) => {
    setPosts(updatedPosts)
    // Debounce localStorage write — max 1 write per 300ms
    if (lsTimerRef.current) clearTimeout(lsTimerRef.current)
    lsTimerRef.current = setTimeout(() => {
      localStorage.setItem(`cv_seed_posts_${classroom.id}`, JSON.stringify(updatedPosts))
    }, 300)
  }, [classroom.id])

  /* Add a reply into the tree in-memory (needed for classmate's auto reply trigger) */
  const addReply = useCallback((parentId: string, newPost: Post) => {
    setPosts(prev => {
      const updated = [newPost, ...prev]
      if (isSeedClassroom) {
        if (lsTimerRef.current) clearTimeout(lsTimerRef.current)
        lsTimerRef.current = setTimeout(() => {
          localStorage.setItem(`cv_seed_posts_${classroom.id}`, JSON.stringify(updated))
        }, 300)
      }
      return updated
    })
  }, [classroom.id, isSeedClassroom])

  const handleResolve = useCallback(async (postId: string) => {
    if (isSeedClassroom) {
      setPosts(prev => {
        const updated = prev.map(p => p.id === postId ? { ...p, resolved: !p.resolved } : p)
        if (lsTimerRef.current) clearTimeout(lsTimerRef.current)
        lsTimerRef.current = setTimeout(() => {
          localStorage.setItem(`cv_seed_posts_${classroom.id}`, JSON.stringify(updated))
        }, 300)
        return updated
      })
      return
    }
    const res = await fetch(`/api/posts/${postId}/resolve`, { method: 'PATCH' })
    if (res.ok) {
      const updated = await res.json()
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, resolved: updated.resolved } : p))
    }
  }, [classroom.id, isSeedClassroom])

  const handleVote = useCallback(async (postId: string, direction: 'up' | 'down') => {
    if (isSeedClassroom) {
      setPosts(prev => {
        const updated = prev.map(p => {
          if (p.id === postId) {
            const reactions = p.reactions.filter(r => r.user_id !== userId)
            const clickedBefore = p.reactions.find(r => r.user_id === userId && r.emoji === direction)
            if (!clickedBefore) reactions.push({ emoji: direction, user_id: userId })
            return { ...p, reactions }
          }
          return p
        })
        if (lsTimerRef.current) clearTimeout(lsTimerRef.current)
        lsTimerRef.current = setTimeout(() => {
          localStorage.setItem(`cv_seed_posts_${classroom.id}`, JSON.stringify(updated))
        }, 300)
        return updated
      })
      return
    }
    const res = await fetch(`/api/posts/${postId}/react`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emoji: direction }),
    })
    if (res.ok) {
      const result = await res.json()
      setPosts(prev => {
        return prev.map(p => {
          if (p.id === postId) {
            const reactions = p.reactions.filter(r => r.user_id !== userId)
            if (result.action !== 'removed') reactions.push({ emoji: direction, user_id: userId })
            return { ...p, reactions }
          }
          return p
        })
      })
    }
  }, [classroom.id, isSeedClassroom, userId])

  function handlePosted(newPost: Post) {
    let updated = posts
    if (isSeedClassroom) {
      updated = [{ ...newPost, replies: [] }, ...posts]
      saveLocalPosts(updated)
    } else {
      setPosts(prev => [{ ...newPost, replies: [] }, ...prev])
      router.refresh()
    }

    // Classroom auto classmate response simulation
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

  // ── Memoized: build tree + filter only when posts/filter change ──
  const openDoubtCount = useMemo(() => {
    if (!Array.isArray(posts)) return 0
    return posts.filter(p => p && p.type === 'doubt' && !p.resolved && !p.parent_id).length
  }, [posts])

  const filtered = useMemo(() => {
    if (!Array.isArray(posts)) return []
    const cleanPosts = posts.filter(p => p && p.id)
    const tree = buildTree(cleanPosts)
    return filter === 'all' ? tree : tree.filter(p => p && p.type === filter)
  }, [posts, filter])

  if (!mounted) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh', fontFamily: 'var(--font-jakarta)' }}>
        <div style={{ color: '#00595c', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="material-symbols-outlined" style={{ animation: 'spin 1s linear infinite' }}>sync</span>
          Loading Classroom...
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    )
  }

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

            {/* Active Identity Badges */}
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

      {/* Demo banner */}
      {isSeedClassroom && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: '#ffddb8', border: '2px solid #855300',
          padding: '10px 14px', marginBottom: 20,
          fontFamily: 'var(--font-jakarta)', fontSize: '0.8rem', color: '#4a2800',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#855300', fontVariationSettings: '"FILL" 1' }}>info</span>
          <span>✨ <strong>Classroom Feed</strong> — click <strong>"View Discussion"</strong> on any doubt or thread to view collapsible Reddit nested comments and chat directly with your classmates.</span>
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
            <PostCard
              key={post.id}
              post={post}
              classroomId={classroom.id}
              userId={userId}
              currentUserHandle={currentUserHandle}
              currentUserId={currentUserId}
              onResolve={handleResolve}
              onVote={handleVote}
            />
          ))}
        </div>
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
