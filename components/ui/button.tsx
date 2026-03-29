import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-condensed font-bold uppercase tracking-wide text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-55 active:scale-[.97]',
  {
    variants: {
      variant: {
        primary: 'bg-[var(--primary)] text-white shadow-[0_4px_14px_rgba(0,119,182,.3)] hover:bg-[var(--primary-dark)] hover:-translate-y-px',
        cta:     'bg-[var(--cta)] text-white shadow-[0_4px_14px_rgba(247,127,0,.35)] hover:bg-[var(--cta-hover)] hover:-translate-y-px',
        outline: 'border-2 border-white/50 text-white bg-transparent hover:bg-white/10 hover:border-white',
        ghost:   'border border-slate-200 text-slate-600 bg-transparent hover:bg-slate-100',
        danger:  'bg-red-500 text-white hover:bg-red-600',
        success: 'bg-emerald-500 text-white hover:bg-emerald-600',
        link:    'underline-offset-4 hover:underline text-[var(--primary)] normal-case tracking-normal font-normal text-sm p-0 h-auto shadow-none',
      },
      size: {
        default: 'h-11 px-7 py-3 text-[.9rem]',
        sm:      'h-9 px-4 text-[.8rem]',
        lg:      'h-13 px-9 text-base',
        icon:    'h-9 w-9 p-0',
      },
      fullWidth: {
        true:  'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant:   'primary',
      size:      'default',
      fullWidth:  false,
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, fullWidth, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, fullWidth, className }))}
        ref={ref}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }
