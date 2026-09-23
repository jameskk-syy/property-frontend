import { useState, useEffect } from 'react'
import { Building2, Wallet, Users, TrendingUp, AlertTriangle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import PageHeader from '../../components/ui/PageHeader'
import StatCard from '../../components/ui/StatCard'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import { StatCardsSkeleton, CardSkeleton } from '../../components/ui/Skeleton'
import { useAuth } from '../../context/AuthContext'
import { formatKsh } from '../../data/mockData'
import { api } from '../../api/client'

export default function LandlordDashboard() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    api.getLandlordDashboard()
      .then((res) => { if (mounted) setData(res) })
      .catch(() => {})
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [])

  const props = data?.properties || []
  const trend = data?.trend || []
  const arrears = data?.arrears || []

  return (
    <div>
      <PageHeader
        title={`Good morning, ${data?.landlord_name?.split(' ')[0] || user?.name?.split(' ')[0] || 'Landlord'}`}
        description="Here's how your properties are performing."
      />

      {loading ? (
        <div className="mb-6"><StatCardsSkeleton count={4} /></div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="My Properties" value={data?.property_count || 0} icon={Building2} />
          <StatCard label="Occupied Units" value={`${data?.occupied_units || 0}/${data?.total_units || 0}`} icon={Users} tone="blue" />
          <StatCard label="Rent Collected (This Month)" value={formatKsh(data?.revenue_this_month || 0)} icon={Wallet} tone="brand" />
          <StatCard label="Occupancy Rate" value={`${data?.occupancy_rate || 0}%`} icon={TrendingUp} tone="orange" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="lg:col-span-2"><CardSkeleton height={240} /></div>
        ) : (
          <Card className="lg:col-span-2">
            <h3 className="font-semibold text-slate-900 mb-1">Rent Paid by Month</h3>
            <p className="text-xs text-slate-500 mb-4">Rent collected across your properties (last 6 months).</p>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip formatter={(v) => formatKsh(v)} cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="gross" name="Rent Paid" fill="#14b98a" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}

        {loading ? (
          <CardSkeleton lines={5} />
        ) : (
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-900">Tenants in Arrears</h3>
              {arrears.length > 0 && <Badge tone="red">{arrears.length}</Badge>}
            </div>
            {arrears.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <span className="w-11 h-11 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mb-2">
                  <TrendingUp size={20} />
                </span>
                <p className="text-sm text-slate-500">No tenants in arrears.</p>
                <p className="text-xs text-slate-400 mt-0.5">All rent is up to date.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {arrears.map((t) => (
                  <div key={t.id} className="flex items-center justify-between text-sm">
                    <div className="min-w-0 flex items-center gap-2">
                      <span className="w-8 h-8 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
                        <AlertTriangle size={15} />
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium text-slate-800 truncate">{t.name}</p>
                        <p className="text-xs text-slate-400">{t.property} · Unit {t.unit}</p>
                      </div>
                    </div>
                    <span className="font-semibold text-rose-600 shrink-0">{formatKsh(t.balance)}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  )
}
