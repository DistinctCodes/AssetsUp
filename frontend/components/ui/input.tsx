import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string
  label?: string
  error?: string | undefined
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ id, label, error, className = '', ...props }, ref) => {
    const describedBy = error ? `${id}-error` : undefined

    return (
      <div className={cn('flex flex-col gap-1')}>
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-gray-700">
            {label}
          </label>
        )}

        <input
          id={id}
          ref={ref}
          className={cn(
            'w-full rounded-lg border px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            error ? 'border-red-300 focus-visible:ring-red-500' : 'border-gray-300',
            className
          )}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          {...props}
        />

        {error && (
          <p id={`${id}-error`} className="text-xs text-red-500 mt-1">
            {error}
          </p>
        )}
      </div>
    )
  }
)
Input.displayName = 'Input'
