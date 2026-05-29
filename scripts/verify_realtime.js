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

async function runRealtimeTest() {
  console.log('1. INITIALIZING SUPABASE CLIENTS...')
  const serviceClient = createClient(supabaseUrl, supabaseServiceKey)
  const clientA = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
  const clientB = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)

  // Login Account A (Principal)
  const { data: authA, error: errA } = await clientA.auth.signInWithPassword({
    email: 'principal@principal.rgmcet.edu.in',
    password: 'Password123!'
  })
  if (errA) {
    console.error('Failed to login as Account A:', errA.message)
    process.exit(1)
  }
  const userIdA = authA.user.id
  console.log(`- Account A (Principal) logged in: ${userIdA}`)

  // Login Account B (HOD CSE)
  const { data: authB, error: errB } = await clientB.auth.signInWithPassword({
    email: 'hod.cse@hod.rgmcet.edu.in',
    password: 'Password123!'
  })
  if (errB) {
    console.error('Failed to login as Account B:', errB.message)
    process.exit(1)
  }
  const userIdB = authB.user.id
  console.log(`- Account B (HOD CSE) logged in: ${userIdB}`)

  console.log('\n2. SETTING UP REAL-TIME LISTENER FOR ACCOUNT B...')
  let eventReceived = null
  let resolveEvent = null
  const eventPromise = new Promise(resolve => { resolveEvent = resolve })

  const channel = clientB
    .channel('realtime-test-listings')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'listings'
      },
      (payload) => {
        console.log('  🔔 RECEIVED INSERT EVENT ON REAL-TIME CHANNEL!')
        eventReceived = payload.new
        resolveEvent(payload.new)
      }
    )
    .subscribe((status) => {
      console.log(`- Real-time subscription status: ${status}`)
    })

  // Wait a moment for subscription to be active
  console.log('Waiting 3 seconds for channel connection to stabilize...')
  await new Promise(resolve => setTimeout(resolve, 3000))

  console.log('\n3. ACCOUNT A CREATES A LISTING WITH AN IMAGE...')
  const testListingTitle = `Verification Book ${Date.now()}`
  const testImage = ['https://lhmlmxcerkfbsytohnza.supabase.co/storage/v1/object/public/attachments/test-image.jpg']

  const { data: createdListing, error: createError } = await clientA
    .from('listings')
    .insert({
      seller_id: userIdA,
      title: testListingTitle,
      description: 'Automated Real-time Verification Listing',
      price: 49.99,
      type: 'buy',
      category: 'books',
      images: testImage,
      status: 'available'
    })
    .select('*')
    .single()

  if (createError) {
    console.error('Failed to create listing:', createError.message)
    clientB.removeChannel(channel)
    process.exit(1)
  }
  console.log(`- Listing created successfully by Account A! ID: ${createdListing.id}`)

  console.log('\n4. AWAITING REAL-TIME EVENT PROPAGATION FOR ACCOUNT B...')
  // Wait up to 10 seconds for event
  const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Real-time event timed out!')), 10000))
  
  try {
    const receivedListing = await Promise.race([eventPromise, timeoutPromise])
    console.log('  ✅ SUCCESS! Real-time event propagated successfully.')
    console.log('  🔍 LISTING RECEIVED METADATA:')
    console.log(`    - ID: ${receivedListing.id}`)
    console.log(`    - Title: ${receivedListing.title}`)
    console.log(`    - Price: $${receivedListing.price}`)
    console.log(`    - Images: ${JSON.stringify(receivedListing.images)}`)
    console.log(`    - Seller ID: ${receivedListing.seller_id}`)

    // Run verification assertions
    if (receivedListing.title !== testListingTitle) throw new Error('Title mismatch!')
    if (receivedListing.seller_id !== userIdA) throw new Error('Seller ID mismatch!')
    if (!receivedListing.images || receivedListing.images[0] !== testImage[0]) throw new Error('Image URL mismatch!')

    console.log('\n🌟 ALL REAL-TIME CHECKS PASSED SUCCESSFULLY!')
  } catch (err) {
    console.error('  ❌ REAL-TIME CHECK FAILED:', err.message)
  } finally {
    // Cleanup by deleting the test listing
    console.log('\n5. CLEANING UP TEST LISTING...')
    const { error: deleteErr } = await serviceClient
      .from('listings')
      .delete()
      .eq('id', createdListing.id)
    
    if (deleteErr) {
      console.error('Failed to delete test listing during cleanup:', deleteErr.message)
    } else {
      console.log('- Test listing deleted successfully.')
    }

    clientB.removeChannel(channel)
  }
}

runRealtimeTest().catch(console.error)
