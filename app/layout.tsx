import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { SupabaseProvider } from '@/components/supabase-provider'
import { ThemeProvider } from '@/components/ThemeProvider'
import OfflineBanner from '@/components/OfflineBanner'
import { Suspense } from 'react'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    template: '%s | CSLearn',
    default: 'CSLearn',
  },
  description: 'GCSE revision platform for Computer Science and English Language',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'CSLearn',
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'theme-color': '#4f46e5',
    'msapplication-TileColor': '#4f46e5',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="">
      <body className={inter.className}>
        <ThemeProvider>
          <SupabaseProvider>
            <Suspense fallback={null}>
              <OfflineBanner />
            </Suspense>
            <main className="min-h-screen bg-gray-50 flex flex-col">
              <Suspense fallback={
                <div className="flex items-center justify-center py-20">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
                </div>
              }>
                <div className="flex-1">
                  {children}
                </div>
              </Suspense>
              <footer className="border-t border-gray-200 bg-white/80 py-3 px-4 text-center dark:border-gray-700 dark:bg-gray-900/80">
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Unofficial educational resource. Not affiliated with or endorsed by OCR, AQA, or Pearson Edexcel.
                </p>
              </footer>
            </main>
          </SupabaseProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
