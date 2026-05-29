const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

// Manual parsing of .env.local
try {
  const envContent = fs.readFileSync('.env.local', 'utf8')
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
  console.log('Parsed .env.local successfully.')
} catch (e) {
  console.error('Failed to read .env.local:', e.message)
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing env variables!')
  process.exit(1)
}

async function verify() {
  console.log('1. INITIALIZING SUPABASE SERVICE CLIENT...')
  const serviceClient = createClient(supabaseUrl, supabaseServiceKey)

  console.log('\n2. CHECKING BUCKETS...')
  const { data: buckets, error: bucketsErr } = await serviceClient.storage.listBuckets()
  if (bucketsErr) {
    console.error('Failed to list buckets:', bucketsErr)
    process.exit(1)
  }
  
  const avatarsBucket = buckets.find(b => b.name === 'avatars')
  const attachmentsBucket = buckets.find(b => b.name === 'attachments')
  
  console.log(`- avatars bucket exists: ${!!avatarsBucket} (Public: ${avatarsBucket?.public})`)
  console.log(`- attachments bucket exists: ${!!attachmentsBucket} (Public: ${attachmentsBucket?.public})`)
  
  if (!avatarsBucket || !attachmentsBucket) {
    console.error('Core buckets are missing!')
    process.exit(1)
  }

  console.log('\n3. AUTHENTICATING ACCOUNT A AND ACCOUNT B...')
  const clientA = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
  const clientB = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)

  // Login as principal
  const { data: authA, error: errA } = await clientA.auth.signInWithPassword({
    email: 'principal@principal.rgmcet.edu.in',
    password: 'Password123!'
  })
  if (errA) {
    console.error('Failed to login as Account A:', errA.message)
    process.exit(1)
  }
  const userIdA = authA.user.id
  console.log(`- Account A (Principal) logged in. ID: ${userIdA}`)

  // Login as CS HOD
  const { data: authB, error: errB } = await clientB.auth.signInWithPassword({
    email: 'hod.cse@hod.rgmcet.edu.in',
    password: 'Password123!'
  })
  if (errB) {
    console.error('Failed to login as Account B:', errB.message)
    process.exit(1)
  }
  const userIdB = authB.user.id
  console.log(`- Account B (HOD CSE) logged in. ID: ${userIdB}`)

  console.log('\n4. RUNNING STORAGE SECURITY ASSERTIONS (RLS TEST)...');

  // Test 1: Account A uploading into Account A's folder (Own folder) -> EXPECT SUCCESS
  console.log('- Test 1: Account A uploads into own folder...')
  const fileContent = Buffer.from('campusvault_verfication_test')
  const pathOwn = `${userIdA}/listings/verif_test.txt`
  
  const { data: upOwn, error: upOwnErr } = await clientA.storage
    .from('attachments')
    .upload(pathOwn, fileContent, { contentType: 'text/plain', upsert: true })

  if (upOwnErr) {
    console.error('  ❌ Test 1 FAILED! Account A could not upload to own folder:', upOwnErr.message)
  } else {
    console.log('  ✅ Test 1 PASSED! Upload to own folder succeeded.')
  }

  // Test 2: Account A uploading into Account B's folder (Foreign folder) -> EXPECT FAILURE
  console.log('- Test 2: Account A attempts to upload into Account B\'s folder...')
  const pathForeign = `${userIdB}/listings/verif_test.txt`
  
  const { data: upForeign, error: upForeignErr } = await clientA.storage
    .from('attachments')
    .upload(pathForeign, fileContent, { contentType: 'text/plain', upsert: true })

  if (upForeignErr) {
    console.log('  ✅ Test 2 PASSED! Upload to foreign folder was blocked as expected. Error:', upForeignErr.message)
  } else {
    console.error('  ❌ Test 2 FAILED! Account A successfully uploaded to Account B\'s folder! RLS BYPASS DETECTED.')
    // Cleanup if it bypassed
    await serviceClient.storage.from('attachments').remove([pathForeign])
  }

  // Test 3: Account B attempts to delete Account A's file -> EXPECT FAILURE
  console.log('- Test 3: Account B attempts to delete Account A\'s file...')
  const { data: delForeign, error: delForeignErr } = await clientB.storage
    .from('attachments')
    .remove([pathOwn])

  if (delForeignErr || !delForeign || delForeign.length === 0) {
    console.log('  ✅ Test 3 PASSED! Account B was blocked from deleting Account A\'s file.')
  } else {
    console.error('  ❌ Test 3 FAILED! Account B successfully deleted Account A\'s file! RLS BYPASS DETECTED.')
  }

  // Test 4: Account A deletes own file -> EXPECT SUCCESS
  console.log('- Test 4: Account A deletes own file...')
  const { data: delOwn, error: delOwnErr } = await clientA.storage
    .from('attachments')
    .remove([pathOwn])

  if (delOwnErr) {
    console.error('  ❌ Test 4 FAILED! Account A could not delete own file:', delOwnErr.message)
  } else {
    console.log('  ✅ Test 4 PASSED! Account A successfully deleted own file.')
  }

  console.log('\n--- VERIFICATION COMPLETED ---')
}

verify().catch(console.error)
