import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

const variants = {
  primary: 'bg-[var(--color-primary)] text-white hover:opacity-90 border-transparent font-bold shadow-md',
  secondary: 'bg-[var(--color-surface)] text-[var(--color-text)] border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] font-semibold shadow-sm',
  danger: 'bg-[var(--color-error)] text-white hover:opacity-90 border-transparent font-bold',
  ghost: 'bg-transparent text-[var(--color-text-muted)] border-transparent hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]',
};

// DESIGN_SYSTEM §11.2 — 32 / 40 / 48px. `md` matches the original (unsized) button exactly,
// so every existing caller keeps its current size.
const sizes = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-3.5 text-sm gap-2',
  lg: 'h-12 px-5 text-base gap-2',
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  /** Shows a spinner and disables the button without changing its width (DESIGN_SYSTEM §11.3). */
  loading?: boolean;
  children: ReactNode;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading = false, disabled, children, className = '', ...props },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`relative inline-flex cursor-pointer items-center justify-center rounded-md border font-medium transition disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      <span className={loading ? 'invisible' : 'contents'}>{children}</span>
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
            <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </span>
      )}
    </button>
  );
});
