import { useEffect, useState } from 'react'
import { Building } from 'lucide-react'
import { Select } from '../ui/Field'
import { api } from '../../api/client'

/**
 * Reusable server-side "filter by property" dropdown for admin list pages.
 *
 * Loads the property list once (api.getProperties) and renders a Select with an
 * "All Properties" default. The parent owns the selected value and reloads its
 * data server-side whenever it changes.
 *
 * Props:
 *  - value: selected property id ('' = All)
 *  - onChange: (propertyId) => void
 *  - className, selectClassName: optional style overrides
 */
export default function PropertyFilter({ value, onChange, className = '', selectClassName = '' }) {
  const [properties, setProperties] = useState([])

  useEffect(() => {
    let mounted = true
    api.getProperties()
      .then((res) => { if (mounted && Array.isArray(res)) setProperties(res) })
      .catch(() => {})
    return () => { mounted = false }
  }, [])

  return (
    <div className={`flex items-center gap-2 text-xs font-medium text-slate-500 ${className}`}>
      <Building className="w-3.5 h-3.5 shrink-0" />
      <Select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`text-sm py-1.5 pr-8 ${selectClassName}`}
        aria-label="Filter by property"
      >
        <option value="">All Properties</option>
        {properties.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </Select>
    </div>
  )
}
