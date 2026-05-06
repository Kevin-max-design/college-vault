import { redirect } from 'next/navigation'

// Legacy redirect: /projects was renamed to /vault
export default function ProjectsRedirect() {
  redirect('/vault')
}
