import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'

function StatCard({ label, value, icon, color }: { label: string; value: number | string; icon: string; color: string }) {
  return (
    <div style={{
      background: '#ffffff', border: '1px solid #e2e8f0',
      borderRadius: '10px', padding: '12px 14px',
      boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.04)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 18, color }}>{icon}</span>
        <span style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b' }}>{label}</span>
      </div>
      <div style={{ fontFamily: 'var(--font-newsreader)', fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>{value}</div>
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
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <span style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#64748b' }}>
            {dept} Department
          </span>
          <h1 style={{ fontFamily: 'var(--font-newsreader)', fontWeight: 800, fontSize: '1.75rem', color: '#00595c', lineHeight: 1.1, marginTop: 2 }}>
            HOD Dashboard
          </h1>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3" style={{ marginBottom: 24 }}>
        <StatCard label="Department Users" value={stats.users} icon="group" color="#00595c" />
        <StatCard label="Classrooms" value={stats.classrooms} icon="school" color="#0d7377" />
        <StatCard label="Total Posts" value={stats.posts} icon="forum" color="#855300" />
        <StatCard label="Vault Listings" value={stats.listings} icon="storefront" color="#ba1a1a" />
      </div>

      {/* Two Column Grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {/* Quick Actions (2 cols) */}
        <div className="md:col-span-2">
          <h2 style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: '#00595c', letterSpacing: '0.07em', marginBottom: 12 }}>
            Quick Actions
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { href: '/admin/users', label: 'Manage Users', icon: 'group' },
              { href: '/admin/classrooms', label: 'Add Classroom', icon: 'add_circle' },
              { href: '/admin/posts', label: 'Moderate Posts', icon: 'forum' },
              { href: '/admin/bulletin', label: 'Post Notice', icon: 'campaign' },
            ].map(a => (
              <Link key={a.href} href={a.href} style={{ textDecoration: 'none' }}>
                <div
                  className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg shadow-sm text-xs font-bold text-slate-700 cursor-pointer transition-all duration-150 hover:border-[#00595c] hover:bg-[#f0faf6] hover:text-[#00595c]"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{a.icon}</span>
                  <span>{a.label}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Signups (3 cols) */}
        <div className="md:col-span-3">
          <h2 style={{ fontFamily: 'var(--font-jakarta)', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: '#00595c', letterSpacing: '0.07em', marginBottom: 12 }}>
            Recent Signups — {dept}
          </h2>
          {recentUsers.length === 0 ? (
            <div style={{ padding: 20, background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign: 'center', color: '#64748b', fontFamily: 'var(--font-jakarta)', fontSize: '0.8rem' }}>
              No users yet in this department.
            </div>
          ) : (
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              {recentUsers.map((u: any, i: number) => (
                <div key={u.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 12px', background: i % 2 === 0 ? '#ffffff' : '#f8fafc',
                  borderBottom: i < recentUsers.length - 1 ? '1px solid #e2e8f0' : 'none',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#e2f2f3', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ color: '#00595c', fontSize: '0.65rem', fontWeight: 700 }}>
                        {u.full_name?.split(' ').slice(0, 2).map((n: string) => n[0]).join('') || '?'}
                      </span>
                    </div>
                    <span style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 600, fontSize: '0.8rem', color: '#0f172a' }}>{u.full_name}</span>
                  </div>
                  <span style={{
                    fontFamily: 'var(--font-jakarta)', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
                    padding: '2px 8px', background: u.role === 'faculty' ? '#e2f2f3' : '#f1f5f9', color: '#334155', borderRadius: '12px',
                  }}>
                    {u.role}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
