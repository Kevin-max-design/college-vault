import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'

function StatCard({ label, value, icon, color }: { label: string; value: number | string; icon: string; color: string }) {
  return (
    <div style={{
      background: '#ffffff', border: '1px solid #e2e8f0',
      borderRadius: '12px', padding: '20px 22px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 20, color }}>{icon}</span>
        <span style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b' }}>{label}</span>
      </div>
      <div style={{ fontFamily: 'var(--font-newsreader)', fontSize: '2.8rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{value}</div>
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
        <span style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#64748b' }}>
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
                background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                fontFamily: 'var(--font-jakarta)', fontSize: '0.75rem', fontWeight: 700, color: '#334155',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = '#00595c';
                  e.currentTarget.style.background = '#f0faf6';
                  e.currentTarget.style.color = '#00595c';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.background = '#ffffff';
                  e.currentTarget.style.color = '#334155';
                }}
              >
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
          <div style={{ padding: 24, background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center', color: '#64748b', fontFamily: 'var(--font-jakarta)', fontSize: '0.875rem' }}>
            No users yet in this department.
          </div>
        ) : (
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
            {recentUsers.map((u: any, i: number) => (
              <div key={u.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '14px 20px', background: i % 2 === 0 ? '#ffffff' : '#f8fafc',
                borderBottom: i < recentUsers.length - 1 ? '1px solid #e2e8f0' : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#e2f2f3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: '#00595c', fontSize: '0.75rem', fontWeight: 700 }}>
                      {u.full_name?.split(' ').slice(0, 2).map((n: string) => n[0]).join('') || '?'}
                    </span>
                  </div>
                  <span style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 600, fontSize: '0.875rem', color: '#0f172a' }}>{u.full_name}</span>
                </div>
                <span style={{
                  fontFamily: 'var(--font-jakarta)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
                  padding: '4px 10px', background: u.role === 'faculty' ? '#e2f2f3' : '#f1f5f9', color: '#334155', borderRadius: '20px',
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
