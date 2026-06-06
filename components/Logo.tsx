'use client'

import { useTheme } from '@/components/ThemeProvider'

export default function Logo({ className = '' }: { className?: string }) {
  const { isDark } = useTheme()

  return (
    <img
      src={isDark ? '/logo-dark.svg' : '/logo.svg'}
      alt="CSLearn"
      className={className}
    />
  )
}
