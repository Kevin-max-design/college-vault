import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'

function StatCard({ label, value, icon, color }: { label: string; value: number | string; icon: string; color: string }) {
  return (
    <div style={{
      background: '#fbf9f4', border: `2px solid ${color}`,
      padding: '20px 22px', boxShadow: `4px 4px 0 0 ${color}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 20, color }}>{icon}</span>
        <span style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6e7979' }}>{label}</span>
      </div>
      <div style={{ fontFamily: 'var(--font-newsreader)', fontSize: '2.8rem', fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
    </div>
  )
}

export default async function AdminDashboard() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/onboarding/verify')

  const { data: profile } = await supabase.from('profiles').select('role, department, full_name').eq('id', user.id).single()
  const role = profile?.role ?? 'student'
  const dept = profile?.department ?? ''

  // Principal only gets bulletin
  if (role === 'principal') redirect('/admin/bulletin')

  if (!['hod'].includes(role)) redirect('/classrooms')

  // Fetch department-scoped stats
  const [usersRes, classroomsRes, postsRes, listingsRes, recentUsersRes] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('department', dept),
    supabase.from('classrooms').select('id', { count: 'exact', head: true }).eq('department', dept),
    supabase.from('posts').select('id', { count: 'exact', head: true }),
    supabase.from('listings').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id, full_name, role, created_at').eq('department', dept).order('created_at', { ascending: false }).limit(5),
  ])

  const stats = {
    users: usersRes.count ?? 0,
    classrooms: classroomsRes.count ?? 0,
    posts: postsRes.count ?? 0,
    listings: listingsRes.count ?? 0,
  }

  const recentUsers = recentUsersRes.data ?? []

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <span style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6e7979' }}>
          {dept} Department
        </span>
        <h1 style={{ fontFamily: 'var(--font-newsreader)', fontWeight: 800, fontSize: '2.5rem', color: '#00595c', lineHeight: 1.1, marginTop: 4 }}>
          HOD Dashboard
        </h1>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 20, marginBottom: 40 }}>
        <StatCard label="Department Users" value={stats.users} icon="group" color="#00595c" />
        <StatCard label="Classrooms" value={stats.classrooms} icon="school" color="#0d7377" />
        <StatCard label="Total Posts" value={stats.posts} icon="forum" color="#855300" />
        <StatCard label="Vault Listings" value={stats.listings} icon="storefront" color="#ba1a1a" />
      </div>

      {/* Quick Actions */}
      <div style={{ marginBottom: 40 }}>
        <h2 style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: '#00595c', letterSpacing: '0.07em', marginBottom: 16 }}>
          Quick Actions
        </h2>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[
            { href: '/admin/users', label: 'Manage Users', icon: 'group' },
            { href: '/admin/classrooms', label: 'Add Classroom', icon: 'add_circle' },
            { href: '/admin/posts', label: 'Moderate Posts', icon: 'forum' },
            { href: '/admin/bulletin', label: 'Post Notice', icon: 'campaign' },
          ].map(a => (
            <Link key={a.href} href={a.href} style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
                background: '#fbf9f4', border: '2px solid #00595c', boxShadow: '3px 3px 0 0 #00595c',
                fontFamily: 'var(--font-jakarta)', fontSize: '0.75rem', fontWeight: 700, color: '#00595c',
                cursor: 'pointer', transition: 'transform 0.1s',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{a.icon}</span>
                {a.label}
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Signups */}
      <div>
        <h2 style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: '#00595c', letterSpacing: '0.07em', marginBottom: 16 }}>
          Recent Signups — {dept}
        </h2>
        {recentUsers.length === 0 ? (
          <div style={{ padding: 24, background: '#f0eee9', textAlign: 'center', color: '#6e7979', fontFamily: 'var(--font-jakarta)', fontSize: '0.875rem' }}>
            No users yet in this department.
          </div>
        ) : (
          <div style={{ border: '2px solid #bec9c9', overflow: 'hidden' }}>
            {recentUsers.map((u: any, i: number) => (
              <div key={u.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 16px', background: i % 2 === 0 ? '#fbf9f4' : '#f5f3ee',
                borderBottom: i < recentUsers.length - 1 ? '1px solid #e4e2dd' : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#0d7377', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: '#a2f5f9', fontSize: '0.75rem', fontWeight: 700 }}>
                      {u.full_name?.split(' ').slice(0, 2).map((n: string) => n[0]).join('') || '?'}
                    </span>
                  </div>
                  <span style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 600, fontSize: '0.875rem', color: '#1b1c19' }}>{u.full_name}</span>
                </div>
                <span style={{
                  fontFamily: 'var(--font-jakarta)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
                  padding: '3px 8px', background: u.role === 'faculty' ? '#e8f5f5' : '#f0eee9', color: '#00595c', border: '1.5px solid #bec9c9',
                }}>
                  {u.role}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
