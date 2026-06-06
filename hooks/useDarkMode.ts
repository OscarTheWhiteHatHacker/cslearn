'use client'

import { useState, useEffect, useCallback } from 'react'
import { DARK_MODE_STORAGE_KEY } from '@/lib/constants'

export function useDarkMode() {
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
      // Respect system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      setIsDark(prefersDark)
      if (prefersDark) {
        document.documentElement.classList.add('dark')
      }
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

  return { isDark, toggle, setDark, mounted }
}
