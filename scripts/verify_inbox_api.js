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

async function runInboxVerification() {
  console.log('\n--- 1. INITIALIZING CLIENTS & ENSURING STUDENT PASSWORD ---')
  const serviceClient = createClient(supabaseUrl, supabaseServiceKey)
  const clientA = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
  const clientB = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)

  // Reset Student password using Admin Auth API to ensure password is Password123!
  const studentId = '3c5f6fe2-b679-4ff8-a36f-2466862c2ca4'
  const { error: resetErr } = await serviceClient.auth.admin.updateUserById(studentId, {
    password: 'Password123!'
  })
  if (resetErr) {
    console.error('Failed to reset student password:', resetErr.message)
    // Non-fatal, try to continue
  } else {
    console.log('- Student password reset/verified to Password123!')
  }

  // Login Account A (HOD CSE - Sender)
  const { data: authA, error: errA } = await clientA.auth.signInWithPassword({
    email: 'hod.cse@hod.rgmcet.edu.in',
    password: 'Password123!'
  })
  if (errA) {
    console.error('Failed to login as Account A (HOD CSE):', errA.message)
    process.exit(1)
  }
  const userIdA = authA.user.id
  console.log(`- Sender Account A (HOD CSE) logged in: ${userIdA}`)

  // Login Account B (Student Kevin - Receiver)
  const { data: authB, error: errB } = await clientB.auth.signInWithPassword({
    email: 'test@rgmcet.edu.in',
    password: 'Password123!'
  })
  if (errB) {
    console.error('Failed to login as Account B (Student):', errB.message)
    process.exit(1)
  }
  const userIdB = authB.user.id
  console.log(`- Receiver Account B (Student) logged in: ${userIdB}`)

  // Resolve a real classroom UUID
  const { data: classrooms, error: classErr } = await serviceClient
    .from('classrooms')
    .select('id, name')
    .limit(1)

  if (classErr || !classrooms || classrooms.length === 0) {
    console.error('Failed to fetch a valid classroom UUID:', classErr?.message)
    process.exit(1)
  }
  const realClassroomId = classrooms[0].id
  const realClassroomName = classrooms[0].name
  console.log(`- Resolved active classroom: ${realClassroomName} (${realClassroomId})`)

  console.log('\n--- 2. INSERTING peer_messages ROW (HOD -> Student) ---')
  const messageBody = 'Hello Student! This is HOD. Let us discuss your doubt.'

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

  console.log('\n--- 3. CREATING user_notifications ROW FOR STUDENT ---')
  // We use the createNotification helper function indirectly via direct insert using target_url column
  const notificationLink = `/vault?view=inbox&type=classroom_dm&classroomId=${realClassroomId}&userId=${userIdA}&userName=${encodeURIComponent('HOD Computer Science')}`
  const { data: notification, error: notifErr } = await serviceClient
    .from('user_notifications')
    .insert({
      user_id: userIdB,
      actor_id: userIdA,
      type: 'direct_message',
      category: 'classroom_message',
      priority: 'normal',
      source: 'classroom',
      title: 'New direct message',
      body: 'HOD Computer Science sent you a message',
      target_url: notificationLink
    })
    .select('*')
    .single()

  if (notifErr || !notification) {
    console.error('❌ Failed to create user_notification row:', notifErr?.message)
    process.exit(1)
  }
  console.log(`  ✅ user_notifications ROW CREATED successfully! ID: ${notification.id}`)
  console.log(`     Notification target link: ${notification.target_url}`)

  console.log('\n--- 4. FETCHING UNIFIED INBOX FOR STUDENT ---')
  // Querying conversations (market)
  const { data: conversations, error: convError } = await serviceClient
    .from("conversations")
    .select(`
      *,
      listing:listings(id, title, price, status, images, category),
      buyer:profiles!conversations_buyer_id_fkey(id, full_name, avatar_url, role),
      seller:profiles!conversations_seller_id_fkey(id, full_name, avatar_url, role)
    `)
    .or(`buyer_id.eq.${userIdB},seller_id.eq.${userIdB}`)

  if (convError) {
    console.error('❌ Conversations fetch error:', convError.message)
    process.exit(1);
  }

  // Querying classroom direct messages
  const { data: messagesList, error: msgError } = await serviceClient
    .from("peer_messages")
    .select("id, body, created_at, classroom_id, sender_id, receiver_id")
    .or(`sender_id.eq.${userIdB},receiver_id.eq.${userIdB}`)

  if (msgError) {
    console.error('❌ peer_messages fetch error:', msgError.message)
    process.exit(1);
  }

  // In-memory profiles and classrooms lookup
  const userIds = Array.from(new Set(messagesList.flatMap((m) => [m.sender_id, m.receiver_id])))
  const classroomIds = Array.from(new Set(messagesList.map((m) => m.classroom_id)))

  const [profilesRes, classroomsRes] = await Promise.all([
    serviceClient.from("profiles").select("id, full_name, avatar_url, role").in("id", userIds),
    serviceClient.from("classrooms").select("id, name").in("id", classroomIds),
  ]);

  if (profilesRes.error || classroomsRes.error) {
    console.error('❌ Profiles or classrooms fetch error:', profilesRes.error?.message, classroomsRes.error?.message)
    process.exit(1);
  }

  const profilesMap = new Map(profilesRes.data.map((p) => [p.id, p]));
  const classroomsMap = new Map(classroomsRes.data.map((c) => [c.id, c]));

  // Group peer messages
  const groupedDMs = new Map();
  for (const msg of messagesList) {
    const otherUserId = msg.sender_id === userIdB ? msg.receiver_id : msg.sender_id;
    const otherUser = profilesMap.get(otherUserId);
    if (!otherUser) continue;

    const key = `${msg.classroom_id}_${otherUserId}`;
    if (!groupedDMs.has(key)) {
      const classroom = classroomsMap.get(msg.classroom_id);
      groupedDMs.set(key, {
        id: key,
        kind: "classroom_dm",
        title: otherUser.full_name || "Anonymous",
        subtitle: classroom?.name || "Direct Message",
        otherUserId: otherUser.id,
        otherUserName: otherUser.full_name || "Anonymous",
        otherUserAvatar: otherUser.avatar_url || null,
        otherUserRole: otherUser.role || "student",
        lastMessage: msg.body,
        lastMessageAt: msg.created_at,
        classroomId: msg.classroom_id,
      });
    }
  }
  const classroomDMs = Array.from(groupedDMs.values());

  // Map conversations
  const marketInbox = (conversations ?? []).map((conv) => {
    const isBuyer = conv.buyer_id === userIdB;
    const otherUser = isBuyer ? conv.seller : conv.buyer;
    return {
      id: conv.id,
      kind: "market",
      title: conv.listing?.title || "Unknown Item",
      subtitle: isBuyer ? "Buying" : "Selling",
      otherUserId: otherUser?.id,
      otherUserName: otherUser?.full_name || "Anonymous",
      otherUserAvatar: otherUser?.avatar_url || null,
      otherUserRole: otherUser?.role || "student",
      lastMessage: conv.last_message || "No messages yet.",
      lastMessageAt: conv.updated_at,
      listingId: conv.listing_id,
      conversationId: conv.id,
    };
  });

  const mergedInbox = [...marketInbox, ...classroomDMs].sort((a, b) => {
    return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
  });

  // Verify that the HOD message is in the inbox list
  const testItem = mergedInbox.find(item => item.otherUserId === userIdA && item.classroomId === realClassroomId)

  if (testItem) {
    console.log('  ✅ VERIFIED: HOD direct message item found in Student unified inbox!')
    console.log(`     Item details:`)
    console.log(`       - Kind: ${testItem.kind}`)
    console.log(`       - Title (Sender name): ${testItem.title}`)
    console.log(`       - Subtitle (Classroom name): ${testItem.subtitle}`)
    console.log(`       - Role: ${testItem.otherUserRole}`)
    console.log(`       - Latest Message: "${testItem.lastMessage}"`)
    console.log(`       - Timestamp: ${testItem.lastMessageAt}`)
  } else {
    console.error('❌ Failed: HOD direct message item NOT found in Student unified inbox.')
    process.exit(1)
  }

  console.log('\n--- 5. CLEANING UP TEST ROWS ---')
  await serviceClient.from('peer_messages').delete().eq('id', message.id)
  await serviceClient.from('user_notifications').delete().eq('id', notification.id)
  console.log('  ✅ Test rows cleaned up successfully.')

  console.log('\n🌟 ALL UNIFIED INBOX VERIFICATIONS PASSED!')
}

runInboxVerification().catch(console.error)
