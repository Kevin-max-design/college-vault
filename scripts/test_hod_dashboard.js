const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

try {
  const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8')
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return
    const parts = trimmed.split('=')
    if (parts.length >= 2) {
      const key = parts[0].trim()
      const value = parts.slice(1).join('=').trim()
      process.env[key] = value
    }
  })
} catch (e) {
  console.error('Failed to read .env.local:', e.message)
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !publishableKey) {
  console.error('Missing env variables!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, publishableKey)

async function testHODDashboard() {
  console.log('Logging in as HOD CSE...')
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'hod.cse@hod.rgmcet.edu.in',
    password: 'Password123!'
  })
  if (authErr) {
    console.error('Login failed:', authErr.message)
    process.exit(1)
  }
  console.log('Login successful. User ID:', auth.user.id)

  const { data: profile, error: profErr } = await supabase
    .from('profiles')
    .select('role, department, full_name')
    .eq('id', auth.user.id)
    .single()

  if (profErr) {
    console.error('Failed to fetch profile:', profErr.message)
    process.exit(1)
  }

  const role = profile.role
  const dept = profile.department
  console.log(`Role: ${role}, Dept: ${dept}`)

  console.log('Running HOD dashboard queries...')
  const [usersRes, classroomsRes, postsRes, listingsRes, recentUsersRes] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('department', dept),
    supabase.from('classrooms').select('id', { count: 'exact', head: true }).eq('department', dept),
    supabase.from('posts').select('id', { count: 'exact', head: true }),
    supabase.from('listings').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id, full_name, role, created_at').eq('department', dept).order('created_at', { ascending: false }).limit(5),
  ])

  console.log('Users Query Status:', usersRes.error ? `❌ ${usersRes.error.message}` : '✅ OK')
  console.log('Classrooms Query Status:', classroomsRes.error ? `❌ ${classroomsRes.error.message}` : '✅ OK')
  console.log('Posts Query Status:', postsRes.error ? `❌ ${postsRes.error.message}` : '✅ OK')
  console.log('Listings Query Status:', listingsRes.error ? `❌ ${listingsRes.error.message}` : '✅ OK')
  console.log('Recent Users Query Status:', recentUsersRes.error ? `❌ ${recentUsersRes.error.message}` : '✅ OK')

  if (recentUsersRes.data) {
    console.log('Recent Users Count:', recentUsersRes.data.length)
  }
}

testHODDashboard().catch(console.error)
