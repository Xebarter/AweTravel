import type { Metadata, Viewport } from 'next'
import { Montserrat } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { AuthProvider } from '@/lib/auth-context'
import './globals.css'

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: 'variable',
  variable: '--font-montserrat',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'AweTravel — Digital transport marketplace',
    template: '%s — AweTravel',
  },
  description:
    'Book travel tickets online with AweTravel — search routes, compare fares, and complete bookings with verified operators.',
  applicationName: 'AweTravel',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'AweTravel',
    statusBarStyle: 'default',
  },
  /** Favicon, `app/icon.*`, and `app/apple-icon.png` are picked up automatically by Next.js. */
}

export const viewport: Viewport = {
  themeColor: '#ea580c',
  colorScheme: 'light dark',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${montserrat.variable} ${montserrat.className} bg-background antialiased`}
    >
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
