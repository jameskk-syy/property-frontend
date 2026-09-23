import { Loader2 } from 'lucide-react'

const SIZES = { sm: 16, md: 22, lg: 30 }

/** Simple spinning indicator used inline or inside loading blocks. */
export default function Spinner({ size = 'md', className = '' }) {
  const px = SIZES[size] || SIZES.md
  return <Loader2 size={px} className={`animate-spin text-brand-500 ${className}`} />
}

/**
 * Centered loading block for full-page / section loads. Shows a spinner
 * and an optional label.
 */
export function LoadingState({ label = 'Loading…', className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center text-center py-14 text-slate-400 ${className}`}>
      <Spinner size="lg" />
      <p className="text-sm font-medium text-slate-500 mt-3">{label}</p>
    </div>
  )
}
