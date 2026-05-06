'use client'

import { useState, useTransition, useEffect } from 'react'
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

/* ── Helpers ────────────────────────────────────────────────────────── */
function timeAgo(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}
function initials(name = '') { return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() || '?' }

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

/* ── Inline Reply Input ─────────────────────────────────────────────── */
function ReplyInput({ classroomId, parentId, onPosted, onCancel }: {
  classroomId: string; parentId: string
  onPosted: (p: Post) => void; onCancel: () => void
}) {
  const [text, setText] = useState('')
  const [pending, start] = useTransition()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    start(async () => {
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
function ThreadNode({ post, depth, classroomId, userId, onNewReply, onResolve, onReact }: {
  post: Post; depth: number; classroomId: string; userId: string
  onNewReply: (parentId: string, newPost: Post) => void
  onResolve: (id: string) => void
  onReact: (id: string) => void
}) {
  const [showReplyBox, setShowReplyBox] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const meta = TYPE_META[post.type] ?? TYPE_META.thread
  const isDoubt = post.type === 'doubt'
  const myReaction = post.reactions.find(r => r.user_id === userId)
  const likeCount = post.reactions.filter(r => r.emoji === '👍').length
  const hasReplies = (post.replies?.length ?? 0) > 0

  // Depth-based indent colors
  const borderColors = ['#00595c', '#0d7377', '#855300', '#6e7979']
  const indentColor = borderColors[Math.min(depth, borderColors.length - 1)]

  return (
    <div style={{
      marginLeft: depth > 0 ? 16 : 0,
      borderLeft: depth > 0 ? `2px solid ${indentColor}` : 'none',
      paddingLeft: depth > 0 ? 12 : 0,
      marginTop: depth > 0 ? 10 : 0,
    }}>
      {/* Post card */}
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
          {/* Author */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 22, height: 22, borderRadius: '50%', background: '#0d7377',
              border: '1.5px solid #00595c', display: 'flex', alignItems: 'center',
              justifyContent: 'center', overflow: 'hidden', flexShrink: 0,
            }}>
              {post.author?.avatar_url
                ? <img src={post.author.avatar_url} alt="" style={{ width: '100%', objectFit: 'cover' }} />
                : <span style={{ color: '#a2f5f9', fontSize: '0.55rem', fontWeight: 700 }}>{initials(post.author?.full_name)}</span>
              }
            </div>
            <span style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.72rem', fontWeight: 600, color: '#3e4949' }}>
              {post.author?.full_name ?? 'Anonymous'}
            </span>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button onClick={() => onReact(post.id)} style={{
              display: 'flex', alignItems: 'center', gap: 3, padding: '3px 8px',
              border: `1.5px solid ${myReaction ? '#00595c' : '#bec9c9'}`,
              background: myReaction ? '#e8f5f5' : 'transparent',
              color: myReaction ? '#00595c' : '#6e7979',
              fontFamily: 'var(--font-jakarta)', fontSize: '0.7rem', cursor: 'pointer',
            }}>
              👍 {likeCount > 0 && likeCount}
            </button>

            <button onClick={() => setShowReplyBox(v => !v)} style={{
              display: 'flex', alignItems: 'center', gap: 3, padding: '3px 8px',
              border: '1.5px solid #bec9c9', background: 'transparent',
              color: '#00595c', fontFamily: 'var(--font-jakarta)', fontSize: '0.65rem',
              fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 13 }}>reply</span>
              Reply
            </button>

            {isDoubt && (
              <button onClick={() => onResolve(post.id)} style={{
                padding: '3px 8px', border: `1.5px solid ${post.resolved ? '#bec9c9' : '#00595c'}`,
                background: post.resolved ? 'transparent' : '#00595c',
                color: post.resolved ? '#6e7979' : '#fff',
                fontFamily: 'var(--font-jakarta)', fontSize: '0.65rem',
                fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer',
              }}>
                {post.resolved ? 'Reopen' : 'Resolve'}
              </button>
            )}

            {hasReplies && (
              <button onClick={() => setCollapsed(v => !v)} style={{
                padding: '3px 8px', border: '1.5px solid #bec9c9',
                background: 'transparent', color: '#6e7979',
                fontFamily: 'var(--font-jakarta)', fontSize: '0.65rem',
                fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3,
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 13 }}>
                  {collapsed ? 'expand_more' : 'expand_less'}
                </span>
                {post.replies!.length} {post.replies!.length === 1 ? 'reply' : 'replies'}
              </button>
            )}
          </div>
        </div>

        {/* Inline reply input */}
        {showReplyBox && (
          <ReplyInput
            classroomId={classroomId}
            parentId={post.id}
            onPosted={newPost => { onNewReply(post.id, newPost); setShowReplyBox(false) }}
            onCancel={() => setShowReplyBox(false)}
          />
        )}
      </div>

      {/* Nested replies */}
      {!collapsed && hasReplies && post.replies!.map(reply => (
        <ThreadNode
          key={reply.id}
          post={reply}
          depth={depth + 1}
          classroomId={classroomId}
          userId={userId}
          onNewReply={onNewReply}
          onResolve={onResolve}
          onReact={onReact}
        />
      ))}
    </div>
  )
}

/* ── Post Doubt Modal ───────────────────────────────────────────────── */
function PostDoubtModal({ classroomId, userRole, onClose, onPosted }: {
  classroomId: string; userRole: string; onClose: () => void; onPosted: (p: Post) => void
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
  const router = useRouter()

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
    setPosts(prev => insertInto(prev))
  }

  async function handleResolve(postId: string) {
    const res = await fetch(`/api/posts/${postId}/resolve`, { method: 'PATCH' })
    if (res.ok) {
      const updated = await res.json()
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, resolved: updated.resolved } : p))
    }
  }

  async function handleReact(postId: string) {
    const res = await fetch(`/api/posts/${postId}/react`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emoji: '👍' }),
    })
    if (res.ok) {
      const result = await res.json()
      setPosts(prev => prev.map(p => {
        if (p.id !== postId) return p
        if (result.action === 'removed') return { ...p, reactions: p.reactions.filter(r => r.user_id !== userId) }
        return { ...p, reactions: [...p.reactions, { emoji: '👍', user_id: userId }] }
      }))
    }
  }

  function handlePosted(newPost: Post) {
    setPosts(prev => [{ ...newPost, replies: [] }, ...prev])
    router.refresh()
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
            {/* Enrollment Seat Badge */}
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

      {/* Section header + Post button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h2 style={{ fontFamily: 'var(--font-newsreader)', fontWeight: 700, fontSize: '1.5rem', color: '#1b1c19' }}>
          Doubts &amp; Threads
        </h2>
        <button onClick={() => setShowModal(true)} style={{
          display: 'flex', alignItems: 'center', gap: 5, padding: '9px 14px',
          background: '#fea619', border: '2px solid #00595c', color: '#684000',
          fontFamily: 'var(--font-jakarta)', fontSize: '0.65rem', fontWeight: 700,
          letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
          boxShadow: '3px 3px 0 0 #00595c',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 15 }}>add</span>
          Post
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
          <p style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.85rem', color: '#6e7979' }}>No posts yet — tap "Post" to start the conversation.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 16 }}>
          {filtered.map(post => (
            <ThreadNode
              key={post.id}
              post={post}
              depth={0}
              classroomId={classroom.id}
              userId={userId}
              onNewReply={addReply}
              onResolve={handleResolve}
              onReact={handleReact}
            />
          ))}
        </div>
      )}

      {showModal && (
        <PostDoubtModal
          classroomId={classroom.id}
          userRole={userRole}
          onClose={() => setShowModal(false)}
          onPosted={handlePosted}
        />
      )}
    </div>
  )
}
