'use client'

import { ButtonHTMLAttributes, forwardRef } from 'react'
import { Button } from '@/components/ui/Button'

interface LoadingButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean
  loadingText?: string
}

/**
 * @deprecated Use `Button` component directly instead — it already supports `loading` and `loadingText` props.
 */
export const LoadingButton = forwardRef<HTMLButtonElement, LoadingButtonProps>(
  ({ loading = false, loadingText, children, className = '', ...props }, ref) => {
    return (
      <Button
        ref={ref}
        loading={loading}
        loadingText={loadingText}
        className={className}
        {...props}
      >
        {children}
      </Button>
    )
  },
)

LoadingButton.displayName = 'LoadingButton'
