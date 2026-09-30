import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Building2, Users, Wallet, AlertTriangle, ArrowUpRight, CheckCircle2, Clock, Receipt } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid, Legend } from 'recharts'
import PageHeader from '../../components/ui/PageHeader'
import StatCard from '../../components/ui/StatCard'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Avatar from '../../components/ui/Avatar'
import Button from '../../components/ui/Button'
import { StatCardsSkeleton, CardSkeleton } from '../../components/ui/Skeleton'
import { formatKsh } from '../../data/mockData'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../api/client'

// Palette cycled across properties in the per-property rent chart.
const PROPERTY_COLORS = [
  '#14b98a', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1',
]

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [propsList, setPropsList] = useState([])
  const [paymentsList, setPaymentsList] = useState([])
  const [revenueThisMonth, setRevenueThisMonth] = useState(0)
  const [totalOverdue, setTotalOverdue] = useState(0)
  const [revenueTrend, setRevenueTrend] = useState([])
  const [occupancyBreakdown, setOccupancyBreakdown] = useState([])
  const [rentByProperty, setRentByProperty] = useState({ properties: [], series: [] })
  // Unit totals come from the same source as the summary/occupancy pie so the
  // "Occupied Units" card always matches the Properties & Units page.
  const [unitTotals, setUnitTotals] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    // Monthly rent collected per property (grouped bar chart). Independent of the
    // summary load so a slow query never blocks the KPI cards.
    api.getRentCollectionByProperty(6)
      .then((res) => { if (mounted && res) setRentByProperty(res) })
      .catch(() => {})

    Promise.allSettled([api.getDashboardSummary(), api.getProperties()]).then(([s, p]) => {
      if (!mounted) return
      const summary = s.status === 'fulfilled' ? s.value : null
      if (summary) {
        setRevenueThisMonth(summary.revenue_this_month || 0)
        setTotalOverdue(summary.total_overdue || 0)
        setRevenueTrend(summary.revenue_trend || [])
        setOccupancyBreakdown(summary.occupancy_breakdown || [])
        if (summary.total_units !== undefined) {
          setUnitTotals({ total: summary.total_units || 0, occupied: summary.occupied_units || 0 })
        }
        if (summary.recent_payments && summary.recent_payments.length > 0) {
          setPaymentsList(summary.recent_payments.slice(0, 5))
        }
      }
      if (p.status === 'fulfilled' && Array.isArray(p.value) && p.value.length > 0) {
        setPropsList(p.value)
      }
      setLoading(false)
    })

    return () => { mounted = false }
  }, [])

  // Prefer the dashboard summary's live counts; fall back to summing the
  // property list (which also carries per-property unit counts).
  const totalUnits = unitTotals ? unitTotals.total : propsList.reduce((sum, p) => sum + (p.units || 0), 0)
  const occupiedUnits = unitTotals ? unitTotals.occupied : propsList.reduce((sum, p) => sum + (p.occupied || 0), 0)

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user?.name || 'Admin'}`}
        description="Here's what's happening across your portfolio today."
        actions={<Link to="/admin/property-onboarding"><Button>+ Add Property</Button></Link>}
      />

      {loading ? (
        <div className="mb-6"><StatCardsSkeleton count={4} /></div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Total Properties" value={propsList.length} icon={Building2} trend={4} trendLabel="vs last month" />
          <StatCard label="Occupied Units" value={`${occupiedUnits}/${totalUnits || '-'}`} icon={Users} tone="blue" trend={2} trendLabel="vs last month" />
          <StatCard label="Revenue This Month" value={formatKsh(revenueThisMonth)} icon={Wallet} tone="brand" />
          <StatCard label="Overdue Balances" value={formatKsh(totalOverdue)} icon={AlertTriangle} tone="red" />
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
          <div className="lg:col-span-2"><CardSkeleton height={260} /></div>
          <CardSkeleton lines={5} />
        </div>
      )}

      {!loading && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">Revenue vs Expenses</h3>
            <span className="text-xs text-slate-400">Last 6 months</span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={revenueTrend}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} tickFormatter={(v) => `${v / 1000}k`} />
              <Tooltip formatter={(v) => formatKsh(v)} cursor={{ fill: '#f8fafc' }} />
              <Bar dataKey="revenue" name="Revenue" fill="#14b98a" radius={[6, 6, 0, 0]} />
              <Bar dataKey="expenses" name="Expenses" fill="#e2e8f0" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 className="font-semibold text-slate-900 mb-4">Occupancy</h3>
          {occupancyBreakdown.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={occupancyBreakdown} dataKey="value" innerRadius={50} outerRadius={75} paddingAngle={3}>
                    {occupancyBreakdown.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => `${v}%`} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {occupancyBreakdown.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-slate-600">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                      {item.name}
                    </span>
                    <span className="font-medium text-slate-800">{item.value}%</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-400">No unit data available</p>
          )}
        </Card>
      </div>
      )}

      {/* Monthly rent collected per property */}
      {!loading && (
        <Card className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-slate-900">Rent Collected by Property</h3>
              <p className="text-xs text-slate-400">Monthly rent recognised in the ledger, per property</p>
            </div>
            <span className="text-xs text-slate-400">Last 6 months</span>
          </div>
          {rentByProperty.properties.length > 0 && rentByProperty.series.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={rentByProperty.series} margin={{ top: 5, right: 8, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip formatter={(v) => formatKsh(v)} cursor={{ fill: '#f8fafc' }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {rentByProperty.properties.map((p, i) => (
                  <Bar
                    key={p.key}
                    dataKey={p.key}
                    name={p.name}
                    fill={PROPERTY_COLORS[i % PROPERTY_COLORS.length]}
                    radius={[4, 4, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-slate-400 py-8 text-center">No rent collection data available yet.</p>
          )}
        </Card>
      )}

      {loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2"><CardSkeleton lines={6} /></div>
          <CardSkeleton lines={4} />
        </div>
      )}

      {!loading && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Beautiful Recent Payments Section */}
        <Card className="lg:col-span-2" padded={false}>
          <div className="p-5 pb-3 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-medium shadow-sm">
                <Receipt size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 text-base">Recent Payments</h3>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    {paymentsList.length} items
                  </span>
                </div>
                <p className="text-xs text-slate-400">Latest rent & utility transactions processed</p>
              </div>
            </div>
            <Link
              to="/admin/payment-reconciliation"
              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors"
            >
              View All <ArrowUpRight size={14} />
            </Link>
          </div>

          <div className="p-3 divide-y divide-slate-100">
            {paymentsList.length > 0 ? (
              paymentsList.slice(0, 5).map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50/80 transition-all group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="relative shrink-0">
                      <Avatar name={p.tenant} size={40} className="ring-2 ring-emerald-50 shadow-xs" />
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center ring-2 ring-white">
                        <CheckCircle2 size={10} />
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-slate-800 truncate group-hover:text-emerald-600 transition-colors">
                          {p.tenant}
                        </p>
                        <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 shrink-0">
                          {p.id}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5 truncate">
                        <span className="font-medium text-slate-600 truncate">{p.property}</span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1 font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                          {p.method || 'M-Pesa'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 ml-3">
                    <p className="text-sm font-bold text-emerald-600 tracking-tight">
                      + {formatKsh(p.amount)}
                    </p>
                    <div className="flex items-center justify-end gap-1.5 mt-0.5">
                      <span className="text-[11px] text-slate-400">{p.date}</span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          p.status === 'Paid'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {p.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-400">
                <Clock className="mx-auto mb-2 opacity-50" size={24} />
                <p className="text-sm font-medium">No recent payments recorded</p>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold text-slate-900 mb-3">Portfolio Snapshot</h3>
          <div className="space-y-3">
            {propsList.slice(0, 4).map((p) => (
              <button
                key={p.id}
                onClick={() => navigate(`/admin/properties/${p.id}`)}
                className="w-full flex items-center justify-between text-sm text-left hover:bg-slate-50 -mx-1 px-1 py-1 rounded-md"
              >
                <div className="min-w-0">
                  <p className="font-medium text-slate-800 truncate">{p.name}</p>
                  <p className="text-xs text-slate-400">{p.location}</p>
                </div>
                <span className="text-xs font-medium text-slate-500 shrink-0 ml-2">
                  {p.occupied}/{p.units}
                </span>
              </button>
            ))}
          </div>
        </Card>
      </div>
      )}
    </div>
  )
}
