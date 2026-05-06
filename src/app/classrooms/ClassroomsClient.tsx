'use client'

import { useState } from 'react'
import Link from 'next/link'

/* ── Types ────────────────────────────────────────────────────────── */
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

// Keep Project exported to avoid breaking any existing import
export interface Project {
  id: string
  name: string
  phase: string
  description: string
  status: 'on_track' | 'blocked' | 'at_risk'
  icon: string
  header_color: 'teal' | 'amber'
}

type Filter = 'all' | 'core' | 'elective'
const YEARS = [1, 2, 3, 4] as const

interface Props {
  classroomsByYear: Record<number, Classroom[]>
  department: string
  userYear: number
}

/* ── Doubt Badge ───────────────────────────────────────────────────── */
function DoubtBadge({ count, active }: { count: number; active: boolean }) {
  if (!active && count === 0) return null
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 9px', borderRadius: 9999,
      border: '2px solid', borderColor: active ? '#ba1a1a' : '#bec9c9',
      background: active ? '#ffdad6' : '#f0eee9',
      color: active ? '#93000a' : '#6e7979',
      fontSize: '0.62rem', fontFamily: 'var(--font-jakarta)',
      fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
      flexShrink: 0,
    }}>
      {active && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ba1a1a', display: 'inline-block' }} />}
      {count} {count === 1 ? 'Doubt' : 'Doubts'}
    </div>
  )
}

/* ── Classroom Card ────────────────────────────────────────────────── */
function ClassroomCard({ c, featured }: { c: Classroom; featured?: boolean }) {
  return (
    <Link href={`/classrooms/${c.id}`} style={{ textDecoration: 'none', display: 'block', marginBottom: 14 }}>
      <div
        style={{
          border: '2px solid #00595c',
          background: '#fbf9f4',
          padding: featured ? '18px 20px 20px' : '14px 16px 16px',
          boxShadow: featured ? '6px 6px 0 0 #00595c' : '4px 4px 0 0 #00595c',
          transition: 'transform 0.15s, box-shadow 0.15s',
          cursor: 'pointer',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'translate(-2px,-2px)'
          e.currentTarget.style.boxShadow = featured ? '8px 8px 0 0 #00595c' : '6px 6px 0 0 #00595c'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'translate(0,0)'
          e.currentTarget.style.boxShadow = featured ? '6px 6px 0 0 #00595c' : '4px 4px 0 0 #00595c'
        }}
      >
        {/* Top row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <span style={{
            fontFamily: 'var(--font-jakarta)', fontSize: '0.62rem', fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6e7979',
          }}>
            {c.subject_type === 'core' ? 'Core Subject' : 'Elective'}
          </span>
          <DoubtBadge count={c.doubt_count} active={c.is_active_doubt} />
        </div>

        {/* Title */}
        <h4 style={{
          fontFamily: 'var(--font-newsreader)', fontWeight: 700,
          fontSize: featured ? '1.8rem' : '1.35rem',
          lineHeight: 1.15, color: '#1b1c19',
          marginBottom: 8, letterSpacing: '-0.01em',
        }}>
          {c.name}
        </h4>

        {/* Description */}
        <p style={{
          fontFamily: 'var(--font-jakarta)', fontSize: '0.875rem',
          lineHeight: 1.55, color: '#3e4949',
          marginBottom: 14,
        }}>
          {c.description}
        </p>

        {/* Footer */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          paddingTop: 12, borderTop: '1.5px solid #bec9c9',
        }}>
          <span style={{
            fontFamily: 'var(--font-jakarta)', fontSize: '0.65rem',
            fontWeight: 700, color: '#6e7979',
          }}>
            {c.member_count} students
          </span>
          <span style={{
            display: 'flex', alignItems: 'center', gap: 4,
            fontFamily: 'var(--font-jakarta)', fontSize: '0.65rem',
            fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
            color: '#00595c',
          }}>
            Enter Class
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>arrow_forward</span>
          </span>
        </div>
      </div>
    </Link>
  )
}

/* ── Main ──────────────────────────────────────────────────────────── */
export default function ClassroomsClient({ classroomsByYear, department, userYear }: Props) {
  const [selectedYear, setSelectedYear] = useState<number>(userYear ?? 1)
  const [filter, setFilter] = useState<Filter>('all')

  const classrooms = classroomsByYear[selectedYear] ?? []
  const filtered = filter === 'all' ? classrooms : classrooms.filter(c => c.subject_type === filter)

  return (
    <div style={{ padding: '20px 18px 0' }}>

      {/* Department header */}
      <div style={{ marginBottom: 20 }}>
        <span style={{
          fontFamily: 'var(--font-jakarta)', fontSize: '0.65rem', fontWeight: 700,
          letterSpacing: '0.1em', textTransform: 'uppercase', color: '#00595c',
          display: 'block', marginBottom: 4,
        }}>
          Department
        </span>
        <h2 style={{
          fontFamily: 'var(--font-newsreader)', fontWeight: 700,
          fontSize: '1.9rem', lineHeight: 1.1, color: '#1b1c19',
          letterSpacing: '-0.01em',
        }}>
          {department}
        </h2>
      </div>

      {/* ── Year Tabs ─────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        borderBottom: '2px solid #00595c',
        marginBottom: 20,
        gap: 0,
      }}>
        {YEARS.map(yr => {
          const isActive = selectedYear === yr
          const isUserYear = userYear === yr
          return (
            <button
              key={yr}
              onClick={() => { setSelectedYear(yr); setFilter('all') }}
              style={{
                flex: 1,
                padding: '10px 4px 12px',
                border: 'none',
                borderBottom: isActive ? '3px solid #fea619' : '3px solid transparent',
                background: isActive ? '#fea619' : 'transparent',
                color: isActive ? '#684000' : '#6e7979',
                fontFamily: 'var(--font-jakarta)',
                fontSize: '0.75rem', fontWeight: 800,
                letterSpacing: '0.05em', textTransform: 'uppercase',
                cursor: 'pointer',
                transition: 'all 0.15s',
                position: 'relative',
              }}
            >
              Year {yr}
              {isUserYear && (
                <span style={{
                  position: 'absolute', top: 6, right: 6,
                  width: 5, height: 5, borderRadius: '50%',
                  background: isActive ? '#855300' : '#00595c',
                }} />
              )}
            </button>
          )
        })}
      </div>

      {/* Notice when browsing another year */}
      {selectedYear !== userYear && (
        <div style={{
          background: '#ffddb8', border: '2px solid #855300',
          padding: '8px 12px', marginBottom: 16, display: 'flex',
          alignItems: 'center', gap: 8,
        }}>
          <span className="material-symbols-outlined" style={{ color: '#855300', fontSize: 16 }}>info</span>
          <span style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.75rem', color: '#684000', fontWeight: 600 }}>
            Browsing Year {selectedYear} classrooms. You can freely enter any class.
          </span>
        </div>
      )}

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {(['all', 'core', 'elective'] as Filter[]).map(f => {
          const labels: Record<Filter, string> = { all: 'All', core: 'Core', elective: 'Elective' }
          const isActive = filter === f
          return (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '5px 14px', borderRadius: 9999,
              border: '2px solid',
              borderColor: isActive ? '#00595c' : '#bec9c9',
              background: isActive ? '#fea619' : 'transparent',
              color: isActive ? '#684000' : '#6e7979',
              fontFamily: 'var(--font-jakarta)', fontSize: '0.65rem', fontWeight: 700,
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

      {/* Classroom list */}
      {filtered.length === 0 ? (
        <div style={{
          border: '2px dashed #bec9c9', padding: '40px 18px', textAlign: 'center', marginBottom: 14,
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 40, color: '#bec9c9', display: 'block', marginBottom: 10 }}>school</span>
          <p style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.85rem', color: '#6e7979' }}>
            No classrooms for Year {selectedYear} yet.
          </p>
        </div>
      ) : (
        <>
          {/* First card — featured / large */}
          {filtered[0] && <ClassroomCard c={filtered[0]} featured />}
          {/* Rest — regular */}
          {filtered.slice(1).map(c => <ClassroomCard key={c.id} c={c} />)}
        </>
      )}

      <div style={{ height: 20 }} />
    </div>
  )
}
