'use client'

import { useTheme } from '@/components/ThemeProvider'

export default function ThemeToggle() {
  const { isDark, toggle, mounted } = useTheme()

  if (!mounted) {
    return (
      <div className="h-9 w-20 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" aria-label="Loading theme toggle" />
    )
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={`relative h-9 w-20 rounded-full transition-all duration-300 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
        isDark
          ? 'bg-gray-800 ring-purple-500'
          : 'bg-yellow-200 ring-yellow-600'
      }`}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {/* Track background icons */}
      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-yellow-600 transition-opacity duration-300">
        <svg className={`h-4 w-4 ${isDark ? 'opacity-30' : 'opacity-100'}`} fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      </span>
      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-purple-400 transition-opacity duration-300">
        <svg className={`h-4 w-4 ${isDark ? 'opacity-100' : 'opacity-30'}`} fill="currentColor" viewBox="0 0 24 24">
          <path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      </span>

      {/* Slider thumb */}
      <span
        className={`absolute top-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-md transition-all duration-300 ease-in-out ${
          isDark ? 'translate-x-11' : 'translate-x-0.5'
        }`}
      >
        {isDark ? (
          <svg className="h-4 w-4 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        ) : (
          <svg className="h-4 w-4 text-yellow-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        )}
      </span>
    </button>
  )
}
