'use client'

import { useState } from 'react'
import Link from 'next/link'

/* ── Types ────────────────────────────────────────────────────── */
export type SubjectType = 'core' | 'elective'

export interface Classroom {
  id: string
  name: string
  subject_type: SubjectType
  description: string
  doubt_count: number
  member_count: number
  is_active_doubt: boolean
  year: number
}

export type ProjectStatus = 'on_track' | 'blocked' | 'at_risk'

export interface Project {
  id: string
  name: string
  phase: string
  description: string
  status: ProjectStatus
  icon: string
  header_color: 'teal' | 'amber'
  year: number
}

type Filter = 'all' | 'core' | 'elective'

interface Props {
  classrooms: Classroom[]
  projects: Project[]
  department: string
  selectedYear: number
}

/* ── Doubt badge ───────────────────────────────────────────────── */
function DoubtBadge({ count, active }: { count: number; active: boolean }) {
  if (!active && count === 0) return null
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      padding: '4px 10px',
      borderRadius: 9999,
      border: '2px solid #00595c',
      background: active ? '#ba1a1a' : '#e4e2dd',
      color: active ? '#ffffff' : '#3e4949',
      fontSize: '0.65rem',
      fontFamily: 'var(--font-jakarta)',
      fontWeight: 700,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      flexShrink: 0,
    }}>
      {active && (
        <span className="pulse-dot" style={{
          width: 6, height: 6, borderRadius: '50%',
          background: '#ffffff', display: 'inline-block',
        }} />
      )}
      {count} {count === 1 ? 'Doubt' : 'Doubts'}
    </div>
  )
}

/* ── Classroom card (large featured) ──────────────────────────── */
function ClassroomCardLarge({ c }: { c: Classroom }) {
  return (
    <Link href={`/classrooms/${c.id}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div style={{
        border: '2px solid #00595c',
        background: '#fbf9f4',
        padding: '16px 18px 18px',
        boxShadow: '5px 5px 0 0 #00595c',
        transition: 'transform 0.15s, box-shadow 0.15s',
        cursor: 'pointer',
        marginBottom: 14,
      }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'translate(-2px,-2px)'
          e.currentTarget.style.boxShadow = '7px 7px 0 0 #00595c'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'translate(0,0)'
          e.currentTarget.style.boxShadow = '5px 5px 0 0 #00595c'
        }}
      >
        {/* Top row: label + badge */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <span style={{
            fontFamily: 'var(--font-jakarta)', fontSize: '0.65rem', fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6e7979',
          }}>
            {c.subject_type === 'core' ? 'Core Subject' : 'Elective'}
          </span>
          <DoubtBadge count={c.doubt_count} active={c.is_active_doubt} />
        </div>

        {/* Title */}
        <h4 style={{
          fontFamily: 'var(--font-newsreader)', fontWeight: 700,
          fontSize: '1.75rem', lineHeight: 1.15, color: '#1b1c19',
          marginBottom: 8, letterSpacing: '-0.01em',
        }}>
          {c.name}
        </h4>

        {/* Description */}
        <p style={{
          fontFamily: 'var(--font-jakarta)', fontSize: '0.875rem',
          lineHeight: 1.55, color: '#3e4949',
        }}>
          {c.description}
        </p>

        {/* Footer */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginTop: 16, paddingTop: 14, borderTop: '1.5px solid #00595c',
        }}>
          {/* Avatar stack */}
          <div style={{ display: 'flex' }}>
            {['#d9e3f9', '#ffddb8', '#9df0f4'].map((bg, i) => (
              <div key={i} style={{
                width: 26, height: 26, borderRadius: '50%', background: bg,
                border: '2px solid #00595c', marginLeft: i === 0 ? 0 : -7, zIndex: 3 - i,
              }} />
            ))}
          </div>
          <span style={{
            display: 'flex', alignItems: 'center', gap: 3,
            fontFamily: 'var(--font-jakarta)', fontSize: '0.65rem', fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase', color: '#00595c',
          }}>
            Enter Class
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>arrow_forward</span>
          </span>
        </div>
      </div>
    </Link>
  )
}

/* ── Classroom card (small, with teal or plain variant) ───────── */
function ClassroomCardSmall({ c, teal }: { c: Classroom; teal?: boolean }) {
  return (
    <Link href={`/classrooms/${c.id}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div style={{
        border: '2px solid #00595c',
        background: teal ? '#0d7377' : '#fbf9f4',
        padding: '16px 18px 18px',
        boxShadow: teal ? '5px 5px 0 0 #fea619' : '5px 5px 0 0 #00595c',
        transition: 'transform 0.15s, box-shadow 0.15s',
        cursor: 'pointer',
        marginBottom: 14,
      }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'translate(-2px,-2px)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'translate(0,0)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <span style={{
            fontFamily: 'var(--font-jakarta)', fontSize: '0.65rem', fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            color: teal ? 'rgba(162,245,249,0.7)' : '#6e7979',
          }}>
            {c.subject_type === 'core' ? 'Core Subject' : 'Elective'}
          </span>
          {!teal && <DoubtBadge count={c.doubt_count} active={c.is_active_doubt} />}
        </div>

        <h4 style={{
          fontFamily: 'var(--font-newsreader)', fontWeight: 700,
          fontSize: '1.35rem', lineHeight: 1.2, color: teal ? '#a2f5f9' : '#1b1c19',
          marginBottom: 6,
        }}>
          {c.name}
        </h4>
        <p style={{
          fontFamily: 'var(--font-jakarta)', fontSize: '0.82rem',
          lineHeight: 1.5, color: teal ? 'rgba(162,245,249,0.85)' : '#3e4949',
          marginBottom: 14,
        }}>
          {c.description}
        </p>

        {teal ? (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            fontFamily: 'var(--font-jakarta)', fontSize: '0.65rem', fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase', color: '#fea619',
          }}>
            Enter Class →
          </span>
        ) : (
          <div style={{
            background: '#00595c', color: '#ffffff', textAlign: 'center',
            padding: '9px 0', fontFamily: 'var(--font-jakarta)',
            fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}>
            Enter
          </div>
        )}
      </div>
    </Link>
  )
}

/* ── Project card ──────────────────────────────────────────────── */
function ProjectCard({ p }: { p: Project }) {
  const statusStyles: Record<ProjectStatus, React.CSSProperties> = {
    on_track: { background: '#fbf9f4', border: '2px solid #00595c', color: '#855300' },
    blocked:  { background: '#ffdad6', border: '2px solid #ba1a1a', color: '#93000a' },
    at_risk:  { background: '#ffddb8', border: '2px solid #855300', color: '#684000' },
  }
  const statusLabel: Record<ProjectStatus, string> = {
    on_track: 'STATUS: ON TRACK',
    blocked:  'STATUS: BLOCKED',
    at_risk:  'STATUS: AT RISK',
  }
  const headerBg    = p.header_color === 'amber' ? '#fea619' : '#00595c'
  const headerText  = p.header_color === 'amber' ? '#684000' : '#ffffff'
  const headerIcon  = p.header_color === 'amber' ? '#684000' : '#a2f5f9'

  return (
    <Link href={`/projects/${p.id}`} style={{ textDecoration: 'none', display: 'block', marginBottom: 14 }}>
      <div style={{
        border: '2px solid #00595c',
        boxShadow: '5px 5px 0 0 #00595c',
        overflow: 'hidden',
        transition: 'transform 0.15s',
        cursor: 'pointer',
      }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'translate(-2px,-2px)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'translate(0,0)')}
      >
        {/* Header strip */}
        <div style={{
          background: headerBg, padding: '10px 16px',
          borderBottom: '2px solid #00595c',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{
            fontFamily: 'var(--font-jakarta)', fontSize: '0.65rem', fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase', color: headerText,
          }}>
            {p.phase}
          </span>
          <span className="material-symbols-outlined" style={{ color: headerIcon, fontSize: 18 }}>
            {p.icon}
          </span>
        </div>

        {/* Body */}
        <div className="polka-bg" style={{ padding: '16px 18px 18px', background: '#fbf9f4' }}>
          <h4 style={{
            fontFamily: 'var(--font-newsreader)', fontWeight: 700,
            fontSize: '1.35rem', color: '#1b1c19', marginBottom: 4,
          }}>
            {p.name}
          </h4>
          <p style={{
            fontFamily: 'var(--font-jakarta)', fontSize: '0.82rem',
            lineHeight: 1.5, color: '#3e4949', marginBottom: 14,
          }}>
            {p.description}
          </p>
          <div style={{
            display: 'inline-flex', padding: '6px 10px',
            fontFamily: 'var(--font-jakarta)', fontSize: '0.65rem',
            fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase',
            ...statusStyles[p.status],
          }}>
            {statusLabel[p.status]}
          </div>
        </div>
      </div>
    </Link>
  )
}

/* ── Section heading ───────────────────────────────────────────── */
function SectionHeading({ label, accent = '#fea619' }: { label: string; accent?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, marginTop: 28 }}>
      <div style={{ width: 10, height: 26, background: accent, border: '2px solid #00595c', flexShrink: 0 }} />
      <h3 style={{
        fontFamily: 'var(--font-newsreader)', fontWeight: 600,
        fontSize: '1.45rem', color: '#1b1c19', lineHeight: 1.2,
      }}>
        {label}
      </h3>
    </div>
  )
}

/* ── Main ──────────────────────────────────────────────────────── */
export default function ClassroomsClient({ classrooms, projects, department, selectedYear }: Props) {
  const [filter, setFilter] = useState<Filter>('all')
  const [activeYear, setActiveYear] = useState<number>(selectedYear + 1) // selectedYear is 0-indexed passed from page

  const filtered = classrooms.filter(c =>
    c.year === activeYear && (filter === 'all' ? true : c.subject_type === filter)
  )

  const filteredProjects = projects.filter(p => p.year === activeYear)

  return (
    <div style={{ padding: '0 18px 0' }}>
      
      {/* ── Year Selector Tabs ──────────────────────────────────── */}
      <div style={{ 
        display: 'flex', borderBottom: '2px solid #bec9c9', marginBottom: 24,
        overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none'
      }}>
        {[1, 2, 3, 4].map(y => (
          <button
            key={y}
            onClick={() => setActiveYear(y)}
            style={{
              flex: 1, padding: '16px 12px', background: 'transparent', border: 'none',
              borderBottom: activeYear === y ? '3px solid #00595c' : '3px solid transparent',
              color: activeYear === y ? '#00595c' : '#6e7979',
              fontFamily: 'var(--font-jakarta)', fontSize: '0.85rem', fontWeight: 800,
              textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer',
              transition: 'all 0.2s', whiteSpace: 'nowrap'
            }}
          >
            Year {y}
          </button>
        ))}
      </div>

      {/* Department header + filters */}
      <div style={{
        borderBottom: '2px solid #00595c',
        paddingBottom: 18,
        marginBottom: 4,
      }}>
        <span style={{
          fontFamily: 'var(--font-jakarta)', fontSize: '0.65rem', fontWeight: 700,
          letterSpacing: '0.1em', textTransform: 'uppercase', color: '#00595c',
          display: 'block', marginBottom: 4,
        }}>
          Department
        </span>
        <h2 style={{
          fontFamily: 'var(--font-newsreader)', fontWeight: 700,
          fontSize: '2rem', lineHeight: 1.1, color: '#1b1c19',
          letterSpacing: '-0.01em', marginBottom: 14,
        }}>
          {department}
        </h2>

        {/* Filter pills */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(['all', 'core', 'elective'] as Filter[]).map(f => {
            const labels: Record<Filter, string> = { all: 'All CSE', core: 'Core', elective: 'Elective' }
            const isActive = filter === f
            return (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: '6px 14px',
                borderRadius: 9999,
                border: '2px solid',
                borderColor: isActive ? '#00595c' : '#6e7979',
                background: isActive ? '#fea619' : 'transparent',
                color: isActive ? '#684000' : '#00595c',
                fontFamily: 'var(--font-jakarta)',
                fontSize: '0.65rem', fontWeight: 700,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                cursor: 'pointer',
                boxShadow: isActive ? '2px 2px 0 0 #00595c' : 'none',
                transition: 'all 0.15s',
              }}>
                {labels[f]}
              </button>
            )
          })}
        </div>
      </div>

      {/* Study & Doubt Classrooms */}
      <SectionHeading label="Study & Doubt Classrooms" accent="#fea619" />

      {filtered.length === 0 ? (
        <div style={{
          border: '2px dashed #bec9c9', padding: '32px 18px', textAlign: 'center',
          marginBottom: 14,
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 36, color: '#bec9c9', display: 'block', marginBottom: 8 }}>school</span>
          <p style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.85rem', color: '#6e7979' }}>
            No classrooms for this filter.
          </p>
        </div>
      ) : (
        <>
          {/* First card = large featured */}
          {filtered[0] && <ClassroomCardLarge c={filtered[0]} />}
          {/* Second = small plain */}
          {filtered[1] && <ClassroomCardSmall c={filtered[1]} />}
          {/* Third = teal variant */}
          {filtered[2] && <ClassroomCardSmall c={filtered[2]} teal />}
          {/* Rest = plain */}
          {filtered.slice(3).map(c => <ClassroomCardSmall key={c.id} c={c} />)}
        </>
      )}

      {/* Project Classrooms */}
      <SectionHeading label={`Project Classrooms (Yr ${activeYear})`} accent="#00595c" />

      {filteredProjects.length === 0 ? (
        <div style={{
          border: '2px dashed #bec9c9', padding: '32px 18px', textAlign: 'center',
          marginBottom: 14,
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 36, color: '#bec9c9', display: 'block', marginBottom: 8 }}>architecture</span>
          <p style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.85rem', color: '#6e7979' }}>
            No project classrooms yet for Year {activeYear}.
          </p>
        </div>
      ) : (
        filteredProjects.map(p => <ProjectCard key={p.id} p={p} />)
      )}

      {/* Bottom padding for nav */}
      <div style={{ height: 16 }} />
    </div>
  )
}
