import { useState, useRef, useEffect, useCallback } from 'react'
import { ChevronDown, Check, Search, Loader2, Plus } from 'lucide-react'

/**
 * Async searchable single-select dropdown with backend search.
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
  const [hasFetched, setHasFetched] = useState(false)
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

  // Find selected label from value
  useEffect(() => {
    if (value) {
      const sel = options.find((o) => (o[valueKey] || o.value || o.name) === value)
      if (sel) {
        setSelectedLabel(sel[labelKey] || sel.label || sel.name || value)
      } else {
        setSelectedLabel(typeof value === 'string' ? value : '')
      }
    } else {
      setSelectedLabel('')
    }
  }, [value, options, labelKey, valueKey])

  // Search function
  const doSearch = useCallback(async (searchQuery) => {
    setLoading(true)
    try {
      let results = []
      if (fetchOptions) {
        const response = await fetchOptions({ search: searchQuery, page: 1, pageSize: 20 })
        const data = response?.data || response || []
        results = data.map(item => ({
          ...item,
          value: item[valueKey] || item.name || item.id,
          label: item[labelKey] || item.name || item[valueKey],
        }))
      } else if (onSearch) {
        results = await onSearch(searchQuery)
      }
      setOptions(results || [])
    } catch (err) {
      console.error('AsyncSearchSelect search error:', err)
      setOptions([])
    } finally {
      setLoading(false)
    }
  }, [onSearch, fetchOptions, labelKey, valueKey])

  // Debounced search on query change
  useEffect(() => {
    if (!open) return
    
    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(() => {
      doSearch(query)
    }, debounceMs)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, debounceMs, open]) // Removed doSearch from deps to prevent loop

  // Load initial options when opening (only once)
  const handleOpen = async () => {
    setOpen(true)
    if (!hasFetched) {
      setHasFetched(true)
      doSearch('')
    }
  }

  const handleClose = () => {
    setOpen(false)
    setQuery('')
  }

  const pick = (option) => {
    const label = option[labelKey] || option.label || option.name
    onChange(option)
    setSelectedLabel(label)
    handleClose()
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
          {addNewLabel && onAddNew && (
            <div className="border-t border-slate-100 p-2">
              <button
                type="button"
                onClick={() => {
                  handleClose()
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
