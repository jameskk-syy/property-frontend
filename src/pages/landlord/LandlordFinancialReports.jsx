import { useState, useEffect } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Wallet, PiggyBank, Receipt, Building } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import StatCard from '../../components/ui/StatCard'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import DataTable from '../../components/ui/DataTable'
import { Select } from '../../components/ui/Field'
import { StatCardsSkeleton, CardSkeleton } from '../../components/ui/Skeleton'
import { formatKsh } from '../../data/mockData'
import { api } from '../../api/client'

export default function LandlordFinancialReports() {
  const [options, setOptions] = useState([])
  const [propertyFilter, setPropertyFilter] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  // Load the landlord's property list once (for the filter dropdown).
  useEffect(() => {
    api.getLandlordPropertyOptions().then(setOptions).catch(() => {})
  }, [])

  // Reload the report whenever the property filter changes.
  useEffect(() => {
    let mounted = true
    setLoading(true)
    api.getLandlordFinancials(propertyFilter || null)
      .then((res) => { if (mounted) setData(res) })
      .catch(() => {})
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [propertyFilter])

  const trend = data?.trend || []
  const rentByTenant = data?.rent_by_tenant || []

  return (
    <div>
      <PageHeader
        title="Financial Reports"
        description="Rent collections across your properties and how each tenant has paid."
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
          <StatCard label="Rent Collected" value={formatKsh(data?.total_income || 0)} icon={Wallet} tone="brand" />
          <StatCard label="Property Expenses" value={formatKsh(data?.total_expenses || 0)} icon={Receipt} tone="orange" />
          <StatCard label="Net Payout to You" value={formatKsh(data?.net_payout || 0)} icon={PiggyBank} tone="blue" />
        </div>
      )}

      {loading ? (
        <div className="mb-5"><CardSkeleton height={260} /></div>
      ) : (
        <Card className="mb-5">
          <h3 className="font-semibold text-slate-900 mb-1">Rent Collection Trend</h3>
          <p className="text-xs text-slate-500 mb-4">Rent collected vs property expenses (last 6 months).</p>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={trend}>
              <defs>
                <linearGradient id="llrev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#14b98a" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#14b98a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} tickFormatter={(v) => `${v / 1000}k`} />
              <Tooltip formatter={(v) => formatKsh(v)} />
              <Area type="monotone" dataKey="revenue" name="Rent Collected" stroke="#14b98a" strokeWidth={2} fill="url(#llrev)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      )}

      <Card padded={false} className="p-5">
        <h3 className="font-semibold text-slate-900 mb-1">How Rent Was Paid — By Tenant</h3>
        <p className="text-xs text-slate-500 mb-4">Billed, paid and outstanding per tenant on your properties.</p>
        <DataTable
          loading={loading}
          columns={[
            { key: 'tenant', header: 'Tenant' },
            { key: 'property', header: 'Property' },
            { key: 'unit', header: 'Unit' },
            { key: 'rent', header: 'Monthly Rent', render: (r) => formatKsh(r.rent) },
            { key: 'billed', header: 'Billed', render: (r) => formatKsh(r.billed) },
            { key: 'paid', header: 'Paid', render: (r) => <span className="text-emerald-600 font-medium">{formatKsh(r.paid)}</span> },
            { key: 'outstanding', header: 'Outstanding', render: (r) => (
              <span className={r.outstanding > 0 ? 'text-rose-600 font-semibold' : 'text-slate-400'}>{formatKsh(r.outstanding)}</span>
            ) },
            { key: 'status', header: 'Status', render: (r) => (
              <Badge tone={r.outstanding > 0 ? 'red' : 'green'}>{r.outstanding > 0 ? 'Owing' : 'Paid'}</Badge>
            ) },
          ]}
          rows={rentByTenant.map((r, i) => ({ ...r, id: i }))}
          searchKeys={['tenant', 'property', 'unit']}
          searchPlaceholder="Search tenants…"
          emptyMessage="No rent activity yet for your properties."
        />
      </Card>
    </div>
  )
}
