'use client'

import { useState, useTransition, useEffect, useMemo, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import dynamic from 'next/dynamic'

const DirectChatWidget = dynamic(() => import('@/app/components/DirectChatWidget'), {
  ssr: false,
})

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
  postId: string
  initialPosts: Post[]
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

function ReplyInput({ 
  classroomId, 
  parentId, 
  onPosted, 
  onCancel, 
  isSeedClassroom, 
  currentUserHandle, 
  currentUserId,
  posts,
  setPosts
}: {
  classroomId: string; parentId: string
  onPosted: (p: Post) => void; onCancel: () => void; isSeedClassroom?: boolean
  currentUserHandle: string; currentUserId: string
  posts: Post[]
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>
}) {
  const [text, setText] = useState('')
  const [pending, start] = useTransition()
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files) return
    setAttachedFiles(prev => [...prev, ...Array.from(files)])
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
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
        alert(err.message || 'File upload failed.')
        return
      }

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
          attachments: attachedFiles.map(file => ({
            name: file.name,
            url: '#',
            type: file.type || 'application/octet-stream'
          }))
        }
        onPosted(mockReply)
        setText('')
        setAttachedFiles([])
        onCancel()
        return
      }

      // Phase 9 Stateful Optimistic UI Update
      const originalText = text
      const previousPosts = posts
      const tempId = `temp-${Date.now()}`
      const optReply: Post = {
        id: tempId,
        content: text.trim(),
        type: 'thread',
        resolved: false,
        created_at: new Date().toISOString(),
        parent_id: parentId,
        author: { id: currentUserId, full_name: currentUserHandle, avatar_url: null, role: 'student' },
        reactions: [],
        attachments: attachedFiles.map(file => ({
          name: file.name,
          url: '#',
          type: file.type || 'application/octet-stream'
        }))
      }

      // Step 2: Update UI instantly
      setPosts(prev => [optReply, ...prev])
      setText('')
      setAttachedFiles([])
      onCancel()

      try {
        // Step 3: Send API request
        const res = await fetch(`/api/classrooms/${classroomId}/posts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: originalText.trim(), type: 'thread', parent_id: parentId, attachments: uploadedAttachments }),
        })
        if (res.ok) { 
          const added = await res.json()
          const realPost = { ...added, reactions: [], replies: [] }
          // Step 4: If success, keep UI (swap temp reply with real reply)
          setPosts(prev => prev.map(p => p.id === tempId ? realPost : p))
        } else {
          // Step 5 & 6: If failure, rollback and show error
          setPosts(previousPosts)
          const errData = await res.json().catch(() => ({}))
          alert(errData.error || 'Failed to post reply.')
        }
      } catch (err: any) {
        // Step 5 & 6: If failure, rollback and show error
        setPosts(previousPosts)
        alert(err.message || 'Network error — failed to post reply.')
      }
    })
  }

  return (
    <div style={{ marginTop: 10 }}>
      <form onSubmit={submit} style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
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
          <button type="button" onClick={() => fileInputRef.current?.click()} style={{
            padding: '6px 14px', background: 'transparent', border: '2px solid #00595c',
            color: '#00595c', fontFamily: 'var(--font-jakarta)', fontSize: '0.65rem',
            fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center'
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 13 }}>attach_file</span>
            Files
          </button>
          <input
            type="file"
            multiple
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <button type="button" onClick={onCancel} style={{
            padding: '6px 14px', background: 'transparent', border: '2px solid #bec9c9',
            color: '#6e7979', fontFamily: 'var(--font-jakarta)', fontSize: '0.65rem',
            fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer',
          }}>
            Cancel
          </button>
        </div>
      </form>
      {attachedFiles.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
          {attachedFiles.map((f, idx) => (
            <div key={idx} style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              background: '#e8f5f5', border: '1.5px solid #00595c',
              padding: '2px 6px',
              fontFamily: 'var(--font-jakarta)', fontSize: '0.7rem', color: '#00595c'
            }}>
              <span>{f.name}</span>
              <span 
                className="material-symbols-outlined" 
                onClick={() => setAttachedFiles(prev => prev.filter((_, i) => i !== idx))}
                style={{ fontSize: 12, cursor: 'pointer', fontWeight: 'bold' }}
              >
                close
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Thread Node (recursive comments tree) ────────────────────────────────────────── */
function ThreadNode({ 
  post, 
  depth, 
  classroomId, 
  userId, 
  userRole,
  currentUserHandle,
  currentUserId,
  onNewReply, 
  onResolve, 
  onVote, 
  onOpenChat,
  isSeedClassroom,
  posts,
  setPosts
}: {
  post: Post; depth: number; classroomId: string; userId: string; userRole: string
  currentUserHandle: string; currentUserId: string
  onNewReply: (parentId: string, newPost: Post) => void
  onResolve: (id: string) => void
  onVote: (id: string, direction: 'up' | 'down') => void
  onOpenChat: (recipientId: string, handle: string) => void
  isSeedClassroom?: boolean
  posts: Post[]
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>
}) {
  const [showReplyBox, setShowReplyBox] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const meta = TYPE_META[post.type] ?? TYPE_META.thread
  const isDoubt = post.type === 'doubt'
  const hasReplies = (post.replies?.length ?? 0) > 0

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

  const myUpvoted = post.reactions.some(r => r.user_id === userId && r.emoji === 'up')
  const myDownvoted = post.reactions.some(r => r.user_id === userId && r.emoji === 'down')
  
  const upVotes = post.reactions.filter(r => r.emoji === 'up').length
  const downVotes = post.reactions.filter(r => r.emoji === 'down').length
  const legacyLikes = post.reactions.filter(r => r.emoji === '👍').length
  
  const score = legacyLikes + upVotes - downVotes + Math.max(1, 4 - depth)

  const borderColors = ['#00595c', '#0d7377', '#855300', '#6e7979']
  const indentColor = borderColors[Math.min(depth, borderColors.length - 1)]

  if (collapsed) {
    return (
      <div style={{
        marginLeft: 16,
        borderLeft: `2px dashed #bec9c9`,
        paddingLeft: 12,
        marginTop: 10,
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
      marginTop: 10,
      display: 'flex',
      gap: 10,
    }}>
      {/* Clickable Reddit Left Collapsible Track Line */}
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

      {/* Main Comment Node Wrapper */}
      <div style={{ flex: 1 }}>
        <div style={{
          border: `2px solid ${post.resolved ? '#bec9c9' : indentColor}`,
          background: post.resolved ? '#f5f3ee' : '#fdfcf8',
          padding: '12px 14px',
          boxShadow: 'none',
        }}>
          {/* Header */}
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
          <p style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.875rem', lineHeight: 1.6, color: '#1b1c19', marginBottom: post.attachments && post.attachments.length > 0 ? 8 : 10 }}>
            {post.content}
          </p>

          {/* Render attachments */}
          {post.attachments && post.attachments.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: -4, marginBottom: 10 }}>
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
                    <span style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name}</span>
                  </a>
                )
              })}
            </div>
          )}

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

            {/* Actions: Upvote/Downvote & Reply */}
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
              {(!isMe || ['hod', 'faculty', 'principal'].includes(userRole)) ? (
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
              posts={posts}
              setPosts={setPosts}
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
            userRole={userRole}
            currentUserHandle={currentUserHandle}
            currentUserId={currentUserId}
            onNewReply={onNewReply}
            onResolve={onResolve}
            onVote={onVote}
            onOpenChat={onOpenChat}
            isSeedClassroom={isSeedClassroom}
            posts={posts}
            setPosts={setPosts}
          />
        ))}
      </div>
    </div>
  )
}

/* ── Main Detail Component ────────────────────────────────────────── */
export default function PostDetailClient({ classroom, postId, initialPosts, userId, userRole }: Props) {
  const [posts, setPosts] = useState<Post[]>(() => flattenPosts(initialPosts))
  const [directCommentText, setDirectCommentText] = useState('')
  const [commentPending, startComment] = useTransition()
  const [directAttachedFiles, setDirectAttachedFiles] = useState<File[]>([])
  const directFileInputRef = useRef<HTMLInputElement>(null)

  const [currentUserId, setCurrentUserId] = useState<string>(userId || 'mock-user')
  const [currentUserHandle, setCurrentUserHandle] = useState<string>('u/Student_Scholar')
  const [mounted, setMounted] = useState(false)
  
  const [activeChatUser, setActiveChatUser] = useState<{ id: string; handle: string } | null>(null)

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  const isSeedClassroom = !UUID_RE.test(classroom.id)

  // Initialize dynamic session nickname
  useEffect(() => {
    setMounted(true)
    let storedId = localStorage.getItem(`cv_unique_id_${classroom.id}`)
    let storedHandle = localStorage.getItem(`cv_unique_handle_${classroom.id}`)
    
    if (!storedId) {
      storedId = 'u_' + Math.random().toString(36).substring(2, 11)
      localStorage.setItem(`cv_unique_id_${classroom.id}`, storedId)
    }
    
    const dept = classroom.department || 'CSE'
    if (userRole === 'hod') {
      storedHandle = `HOD ${dept}`
      localStorage.setItem(`cv_unique_handle_${classroom.id}`, storedHandle)
    } else if (userRole === 'faculty') {
      storedHandle = `Faculty_${dept}`
      localStorage.setItem(`cv_unique_handle_${classroom.id}`, storedHandle)
    } else if (!storedHandle || storedHandle.startsWith('HOD ') || storedHandle.startsWith('Faculty_')) {
      const adjectives = ['Curious', 'Studious', 'Analytical', 'Bright', 'Clever', 'Mindful', 'Academic', 'Creative']
      const nouns = ['Scholar', 'Mind', 'Explorer', 'Thinker', 'Learner', 'Guru', 'Innovator']
      const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
      const noun = nouns[Math.floor(Math.random() * nouns.length)]
      const randNum = Math.floor(100 + Math.random() * 900)
      storedHandle = `u/${adj}_${noun}_${randNum}`
      localStorage.setItem(`cv_unique_handle_${classroom.id}`, storedHandle)
    }
    
    // Clear any stale localStorage seed posts — Supabase is now the source of truth
    localStorage.removeItem(`cv_seed_posts_${classroom.id}`)

    setCurrentUserId(storedId)
    setCurrentUserHandle(storedHandle)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classroom.id, classroom.department, userRole])

  // ── Supabase Realtime: live reply subscription ─────────────────────────────
  useEffect(() => {
    if (isSeedClassroom) return // degraded mode: no Realtime

    const supabase = createClient()
    const channel = supabase
      .channel(`post-detail-posts-${classroom.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts', filter: `classroom_id=eq.${classroom.id}` },
        async (payload) => {
          const raw = payload.new as any
          // Fetch only the joined fields we need (author + reactions) — NOT the whole post
          // This avoids a full round-trip and uses a targeted single-row query
          const { data: joined } = await supabase
            .from('posts')
            .select('author:profiles!posts_author_id_fkey(id, full_name, avatar_url, role), reactions(emoji, user_id), attachments')
            .eq('id', raw.id)
            .single()

          const fullPost: Post = {
            id: raw.id,
            content: raw.content,
            type: raw.type,
            resolved: raw.resolved,
            created_at: raw.created_at,
            parent_id: raw.parent_id ?? null,
            attachments: joined?.attachments ?? [],
            author: joined ? (Array.isArray(joined.author) ? joined.author[0] : joined.author) : null,
            reactions: joined?.reactions ?? [],
            replies: []
          }

          setPosts(prev => {
            if (prev.some(p => p.id === fullPost.id)) return prev // dedupe
            return [fullPost, ...prev]
          })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [classroom.id, isSeedClassroom])

  /* Add a reply into the tree in-memory (used for simulated auto-replies) */
  const addReply = useCallback((_parentId: string, newPost: Post) => {
    setPosts(prev => [newPost, ...prev])
  }, [])

  const handleResolve = useCallback(async (id: string) => {
    if (isSeedClassroom) {
      // Degraded mode: optimistic only
      setPosts(prev => prev.map(p => p.id === id ? { ...p, resolved: !p.resolved } : p))
      return
    }
    const res = await fetch(`/api/posts/${id}/resolve`, { method: 'PATCH' })
    if (res.ok) {
      const updated = await res.json()
      setPosts(prev => prev.map(p => p.id === id ? { ...p, resolved: updated.resolved } : p))
    }
  }, [isSeedClassroom])

  const handleVote = useCallback(async (id: string, direction: 'up' | 'down') => {
    if (isSeedClassroom) {
      // Degraded mode: optimistic vote only (no DB)
      setPosts(prev => prev.map(p => {
        if (p.id !== id) return p
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
      if (p.id === id) {
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
      const res = await fetch(`/api/posts/${id}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji: direction }),
      })
      if (!res.ok) {
        // Rollback state on failure
        setPosts(previousPosts)
        const errData = await res.json().catch(() => ({}))
        alert(errData.error || 'Failed to update vote.')
      } else {
        const result = await res.json()
        setPosts(prev => {
          return prev.map(p => {
            if (p.id === id) {
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
  }, [classroom.id, isSeedClassroom, userId, posts])

  const handleOpenChat = useCallback((recipientId: string, handle: string) => {
    setActiveChatUser({ id: recipientId, handle })
  }, [])

  // Extract the target sub-tree
  const targetPostNode = useMemo(() => {
    const map = new Map<string, Post>()
    if (!Array.isArray(posts)) return null
    const cleanPosts = posts.filter(p => p && p.id)
    cleanPosts.forEach(p => map.set(p.id, { ...p, replies: [] }))
    map.forEach(p => {
      if (p.parent_id && map.has(p.parent_id)) {
        map.get(p.parent_id)!.replies!.push(p)
      }
    })
    return map.get(postId) ?? null
  }, [posts, postId])

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

  if (!targetPostNode) {
    return (
      <div style={{ padding: '40px 18px', textAlign: 'center' }}>
        <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#ba1a1a', marginBottom: 12 }}>error</span>
        <h2 style={{ fontFamily: 'var(--font-newsreader)', fontSize: '1.5rem', color: '#1b1c19', marginBottom: 8 }}>Discussion Not Found</h2>
        <p style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.9rem', color: '#6e7979', marginBottom: 20 }}>
          This doubt or thread may have been removed or does not exist.
        </p>
        <Link href={`/classrooms/${classroom.id}`} style={{
          display: 'inline-flex', alignItems: 'center', gap: 5, padding: '9px 16px',
          background: '#00595c', color: '#fff', border: '2px solid #00595c',
          fontFamily: 'var(--font-jakarta)', fontSize: '0.75rem', fontWeight: 700,
          textTransform: 'uppercase', textDecoration: 'none',
        }}>
          Return to Classroom
        </Link>
      </div>
    )
  }

  // Format the target post's author handles and score
  const mainMeta = TYPE_META[targetPostNode.type] ?? TYPE_META.thread
  const rawMainAuthor = targetPostNode.author?.full_name ?? 'Anonymous'
  const mainAuthorId = targetPostNode.author?.id ?? 'mock-author'
  
  let mainAuthorHandle = rawMainAuthor
  if (!rawMainAuthor.startsWith('u/')) {
    if (mainAuthorId === currentUserId || mainAuthorId === userId || mainAuthorId === 'mock-user' || rawMainAuthor === 'You (Student)') {
      mainAuthorHandle = currentUserHandle
    } else {
      const cleanName = rawMainAuthor.replace(/\s+/g, '_')
      mainAuthorHandle = `u/${cleanName}_${mainAuthorId.substring(0, 4)}`
    }
  }

  const isMainAuthorMe = mainAuthorHandle === currentUserHandle || mainAuthorId === currentUserId || mainAuthorId === userId || mainAuthorId === 'mock-user'

  const mainUpvoted = targetPostNode.reactions.some(r => r.user_id === userId && r.emoji === 'up')
  const mainDownvoted = targetPostNode.reactions.some(r => r.user_id === userId && r.emoji === 'down')
  const mainUpCount = targetPostNode.reactions.filter(r => r.emoji === 'up').length
  const mainDownCount = targetPostNode.reactions.filter(r => r.emoji === 'down').length
  const mainLegacyLikes = targetPostNode.reactions.filter(r => r.emoji === '👍').length
  const mainScore = mainLegacyLikes + mainUpCount - mainDownCount + 6

  // Handle direct comments to this doubt
  function handlePostDirectComment(e: React.FormEvent) {
    e.preventDefault()
    if (!directCommentText.trim()) return

    startComment(async () => {
      let uploadedAttachments: { name: string; url: string; type: string }[] = []
      try {
        if (directAttachedFiles.length > 0 && !isSeedClassroom) {
          const { createClient } = await import('@/lib/supabase/client')
          const supabase = createClient()
          for (const file of directAttachedFiles) {
            const filePath = `${classroom.id}/${Date.now()}-${file.name}`
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
        alert(err.message || 'File upload failed.')
        return
      }

      let newPost: Post
      if (isSeedClassroom) {
        newPost = {
          id: Math.random().toString(36).substring(2, 11),
          content: directCommentText.trim(),
          type: 'thread',
          resolved: false,
          created_at: new Date().toISOString(),
          parent_id: postId,
          author: { id: currentUserId, full_name: currentUserHandle, avatar_url: null, role: 'student' },
          reactions: [],
          attachments: directAttachedFiles.map(file => ({
            name: file.name,
            url: '#',
            type: file.type || 'application/octet-stream'
          }))
        }
        const updated = [...posts, newPost]
        setPosts(updated)
        setDirectCommentText('')
        setDirectAttachedFiles([])
      } else {
        const originalText = directCommentText
        const previousPosts = posts
        
        let optPost: Post | null = null
        if (directAttachedFiles.length === 0) {
          // Instantly insert optimistic post if no attachments are pending upload
          optPost = {
            id: 'opt-' + Math.random().toString(36).substring(2, 11),
            content: directCommentText.trim(),
            type: 'thread',
            resolved: false,
            created_at: new Date().toISOString(),
            parent_id: postId,
            author: { id: currentUserId, full_name: currentUserHandle, avatar_url: null, role: userRole },
            reactions: [],
            attachments: []
          }
          setPosts(prev => [...prev, optPost!])
          setDirectCommentText('')
        }

        try {
          const res = await fetch(`/api/classrooms/${classroom.id}/posts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: originalText.trim(), type: 'thread', parent_id: postId, attachments: uploadedAttachments }),
          })
          if (res.ok) {
            const added = await res.json()
            newPost = { ...added, reactions: [], replies: [] }
            
            if (optPost) {
              // Replace optimistic post with the real response
              setPosts(prev => prev.map(p => p.id === optPost!.id ? newPost : p))
            } else {
              setPosts(prev => [...prev, newPost])
            }
            setDirectCommentText('')
            setDirectAttachedFiles([])
          } else {
            // Rollback on non-ok status
            setPosts(previousPosts)
            setDirectCommentText(originalText)
            const errData = await res.json().catch(() => ({}))
            alert(errData.error || 'Failed to post reply.')
            return
          }
        } catch (err: any) {
          // Rollback on network failure
          setPosts(previousPosts)
          setDirectCommentText(originalText)
          alert(err.message || 'Network error — failed to post reply.')
          return
        }
      }

      // Simulation classmates auto response after 2 seconds
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
    })
  }

  return (
    <div style={{ padding: '20px 18px 40px' }}>
      {/* Back Link */}
      <Link href={`/classrooms/${classroom.id}`} style={{
        display: 'inline-flex', alignItems: 'center', gap: 5, textDecoration: 'none',
        color: '#6e7979', fontFamily: 'var(--font-jakarta)', fontSize: '0.75rem',
        fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 20,
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span>
        Back to {classroom.name}
      </Link>

      {/* Main Doubt Highlight Card */}
      <div style={{
        border: `3px solid ${targetPostNode.resolved ? '#bec9c9' : '#00595c'}`,
        background: targetPostNode.resolved ? '#f5f3ee' : '#fbf9f4',
        padding: '24px 24px',
        boxShadow: targetPostNode.resolved ? 'none' : '6px 6px 0 0 #00595c',
        marginBottom: 28,
        position: 'relative',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: targetPostNode.resolved ? '#6e7979' : mainMeta.color }}>
              {targetPostNode.resolved ? 'check_circle' : mainMeta.icon}
            </span>
            <span style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: targetPostNode.resolved ? '#6e7979' : mainMeta.color }}>
              {targetPostNode.resolved ? 'Resolved' : mainMeta.label}
            </span>
          </div>
          <span style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.7rem', color: '#6e7979' }}>{timeAgo(targetPostNode.created_at)}</span>
        </div>

        <h1 style={{
          fontFamily: 'var(--font-newsreader)',
          fontSize: '1.45rem',
          lineHeight: 1.5,
          color: '#1b1c19',
          fontWeight: 600,
          marginBottom: targetPostNode.attachments && targetPostNode.attachments.length > 0 ? 10 : 16,
          whiteSpace: 'pre-wrap',
        }}>
          {targetPostNode.content}
        </h1>

        {/* Render attachments */}
        {targetPostNode.attachments && targetPostNode.attachments.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: -6, marginBottom: 16 }}>
            {targetPostNode.attachments.map((att, i) => {
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
                  <span style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name}</span>
                </a>
              )
            })}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, borderTop: '1.5px solid #bec9c9', paddingTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 26, height: 26, borderRadius: '50%', background: isMainAuthorMe ? '#fea619' : '#0d7377',
              border: '2px solid #00595c', display: 'flex', alignItems: 'center',
              justifyContent: 'center', overflow: 'hidden', flexShrink: 0,
            }}>
              <span style={{ color: isMainAuthorMe ? '#684000' : '#a2f5f9', fontSize: '0.65rem', fontWeight: 700 }}>
                {initials(mainAuthorHandle)}
              </span>
            </div>
            <span style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.78rem', fontWeight: 700, color: isMainAuthorMe ? '#855300' : '#3e4949' }}>
              {mainAuthorHandle} {isMainAuthorMe && '(Author/You)'}
            </span>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {/* Reddit Upvote Downvote */}
            <div style={{ display: 'flex', alignItems: 'center', border: '2px solid #bec9c9', borderRadius: 24, overflow: 'hidden', background: '#fff' }}>
              <button 
                onClick={() => handleVote(targetPostNode.id, 'up')}
                style={{
                  background: mainUpvoted ? '#ff4500' : 'transparent',
                  border: 'none',
                  color: mainUpvoted ? '#fff' : '#6e7979',
                  padding: '4px 12px',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                }}
              >
                ▲
              </button>
              <span style={{
                fontFamily: 'var(--font-jakarta)',
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '0 8px',
                color: mainUpvoted ? '#ff4500' : mainDownvoted ? '#7193ff' : '#1b1c19',
              }}>
                {mainScore}
              </span>
              <button 
                onClick={() => handleVote(targetPostNode.id, 'down')}
                style={{
                  background: mainDownvoted ? '#7193ff' : 'transparent',
                  border: 'none',
                  color: mainDownvoted ? '#fff' : '#6e7979',
                  padding: '4px 12px',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                }}
              >
                ▼
              </button>
            </div>

            {targetPostNode.type === 'doubt' && (
              <button 
                onClick={() => handleResolve(targetPostNode.id)}
                style={{
                  padding: '6px 12px', border: `2px solid ${targetPostNode.resolved ? '#bec9c9' : '#00595c'}`,
                  background: targetPostNode.resolved ? 'transparent' : '#00595c',
                  color: targetPostNode.resolved ? '#6e7979' : '#fff',
                  fontFamily: 'var(--font-jakarta)', fontSize: '0.7rem',
                  fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer',
                }}
              >
                {targetPostNode.resolved ? 'Reopen Doubt' : 'Resolve Doubt'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Discussion title and identity banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h2 style={{ fontFamily: 'var(--font-newsreader)', fontWeight: 700, fontSize: '1.4rem', color: '#1b1c19' }}>
          Classroom Discussion ({targetPostNode.replies?.length || 0} comments)
        </h2>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          background: '#e8f5f5', border: '2px solid #00595c',
          padding: '3px 10px',
        }}>
          <span style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.65rem', fontWeight: 800, color: '#00595c' }}>
            👤 ID: {currentUserHandle}
          </span>
        </div>
      </div>

      {/* Join the Discussion Box (Author replied restriction) */}
      <div style={{ marginBottom: 24 }}>
        {(!isMainAuthorMe || ['hod', 'faculty', 'principal'].includes(userRole)) ? (
          <div>
            <form onSubmit={handlePostDirectComment} style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <textarea
                value={directCommentText}
                onChange={e => setDirectCommentText(e.target.value)}
                placeholder="What's your answer or thought? Help your classmate..."
                rows={3}
                style={{
                  flex: 1, padding: '12px 14px', border: '2.5px solid #00595c',
                  background: '#fbf9f4', fontFamily: 'var(--font-jakarta)', fontSize: '0.9rem',
                  lineHeight: 1.5, color: '#1b1c19', resize: 'none', outline: 'none',
                  boxShadow: '3px 3px 0 0 #00595c',
                }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <button
                  type="submit"
                  disabled={commentPending || !directCommentText.trim()}
                  style={{
                    padding: '12px 18px', background: '#fea619', border: '2.5px solid #00595c',
                    color: '#684000', fontFamily: 'var(--font-jakarta)', fontSize: '0.75rem',
                    fontWeight: 700, textTransform: 'uppercase', cursor: commentPending ? 'not-allowed' : 'pointer',
                    boxShadow: '3px 3px 0 0 #00595c',
                    opacity: commentPending ? 0.7 : 1,
                    width: '100%', textAlign: 'center'
                  }}
                >
                  {commentPending ? '…' : 'Comment'}
                </button>
                <button
                  type="button"
                  onClick={() => directFileInputRef.current?.click()}
                  style={{
                    padding: '8px 14px', background: '#f5f3ee', border: '2.5px solid #00595c',
                    color: '#00595c', fontFamily: 'var(--font-jakarta)', fontSize: '0.7rem',
                    fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer',
                    boxShadow: '3px 3px 0 0 #00595c',
                    display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center'
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>attach_file</span>
                  Attach
                </button>
                <input
                  type="file"
                  multiple
                  ref={directFileInputRef}
                  onChange={(e) => {
                    const files = e.target.files
                    if (files) setDirectAttachedFiles(prev => [...prev, ...Array.from(files)])
                  }}
                  style={{ display: 'none' }}
                />
              </div>
            </form>
            {directAttachedFiles.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12, marginBottom: 4 }}>
                {directAttachedFiles.map((f, idx) => (
                  <div key={idx} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    background: '#e8f5f5', border: '2px solid #00595c',
                    padding: '4px 8px',
                    fontFamily: 'var(--font-jakarta)', fontSize: '0.75rem', color: '#00595c',
                    boxShadow: '2px 2px 0 0 #00595c'
                  }}>
                    <span>{f.name}</span>
                    <span 
                      className="material-symbols-outlined" 
                      onClick={() => setDirectAttachedFiles(prev => prev.filter((_, i) => i !== idx))}
                      style={{ fontSize: 14, cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      close
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div style={{
            border: '2px dashed #bec9c9',
            padding: '16px',
            textAlign: 'center',
            background: '#f5f3ee',
            fontFamily: 'var(--font-jakarta)',
            fontSize: '0.85rem',
            color: '#6e7979',
            fontStyle: 'italic',
          }}>
            🔒 Only classmates can comment on this doubt (Self-replies are locked to prioritize peer collaboration)
          </div>
        )}
      </div>

      {/* Recursive comments list */}
      {targetPostNode.replies && targetPostNode.replies.length === 0 ? (
        <div style={{ border: '2px dashed #bec9c9', padding: '40px 20px', textAlign: 'center', marginBottom: 20 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 36, color: '#bec9c9', display: 'block', marginBottom: 8 }}>forum</span>
          <p style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.85rem', color: '#6e7979' }}>
            No responses yet. Join the conversation above!
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 40 }}>
          {targetPostNode.replies && targetPostNode.replies.map(reply => (
            <ThreadNode
              key={reply.id}
              post={reply}
              depth={0}
              classroomId={classroom.id}
              userId={userId}
              userRole={userRole}
              currentUserHandle={currentUserHandle}
              currentUserId={currentUserId}
              onNewReply={addReply}
              onResolve={handleResolve}
              onVote={handleVote}
              onOpenChat={handleOpenChat}
              isSeedClassroom={isSeedClassroom}
              posts={posts}
              setPosts={setPosts}
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
    </div>
  )
}
