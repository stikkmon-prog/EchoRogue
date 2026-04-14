import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
}

const variantStyles: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-cyan-400 text-slate-950 hover:bg-cyan-300 border border-transparent shadow-[0_12px_30px_rgba(56,189,248,0.18)]',
  secondary: 'bg-white/5 text-slate-100 border border-white/10 hover:bg-white/10',
  ghost: 'bg-transparent text-slate-100 hover:bg-white/10',
  danger: 'bg-red-500 text-slate-950 hover:bg-red-400 border border-red-400/30'
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center rounded-3xl px-5 py-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-cyan-400/30 disabled:cursor-not-allowed disabled:opacity-50',
        variantStyles[variant],
        className
      )}
      {...props}
    />
  )
);

Button.displayName = 'Button';
