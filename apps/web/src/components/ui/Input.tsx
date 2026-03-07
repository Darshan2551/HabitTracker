import { clsx } from 'clsx';
import type { InputHTMLAttributes } from 'react';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

export function Input({ label, error, className, ...props }: InputProps) {
  return (
    <label className="block space-y-1">
      {label ? <span className="text-sm font-medium text-text">{label}</span> : null}
      <input
        className={clsx(
          'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none ring-0 placeholder:text-muted focus:border-accent',
          error && 'border-rose-500',
          className,
        )}
        {...props}
      />
      {error ? <span className="text-xs text-rose-500">{error}</span> : null}
    </label>
  );
}
