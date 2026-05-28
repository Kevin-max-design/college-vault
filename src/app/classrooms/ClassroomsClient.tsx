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
const YEAR_LABELS: Record<number, string> = {
  1: '1st Year', 2: '2nd Year', 3: '3rd Year', 4: '4th Year',
}

const DEPT_YEARS: Record<string, number[]> = {
  CSE: [1, 2, 3, 4],
  'CSE-DS': [1, 2, 3, 4],
  'CSE-AIML': [1, 2, 3, 4],
  'CSE-CS': [1, 2, 3, 4],
  CSBS: [1, 2, 3, 4],
  ECE: [1, 2, 3, 4],
  EEE: [1, 2, 3, 4],
  ME: [1, 2, 3, 4],
  CE: [1, 2, 3, 4],
  MCA: [1, 2],
  MBA: [1, 2],
  MATHS: [1],
  PHY: [1],
  CHEM: [1],
  ENG: [1]
}

interface Props {
  classroomsByYear: Record<number, Classroom[]>
  department: string
  userYear: number
  departmentCode?: string
}

/* ── Anonymous Doubt Box ────────────────────────────────────────── */
function AnonymousDoubt() {
  const [text, setText] = useState('')
  const [sent, setSent] = useState(false)

  const handleSend = () => {
    if (!text.trim()) return
    setSent(true)
    setTimeout(() => { setSent(false); setText('') }, 2500)
  }

  return (
    <div className="bg-surface border-2 border-outline-variant p-4 mb-6 shadow-[4px_4px_0_0_#bec9c9]">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">🌊</span>
        <h3 className="font-newsreader font-bold text-lg text-primary leading-none">
          Anonymous Doubt
        </h3>
      </div>
      <p className="font-jakarta text-xs text-outline leading-relaxed mb-3">
        Stuck on a concept? Drop your question into the void. Professors and peers
        can answer without knowing who asked. Safe, brutal, effective.
      </p>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="E.g., I still don't understand how Dijkstra's algorithm handles negative weights..."
        rows={3}
        className="cv-input resize-none h-auto py-3 text-sm leading-relaxed placeholder:text-outline-variant"
      />
      <button
        onClick={handleSend}
        className="mt-3 bg-primary text-on-primary font-jakarta font-bold text-xs tracking-widest uppercase px-5 py-2.5 border-2 border-primary shadow-[4px_4px_0_0_#00595c] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#00595c] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
      >
        {sent ? '✓ Cast!' : 'Cast Into Void'}
      </button>
    </div>
  )
}

/* ── Section Label ───────────────────────────────────────────────── */
function SectionLabel({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3 mt-6 border-b-2 border-outline-variant pb-2">
      <span>{icon}</span>
      <h2 className="font-jakarta font-black text-xs tracking-[0.12em] uppercase text-primary">
        {label}
      </h2>
    </div>
  )
}

/* ── Classroom Card ─────────────────────────────────────────────── */
function ClassroomCard({ c, featured }: { c: Classroom; featured?: boolean }) {
  return (
    <Link href={`/classrooms/${c.id}`} style={{ textDecoration: 'none', display: 'block', marginBottom: 14 }}>
      <div
        className={`bg-surface border-2 border-primary transition-all cursor-pointer group ${
          featured
            ? 'shadow-[6px_6px_0_0_#00595c] p-5 hover:shadow-[8px_8px_0_0_#00595c] hover:-translate-x-0.5 hover:-translate-y-0.5'
            : 'shadow-[4px_4px_0_0_#00595c] p-4 hover:shadow-[6px_6px_0_0_#00595c] hover:-translate-x-0.5 hover:-translate-y-0.5'
        }`}
      >
        {/* Top row */}
        <div className="flex justify-between items-start mb-2">
          <span className="font-jakarta font-bold text-[0.6rem] tracking-[0.08em] uppercase text-outline">
            {c.subject_type === 'core' ? 'Core Subject' : 'Elective'}
          </span>
          {c.is_active_doubt && (
            <span className="inline-flex items-center gap-1 font-jakarta font-bold text-[0.6rem] tracking-widest uppercase px-2 py-0.5 border-2 border-error bg-error-container text-on-error-container">
              <span className="w-1.5 h-1.5 rounded-full bg-error inline-block" />
              Active Doubt
            </span>
          )}
          {!c.is_active_doubt && c.doubt_count > 0 && (
            <span className="font-jakarta font-bold text-[0.6rem] tracking-widest uppercase px-2 py-0.5 border-2 border-outline-variant text-outline">
              {c.doubt_count} Doubts
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className={`font-newsreader font-bold text-on-surface leading-tight mb-1 ${
          featured ? 'text-[1.65rem]' : 'text-xl'
        }`}>
          {c.name}
        </h3>

        {/* Description */}
        <p className="font-jakarta text-sm text-on-surface-variant leading-snug mb-4">
          {c.description}
        </p>

        {/* Footer */}
        <div className="flex justify-between items-center pt-3 border-t-2 border-outline-variant">
          <span className="font-jakarta font-bold text-[0.65rem] text-outline tracking-wide">
            {c.member_count} students
          </span>
          <span className="flex items-center gap-1 font-jakarta font-bold text-[0.65rem] uppercase tracking-widest text-primary">
            Enter Class
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </span>
        </div>
      </div>
    </Link>
  )
}

/* ── Project Hub Card ────────────────────────────────────────────── */
interface HubProject {
  title: string
  description: string
  tags: string[]
  members: string[]
  requestToJoin: boolean
  banner?: string
}

function ProjectCard({ p }: { p: HubProject }) {
  return (
    <Link href="/vault" style={{ textDecoration: 'none', display: 'block', marginBottom: 14 }}>
      <div className="bg-surface border-2 border-primary shadow-[4px_4px_0_0_#00595c] overflow-hidden hover:shadow-[6px_6px_0_0_#00595c] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all">
        {p.banner && (
          <div className="h-20 bg-surface-container border-b-2 border-primary flex items-center justify-center">
            <span className="font-newsreader font-black text-2xl text-primary tracking-tight">
              {p.banner}
            </span>
          </div>
        )}
        <div className="p-4">
          <div className="flex flex-wrap gap-1.5 mb-2">
            {p.tags.map(tag => (
              <span
                key={tag}
                className="font-jakarta font-bold text-[0.58rem] tracking-widest uppercase px-2 py-0.5 border border-primary text-primary bg-surface-container"
              >
                {tag}
              </span>
            ))}
          </div>

          <h3 className="font-newsreader font-bold text-base text-on-surface mb-1.5 leading-tight">
            {p.title}
          </h3>

          <p className="font-jakarta text-xs text-on-surface-variant leading-relaxed mb-4">
            {p.description}
          </p>

          <div className="flex items-center justify-between">
            {/* Member avatars */}
            <div className="flex items-center">
              {p.members.map((m, i) => (
                <div
                  key={i}
                  className="w-7 h-7 rounded-full border-2 border-surface bg-primary flex items-center justify-center font-jakarta font-bold text-[0.58rem] text-on-primary"
                  style={{ marginLeft: i > 0 ? -8 : 0 }}
                >
                  {m}
                </div>
              ))}
              <span className="font-jakarta text-[0.65rem] text-outline ml-2">
                +{p.members.length}
              </span>
            </div>

            {p.requestToJoin ? (
              <button className="bg-secondary-container text-on-secondary-container font-jakarta font-bold text-[0.65rem] uppercase tracking-widest px-4 py-2 border-2 border-primary shadow-[2px_2px_0_0_#00595c] hover:shadow-[4px_4px_0_0_#00595c] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all">
                Request to Join
              </button>
            ) : (
              <button className="bg-surface text-primary font-jakarta font-bold text-[0.65rem] uppercase tracking-widest px-4 py-2 border-2 border-primary shadow-[2px_2px_0_0_#00595c] hover:shadow-[4px_4px_0_0_#00595c] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all">
                View Details
              </button>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}

const PROJECT_HUBS: HubProject[] = [
  {
    title: 'Campus Vault Redesign',
    description: 'Join the open-source squad building the next iteration of the student portal. React, Node, and sheer willpower.',
    tags: ['Hackathon Prep', 'Web Dev'],
    members: ['A', 'K', 'R'],
    requestToJoin: true,
    banner: 'BUILD IT',
  },
  {
    title: 'ML Fundamentals',
    description: "Working through Andrew Ng's course together. Meet every Thursday in the library.",
    tags: ['Study Group'],
    members: ['M', 'L'],
    requestToJoin: false,
  },
]

/* ── Main Component ─────────────────────────────────────────────── */
export default function ClassroomsClient({ classroomsByYear, department, userYear, departmentCode }: Props) {
  const allowedYears = departmentCode && DEPT_YEARS[departmentCode]
    ? DEPT_YEARS[departmentCode]
    : [1, 2, 3, 4]

  const defaultYear = allowedYears.includes(userYear) ? userYear : allowedYears[0] ?? 1
  const [selectedYear, setSelectedYear] = useState<number>(defaultYear)
  const [filter, setFilter] = useState<Filter>('all')

  const classrooms = classroomsByYear[selectedYear] ?? []
  const filtered = filter === 'all' ? classrooms : classrooms.filter(c => c.subject_type === filter)

  return (
    <div className="px-4 py-5 max-w-xl mx-auto">

      {/* Page heading */}
      <h1 className="font-newsreader font-black text-[2.4rem] leading-none text-primary mb-4 tracking-tight">
        Classrooms
      </h1>

      {/* ── Year Pill Tabs ──────────────────────────────────── */}
      <div className="flex gap-2 flex-wrap mb-6">
        {allowedYears.map(yr => {
          const isActive = selectedYear === yr
          return (
            <button
              key={yr}
              onClick={() => { setSelectedYear(yr); setFilter('all') }}
              className={`font-jakarta font-bold text-xs tracking-widest uppercase px-4 py-1.5 border-2 transition-all ${
                isActive
                  ? 'bg-secondary-container text-on-secondary-container border-primary shadow-[2px_2px_0_0_#00595c]'
                  : 'bg-surface text-outline border-outline-variant hover:border-primary hover:text-primary'
              }`}
            >
              {YEAR_LABELS[yr]}
            </button>
          )
        })}
      </div>

      {/* ── Anonymous Doubt ─────────────────────────────────── */}
      <AnonymousDoubt />

      {/* ── Filter Pills ────────────────────────────────────── */}
      <div className="flex gap-2 mb-1">
        {(['all', 'core', 'elective'] as Filter[]).map(f => {
          const labels: Record<Filter, string> = { all: 'All', core: 'Core', elective: 'Elective' }
          const isActive = filter === f
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`font-jakarta font-bold text-[0.6rem] tracking-widest uppercase px-3 py-1 border-2 transition-all ${
                isActive
                  ? 'bg-primary text-on-primary border-primary'
                  : 'bg-surface text-outline border-outline-variant hover:border-primary hover:text-primary'
              }`}
            >
              {labels[f]}
            </button>
          )
        })}
      </div>

      {/* ── Core Subjects ───────────────────────────────────── */}
      <SectionLabel icon="📚" label="Core Subjects" />

      {filtered.length === 0 ? (
        <div className="border-2 border-dashed border-outline-variant p-10 text-center mb-4">
          <span className="material-symbols-outlined text-4xl text-outline-variant block mb-2">school</span>
          <p className="font-jakarta text-sm text-outline">
            No classrooms for Year {selectedYear} yet.
          </p>
        </div>
      ) : (
        <>
          {filtered[0] && <ClassroomCard c={filtered[0]} featured />}
          {filtered.slice(1).map(c => <ClassroomCard key={c.id} c={c} />)}
        </>
      )}

      {/* Browsing other year notice */}
      {selectedYear !== userYear && (
        <div className="bg-secondary-fixed border-2 border-secondary text-on-secondary-container flex items-center gap-2 p-3 mb-4 text-xs font-jakarta font-semibold">
          <span className="material-symbols-outlined text-base" style={{ color: '#855300' }}>info</span>
          Browsing Year {selectedYear} — you can freely enter any class.
        </div>
      )}

      {/* ── Project Hubs ────────────────────────────────────── */}
      <SectionLabel icon="🚀" label="Project Hubs" />
      {PROJECT_HUBS.map(p => <ProjectCard key={p.title} p={p} />)}

    </div>
  )
}
