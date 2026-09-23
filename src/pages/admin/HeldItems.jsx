import { useState, useEffect, useCallback, useMemo } from 'react'
import { Package, Boxes, Coins, Building, X } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import StatCard from '../../components/ui/StatCard'
import Card from '../../components/ui/Card'
import DataTable from '../../components/ui/DataTable'
import Badge from '../../components/ui/Badge'
import FilterDrawer, { FilterItem } from '../../components/patterns/FilterDrawer'
import { Select } from '../../components/ui/Field'
import { StatCardsSkeleton } from '../../components/ui/Skeleton'
import { useToast } from '../../context/ToastContext'
import { formatKsh } from '../../data/mockData'
import { api } from '../../api/client'

const statusTone = (s) => {
  const v = String(s || '').toLowerCase()
  if (v === 'released') return 'green'
  if (v === 'disposed') return 'red'
  return 'orange' // Held
}

export default function HeldItems() {
  const { showToast } = useToast()
  const [rows, setRows] = useState([])
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [propertyFilter, setPropertyFilter] = useState('')
  const [tenantFilter, setTenantFilter] = useState('')
  const [preview, setPreview] = useState(null) // photo data URL being viewed

  const load = useCallback(() => {
    setLoading(true)
    api.getHeldItems({ property: propertyFilter || null, tenant: tenantFilter || null })
      .then((res) => setRows(Array.isArray(res) ? res : []))
      .catch((err) => showToast(err?.message || 'Could not load held items.'))
      .finally(() => setLoading(false))
  }, [propertyFilter, tenantFilter, showToast])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    api.getProperties().then((res) => setProperties(res || [])).catch(() => {})
  }, [])

  // Tenant options derived from the loaded rows (kept in scope, no extra endpoint).
  const tenantOptions = useMemo(() => {
    const map = new Map()
    rows.forEach((r) => {
      if (r.tenant && !map.has(r.tenant)) map.set(r.tenant, r.tenant_name || r.tenant)
    })
    return Array.from(map, ([id, name]) => ({ id, name }))
  }, [rows])

  const totalValue = rows.reduce((sum, r) => sum + (Number(r.estimated_value) || 0), 0)
  const heldCount = rows.filter((r) => (r.status || 'Held') === 'Held').length

  return (
    <div>
      <PageHeader
        title="Held Tenant Items"
        description="Belongings held against unpaid rent or dues when tenants vacated. Filter by property or tenant."
        actions={
          <FilterDrawer
            activeCount={[propertyFilter, tenantFilter].filter(Boolean).length}
            onClear={() => {
              setPropertyFilter('')
              setTenantFilter('')
            }}
          >
            <FilterItem label="Property">
              <div className="flex items-center gap-1.5">
                <Building className="w-4 h-4 text-slate-400 hidden lg:block" />
                <Select value={propertyFilter} onChange={(e) => { setPropertyFilter(e.target.value); setTenantFilter('') }} className="w-full lg:w-44 text-sm py-1.5">
                  <option value="">All properties</option>
                  {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </Select>
              </div>
            </FilterItem>
            <FilterItem label="Tenant">
              <Select value={tenantFilter} onChange={(e) => setTenantFilter(e.target.value)} className="w-full lg:w-44 text-sm py-1.5">
                <option value="">All tenants</option>
                {tenantOptions.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Select>
            </FilterItem>
          </FilterDrawer>
        }
      />

      {loading ? (
        <div className="mb-6"><StatCardsSkeleton count={3} /></div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <StatCard label="Total Items" value={rows.length} icon={Package} />
          <StatCard label="Currently Held" value={heldCount} icon={Boxes} tone="orange" />
          <StatCard label="Estimated Value" value={formatKsh(totalValue)} icon={Coins} tone="brand" />
        </div>
      )}

      <Card padded={false} className="p-5">
        <DataTable
          loading={loading}
          columns={[
            {
              key: 'photo',
              header: '',
              render: (r) => (
                r.photo ? (
                  <button type="button" onClick={() => setPreview(r.photo)} className="block w-12 h-12 rounded-lg overflow-hidden border border-slate-200">
                    <img src={r.photo} alt={r.item_name} className="w-full h-full object-cover" />
                  </button>
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center text-slate-300">
                    <Package size={18} />
                  </div>
                )
              ),
            },
            { key: 'item_name', header: 'Item', render: (r) => (
              <div>
                <p className="font-medium text-slate-800">{r.item_name}</p>
                {r.description && <p className="text-xs text-slate-400">{r.description}</p>}
              </div>
            ) },
            { key: 'tenant_name', header: 'Tenant', render: (r) => r.tenant_name || r.tenant || '—' },
            { key: 'property', header: 'Property', render: (r) => (
              <div>
                <p className="text-slate-700">{r.property || '—'}</p>
                {r.unit && <p className="text-xs text-slate-400">Unit {r.unit}</p>}
              </div>
            ) },
            { key: 'quantity', header: 'Qty', render: (r) => r.quantity || 1 },
            { key: 'estimated_value', header: 'Est. Value', render: (r) => formatKsh(r.estimated_value || 0) },
            { key: 'status', header: 'Status', render: (r) => <Badge tone={statusTone(r.status)}>{r.status || 'Held'}</Badge> },
            { key: 'reason', header: 'Reason', render: (r) => <span className="text-slate-500 text-sm">{r.reason || '—'}</span> },
          ]}
          rows={rows}
          searchKeys={['item_name', 'tenant_name', 'property', 'reason']}
          searchPlaceholder="Search held items…"
          emptyMessage="No held items match these filters."
        />
      </Card>

      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" />
          <div className="relative max-w-3xl max-h-[85vh]">
            <button
              onClick={() => setPreview(null)}
              className="absolute -top-3 -right-3 w-9 h-9 rounded-full bg-white text-slate-600 flex items-center justify-center shadow-lg hover:bg-slate-100"
            >
              <X size={18} />
            </button>
            <img src={preview} alt="Held item" className="max-w-full max-h-[85vh] rounded-lg object-contain" onClick={(e) => e.stopPropagation()} />
          </div>
        </div>
      )}
    </div>
  )
}
