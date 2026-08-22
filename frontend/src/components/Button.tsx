import type { ButtonHTMLAttributes, ReactNode } from 'react';

const variants = {
  primary:
    'bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] border-transparent',
  secondary:
    'bg-white text-[var(--ink)] border-[var(--line)] hover:bg-[var(--bg)]',
  danger:
    'bg-[var(--danger)] text-white hover:opacity-90 border-transparent',
  ghost: 'bg-transparent text-[var(--muted)] border-transparent hover:bg-[var(--bg)]',
};

export function Button({
  variant = 'primary',
  children,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  children: ReactNode;
}) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-md border px-3.5 py-2 text-sm font-medium transition disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
