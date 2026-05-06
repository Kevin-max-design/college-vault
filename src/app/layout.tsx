import type { Metadata, Viewport } from 'next'
import './globals.css'
import ServiceWorkerRegistrar from './components/ServiceWorkerRegistrar'

export const metadata: Metadata = {
  title: 'CampusVault — Your Campus, Your Network',
  description: 'A college-exclusive peer-to-peer resource-sharing and bulletin platform.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'CampusVault',
    startupImage: '/apple-touch-icon.png',
  },
  formatDetection: { telephone: false },
  openGraph: {
    title: 'CampusVault',
    description: 'Your campus — bulletin, classrooms, marketplace & more.',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: '#00595c',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        {/* Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,200..800;1,6..72,200..800&family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
        
        {/* PWA */}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="CampusVault" />
      </head>
      <body>
        {children}
        <ServiceWorkerRegistrar />
      </body>
    </html>
  )
}
