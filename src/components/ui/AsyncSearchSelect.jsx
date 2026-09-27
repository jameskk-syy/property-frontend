import { useState, useRef, useEffect, useCallback } from 'react'
import { ChevronDown, Check, Search, Loader2 } from 'lucide-react'

/**
 * Async searchable single-select dropdown with backend search.
 *
 * Props:
 *  - value: the selected value
 *  - onChange: (value) => void
 *  - onSearch: async (query) => [{ value, label }] - function to search backend
 *  - initialOptions: [{ value, label }] - initial options to show before search
 *  - placeholder
 *  - searchPlaceholder
 *  - disabled
 *  - emptyMessage
 *  - loadingMessage
 *  - debounceMs: debounce time for search (default 300ms)
 *  - minChars: minimum characters before searching (default 0)
 */
export default function AsyncSearchSelect({
  value,
  onChange,
  onSearch,
  initialOptions = [],
  placeholder = 'Select…',
  searchPlaceholder = 'Type to search…',
  disabled = false,
  emptyMessage = 'No matches found',
  loadingMessage = 'Searching…',
  debounceMs = 300,
  minChars = 0,
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [options, setOptions] = useState(initialOptions)
  const [loading, setLoading] = useState(false)
  const [selectedLabel, setSelectedLabel] = useState('')
  const ref = useRef(null)
  const debounceRef = useRef(null)

  // Close on outside click
  useEffect(() => {
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  // Update options when initialOptions change
  useEffect(() => {
    if (initialOptions.length > 0 && !query) {
      setOptions(initialOptions)
    }
  }, [initialOptions, query])

  // Find selected label from options or initialOptions
  useEffect(() => {
    const sel = options.find((o) => o.value === value) || initialOptions.find((o) => o.value === value)
    setSelectedLabel(sel?.label || '')
  }, [value, options, initialOptions])

  // Debounced search
  const doSearch = useCallback(async (searchQuery) => {
    if (searchQuery.length < minChars) {
      setOptions(initialOptions)
      return
    }
    setLoading(true)
    try {
      const results = await onSearch(searchQuery)
      setOptions(results || [])
    } catch (err) {
      console.error('AsyncSearchSelect search error:', err)
      setOptions([])
    } finally {
      setLoading(false)
    }
  }, [onSearch, minChars, initialOptions])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    
    if (!query) {
      setOptions(initialOptions)
      return
    }

    debounceRef.current = setTimeout(() => {
      doSearch(query)
    }, debounceMs)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, debounceMs, doSearch, initialOptions])

  // Load initial options when opening
  const handleOpen = async () => {
    setOpen(true)
    if (options.length === 0 && !loading) {
      setLoading(true)
      try {
        const results = await onSearch('')
        setOptions(results || [])
      } catch {
        setOptions([])
      } finally {
        setLoading(false)
      }
    }
  }

  const pick = (val, label) => {
    onChange(val)
    setSelectedLabel(label)
    setOpen(false)
    setQuery('')
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={handleOpen}
        className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 bg-white flex items-center gap-2 text-left focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className={`flex-1 truncate ${selectedLabel ? 'text-slate-800' : 'text-slate-400'}`}>
          {selectedLabel || placeholder}
        </span>
        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
      </button>

      {open && !disabled && (
        <div className="absolute z-30 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-8 pr-2.5 py-1.5 text-sm rounded-md border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-400"
              />
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto py-1">
            {loading ? (
              <div className="px-3 py-3 text-sm text-slate-400 flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" />
                {loadingMessage}
              </div>
            ) : options.length === 0 ? (
              <p className="px-3 py-2 text-sm text-slate-400">{emptyMessage}</p>
            ) : (
              options.map((o) => {
                const isSel = o.value === value
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => pick(o.value, o.label)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-slate-50 ${
                      isSel ? 'bg-brand-50/60' : ''
                    }`}
                  >
                    <span className="flex-1 text-slate-700 truncate">{o.label}</span>
                    {isSel && <Check className="w-4 h-4 text-brand-500 shrink-0" />}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
