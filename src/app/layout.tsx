import './globals.css'
import type { Metadata } from 'next'
import Providers from './providers'
import Header from '@/components/Header'
import GlobalAudioPlayer from '@/components/GlobalAudioPlayer'

export const metadata: Metadata = {
  title: 'Reminiscent - Music Platform',
  description: 'Discover, upload, and share music on Reminiscent',
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' }
    ],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <Providers>
          <Header />
          {children}
          <GlobalAudioPlayer />
        </Providers>
      </body>
    </html>
  )
}

