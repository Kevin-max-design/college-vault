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
  { email: 'principal@principal.rgmcet.edu.in', password: 'Password123!', role: 'principal', name: 'Dr. Principal', department: 'MATHS' },
  { email: 'hod.cse@hod.rgmcet.edu.in', password: 'Password123!', role: 'hod', name: 'HOD Computer Science', department: 'CSE' },
  { email: 'hod.cseds@hod.rgmcet.edu.in', password: 'Password123!', role: 'hod', name: 'Dr. DS HOD', department: 'CSE-DS' },
  { email: 'faculty.cs101@faculty.rgmcet.edu.in', password: 'Password123!', role: 'faculty', name: 'Prof. CS101', department: 'CSE' },
  { email: 'admin.ao@ao-office.rgmcet.edu.in', password: 'Password123!', role: 'ao_office', name: 'Admin Officer', department: '' },
  { email: 'admin.exam@exam-cell.rgmcet.edu.in', password: 'Password123!', role: 'exam_cell', name: 'Exam Controller', department: '' },
  { email: 'admin.placement@placement.rgmcet.edu.in', password: 'Password123!', role: 'placement', name: 'Placement Cell', department: '' },
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
      if (authError.message.includes('already registered') || authError.message.includes('already been registered') || authError.code === 'email_exists') {
        console.log(`User ${admin.email} already exists. Attempting to update profile...`)
        // We need to fetch the existing user's ID to update their profile role/department
        const { data: { users } } = await supabase.auth.admin.listUsers()
        const existingUser = users.find(u => u.email === admin.email)
        if (existingUser) {
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({ 
              id: existingUser.id, 
              email: admin.email,
              full_name: admin.name,
              role: admin.role,
              department: admin.department,
              otp_verified: true
            })
          if (profileError) {
            console.error(`Error updating existing profile for ${admin.email}:`, profileError)
          } else {
            console.log(`Updated existing profile for ${admin.email}`)
          }
        }
      } else {
        console.error(`Error creating ${admin.email}:`, authError)
      }
      continue
    }

    const userId = authData.user.id
    console.log(`Created auth user ${admin.email} with ID ${userId}`)

    // Wait a moment for trigger to create profile (if trigger exists)
    await new Promise(resolve => setTimeout(resolve, 500))

    // 2. Update their profile with the correct role & department
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({ 
        id: userId, 
        email: admin.email,
        full_name: admin.name,
        role: admin.role,
        department: admin.department,
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
