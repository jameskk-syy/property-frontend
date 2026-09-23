import { useState } from 'react'
import { Filter, X, ChevronDown } from 'lucide-react'
import Button from '../ui/Button'

/**
 * Responsive filter bar with mobile drawer.
 * 
 * On large screens: displays filters inline in a well-designed row
 * On mobile: shows a "Filters" button that opens a slide-in drawer
 * 
 * Props:
 * - children: filter controls (Select, TextInput, etc.)
 * - activeCount: number of active filters (shown as badge)
 * - onClear: optional callback to clear all filters
 */
export default function FilterDrawer({ children, activeCount = 0, onClear }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Desktop: Inline filter bar */}
      <div className="hidden lg:flex items-center gap-3 flex-wrap">
        {children}
        {activeCount > 0 && onClear && (
          <button
            onClick={onClear}
            className="text-xs text-slate-500 hover:text-slate-700 underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Mobile: Filter button + drawer */}
      <div className="lg:hidden">
        <Button
          variant="secondary"
          icon={Filter}
          onClick={() => setOpen(true)}
          className="relative"
        >
          Filters
          {activeCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-brand-500 text-white text-xs flex items-center justify-center font-semibold">
              {activeCount}
            </span>
          )}
        </Button>
      </div>

      {/* Mobile drawer overlay */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 transition-opacity"
            onClick={() => setOpen(false)}
          />
          
          {/* Drawer */}
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-xl max-h-[80vh] flex flex-col animate-slide-up">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-slate-600" />
                <h3 className="font-semibold text-slate-800">Filters</h3>
                {activeCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-brand-50 text-brand-600 text-xs font-semibold">
                    {activeCount} active
                  </span>
                )}
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {children}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 flex gap-3">
              {onClear && (
                <Button 
                  variant="secondary" 
                  className="flex-1"
                  onClick={() => {
                    onClear()
                    setOpen(false)
                  }}
                >
                  Clear All
                </Button>
              )}
              <Button 
                className="flex-1"
                onClick={() => setOpen(false)}
              >
                Apply Filters
              </Button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.25s ease-out;
        }
      `}</style>
    </>
  )
}

/**
 * A single filter item with label - used inside FilterDrawer for mobile layout
 */
export function FilterItem({ label, children }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      {children}
    </div>
  )
}
