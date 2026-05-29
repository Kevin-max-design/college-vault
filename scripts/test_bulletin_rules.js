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

// Backend mock validation logic following the new API rules
function validateNoticePost(user, body) {
  const { title, scope, department } = body

  if (!title || !scope) {
    throw new Error("title and scope are required.")
  }

  if (user.role === "student") {
    throw new Error("Students cannot post notices.")
  }

  let targetDept = null

  if (user.role === "hod") {
    if (!user.department || user.department.trim() === "") {
      throw new Error("Your HOD profile has no department assigned. Please contact admin.")
    }
    targetDept = user.department.trim()
  } else if (user.role === "principal" || user.role === "admin") {
    if (scope === "department") {
      if (!department || typeof department !== "string" || department.trim() === "") {
        throw new Error("department is required for department-scoped notices.")
      }
      targetDept = department.trim()
    } else {
      targetDept = null
    }
  } else if (user.role === "faculty") {
    const dept = (department && typeof department === "string" && department.trim() !== "")
      ? department.trim()
      : (user.department && typeof user.department === "string" && user.department.trim() !== "")
        ? user.department.trim()
        : null

    if (scope === "department" && (!dept || dept === "")) {
      throw new Error("department is required for department-scoped notices.")
    }
    targetDept = dept
  }

  if (scope === "global" && user.role !== "principal" && user.role !== "admin") {
    throw new Error("Only the Principal can post global notices.")
  }
  if (scope === "department") {
    if (!["faculty", "hod", "principal", "admin"].includes(user.role)) {
      throw new Error("Only faculty or HOD can post department notices.")
    }
  }

  return targetDept
}

async function runTests() {
  console.log('--- 1. LOADING PROFILES FOR TESTING ---')
  const hodId = 'a33ec977-2a0e-401a-8a09-2e981ec2a088'
  const principalId = '14f76b10-aca3-4dde-8a3e-0aa39772427a'

  const { data: hodProfile } = await supabase.from('profiles').select('*').eq('id', hodId).single()
  const { data: principalProfile } = await supabase.from('profiles').select('*').eq('id', principalId).single()

  console.log(`HOD: ${hodProfile.full_name}, Role: ${hodProfile.role}, Dept: ${hodProfile.department}`)
  console.log(`Principal: ${principalProfile.full_name}, Role: ${principalProfile.role}, Dept: ${principalProfile.department}`)

  // ----------------------------------------------------
  console.log('\n--- 2. TEST: HOD CSE POSTING DEPARTMENT NOTICE ---')
  try {
    const targetDept = validateNoticePost(hodProfile, {
      title: 'CSE Dept Meeting',
      scope: 'department',
      department: 'ECE' // Send ECE from frontend to test if it gets ignored
    })
    console.log(`Validation PASSED. Target Department assigned: ${targetDept}`)
    if (targetDept !== 'CSE') {
      throw new Error(`Expected HOD's CSE department to be used, but got ${targetDept}`)
    }
    console.log('Inserting notice in DB...')
    const { data: notice, error: insertErr } = await supabase
      .from('notices')
      .insert({
        author_id: hodProfile.id,
        title: 'CSE Dept Meeting',
        body: 'Urgent meeting for all CSE students.',
        scope: 'department',
        department: targetDept,
        tag: 'urgent'
      })
      .select()
      .single()

    if (insertErr) throw insertErr
    console.log(`Notice inserted successfully. ID: ${notice.id}`)

    // Cleanup notice
    await supabase.from('notices').delete().eq('id', notice.id)
    console.log('Temporary notice cleaned up.')
  } catch (err) {
    console.error('❌ HOD CSE department notice test FAILED:', err.message)
    process.exit(1)
  }

  // ----------------------------------------------------
  console.log('\n--- 3. TEST: HOD WITH MISSING DEPARTMENT ---')
  try {
    console.log('Temporarily removing department from HOD profile...')
    await supabase.from('profiles').update({ department: '' }).eq('id', hodId)
    const { data: updatedHod } = await supabase.from('profiles').select('*').eq('id', hodId).single()

    try {
      validateNoticePost(updatedHod, {
        title: 'Meeting without department',
        scope: 'department'
      })
      console.error('❌ Expected validation to fail for HOD with missing department, but it passed.')
      process.exit(1)
    } catch (e) {
      console.log(`✅ Validation failed as expected with message: "${e.message}"`)
      if (e.message !== "Your HOD profile has no department assigned. Please contact admin.") {
        console.error('❌ Incorrect error message returned.')
        process.exit(1)
      }
    }
  } finally {
    console.log('Restoring department to HOD profile...')
    await supabase.from('profiles').update({ department: 'CSE' }).eq('id', hodId)
  }

  // ----------------------------------------------------
  console.log('\n--- 4. TEST: PRINCIPAL POSTS GLOBAL NOTICE ---')
  try {
    const targetDept = validateNoticePost(principalProfile, {
      title: 'Annual Day Celebrations',
      scope: 'global'
    })
    console.log(`Validation PASSED. Target Department assigned: ${targetDept}`)
    
    console.log('Inserting notice in DB...')
    const { data: notice, error: insertErr } = await supabase
      .from('notices')
      .insert({
        author_id: principalProfile.id,
        title: 'Annual Day Celebrations',
        body: 'All students are invited.',
        scope: 'global',
        department: targetDept,
        tag: 'general'
      })
      .select()
      .single()

    if (insertErr) throw insertErr
    console.log(`Global notice inserted successfully. ID: ${notice.id}`)

    // Cleanup notice
    await supabase.from('notices').delete().eq('id', notice.id)
    console.log('Temporary global notice cleaned up.')
  } catch (err) {
    console.error('❌ Principal global notice test FAILED:', err.message)
    process.exit(1)
  }

  // ----------------------------------------------------
  console.log('\n--- 5. TEST: PRINCIPAL POSTS DEPARTMENT NOTICE ---')
  try {
    console.log('a) Testing department notice without selecting department...')
    try {
      validateNoticePost(principalProfile, {
        title: 'Principal notice for department',
        scope: 'department'
      })
      console.error('❌ Expected validation to fail for principal department notice without dept, but it passed.')
      process.exit(1)
    } catch (e) {
      console.log(`✅ Validation failed as expected with message: "${e.message}"`)
      if (e.message !== "department is required for department-scoped notices.") {
        console.error('❌ Incorrect error message returned.')
        process.exit(1)
      }
    }

    console.log('b) Testing department notice with CSE department selected...')
    const targetDept = validateNoticePost(principalProfile, {
      title: 'Principal notice for department',
      scope: 'department',
      department: 'CSE'
    })
    console.log(`Validation PASSED. Target Department assigned: ${targetDept}`)
    if (targetDept !== 'CSE') {
      throw new Error(`Expected CSE, got ${targetDept}`)
    }
  } catch (err) {
    console.error('❌ Principal department notice test FAILED:', err.message)
    process.exit(1)
  }

  // ----------------------------------------------------
  console.log('\n--- 6. TEST: NOTIFICATION TARGETING FOR DEPARTMENT NOTICE ---')
  try {
    const finalDepartment = 'CSE'
    const actorId = hodId

    // Fetch target users exactly as backend does
    let targetQuery = supabase
      .from('profiles')
      .select('id, full_name, department, role')
      .neq('id', actorId) // never notify self
      .eq('department', finalDepartment)

    const { data: targets, error: targetsErr } = await targetQuery
    if (targetsErr) throw targetsErr

    console.log(`Total CSE target users fetched (excluding actor): ${targets.length}`)

    // Check that HOD actor is not in list
    const containsActor = targets.some(t => t.id === actorId)
    if (containsActor) {
      throw new Error("Target list incorrectly includes HOD actor!")
    }
    console.log('✅ Actor is excluded from notifications.')

    // Check all targets belong to CSE
    const nonCSE = targets.filter(t => t.department !== 'CSE')
    if (nonCSE.length > 0) {
      throw new Error(`Target list contains non-CSE users: ${JSON.stringify(nonCSE)}`)
    }
    console.log('✅ All targets belong to CSE department.')

    // Verify some CSE students are in the list
    const cseStudents = targets.filter(t => t.role === 'student')
    console.log(`CSE Student targets: ${cseStudents.length}`)
    if (cseStudents.length === 0) {
      console.warn('⚠️ No CSE students found in the database. Ensure seed is correct.')
    } else {
      console.log(`Example student: ${cseStudents[0].full_name} (${cseStudents[0].id})`)
    }
  } catch (err) {
    console.error('❌ Notification targeting test FAILED:', err.message)
    process.exit(1)
  }

  console.log('\n🌟 ALL BULLETIN BOARD RULE VERIFICATIONS PASSED!')
}

runTests().catch(console.error)
