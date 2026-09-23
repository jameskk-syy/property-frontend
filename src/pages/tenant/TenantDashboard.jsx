import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Home, Wallet, Calendar, CheckCircle2, Receipt, Smartphone, CreditCard } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import StatCard from '../../components/ui/StatCard'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import PayRentModal from '../../components/patterns/PayRentModal'
import { StatCardsSkeleton, CardSkeleton } from '../../components/ui/Skeleton'
import { formatKsh } from '../../data/mockData'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../api/client'

export default function TenantDashboard() {
  const { user } = useAuth()
  const [payOpen, setPayOpen] = useState(false)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    api.getMyDashboard().then(setData).catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const lease = data?.lease || null
  const balance = Number(data?.balance) || 0
  const payments = data?.recent_payments || []
  const rent = lease?.rent || 0

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${data?.tenant_name || user?.name || ''}`}
        description={lease ? `${lease.property_name} · Unit ${lease.unit}` : 'Your rental overview'}
        actions={<Button onClick={() => setPayOpen(true)}>Pay Rent</Button>}
      />
      <PayRentModal
        open={payOpen}
        onClose={() => { setPayOpen(false); load() }}
        lease={lease?.lease || null}
        amount={balance > 0 ? balance : rent}
        defaultPhone={lease?.phone || ''}
        leaseInfo={lease}
      />

      {loading ? (
        <div className="mb-6"><StatCardsSkeleton count={4} /></div>
      ) : (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Monthly Rent" value={formatKsh(rent)} icon={Home} />
        <StatCard
          label="Balance Due"
          value={balance > 0 ? formatKsh(balance) : 'KSh 0'}
          icon={Wallet}
          tone={balance > 0 ? 'red' : 'brand'}
        />
        <StatCard
          label="Lease Ends"
          value={lease?.lease_end ? new Date(lease.lease_end).toLocaleDateString('en-KE', { month: 'short', year: 'numeric' }) : '—'}
          icon={Calendar}
          tone="blue"
        />
        <StatCard label="Payment Status" value={balance > 0 ? 'Balance due' : 'Up to date'} icon={CheckCircle2} tone={balance > 0 ? 'orange' : 'brand'} />
      </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2"><CardSkeleton lines={5} /></div>
          <CardSkeleton lines={4} />
        </div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2" padded={false}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
                <Receipt size={16} />
              </span>
              <div>
                <h3 className="font-semibold text-slate-900 leading-tight">Payment History</h3>
                <p className="text-xs text-slate-400">Your recent rent payments</p>
              </div>
            </div>
            <Link to="/tenant/payments" className="text-xs font-semibold text-brand-600 hover:text-brand-700">
              View all
            </Link>
          </div>

          {payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <span className="w-12 h-12 rounded-full bg-slate-50 text-slate-300 flex items-center justify-center mb-3">
                <Receipt size={22} />
              </span>
              <p className="text-sm font-medium text-slate-500">No payments yet</p>
              <p className="text-xs text-slate-400 mt-0.5">Your payments will show up here once made.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {payments.map((p) => {
                const isMpesa = String(p.method || '').toLowerCase().includes('mpesa') || String(p.method || '').toLowerCase().includes('m-pesa')
                return (
                  <div key={p.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50/60 transition-colors">
                    <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isMpesa ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                      {isMpesa ? <Smartphone size={18} /> : <CreditCard size={18} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800 truncate">{p.method}</p>
                      <p className="text-xs text-slate-400">{p.date} · Ref {p.id}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-slate-900">{formatKsh(p.amount)}</p>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                        <CheckCircle2 size={11} /> {p.status}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        <Card>
          <h3 className="font-semibold text-slate-900 mb-3">Lease Details</h3>
          {lease ? (
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Landlord</span><span className="font-medium text-slate-800">{lease.landlord || '—'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Caretaker</span><span className="font-medium text-slate-800">{lease.caretaker || '—'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Deposit</span><span className="font-medium text-slate-800">{formatKsh(lease.deposit)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Lease Start</span><span className="font-medium text-slate-800">{lease.lease_start || '—'}</span></div>
            </div>
          ) : (
            <p className="text-sm text-slate-400">No active lease.</p>
          )}
        </Card>
      </div>
      )}
    </div>
  )
}
