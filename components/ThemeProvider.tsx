'use client'

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { DARK_MODE_STORAGE_KEY } from '@/lib/constants'

interface ThemeContextValue {
  isDark: boolean
  toggle: () => void
  setDark: (dark: boolean) => void
  mounted: boolean
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem(DARK_MODE_STORAGE_KEY)
    if (stored === 'dark') {
      setIsDark(true)
      document.documentElement.classList.add('dark')
    } else if (stored === 'light') {
      setIsDark(false)
      document.documentElement.classList.remove('dark')
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      setIsDark(prefersDark)
      if (prefersDark) {
        document.documentElement.classList.add('dark')
      }
    }

    // Listen for reduced-motion preference
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (reducedMotionQuery.matches) {
      document.documentElement.classList.add('reduce-motion')
    }
    const handleReducedMotion = (e: MediaQueryListEvent) => {
      document.documentElement.classList.toggle('reduce-motion', e.matches)
    }
    reducedMotionQuery.addEventListener('change', handleReducedMotion)

    // Listen for dark mode system changes when no explicit preference is stored
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleColorScheme = (e: MediaQueryListEvent) => {
      const stored = localStorage.getItem(DARK_MODE_STORAGE_KEY)
      if (!stored) {
        setIsDark(e.matches)
        document.documentElement.classList.toggle('dark', e.matches)
      }
    }
    darkModeQuery.addEventListener('change', handleColorScheme)

    return () => {
      reducedMotionQuery.removeEventListener('change', handleReducedMotion)
      darkModeQuery.removeEventListener('change', handleColorScheme)
    }
  }, [])

  const toggle = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev
      if (next) {
        document.documentElement.classList.add('dark')
        localStorage.setItem(DARK_MODE_STORAGE_KEY, 'dark')
      } else {
        document.documentElement.classList.remove('dark')
        localStorage.setItem(DARK_MODE_STORAGE_KEY, 'light')
      }
      return next
    })
  }, [])

  const setDark = useCallback((dark: boolean) => {
    setIsDark(dark)
    if (dark) {
      document.documentElement.classList.add('dark')
      localStorage.setItem(DARK_MODE_STORAGE_KEY, 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem(DARK_MODE_STORAGE_KEY, 'light')
    }
  }, [])

  return (
    <ThemeContext.Provider value={{ isDark, toggle, setDark, mounted }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
