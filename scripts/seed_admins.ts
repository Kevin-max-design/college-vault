import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const ADMINS = [
  { email: 'principal@campusvault.edu', password: 'Password123!', role: 'principal', name: 'Dr. Principal' },
  { email: 'hod.cse@campusvault.edu', password: 'Password123!', role: 'hod', name: 'HOD Computer Science' },
  { email: 'faculty.cs101@campusvault.edu', password: 'Password123!', role: 'faculty', name: 'Prof. CS101' },
  { email: 'admin.ao@campusvault.edu', password: 'Password123!', role: 'ao_office', name: 'Admin Officer' },
  { email: 'admin.exam@campusvault.edu', password: 'Password123!', role: 'exam_cell', name: 'Exam Controller' },
  { email: 'admin.placement@campusvault.edu', password: 'Password123!', role: 'placement', name: 'Placement Cell' },
]

async function seedAdmins() {
  console.log('Seeding admins...')

  for (const admin of ADMINS) {
    // 1. Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: admin.email,
      password: admin.password,
      email_confirm: true,
    })

    if (authError) {
      if (authError.message.includes('already registered')) {
        console.log(`User ${admin.email} already exists. Attempting to update profile...`)
        // We can optionally fetch the user ID to update the profile if it exists,
        // but for simplicity we'll just log and continue.
      } else {
        console.error(`Error creating ${admin.email}:`, authError)
      }
      continue
    }

    const userId = authData.user.id
    console.log(`Created auth user ${admin.email} with ID ${userId}`)

    // Wait a moment for trigger to create profile (if trigger exists)
    await new Promise(resolve => setTimeout(resolve, 500))

    // 2. Update their profile with the correct role
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({ 
        id: userId, 
        email: admin.email,
        full_name: admin.name,
        role: admin.role,
        otp_verified: true
      })

    if (profileError) {
      console.error(`Error updating profile for ${admin.email}:`, profileError)
    } else {
      console.log(`Profile updated for ${admin.email}`)
    }
  }

  console.log('Done seeding admins!')
}

seedAdmins()
