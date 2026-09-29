import { Home } from 'lucide-react'

/**
 * NEST@R Logo Component
 * 
 * @param {string} size - 'small' | 'default' | 'large'
 * @param {string} variant - 'dark' (default) | 'light' (for dark backgrounds)
 * @param {boolean} showTagline - Show tagline
 */
export default function NestarLogo({ 
  size = 'default', 
  variant = 'dark',
  showTagline = true,
  className = '' 
}) {
  const sizes = {
    small: { text: 'text-lg', icon: 14, tagline: 'text-[8px]' },
    default: { text: 'text-2xl', icon: 18, tagline: 'text-[10px]' },
    large: { text: 'text-3xl', icon: 22, tagline: 'text-xs' },
  }
  const s = sizes[size] || sizes.default
  
  const colors = variant === 'light' 
    ? { main: 'text-white', accent: 'text-brand-400', tagline: 'text-slate-400' }
    : { main: 'text-navy-900', accent: 'text-brand-600', tagline: 'text-navy-500' }

  return (
    <div className={`flex items-center ${className}`}>
      <span className={`${colors.accent} inline-flex items-center mr-1`}>
        <Home size={s.icon} strokeWidth={2.5} />
      </span>
      <span className={`font-bold tracking-tight ${s.text} ${colors.main}`}>
        NEST
      </span>
    </div>
  )
}
