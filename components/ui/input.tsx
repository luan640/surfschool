import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode
  error?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, icon, error, type, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="relative flex items-center">
          {icon && (
            <span className="absolute left-3 text-slate-400 pointer-events-none w-4 h-4 flex items-center">
              {icon}
            </span>
          )}
          <input
            type={type}
            className={cn(
              'flex h-11 w-full rounded-sm border border-slate-200 bg-white px-3 py-2 text-sm font-sans text-slate-800 placeholder:text-slate-400 transition-colors',
              'focus-visible:outline-none focus-visible:border-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]/10',
              icon && 'pl-10',
              error && 'border-red-400 focus-visible:ring-red-400/10',
              className,
            )}
            ref={ref}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
      </div>
    )
  },
)
Input.displayName = 'Input'

export { Input }
