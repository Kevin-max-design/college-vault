'use client'

import { useEffect } from 'react'

export default function ClassroomError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[ClassroomError] Caught error:', error)
  }, [error])

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: 'var(--font-jakarta), system-ui, sans-serif',
      background: '#F4EFE6',
    }}>
      <div style={{
        maxWidth: 420,
        width: '100%',
        border: '2px solid #ba1a1a',
        background: '#fff',
        padding: '24px',
        boxShadow: '4px 4px 0 0 #ba1a1a',
      }}>
        <h2 style={{ color: '#ba1a1a', fontSize: '1.2rem', marginBottom: 8, fontWeight: 800 }}>
          ⚠ Classroom Error
        </h2>
        <p style={{ fontSize: '0.85rem', color: '#1b1c19', marginBottom: 12, lineHeight: 1.5 }}>
          <strong>Error:</strong> {error.message}
        </p>
        {error.digest && (
          <p style={{ fontSize: '0.75rem', color: '#6e7979', marginBottom: 12 }}>
            Digest: {error.digest}
          </p>
        )}
        <pre style={{
          background: '#f5f3ee',
          border: '1px solid #bec9c9',
          padding: '10px',
          fontSize: '0.7rem',
          overflow: 'auto',
          maxHeight: 200,
          marginBottom: 16,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
        }}>
          {error.stack ?? 'No stack trace available'}
        </pre>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={reset}
            style={{
              padding: '10px 20px',
              background: '#00595c',
              color: '#fff',
              border: '2px solid #00595c',
              fontWeight: 700,
              fontSize: '0.75rem',
              cursor: 'pointer',
              textTransform: 'uppercase',
            }}
          >
            Try Again
          </button>
          <a
            href="/classrooms"
            style={{
              padding: '10px 20px',
              background: 'transparent',
              color: '#00595c',
              border: '2px solid #00595c',
              fontWeight: 700,
              fontSize: '0.75rem',
              cursor: 'pointer',
              textTransform: 'uppercase',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            Back to Classrooms
          </a>
        </div>
      </div>
    </div>
  )
}
