import { useMemo, useState, useEffect, useCallback } from 'react'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'
import EmptyState from './EmptyState'
import { TableSkeleton } from './Skeleton'

const DEFAULT_PAGE_SIZE = 8
const PAGE_SIZE_OPTIONS = [8, 25, 50, 75, 100]

/**
 * Generic table used by nearly every list page in the app.
 * 
 * Props:
 * - columns: [{ key, header, render?(row), width?, align? }]
 * - rows: array of plain objects (for client-side mode)
 * - searchKeys: which fields to match against the search box (client-side)
 * - onRowClick(row): optional — makes rows clickable/navigable
 * 
 * Server-side pagination props:
 * - serverPagination: { page, pageSize, total, hasNext, hasPrev }
 * - onPageChange(page, pageSize): callback when page or pageSize changes
 * - onSearch(query): callback when search query changes (debounced)
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
  // Server-side pagination props
  serverPagination = null,
  onPageChange = null,
  onSearch = null,
}) {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const [localPageSize, setLocalPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [debouncedQuery, setDebouncedQuery] = useState('')

  // Debounce search for server-side mode
  useEffect(() => {
    if (!onSearch) return
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, 300)
    return () => clearTimeout(timer)
  }, [query, onSearch])

  // Trigger server search when debounced query changes
  useEffect(() => {
    if (onSearch && debouncedQuery !== undefined) {
      onSearch(debouncedQuery)
    }
  }, [debouncedQuery, onSearch])

  // Server-side mode detection
  const isServerSide = serverPagination !== null && onPageChange !== null

  // Client-side filtering (only when not server-side)
  const filtered = useMemo(() => {
    if (isServerSide) return rows // Server already filtered
    if (!query || searchKeys.length === 0) return rows
    const q = query.toLowerCase()
    return rows.filter((row) =>
      searchKeys.some((key) => String(row[key] ?? '').toLowerCase().includes(q))
    )
  }, [rows, query, searchKeys, isServerSide])

  // Pagination calculations
  const pageSize = isServerSide ? (serverPagination.pageSize || DEFAULT_PAGE_SIZE) : localPageSize
  const total = isServerSide ? serverPagination.total : filtered.length
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  
  // Current page (0-indexed internally)
  const currentPage = isServerSide 
    ? (serverPagination.page - 1) // Server sends 1-indexed
    : Math.min(page, pageCount - 1)
  
  // Visible rows
  const visible = isServerSide 
    ? rows // Server already paginated
    : (paginate ? filtered.slice(currentPage * pageSize, (currentPage + 1) * pageSize) : filtered)

  // Handle query change
  const changeQuery = useCallback((v) => {
    setQuery(v)
    if (!isServerSide) {
      setPage(0)
    }
    // Server-side search is handled by debounce effect
  }, [isServerSide])

  // Handle page change
  const handlePageChange = useCallback((newPage) => {
    if (isServerSide) {
      onPageChange(newPage + 1, pageSize) // Convert to 1-indexed for server
    } else {
      setPage(newPage)
    }
  }, [isServerSide, onPageChange, pageSize])

  // Handle page size change
  const handlePageSizeChange = useCallback((newSize) => {
    const size = Number(newSize)
    if (isServerSide) {
      onPageChange(1, size) // Reset to page 1 when changing size
    } else {
      setLocalPageSize(size)
      setPage(0)
    }
  }, [isServerSide, onPageChange])

  // Page numbers for display
  const pageNumbers = useMemo(() => {
    const nums = []
    for (let i = 0; i < pageCount; i++) nums.push(i)
    if (pageCount <= 7) return nums
    const set = new Set([0, pageCount - 1, currentPage, currentPage - 1, currentPage + 1])
    return nums.filter((n) => set.has(n) && n >= 0 && n < pageCount)
  }, [pageCount, currentPage])

  // Calculate display range
  const startItem = total > 0 ? currentPage * pageSize + 1 : 0
  const endItem = Math.min((currentPage + 1) * pageSize, total)

  // Has search capability
  const hasSearch = isServerSide ? onSearch !== null : searchKeys.length > 0

  return (
    <div>
      {(hasSearch || rightActions) && (
        <div className="flex items-center justify-between gap-3 mb-4">
          {hasSearch ? (
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
      ) : (visible.length === 0 && total === 0) ? (
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

          {paginate && (total > 0 || pageCount > 1) && (
            <div className="flex items-center justify-between pt-4 mt-1 flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <p className="text-xs text-slate-500">
                  Showing <span className="font-medium text-slate-700">{startItem}</span>–
                  <span className="font-medium text-slate-700">{endItem}</span> of{' '}
                  <span className="font-medium text-slate-700">{total}</span>
                </p>
                {/* Page Size Selector */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500">Show</span>
                  <select
                    value={pageSize}
                    onChange={(e) => handlePageSizeChange(e.target.value)}
                    className="h-7 px-2 text-xs rounded border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-400"
                  >
                    {PAGE_SIZE_OPTIONS.map(size => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                  <span className="text-xs text-slate-500">per page</span>
                </div>
              </div>
              
              {pageCount > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 0 || (isServerSide && !serverPagination.hasPrev)}
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
                            onClick={() => handlePageChange(n)}
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
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= pageCount - 1 || (isServerSide && !serverPagination.hasNext)}
                    className="h-8 px-2.5 rounded-lg border border-slate-200 flex items-center justify-center gap-1 text-sm text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 hover:border-slate-300"
                  >
                    Next <ChevronRight size={15} />
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
