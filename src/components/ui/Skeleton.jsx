/**
 * Shimmering placeholder blocks shown while content loads.
 * - `Skeleton` is a single shimmer block.
 * - `TableSkeleton` mimics the DataTable layout so list pages don't jump.
 * - `StatCardsSkeleton` / `CardSkeleton` cover dashboards & report cards.
 */
export default function Skeleton({ className = '', style = {} }) {
  return (
    <div
      className={`animate-shimmer bg-shimmer rounded ${className}`}
      style={{ backgroundSize: '200% 100%', ...style }}
    />
  )
}

export function TableSkeleton({ columns = 4, rows = 6 }) {
  return (
    <div className="overflow-hidden">
      <div className="flex gap-4 px-5 py-3 bg-slate-50 rounded-t-lg">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-3.5 flex-1" />
        ))}
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex gap-4 px-5 py-4">
            {Array.from({ length: columns }).map((_, c) => (
              <Skeleton key={c} className={`h-4 flex-1 ${c === 0 ? 'max-w-[40%]' : ''}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

/** A row of stat-card placeholders for dashboards/report ribbons. */
export function StatCardsSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl2 border border-slate-200 shadow-card p-5">
          <Skeleton className="h-3 w-24 mb-3" />
          <Skeleton className="h-6 w-20" />
        </div>
      ))}
    </div>
  )
}

/** A generic card body placeholder (chart / panel). */
export function CardSkeleton({ height = 240, lines = 0 }) {
  return (
    <div className="bg-white rounded-xl2 border border-slate-200 shadow-card p-5">
      <Skeleton className="h-4 w-40 mb-4" />
      {lines > 0 ? (
        <div className="space-y-2.5">
          {Array.from({ length: lines }).map((_, i) => (
            <Skeleton key={i} className="h-3.5 w-full" />
          ))}
        </div>
      ) : (
        <Skeleton className="w-full" style={{ height }} />
      )}
    </div>
  )
}
