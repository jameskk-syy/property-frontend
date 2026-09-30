import Card from './Card'

export default function StatCard({ label, value, icon: Icon, trend, trendLabel, tone = 'brand' }) {
  const iconBg = {
    brand: 'bg-brand-50 text-brand-600',
    blue: 'bg-blue-50 text-blue-600',
    orange: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
  }[tone]

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm text-slate-500 min-w-0">{label}</span>
        {Icon && (
          <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
            <Icon size={18} />
          </span>
        )}
      </div>
      <div className="flex items-end justify-between gap-2 flex-wrap">
        <span className="text-xl sm:text-2xl font-semibold text-slate-900 break-words min-w-0">{value}</span>
        {trend != null && (
          <span className={`text-xs font-medium shrink-0 ${trend >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {trend >= 0 ? '+' : ''}
            {trend}% {trendLabel}
          </span>
        )}
      </div>
    </Card>
  )
}
