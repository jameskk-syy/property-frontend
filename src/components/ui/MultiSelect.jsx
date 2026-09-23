import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check, X } from 'lucide-react'

/**
 * Lightweight dependency-free multi-select.
 *
 * Props:
 *  - options: [{ value, label }]
 *  - value: array of selected values
 *  - onChange: (nextValues[]) => void
 *  - placeholder
 */
export default function MultiSelect({ options = [], value = [], onChange, placeholder = 'Select…' }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const selected = options.filter((o) => value.includes(o.value))
  const filtered = query
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options

  const toggle = (val) => {
    if (value.includes(val)) onChange(value.filter((v) => v !== val))
    else onChange([...value, val])
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full min-h-[42px] px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white flex items-center flex-wrap gap-1.5 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400"
      >
        {selected.length === 0 && <span className="text-slate-400">{placeholder}</span>}
        {selected.map((o) => (
          <span
            key={o.value}
            className="inline-flex items-center gap-1 bg-brand-50 text-brand-700 text-xs font-medium px-2 py-0.5 rounded-md"
          >
            {o.label}
            <X
              className="w-3 h-3 cursor-pointer hover:text-brand-900"
              onClick={(e) => {
                e.stopPropagation()
                toggle(o.value)
              }}
            />
          </span>
        ))}
        <ChevronDown className="w-4 h-4 text-slate-400 ml-auto shrink-0" />
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-hidden">
          <div className="p-2 border-b border-slate-100">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search properties…"
              className="w-full px-2.5 py-1.5 text-sm rounded-md border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-400"
            />
          </div>
          <div className="max-h-48 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <p className="px-3 py-2 text-sm text-slate-400">No properties found</p>
            )}
            {filtered.map((o) => {
              const isSel = value.includes(o.value)
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => toggle(o.value)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-slate-50"
                >
                  <span
                    className={`w-4 h-4 rounded border flex items-center justify-center ${
                      isSel ? 'bg-brand-500 border-brand-500' : 'border-slate-300'
                    }`}
                  >
                    {isSel && <Check className="w-3 h-3 text-white" />}
                  </span>
                  <span className="text-slate-700">{o.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
