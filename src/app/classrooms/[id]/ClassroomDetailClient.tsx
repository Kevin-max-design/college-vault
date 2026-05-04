'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

/* ── Types ────────────────────────────────────────────────────────── */
interface Author {
  id: string
  full_name: string
  avatar_url: string | null
  role: string
}

interface Reaction {
  emoji: string
  user_id: string
}

interface Post {
  id: string
  content: string
  type: 'doubt' | 'material' | 'announcement' | 'thread'
  resolved: boolean
  created_at: string
  author: Author | null
  reactions: Reaction[]
  parent_id?: string | null
}

interface Classroom {
  id: string
  name: string
  subject_type: string
  type: string
  department: string
  year: number
  description: string
  entry_code: string
}

interface Props {
  classroom: Classroom
  initialPosts: Post[]
  doubtCount: number
  userId: string
  userRole: string
}

/* ── Helpers ──────────────────────────────────────────────────────── */
function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function authorInitials(name: string | undefined) {
  if (!name) return '?'
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

const POST_TYPE_STYLES: Record<string, { label: string; color: string; icon: string }> = {
  doubt:        { label: 'Doubt',        color: '#ba1a1a', icon: 'help' },
  material:     { label: 'Material',     color: '#00595c', icon: 'book' },
  announcement: { label: 'Announcement', color: '#855300', icon: 'campaign' },
  thread:       { label: 'Thread',       color: '#3e4949', icon: 'forum' },
}

/* ── Post Card ────────────────────────────────────────────────────── */
function PostCard({
  post,
  userId,
  onResolve,
  onReact,
  onReply,
}: {
  post: Post
  userId: string
  onResolve: (id: string) => void
  onReact: (id: string) => void
  onReply?: (id: string) => void
}) {
  const meta = POST_TYPE_STYLES[post.type] ?? POST_TYPE_STYLES.thread
  const isDoubt = post.type === 'doubt'
  const myReaction = post.reactions.find(r => r.user_id === userId)
  const likeCount = post.reactions.filter(r => r.emoji === '👍').length

  return (
    <div style={{
      border: '2px solid',
      borderColor: post.resolved ? '#bec9c9' : '#00595c',
      background: post.resolved ? '#f5f3ee' : '#fbf9f4',
      padding: '16px 18px',
      boxShadow: post.resolved ? 'none' : '4px 4px 0 0 #00595c',
      transition: 'all 0.15s',
    }}>
      {/* Top row: type badge + time */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: 16,
              color: post.resolved ? '#6e7979' : meta.color,
              fontVariationSettings: post.resolved ? "'FILL' 1" : "'FILL' 0",
            }}
          >
            {post.resolved ? 'check_circle' : meta.icon}
          </span>
          <span style={{
            fontFamily: 'var(--font-jakarta)', fontSize: '0.65rem', fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            color: post.resolved ? '#6e7979' : meta.color,
          }}>
            {post.resolved ? 'Resolved' : meta.label}
          </span>
        </div>
        <span style={{
          fontFamily: 'var(--font-jakarta)', fontSize: '0.7rem', color: '#6e7979',
        }}>
          {timeAgo(post.created_at)}
        </span>
      </div>

      {/* Content */}
      <p style={{
        fontFamily: 'var(--font-jakarta)', fontSize: '0.95rem',
        lineHeight: 1.6, color: '#1b1c19', marginBottom: 14,
      }}>
        {post.content}
      </p>

      {/* Footer: author + actions */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        paddingTop: 12, borderTop: '1.5px solid',
        borderColor: post.resolved ? '#bec9c9' : '#00595c',
        flexWrap: 'wrap', gap: 8,
      }}>
        {/* Author */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 26, height: 26, borderRadius: '50%',
            background: '#0d7377', border: '2px solid #00595c',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', flexShrink: 0,
          }}>
            {post.author?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={post.author.avatar_url} alt="" style={{ width: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ color: '#a2f5f9', fontSize: '0.6rem', fontWeight: 700 }}>
                {authorInitials(post.author?.full_name)}
              </span>
            )}
          </div>
          <span style={{
            fontFamily: 'var(--font-jakarta)', fontSize: '0.75rem', fontWeight: 600, color: '#3e4949',
          }}>
            {post.author?.full_name ?? 'Anonymous'}
          </span>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Like */}
          <button
            onClick={() => onReact(post.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '4px 10px', border: '1.5px solid',
              borderColor: myReaction ? '#00595c' : '#bec9c9',
              background: myReaction ? '#e8f5f5' : 'transparent',
              color: myReaction ? '#00595c' : '#6e7979',
              fontFamily: 'var(--font-jakarta)', fontSize: '0.72rem', fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            👍 {likeCount > 0 && likeCount}
          </button>

          {/* Reply */}
          {onReply && (
            <button
              onClick={() => onReply(post.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '4px 10px', border: '1.5px solid #bec9c9',
                background: 'transparent', color: '#6e7979',
                fontFamily: 'var(--font-jakarta)', fontSize: '0.72rem', fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>reply</span>
              Reply
            </button>
          )}

          {/* Resolve (doubts only, own post or faculty) */}
          {isDoubt && (
            <button
              onClick={() => onResolve(post.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '4px 10px', border: '1.5px solid',
                borderColor: post.resolved ? '#bec9c9' : '#00595c',
                background: post.resolved ? '#f5f3ee' : '#00595c',
                color: post.resolved ? '#6e7979' : '#ffffff',
                fontFamily: 'var(--font-jakarta)', fontSize: '0.65rem', fontWeight: 700,
                letterSpacing: '0.06em', textTransform: 'uppercase',
                cursor: 'pointer', transition: 'all 0.15s',
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

/* ── Threaded Post (Recursive) ────────────────────────────────────── */
function ThreadedPost({
  post,
  allPosts,
  userId,
  onResolve,
  onReact,
  onReply,
}: {
  post: Post
  allPosts: Post[]
  userId: string
  onResolve: (id: string) => void
  onReact: (id: string) => void
  onReply: (id: string) => void
}) {
  const replies = allPosts.filter(p => p.parent_id === post.id)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 12 }}>
      <PostCard
        post={post}
        userId={userId}
        onResolve={onResolve}
        onReact={onReact}
        onReply={onReply}
      />
      {replies.length > 0 && (
        <div style={{
          paddingLeft: 24,
          borderLeft: '2px solid #bec9c9',
          marginLeft: 18,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}>
          {replies.map(reply => (
            <ThreadedPost
              key={reply.id}
              post={reply}
              allPosts={allPosts}
              userId={userId}
              onResolve={onResolve}
              onReact={onReact}
              onReply={onReply}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Post Doubt Modal ─────────────────────────────────────────────── */
function PostDoubtModal({
  classroomId,
  userRole,
  onClose,
  onPosted,
  replyToId,
}: {
  classroomId: string
  userRole: string
  onClose: () => void
  onPosted: (post: Post) => void
  replyToId?: string | null
}) {
  const [content, setContent] = useState('')
  const [type, setType] = useState<'doubt' | 'thread' | 'material' | 'announcement'>(replyToId ? 'thread' : 'doubt')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  const canPostMaterial = ['faculty', 'hod', 'principal'].includes(userRole)
  const typeOptions = [
    { value: 'doubt', label: 'Doubt' },
    { value: 'thread', label: 'Thread' },
    ...(canPostMaterial ? [
      { value: 'material', label: 'Material' },
      { value: 'announcement', label: 'Announcement' },
    ] : []),
  ]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) { setError('Please enter your post content.'); return }
    setError('')

    startTransition(async () => {
      try {
        const res = await fetch(`/api/classrooms/${classroomId}/posts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: content.trim(), type, parent_id: replyToId }),
        })
        const data = await res.json()
        if (!res.ok) { setError(data.error ?? 'Something went wrong.'); return }
        onPosted({
          ...data,
          author: data.author,
          reactions: [],
        })
        onClose()
      } catch {
        setError('Network error. Please try again.')
      }
    })
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100,
        }}
      />
      {/* Modal */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 430, zIndex: 101,
        background: '#fbf9f4',
        border: '2px solid #00595c',
        borderBottom: 'none',
        boxShadow: '0 -6px 0 0 #00595c',
        padding: '24px 20px 32px',
        animation: 'slideUp 0.2s ease',
      }}>
        <style>{`@keyframes slideUp { from { transform: translateX(-50%) translateY(100%); } to { transform: translateX(-50%) translateY(0); } }`}</style>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{
            fontFamily: 'var(--font-newsreader)', fontWeight: 700,
            fontSize: '1.4rem', color: '#00595c',
          }}>
            {replyToId ? 'Reply to Post' : 'New Post'}
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6e7979' }}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Type selector */}
          {!replyToId && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              {typeOptions.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setType(opt.value as typeof type)}
                  style={{
                    padding: '5px 14px', borderRadius: 9999,
                    border: '2px solid', cursor: 'pointer',
                    borderColor: type === opt.value ? '#00595c' : '#bec9c9',
                    background: type === opt.value ? '#fea619' : 'transparent',
                    color: type === opt.value ? '#684000' : '#6e7979',
                    fontFamily: 'var(--font-jakarta)', fontSize: '0.65rem',
                    fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                    transition: 'all 0.15s',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {/* Textarea */}
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder={
              type === 'doubt' ? "What's your question or doubt?" :
              type === 'material' ? 'Share a link, note, or resource...' :
              type === 'announcement' ? 'Post an announcement...' :
              'Start a discussion thread...'
            }
            rows={5}
            style={{
              width: '100%', padding: '12px 14px',
              border: '2px solid #00595c', background: '#fbf9f4',
              fontFamily: 'var(--font-jakarta)', fontSize: '0.95rem',
              lineHeight: 1.6, color: '#1b1c19', resize: 'none',
              outline: 'none',
              boxShadow: '3px 3px 0 0 #00595c',
            }}
            onFocus={e => (e.currentTarget.style.boxShadow = '4px 4px 0 0 #fea619')}
            onBlur={e => (e.currentTarget.style.boxShadow = '3px 3px 0 0 #00595c')}
          />

          {error && (
            <p style={{
              marginTop: 8, fontFamily: 'var(--font-jakarta)',
              fontSize: '0.8rem', color: '#ba1a1a',
            }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending}
            style={{
              marginTop: 16, width: '100%', padding: '14px',
              background: '#fea619', border: '2px solid #00595c',
              color: '#684000', fontFamily: 'var(--font-jakarta)',
              fontSize: '0.75rem', fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              cursor: isPending ? 'not-allowed' : 'pointer',
              boxShadow: '4px 4px 0 0 #00595c',
              opacity: isPending ? 0.7 : 1,
              transition: 'all 0.15s',
            }}
          >
            {isPending ? 'Posting…' : 'Post →'}
          </button>
        </form>
      </div>
    </>
  )
}

/* ── Main client component ────────────────────────────────────────── */
export default function ClassroomDetailClient({
  classroom,
  initialPosts,
  doubtCount: initialDoubtCount,
  userId,
  userRole,
}: Props) {
  const [posts, setPosts] = useState<Post[]>(initialPosts)
  const [showModal, setShowModal] = useState(false)
  const [replyToId, setReplyToId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'doubt' | 'material' | 'thread'>('all')
  const router = useRouter()

  const doubtCount = posts.filter(p => p.type === 'doubt' && !p.resolved).length

  async function handleResolve(postId: string) {
    const res = await fetch(`/api/posts/${postId}/resolve`, { method: 'PATCH' })
    if (res.ok) {
      const updated = await res.json()
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, resolved: updated.resolved } : p))
    }
  }

  async function handleReact(postId: string) {
    const res = await fetch(`/api/posts/${postId}/react`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emoji: '👍' }),
    })
    if (res.ok) {
      const result = await res.json()
      setPosts(prev => prev.map(p => {
        if (p.id !== postId) return p
        if (result.action === 'removed') {
          return { ...p, reactions: p.reactions.filter(r => r.user_id !== userId) }
        } else {
          return { ...p, reactions: [...p.reactions, { emoji: '👍', user_id: userId }] }
        }
      }))
    }
  }

  function handlePosted(newPost: Post) {
    setPosts(prev => [...prev, newPost]) // Append new posts to array
    router.refresh()
  }

  function openReplyModal(postId: string) {
    setReplyToId(postId)
    setShowModal(true)
  }

  function openPostModal() {
    setReplyToId(null)
    setShowModal(true)
  }

  const filtered = filter === 'all' ? posts : posts.filter(p => p.type === filter || p.parent_id) // Keep replies in filtered view if parent matches

  const topLevelPosts = filtered.filter(p => !p.parent_id)

  const subjectLabel = classroom.subject_type === 'core' ? 'Core Subject' :
                       classroom.subject_type === 'elective' ? 'Elective' :
                       classroom.subject_type

  return (
    <div style={{ padding: '20px 18px 0' }}>

      {/* Back link */}
      <Link href="/classrooms" style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        textDecoration: 'none', color: '#6e7979',
        fontFamily: 'var(--font-jakarta)', fontSize: '0.75rem',
        fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
        marginBottom: 20,
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span>
        Classrooms
      </Link>

      {/* Header card */}
      <div style={{
        border: '2px solid #00595c',
        boxShadow: '5px 5px 0 0 #00595c',
        marginBottom: 28,
        overflow: 'hidden',
      }}>
        {/* Teal strip */}
        <div style={{ background: '#00595c', height: 6 }} />

        <div style={{ padding: '22px 20px 20px', background: '#fbf9f4' }}>
          <span style={{
            fontFamily: 'var(--font-jakarta)', fontSize: '0.65rem', fontWeight: 700,
            letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6e7979',
            display: 'block', marginBottom: 6,
          }}>
            {subjectLabel}
          </span>
          <h1 style={{
            fontFamily: 'var(--font-newsreader)', fontWeight: 800,
            fontSize: '2rem', lineHeight: 1.15, letterSpacing: '-0.01em',
            color: '#00595c', marginBottom: 10,
          }}>
            {classroom.name}
          </h1>
          <p style={{
            fontFamily: 'var(--font-jakarta)', fontSize: '0.875rem',
            lineHeight: 1.6, color: '#3e4949',
          }}>
            {classroom.description}
          </p>

          {/* Stats */}
          <div style={{
            display: 'flex', gap: 16, marginTop: 16,
            paddingTop: 14, borderTop: '1.5px solid #00595c',
            flexWrap: 'wrap',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              fontFamily: 'var(--font-jakarta)', fontSize: '0.72rem',
              fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
              color: doubtCount > 0 ? '#ba1a1a' : '#6e7979',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>help</span>
              {doubtCount} open {doubtCount === 1 ? 'doubt' : 'doubts'}
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              fontFamily: 'var(--font-jakarta)', fontSize: '0.72rem',
              fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
              color: '#6e7979',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>group</span>
              {classroom.department} · Year {classroom.year}
            </div>
          </div>
        </div>
      </div>

      {/* Posts section header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{
          fontFamily: 'var(--font-newsreader)', fontWeight: 700,
          fontSize: '1.5rem', color: '#1b1c19',
        }}>
          Doubts & Discussion
        </h2>
        <button
          onClick={openPostModal}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '9px 14px',
            background: '#fea619', border: '2px solid #00595c',
            color: '#684000', fontFamily: 'var(--font-jakarta)',
            fontSize: '0.65rem', fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            cursor: 'pointer', boxShadow: '3px 3px 0 0 #00595c',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translate(-1px,-1px)'; e.currentTarget.style.boxShadow = '4px 4px 0 0 #00595c' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translate(0,0)'; e.currentTarget.style.boxShadow = '3px 3px 0 0 #00595c' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 15 }}>add</span>
          Post
        </button>
      </div>

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {([
          { key: 'all', label: 'All' },
          { key: 'doubt', label: 'Doubts' },
          { key: 'thread', label: 'Threads' },
          { key: 'material', label: 'Materials' },
        ] as const).map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              padding: '4px 12px', borderRadius: 9999,
              border: '2px solid', cursor: 'pointer',
              borderColor: filter === f.key ? '#00595c' : '#bec9c9',
              background: filter === f.key ? '#fea619' : 'transparent',
              color: filter === f.key ? '#684000' : '#6e7979',
              fontFamily: 'var(--font-jakarta)', fontSize: '0.65rem',
              fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase',
              transition: 'all 0.15s',
              boxShadow: filter === f.key ? '2px 2px 0 0 #00595c' : 'none',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Posts list */}
      {filtered.length === 0 ? (
        <div style={{
          border: '2px dashed #bec9c9', padding: '40px 20px', textAlign: 'center',
          marginBottom: 20,
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 40, color: '#bec9c9', display: 'block', marginBottom: 10 }}>forum</span>
          <p style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.85rem', color: '#6e7979', marginBottom: 6 }}>
            No posts yet
          </p>
          <p style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.8rem', color: '#bec9c9' }}>
            Tap &ldquo;Post&rdquo; to start the conversation.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
          {topLevelPosts.map(post => (
            <ThreadedPost
              key={post.id}
              post={post}
              allPosts={posts}
              userId={userId}
              onResolve={handleResolve}
              onReact={handleReact}
              onReply={openReplyModal}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <PostDoubtModal
          classroomId={classroom.id}
          userRole={userRole}
          replyToId={replyToId}
          onClose={() => {
            setShowModal(false)
            setReplyToId(null)
          }}
          onPosted={handlePosted}
        />
      )}
    </div>
  )
}
