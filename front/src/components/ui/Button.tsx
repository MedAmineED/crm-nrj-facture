import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'premium'
  size?: 'sm' | 'md' | 'lg' | 'icon'
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          // Base styles
          'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          'active:scale-[0.98]',
          
          // Variant styles
          {
            // Premium gradient button
            'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/30 hover:-translate-y-0.5 rounded-xl':
              variant === 'premium',
            
            // Primary solid button
            'bg-primary-600 text-white hover:bg-primary-700 rounded-xl shadow-sm hover:shadow-md':
              variant === 'primary',
            
            // Secondary button
            'bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl border border-slate-200':
              variant === 'secondary',
            
            // Outline button
            'border-2 border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 rounded-xl':
              variant === 'outline',
            
            // Ghost button
            'text-slate-600 hover:bg-slate-100 hover:text-slate-900 rounded-xl':
              variant === 'ghost',
            
            // Danger button
            'bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-lg shadow-rose-500/25 hover:shadow-xl hover:shadow-rose-500/30 hover:-translate-y-0.5 rounded-xl':
              variant === 'danger',
          },
          
          // Size variants
          {
            'h-9 px-3.5 text-sm rounded-lg': size === 'sm',
            'h-11 px-5': size === 'md',
            'h-13 px-7 text-lg': size === 'lg',
            'h-10 w-10 p-0': size === 'icon',
          },
          
          className
        )}
        {...props}
      />
    )
  }
)

Button.displayName = 'Button'

export default Button