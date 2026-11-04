import type { ButtonHTMLAttributes } from 'react'

/** Mutually exclusive variants prevent a panel background overriding the primary colour. */
export function Button({ primary, className = '', type = 'button', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { primary?: boolean }) {
  return <button {...props} type={type} className={`min-h-11 rounded-xl border px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${primary ? 'border-accent bg-accent text-paper hover:bg-accent-hover' : 'border-line-strong bg-panel text-ink hover:bg-paper-deep'} ${className}`} />
}
