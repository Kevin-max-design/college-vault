import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'System Design · Campus Collaboration Platform',
  description: 'Complete system design documentation — architecture, modules, data flows, schemas, API design, and security.',
}

export default function SystemDesignLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Fira+Code:wght@400;500&display=swap"
        rel="stylesheet"
      />
      {children}
    </>
  )
}
