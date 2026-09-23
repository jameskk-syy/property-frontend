import { useMemo, useState } from 'react'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'
import EmptyState from './EmptyState'
import { TableSkeleton } from './Skeleton'

const PAGE_SIZE = 8

/**
 * Generic table used by nearly every list page in the app.
 * columns: [{ key, header, render?(row) }]
 * rows: array of plain objects
 * searchKeys: which fields to match against the search box
 * onRowClick(row): optional — makes rows clickable/navigable
 */
export default function DataTable({
  columns,
  rows,
  searchKeys = [],
  searchPlaceholder = 'Search…',
  emptyMessage = 'Nothing to show yet.',
  rightActions,
  onRowClick,
  paginate = true,
  loading = false,
}) {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)

  const filtered = useMemo(() => {
    if (!query || searchKeys.length === 0) return rows
    const q = query.toLowerCase()
    return rows.filter((row) =>
      searchKeys.some((key) => String(row[key] ?? '').toLowerCase().includes(q))
    )
  }, [rows, query, searchKeys])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount - 1)
  const visible = paginate ? filtered.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE) : filtered

  const changeQuery = (v) => {
    setQuery(v)
    setPage(0)
  }

  const pageNumbers = useMemo(() => {
    const nums = []
    for (let i = 0; i < pageCount; i++) nums.push(i)
    // Keep it compact: first, last, current +/-1, with ellipses elsewhere
    if (pageCount <= 7) return nums
    const set = new Set([0, pageCount - 1, currentPage, currentPage - 1, currentPage + 1])
    return nums.filter((n) => set.has(n))
  }, [pageCount, currentPage])

  return (
    <div>
      {(searchKeys.length > 0 || rightActions) && (
        <div className="flex items-center justify-between gap-3 mb-4">
          {searchKeys.length > 0 ? (
            <div className="relative w-full max-w-xs">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => changeQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </div>
          ) : (
            <div />
          )}
          {rightActions}
        </div>
      )}

      {loading ? (
        <div className="-mx-5">
          <TableSkeleton columns={columns.length} />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState message={emptyMessage} />
      ) : (
        <>
          <div className="overflow-x-auto -mx-5 rounded-lg">
            <table className="w-full text-sm border-separate border-spacing-0 table-fixed">
              <thead>
                <tr className="text-left text-slate-500 bg-slate-50">
                  {columns.map((col, i) => (
                    <th
                      key={col.key}
                      style={col.width ? { width: col.width } : undefined}
                      className={`font-semibold px-5 py-3 whitespace-nowrap border-y border-slate-200 ${
                        i === 0 ? 'border-l-0' : ''
                      } ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''}`}
                    >
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((row, i) => (
                  <tr
                    key={row.id || row.name || i}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={`${i % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'} ${
                      onRowClick
                        ? 'cursor-pointer hover:bg-brand-50 hover:shadow-[inset_2px_0_0_0_theme(colors.brand.500)]'
                        : 'hover:bg-slate-100/70'
                    } transition-colors`}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-5 py-3.5 text-slate-700 whitespace-nowrap border-b border-slate-100 ${
                          col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''
                        }`}
                      >
                        {col.render ? col.render(row) : row[col.key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {paginate && pageCount > 1 && (
            <div className="flex items-center justify-between pt-4 mt-1">
              <p className="text-xs text-slate-500">
                Showing <span className="font-medium text-slate-700">{currentPage * PAGE_SIZE + 1}</span>–
                <span className="font-medium text-slate-700">{Math.min((currentPage + 1) * PAGE_SIZE, filtered.length)}</span> of{' '}
                <span className="font-medium text-slate-700">{filtered.length}</span>
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                  className="h-8 px-2.5 rounded-lg border border-slate-200 flex items-center justify-center gap-1 text-sm text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 hover:border-slate-300"
                >
                  <ChevronLeft size={15} /> Prev
                </button>

                <div className="flex items-center gap-1 mx-1">
                  {pageNumbers.map((n, idx) => {
                    const prev = pageNumbers[idx - 1]
                    const showEllipsis = prev != null && n - prev > 1
                    return (
                      <span key={n} className="flex items-center gap-1">
                        {showEllipsis && <span className="text-slate-300 px-0.5">…</span>}
                        <button
                          onClick={() => setPage(n)}
                          className={`h-8 w-8 rounded-lg text-sm font-medium transition-colors ${
                            n === currentPage
                              ? 'bg-brand-500 text-white shadow-sm'
                              : 'text-slate-600 border border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                          }`}
                        >
                          {n + 1}
                        </button>
                      </span>
                    )
                  })}
                </div>

                <button
                  onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                  disabled={currentPage >= pageCount - 1}
                  className="h-8 px-2.5 rounded-lg border border-slate-200 flex items-center justify-center gap-1 text-sm text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 hover:border-slate-300"
                >
                  Next <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
