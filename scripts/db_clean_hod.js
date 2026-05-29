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
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing env variables!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function run() {
  console.log('--- BEFORE CLEANUP: HOD Profiles ---')
  const { data: before, error: getErr } = await supabase
    .from('profiles')
    .select('id, full_name, role, department, year_of_study')
    .eq('role', 'hod')

  if (getErr) {
    console.error('Failed to query profiles:', getErr.message)
    process.exit(1)
  }

  console.table(before)

  const missingDept = before.filter(p => !p.department || p.department.trim() === '')
  if (missingDept.length > 0) {
    console.log(`Found ${missingDept.length} HOD profile(s) with missing department. Fixing...`)
    
    for (const p of missingDept) {
      console.log(`Updating ${p.full_name} (${p.id}) department to 'CSE'...`)
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ department: 'CSE' })
        .eq('id', p.id)
      
      if (updateErr) {
        console.error(`Failed to update ${p.full_name}:`, updateErr.message)
      } else {
        console.log(`Successfully updated ${p.full_name}.`)
      }
    }

    console.log('--- AFTER CLEANUP: HOD Profiles ---')
    const { data: after, error: getAfterErr } = await supabase
      .from('profiles')
      .select('id, full_name, role, department, year_of_study')
      .eq('role', 'hod')
    
    if (getAfterErr) {
      console.error('Failed to query profiles after update:', getAfterErr.message)
    } else {
      console.table(after)
    }
  } else {
    console.log('No HOD profiles with missing department found.')
  }
}

run().catch(console.error)
