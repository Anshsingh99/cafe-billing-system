import { Analytics } from '@vercel/analytics/next'
import { Inter, Playfair_Display } from 'next/font/google'
import type { Metadata, Viewport } from 'next'
import './globals.css'
import { AppGate } from '@/components/app-gate'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' })

export const metadata: Metadata = {
  title: 'Ullas Cafe | Cafe POS',
  description: 'A calm, quick point-of-sale workspace for Ullas Cafe.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/image.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/image.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/image.png',
        type: 'image/svg+xml',
      },
    ],
    apple: 'image.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#fbf7ef',
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-background">
      <body className={`${inter.variable} ${playfair.variable} font-sans antialiased`}>
        <AppGate>{children}</AppGate>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
