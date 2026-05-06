'use client'

import { useEffect, useState } from 'react'

export default function Template({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className={`transition-opacity duration-300 ease-in-out ${mounted ? 'opacity-100' : 'opacity-0'}`}>
      {children}
    </div>
  )
}
