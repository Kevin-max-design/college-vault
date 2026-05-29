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
  thread:       { label: 'Reply',        color: '#3e4949', icon: 'forum' },
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
  userRole,
  currentUserHandle,
  currentUserId,
  onResolve, 
  onVote 
}: {
  post: Post; classroomId: string; userId: string; userRole: string
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
      padding: '12px 14px',
      boxShadow: post.resolved ? 'none' : '3px 3px 0 0 #00595c',
      cursor: 'pointer',
      transition: 'transform 0.15s ease, box-shadow 0.15s ease',
    }}
    onClick={navigateToPost}
    onMouseEnter={e => {
      if (!post.resolved) {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = '4px 4px 0 0 #00595c'
      }
    }}
    onMouseLeave={e => {
      if (!post.resolved) {
        e.currentTarget.style.transform = 'none'
        e.currentTarget.style.boxShadow = '3px 3px 0 0 #00595c'
      }
    }}
    >
      {/* Header: type badge + time */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 13, color: post.resolved ? '#6e7979' : meta.color }}>
            {post.resolved ? 'check_circle' : meta.icon}
          </span>
          <span style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: post.resolved ? '#6e7979' : meta.color }}>
            {post.resolved ? 'Resolved' : meta.label}
          </span>
        </div>
        <span style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.62rem', color: '#6e7979' }}>{timeAgo(post.created_at)}</span>
      </div>

      {/* Content preview */}
      <p style={{ 
        fontFamily: 'var(--font-jakarta)', 
        fontSize: '0.9rem', 
        lineHeight: 1.5, 
        color: '#1b1c19', 
        marginBottom: post.attachments && post.attachments.length > 0 ? 8 : 12,
        display: '-webkit-box',
        WebkitLineClamp: 3,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}>
        {post.content}
      </p>

      {/* Render attachments */}
      {post.attachments && post.attachments.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: -4, marginBottom: 12 }}>
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
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '4px 8px', border: '1px solid #00595c',
                  background: '#ffffff', color: '#1b1c19',
                  fontFamily: 'var(--font-jakarta)', fontSize: '0.65rem',
                  fontWeight: 700, textDecoration: 'none',
                  boxShadow: '1.5px 1.5px 0 0 #00595c',
                  transition: 'transform 0.1s, box-shadow 0.1s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-1px)'
                  e.currentTarget.style.boxShadow = '2px 2px 0 0 #00595c'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'none'
                  e.currentTarget.style.boxShadow = '1.5px 1.5px 0 0 #00595c'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 13, color: iconColor }}>{icon}</span>
                <span style={{ maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name}</span>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{
            width: 20, height: 20, borderRadius: '50%', background: isMe ? '#fea619' : '#0d7377',
            border: '1.2px solid #00595c', display: 'flex', alignItems: 'center',
            justifyContent: 'center', overflow: 'hidden', flexShrink: 0,
          }}>
            <span style={{ color: isMe ? '#684000' : '#a2f5f9', fontSize: '0.52rem', fontWeight: 700 }}>
              {initials(authorHandle)}
            </span>
          </div>
          <span style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.68rem', fontWeight: 700, color: isMe ? '#855300' : '#3e4949' }}>
            {authorHandle} {isMe && '(You)'}
          </span>
        </div>

        {/* Dashboard actions */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {/* Upvote/Downvote Reddit block */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f5f3ee', padding: '2px 6px', border: '1px solid #00595c' }}>
            <button 
              onClick={() => onVote(post.id, 'up')} 
              title="Upvote"
              style={{
                background: 'transparent',
                border: 'none',
                color: myUpvoted ? '#ff4500' : '#6e7979',
                cursor: 'pointer',
                fontSize: '0.7rem',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              ▲
            </button>
            <button 
              onClick={() => onVote(post.id, 'down')} 
              title="Downvote"
              style={{
                background: 'transparent',
                border: 'none',
                color: myDownvoted ? '#7193ff' : '#6e7979',
                cursor: 'pointer',
                fontSize: '0.7rem',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              ▼
            </button>
          </div>

          {/* Separate replies page link */}
          <button 
            onClick={navigateToPost}
            style={{
              display: 'flex', alignItems: 'center', gap: 3, padding: '4px 8px',
              border: '1px solid #00595c', background: '#fea619',
              color: '#684000', fontFamily: 'var(--font-jakarta)', fontSize: '0.62rem',
              fontWeight: 800, textTransform: 'uppercase', cursor: 'pointer',
              boxShadow: '1.5px 1.5px 0 0 #00595c',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 12 }}>forum</span>
            Replies ({totalComments})
          </button>

          {isDoubt && (isMe || ['faculty', 'hod', 'principal'].includes(userRole)) && (
            <button 
              onClick={() => onResolve(post.id)} 
              style={{
                padding: '4px 8px', border: `1px solid ${post.resolved ? '#bec9c9' : '#00595c'}`,
                background: post.resolved ? 'transparent' : '#00595c',
                color: post.resolved ? '#6e7979' : '#fff',
                fontFamily: 'var(--font-jakarta)', fontSize: '0.62rem',
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
  const [type, setType] = useState<'doubt' | 'material' | 'announcement'>('doubt')
  const [error, setError] = useState('')
  const [pending, start] = useTransition()
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canPostMaterial = ['faculty', 'hod', 'principal'].includes(userRole)
  const typeOptions = [
    { value: 'doubt', label: 'Doubt' },
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
  const [filter, setFilter] = useState<'all' | 'doubt' | 'material'>('all')
  const [seatCode, setSeatCode] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  
  // Custom unique identifiers (Reddit style) per classroom entry
  const [currentUserId, setCurrentUserId] = useState<string>(userId || 'mock-user')
  const [currentUserHandle, setCurrentUserHandle] = useState<string>('u/Student_Scholar')
  const [mounted, setMounted] = useState(false)

  const router = useRouter()

  // isSeedClassroom: true ONLY in degraded mode (DB unavailable, slug resolution failed).
  // In normal operation, page.tsx resolves seed slugs to real UUIDs so this is always false.
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  const isSeedClassroom = !UUID_RE.test(classroom.id)

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
      storedHandle = 'u/Theory_Scholar_' + Math.random().toString(36).substring(2, 6)
      // Fixed: was accidentally saving storedId again instead of storedHandle
      localStorage.setItem(`cv_unique_handle_${classroom.id}`, storedHandle)
    }

    // Clear any stale localStorage seed posts — Supabase is now the single source of truth
    localStorage.removeItem(`cv_seed_posts_${classroom.id}`)

    setCurrentUserId(storedId)
    setCurrentUserHandle(storedHandle)
  }, [classroom.id])

  // Check if enrolled on first visit, do not auto-enroll to let user manually tap "Join Classroom"
  useEffect(() => {
    if (isSeedClassroom) {
      setSeatCode('CV-SEED')
      return
    }
    fetch(`/api/classrooms/${classroom.id}/enroll`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data && Array.isArray(data.members)) {
          const myMember = data.members.find((m: any) => m.user?.id === userId)
          if (myMember?.seat_code) {
            setSeatCode(myMember.seat_code)
          }
          if (myMember?.anonymous_id && myMember?.anonymous_handle) {
            setCurrentUserId(myMember.anonymous_id)
            setCurrentUserHandle(myMember.anonymous_handle)
            localStorage.setItem(`cv_unique_id_${classroom.id}`, myMember.anonymous_id)
            localStorage.setItem(`cv_unique_handle_${classroom.id}`, myMember.anonymous_handle)
          }
        }
      })
      .catch(() => {})
  }, [classroom.id, userId, isSeedClassroom])

  const handleJoinClassroom = useCallback(async () => {
    if (isSeedClassroom) {
      setSeatCode('CV-SEED')
      setToast({ type: 'success', message: 'Joined seed classroom!' })
      setTimeout(() => setToast(null), 3000)
      return
    }

    const previousSeatCode = seatCode
    const optSeatCode = `CV-${Math.floor(1000 + Math.random() * 9000)}`

    // 1. Save previous state. (previousSeatCode)
    // 2. Update UI instantly.
    setSeatCode(optSeatCode)
    setToast({ type: 'success', message: 'Successfully joined classroom! (Optimistic)' })
    setTimeout(() => setToast(null), 3000)

    try {
      // 3. Send API/Supabase request.
      const res = await fetch(`/api/classrooms/${classroom.id}/enroll`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        // 4. If success, keep UI.
        if (data?.seat_code) {
          setSeatCode(data.seat_code)
        }
        if (data?.anonymous_id && data?.anonymous_handle) {
          setCurrentUserId(data.anonymous_id)
          setCurrentUserHandle(data.anonymous_handle)
          localStorage.setItem(`cv_unique_id_${classroom.id}`, data.anonymous_id)
          localStorage.setItem(`cv_unique_handle_${classroom.id}`, data.anonymous_handle)
        }
      } else {
        // 5. If failure, rollback previous state.
        setSeatCode(previousSeatCode)
        setToast({ type: 'error', message: data.error || 'Failed to join classroom.' })
        setTimeout(() => setToast(null), 5000)
      }
    } catch (err: any) {
      // 5. If failure, rollback previous state.
      setSeatCode(previousSeatCode)
      setToast({ type: 'error', message: err.message || 'Network error — failed to join classroom.' })
      setTimeout(() => setToast(null), 5000)
    }
  }, [classroom.id, seatCode, isSeedClassroom])

  // ── Supabase Realtime: live new-post subscription ──────────────────────────
  useEffect(() => {
    if (isSeedClassroom) return // degraded mode: skip Realtime if DB unavailable

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

  /* Add a reply into the tree in-memory (used for simulated classmate auto-replies) */
  const addReply = useCallback((_parentId: string, newPost: Post) => {
    setPosts(prev => [newPost, ...prev])
  }, [])

  const handleResolve = useCallback(async (postId: string) => {
    if (isSeedClassroom) {
      // Degraded mode: optimistic resolve only (no DB connection)
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, resolved: !p.resolved } : p))
      return
    }
    const res = await fetch(`/api/posts/${postId}/resolve`, { method: 'PATCH' })
    if (res.ok) {
      const updated = await res.json()
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, resolved: updated.resolved } : p))
    }
  }, [isSeedClassroom])

  const handleVote = useCallback(async (postId: string, direction: 'up' | 'down') => {
    if (isSeedClassroom) {
      // Degraded mode: optimistic vote only (no DB connection)
      setPosts(prev => prev.map(p => {
        if (p.id !== postId) return p
        const reactions = p.reactions.filter(r => r.user_id !== userId)
        const clickedBefore = p.reactions.find(r => r.user_id === userId && r.emoji === direction)
        if (!clickedBefore) reactions.push({ emoji: direction, user_id: userId })
        return { ...p, reactions }
      }))
      return
    }

    // Stateful Optimistic UI Update
    const previousPosts = posts
    let clickedBefore = false
    
    const optimisticPosts = posts.map(p => {
      if (p.id === postId) {
        const reactions = p.reactions.filter(r => r.user_id !== userId)
        clickedBefore = p.reactions.some(r => r.user_id === userId && r.emoji === direction)
        if (!clickedBefore) {
          reactions.push({ emoji: direction, user_id: userId })
        }
        return { ...p, reactions }
      }
      return p
    })

    setPosts(optimisticPosts)

    try {
      const res = await fetch(`/api/posts/${postId}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji: direction }),
      })
      if (!res.ok) {
        // Rollback state on failure
        setPosts(previousPosts)
        const errData = await res.json().catch(() => ({}))
        alert(errData.error || 'Failed to register reaction.')
      } else {
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
    } catch (err: any) {
      // Rollback state on network exception
      setPosts(previousPosts)
      alert(err.message || 'Network error — failed to register vote.')
    }
  }, [isSeedClassroom, userId, posts])

  function handlePosted(newPost: Post) {
    // Optimistically prepend the new post; Realtime will dedupe if it fires first
    setPosts(prev => [{ ...newPost, replies: [] }, ...prev])
    // Refresh server-side post cache (for next navigation to this page)
    if (!isSeedClassroom) router.refresh()

    // Classroom auto classmate response simulation
    setTimeout(() => {
      const replyId = Math.random().toString(36).substring(2, 11)
      const dynamicReplies = [
        "Thanks for raising this doubt! I was struggling with the exact same unit syllabus problem.",
        "Exactly! The lecture on this was a bit rushed. The formula is actually covered in Chapter 4, section 2.",
        "Excellent question! Let's check with the faculty during our seminar session tomorrow.",
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
  const normalizedPosts = useMemo(() => {
    if (!Array.isArray(posts)) return []
    return posts.map(p => {
      if (p && p.type === 'thread') {
        return { ...p, type: 'doubt' as const }
      }
      return p
    })
  }, [posts])

  const openDoubtCount = useMemo(() => {
    return normalizedPosts.filter(p => p && p.type === 'doubt' && !p.resolved && !p.parent_id).length
  }, [normalizedPosts])

  const filtered = useMemo(() => {
    const tree = buildTree(normalizedPosts)
    return filter === 'all' ? tree : tree.filter(p => p && p.type === filter)
  }, [normalizedPosts, filter])

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
    <div style={{ padding: '16px 16px 80px', position: 'relative' }}>
      <style>{`
        @media (max-width: 480px) {
          .cv-post-btn-mobile::after {
            content: "Post";
          }
        }
        @media (min-width: 481px) {
          .cv-post-btn-mobile::after {
            content: "Post Doubt";
          }
        }
      `}</style>

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
          animation: 'slideInRight 0.3s ease',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
            {toast.type === 'success' ? 'check_circle' : 'error'}
          </span>
          {toast.message}
        </div>
      )}

      {/* Back */}
      <Link href="/classrooms" style={{
        display: 'inline-flex', alignItems: 'center', gap: 5, textDecoration: 'none',
        color: '#6e7979', fontFamily: 'var(--font-jakarta)', fontSize: '0.75rem',
        fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 16,
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span>
        Classrooms
      </Link>

      {/* Simplified Header card */}
      <div style={{ 
        border: '2px solid #00595c', 
        boxShadow: '4px 4px 0 0 #00595c', 
        marginBottom: 16, 
        background: '#fbf9f4',
        padding: '16px',
        position: 'relative'
      }}>
        <h1 style={{ 
          fontFamily: 'var(--font-newsreader)', 
          fontWeight: 800, 
          fontSize: '1.65rem', 
          lineHeight: 1.15, 
          color: '#00595c', 
          marginBottom: 4 
        }}>
          {classroom.name}
        </h1>
        <span style={{ 
          fontFamily: 'var(--font-jakarta)', 
          fontSize: '0.7rem', 
          fontWeight: 700, 
          letterSpacing: '0.05em', 
          textTransform: 'uppercase', 
          color: '#6e7979', 
          display: 'block', 
          marginBottom: 8 
        }}>
          {classroom.subject_type === 'core' ? 'Core Subject' : 'Elective'} · Year {classroom.year}
        </span>
        <p style={{ 
          fontFamily: 'var(--font-jakarta)', 
          fontSize: '0.82rem', 
          lineHeight: 1.5, 
          color: '#3e4949',
          marginBottom: 10
        }}>
          {classroom.description}
        </p>
        
        {/* Open Doubts + Department Inline Row */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 6, 
          fontFamily: 'var(--font-jakarta)', 
          fontSize: '0.72rem', 
          fontWeight: 700, 
          color: '#6e7979',
          flexWrap: 'wrap'
        }}>
          <span style={{ color: openDoubtCount > 0 ? '#ba1a1a' : '#6e7979', display: 'flex', alignItems: 'center', gap: 3 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>help</span>
            {openDoubtCount} open {openDoubtCount === 1 ? 'doubt' : 'doubts'}
          </span>
          <span>•</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>group</span>
            {classroom.department}
          </span>
        </div>
      </div>

      {/* Join Classroom full-width button below header if not joined */}
      {!seatCode && (
        <button
          onClick={handleJoinClassroom}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            background: '#81d4d8',
            border: '2px solid #00595c',
            color: '#004f52',
            padding: '12px',
            boxShadow: '4px 4px 0 0 #00595c',
            fontFamily: 'var(--font-jakarta)',
            fontSize: '0.85rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            cursor: 'pointer',
            marginBottom: 20,
            transition: 'transform 0.1s, box-shadow 0.1s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-1px)'
            e.currentTarget.style.boxShadow = '5px 5px 0 0 #00595c'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'none'
            e.currentTarget.style.boxShadow = '4px 4px 0 0 #00595c'
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>person_add</span>
          Join Classroom
        </button>
      )}

      {/* Optionally show small text if joined */}
      {seatCode && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontFamily: 'var(--font-jakarta)',
          fontSize: '0.72rem',
          color: '#6e7979',
          marginBottom: 16,
          padding: '0 4px'
        }}>
          <span>
            Joined as <strong style={{ color: '#00595c' }}>{currentUserHandle}</strong>
          </span>
        </div>
      )}

      {/* Section header + Post button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-newsreader)', fontWeight: 700, fontSize: '1.35rem', color: '#1b1c19', margin: 0 }}>
            Doubts
          </h2>
          <p style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.72rem', color: '#6e7979', margin: '2px 0 0 0' }}>
            Tap a post to view replies.
          </p>
        </div>
        {(seatCode || isSeedClassroom) && (
          <button
            onClick={() => setShowModal(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '8px 12px',
              background: '#fea619',
              border: '2px solid #00595c',
              color: '#684000',
              fontFamily: 'var(--font-jakarta)', fontSize: '0.68rem', fontWeight: 800,
              letterSpacing: '0.05em', textTransform: 'uppercase',
              cursor: 'pointer',
              boxShadow: '2px 2px 0 0 #00595c',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>add</span>
            <span className="cv-post-btn-mobile" />
          </button>
        )}
      </div>

      {/* Filters Segmented Tabs */}
      <div style={{ 
        display: 'flex', 
        border: '1.5px solid #00595c', 
        background: '#f5f3ee', 
        padding: 2, 
        gap: 2,
        marginBottom: 16,
        maxWidth: 'fit-content'
      }}>
        {[{ key: 'all', label: 'All' }, { key: 'doubt', label: 'Doubts' }, { key: 'material', label: 'Materials' }].map(f => (
          <button 
            key={f.key} 
            onClick={() => setFilter(f.key as typeof filter)} 
            style={{
              padding: '4px 10px', 
              border: 'none', 
              cursor: 'pointer',
              background: filter === f.key ? '#00595c' : 'transparent',
              color: filter === f.key ? '#ffffff' : '#6e7979',
              fontFamily: 'var(--font-jakarta)', 
              fontSize: '0.62rem', 
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.03em',
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Thread list */}
      {filtered.length === 0 ? (
        <div style={{ border: '2px dashed #bec9c9', padding: '32px 16px', textAlign: 'center', marginBottom: 20 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 36, color: '#bec9c9', display: 'block', marginBottom: 8 }}>
            {!seatCode && !isSeedClassroom ? 'lock' : 'forum'}
          </span>
          <p style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.8rem', color: '#6e7979' }}>
            {!seatCode && !isSeedClassroom
              ? 'Join this classroom to post doubts.'
              : 'No posts yet. Start the first discussion.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
          {filtered.map(post => (
            <PostCard
              key={post.id}
              post={post}
              classroomId={classroom.id}
              userId={userId}
              userRole={userRole}
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
