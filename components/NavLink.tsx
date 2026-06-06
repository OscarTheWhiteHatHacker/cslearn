'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useMemo } from 'react'

interface NavLinkProps {
  href: string
  children: React.ReactNode
  exact?: boolean
  className?: string
  activeClassName?: string
  inactiveClassName?: string
}

export default function NavLink({
  href,
  children,
  exact = false,
  className = '',
  activeClassName = 'text-blue-600 border-b-2 border-blue-600',
  inactiveClassName = 'text-gray-600 hover:text-gray-900',
}: NavLinkProps) {
  const pathname = usePathname()

  const isActive = useMemo(() => {
    if (exact) return pathname === href
    // For root-level links, use exact match
    if (href === '/') return pathname === '/'
    // Otherwise check if pathname starts with href
    return pathname.startsWith(href)
  }, [pathname, href, exact])

  return (
    <Link
      href={href}
      className={cn(
        'text-sm font-medium transition-colors',
        isActive ? activeClassName : inactiveClassName,
        className,
      )}
      aria-current={isActive ? 'page' : undefined}
    >
      {children}
    </Link>
  )
}
