import { useState, useEffect } from 'react'
import { Users, Wallet, Building } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import StatCard from '../../components/ui/StatCard'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Avatar from '../../components/ui/Avatar'
import DataTable from '../../components/ui/DataTable'
import { Select } from '../../components/ui/Field'
import { StatCardsSkeleton } from '../../components/ui/Skeleton'
import { formatKsh } from '../../data/mockData'
import { api } from '../../api/client'

export default function LandlordBilling() {
  const [options, setOptions] = useState([])
  const [propertyFilter, setPropertyFilter] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  // Property list once, for the filter dropdown.
  useEffect(() => {
    api.getLandlordPropertyOptions().then(setOptions).catch(() => {})
  }, [])

  // Reload billing whenever the property filter changes.
  useEffect(() => {
    let mounted = true
    setLoading(true)
    api.getLandlordBilling(propertyFilter || null)
      .then((res) => { if (mounted) setData(res) })
      .catch(() => {})
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [propertyFilter])

  const tenants = data?.tenants || []

  return (
    <div>
      <PageHeader
        title="Tenants & Billing"
        description="Tenants across your properties and their current balances."
        actions={options.length > 1 && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Building className="w-4 h-4" />
            <Select value={propertyFilter} onChange={(e) => setPropertyFilter(e.target.value)} className="text-sm py-1.5">
              <option value="">All my properties</option>
              {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </Select>
          </div>
        )}
      />

      {loading ? (
        <div className="mb-6"><StatCardsSkeleton count={3} /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <StatCard label="Tenants" value={data?.tenant_count || 0} icon={Users} />
          <StatCard label="Monthly Rent Roll" value={formatKsh(data?.monthly_rent_roll || 0)} icon={Wallet} tone="brand" />
          <StatCard label="Total Outstanding" value={formatKsh(data?.total_outstanding || 0)} icon={Wallet} tone="orange" />
        </div>
      )}

      <Card padded={false} className="p-5">
        <DataTable
          loading={loading}
          columns={[
            { key: 'name', header: 'Tenant', render: (r) => (
              <div className="flex items-center gap-2.5">
                <Avatar name={r.name} size={30} />
                <div>
                  <p className="font-medium text-slate-800">{r.name}</p>
                  {r.phone && <p className="text-xs text-slate-400">{r.phone}</p>}
                </div>
              </div>
            ) },
            { key: 'property', header: 'Property' },
            { key: 'unit', header: 'Unit' },
            { key: 'rent', header: 'Rent', render: (r) => formatKsh(r.rent) },
            { key: 'paid', header: 'Paid', render: (r) => <span className="text-emerald-600 font-medium">{formatKsh(r.paid)}</span> },
            { key: 'balance', header: 'Balance', render: (r) => (
              <span className={r.balance > 0 ? 'text-rose-600 font-semibold' : 'text-slate-400'}>
                {r.balance > 0 ? formatKsh(r.balance) : '—'}
              </span>
            ) },
            { key: 'status', header: 'Status', render: (r) => (
              <Badge tone={r.balance > 0 ? 'red' : 'green'}>{r.balance > 0 ? 'Overdue' : 'Up to date'}</Badge>
            ) },
          ]}
          rows={tenants}
          searchKeys={['name', 'unit', 'property']}
          searchPlaceholder="Search tenants…"
          emptyMessage="No tenants on your properties yet."
        />
      </Card>
    </div>
  )
}
