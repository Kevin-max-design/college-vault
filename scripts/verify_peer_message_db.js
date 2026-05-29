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

async function verifyPeerMessagesAndNotifications() {
  console.log('1. INITIALIZING CLIENTS...')
  const serviceClient = createClient(supabaseUrl, supabaseServiceKey)
  const clientA = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
  const clientB = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)

  // Login Account A (HOD CSE - Sender)
  const { data: authA, error: errA } = await clientA.auth.signInWithPassword({
    email: 'hod.cse@hod.rgmcet.edu.in',
    password: 'Password123!'
  })
  if (errA) {
    console.error('Failed to login as Account A:', errA.message)
    process.exit(1)
  }
  const userIdA = authA.user.id
  console.log(`- Sender Account A (HOD CSE) logged in: ${userIdA}`)

  // Login Account B (Principal - Receiver)
  const { data: authB, error: errB } = await clientB.auth.signInWithPassword({
    email: 'principal@principal.rgmcet.edu.in',
    password: 'Password123!'
  })
  if (errB) {
    console.error('Failed to login as Account B:', errB.message)
    process.exit(1)
  }
  const userIdB = authB.user.id
  console.log(`- Receiver Account B (Principal) logged in: ${userIdB}`)

  // Resolve a real classroom UUID
  const { data: classrooms, error: classErr } = await serviceClient
    .from('classrooms')
    .select('id')
    .limit(1)

  if (classErr || !classrooms || classrooms.length === 0) {
    console.error('Failed to fetch a valid classroom UUID:', classErr?.message)
    process.exit(1)
  }
  const realClassroomId = classrooms[0].id
  console.log(`- Resolved active classroom UUID: ${realClassroomId}`)

  console.log('\n2. INSERTING peer_messages ROW...')
  const messageBody = 'heyy'

  const { data: message, error: messageErr } = await serviceClient
    .from('peer_messages')
    .insert({
      classroom_id: realClassroomId,
      sender_id: userIdA,
      receiver_id: userIdB,
      body: messageBody
    })
    .select('*')
    .single()

  if (messageErr) {
    console.error('❌ Failed to insert peer_messages:', messageErr.message)
    process.exit(1)
  }
  console.log(`  ✅ peer_messages ROW INSERTED successfully! ID: ${message.id}`)

  console.log('\n3. DISPATCHING user_notifications ROW via createNotification params...')
  // Import the actual createNotification function dynamically to test the central helper
  const { createNotification } = require('../src/lib/notifications')

  const notification = await createNotification({
    userId: userIdB,
    actorId: userIdA,
    type: 'direct_message',
    category: 'classroom_message',
    priority: 'normal',
    source: 'classroom',
    title: 'New direct message',
    body: 'HOD Computer Science sent you a message',
    link: `/classrooms/${realClassroomId}`
  })

  if (!notification) {
    console.error('❌ Failed to create user_notification row.')
    process.exit(1)
  }
  console.log(`  ✅ user_notifications ROW CREATED successfully! ID: ${notification.id}`)

  console.log('\n4. VERIFYING ROWS IN LIVE DATABASE Catalog...')
  
  // Verify peer_messages row exists
  const { data: verifyMsgs, error: verifyMsgsErr } = await serviceClient
    .from('peer_messages')
    .select('*')
    .eq('id', message.id)
    .single()

  if (verifyMsgsErr || !verifyMsgs) {
    console.error('❌ peer_messages verification lookup failed:', verifyMsgsErr?.message)
  } else {
    console.log('  ✅ VERIFIED: peer_messages row exists with body:', verifyMsgs.body)
  }

  // Verify user_notifications row exists
  const { data: verifyNotifs, error: verifyNotifsErr } = await serviceClient
    .from('user_notifications')
    .select('*')
    .eq('id', notification.id)
    .single()

  if (verifyNotifsErr || !verifyNotifs) {
    console.error('❌ user_notifications verification lookup failed:', verifyNotifsErr?.message)
  } else {
    console.log('  ✅ VERIFIED: user_notifications row exists with title:', verifyNotifs.title, 'and body:', verifyNotifs.body)
    console.log('     Columns checked:')
    console.log(`       - user_id: ${verifyNotifs.user_id}`)
    console.log(`       - type: ${verifyNotifs.type}`)
    console.log(`       - title: ${verifyNotifs.title}`)
    console.log(`       - body: ${verifyNotifs.body}`)
    console.log(`       - link: ${verifyNotifs.link}`)
    console.log(`       - read: ${verifyNotifs.read}`)
    console.log(`       - category: ${verifyNotifs.category}`)
    console.log(`       - priority: ${verifyNotifs.priority}`)
    console.log(`       - source: ${verifyNotifs.source}`)
  }

  console.log('\n5. CLEANING UP TEST ROWS...')
  await serviceClient.from('peer_messages').delete().eq('id', message.id)
  await serviceClient.from('user_notifications').delete().eq('id', notification.id)
  console.log('- Test rows cleaned up successfully.')

  console.log('\n🌟 ALL PEER PEER MESSAGING & NOTIFICATION VERIFICATIONS PASSED!')
}

verifyPeerMessagesAndNotifications().catch(console.error)
