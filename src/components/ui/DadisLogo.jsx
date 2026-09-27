import { Home } from 'lucide-react'

/**
 * DADIS Estates Logo Component
 * 
 * @param {string} size - 'small' | 'default' | 'large'
 * @param {string} variant - 'dark' (default) | 'light' (for dark backgrounds)
 * @param {boolean} showTagline - Show "ESTATES" tagline
 */
export default function DadisLogo({ 
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
    <div className={`flex items-baseline ${className}`}>
      <span className={`font-bold tracking-tight ${s.text}`}>
        <span className={colors.main}>D</span>
        <span className={`${colors.accent} inline-flex items-center`}>
          <Home size={s.icon} className="mx-0.5 -mt-0.5" strokeWidth={2.5} />
        </span>
        <span className={colors.main}>DIS</span>
      </span>
      {showTagline && (
        <span className={`${s.tagline} font-semibold tracking-[0.15em] ${colors.tagline} uppercase ml-1.5`}>
          Estates
        </span>
      )}
    </div>
  )
}
