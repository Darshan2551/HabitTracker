import { clsx } from 'clsx';
import type { ButtonHTMLAttributes } from 'react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  loading?: boolean;
};

const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-accent text-white hover:opacity-90 focus-visible:ring-accent',
  secondary: 'bg-surface border border-border text-text hover:bg-canvas focus-visible:ring-accent',
  ghost: 'bg-transparent text-text hover:bg-canvas focus-visible:ring-accent',
  danger: 'bg-rose-600 text-white hover:bg-rose-500 focus-visible:ring-rose-400',
};

export function Button({
  className,
  variant = 'primary',
  loading = false,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        variants[variant],
        (disabled || loading) && 'cursor-not-allowed opacity-60',
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? 'Please wait...' : children}
    </button>
  );
}
