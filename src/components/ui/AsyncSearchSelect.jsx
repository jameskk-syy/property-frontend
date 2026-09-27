import { useState, useRef, useEffect, useCallback } from 'react'
import { ChevronDown, Check, Search, Loader2, Plus } from 'lucide-react'

/**
 * Async searchable single-select dropdown with backend search.
 *
 * Props:
 *  - value: the selected value
 *  - onChange: (option) => void - receives the full option object or value
 *  - onSearch: async (query) => [{ value, label }] - legacy search function
 *  - fetchOptions: async ({ search, page, pageSize }) => { data: [...] } - paginated fetch
 *  - labelKey: key to use for label from fetched data (default 'label')
 *  - valueKey: key to use for value from fetched data (default 'value')
 *  - initialOptions: [{ value, label }] - initial options to show before search
 *  - placeholder
 *  - searchPlaceholder
 *  - disabled
 *  - emptyMessage
 *  - loadingMessage
 *  - debounceMs: debounce time for search (default 300ms)
 *  - minChars: minimum characters before searching (default 0)
 *  - addNewLabel: label for "Add new" button
 *  - onAddNew: callback when "Add new" is clicked
 */
export default function AsyncSearchSelect({
  value,
  onChange,
  onSearch,
  fetchOptions,
  labelKey = 'label',
  valueKey = 'value',
  initialOptions = [],
  placeholder = 'Select…',
  searchPlaceholder = 'Type to search…',
  disabled = false,
  emptyMessage = 'No matches found',
  loadingMessage = 'Searching…',
  debounceMs = 300,
  minChars = 0,
  addNewLabel,
  onAddNew,
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

  // Find selected label from value
  useEffect(() => {
    if (value) {
      // Try to find in options
      const sel = options.find((o) => (o[valueKey] || o.value) === value || o === value)
      if (sel) {
        setSelectedLabel(sel[labelKey] || sel.label || sel.name || value)
      } else {
        // Value might be the label itself
        setSelectedLabel(typeof value === 'string' ? value : '')
      }
    } else {
      setSelectedLabel('')
    }
  }, [value, options, labelKey, valueKey])

  // Search function that handles both onSearch and fetchOptions
  const doSearch = useCallback(async (searchQuery) => {
    if (searchQuery.length < minChars && minChars > 0) {
      setOptions(initialOptions)
      return
    }
    setLoading(true)
    try {
      let results = []
      if (fetchOptions) {
        // New paginated API
        const response = await fetchOptions({ search: searchQuery, page: 1, pageSize: 20 })
        const data = response?.data || response || []
        // Transform to standard format
        results = data.map(item => ({
          ...item,
          value: item[valueKey] || item.name || item.id,
          label: item[labelKey] || item.name || item[valueKey],
        }))
      } else if (onSearch) {
        // Legacy search API
        results = await onSearch(searchQuery)
      }
      setOptions(results || [])
    } catch (err) {
      console.error('AsyncSearchSelect search error:', err)
      setOptions([])
    } finally {
      setLoading(false)
    }
  }, [onSearch, fetchOptions, minChars, initialOptions, labelKey, valueKey])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    
    if (!query && !open) {
      setOptions(initialOptions)
      return
    }

    debounceRef.current = setTimeout(() => {
      doSearch(query)
    }, debounceMs)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, debounceMs, doSearch, initialOptions, open])

  // Load initial options when opening
  const handleOpen = async () => {
    setOpen(true)
    if (options.length === 0 && !loading) {
      doSearch('')
    }
  }

  const pick = (option) => {
    const val = option[valueKey] || option.value || option.name
    const label = option[labelKey] || option.label || option.name
    onChange(option) // Pass the full option object
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
              options.map((o, idx) => {
                const optValue = o[valueKey] || o.value || o.name
                const optLabel = o[labelKey] || o.label || o.name
                const isSel = optValue === value || o.name === value
                return (
                  <button
                    key={optValue || idx}
                    type="button"
                    onClick={() => pick(o)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-slate-50 ${
                      isSel ? 'bg-brand-50/60' : ''
                    }`}
                  >
                    <span className="flex-1 text-slate-700 truncate">{optLabel}</span>
                    {isSel && <Check className="w-4 h-4 text-brand-500 shrink-0" />}
                  </button>
                )
              })
            )}
          </div>
          {/* Add New button */}
          {addNewLabel && onAddNew && (
            <div className="border-t border-slate-100 p-2">
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  onAddNew()
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-brand-600 hover:bg-brand-50 rounded-md"
              >
                <Plus size={14} />
                {addNewLabel}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
