import { useState, useEffect } from 'react'
import { Home, User, Calendar, Wallet, FileText, CheckCircle2, AlertTriangle } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import { StatCardsSkeleton, CardSkeleton } from '../../components/ui/Skeleton'
import { useToast } from '../../context/ToastContext'
import { api } from '../../api/client'
import { formatKsh } from '../../data/mockData'

export default function TenantLease() {
  const { showToast } = useToast()
  const [lease, setLease] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let mounted = true
    api.getMyLease()
      .then((res) => { if (mounted) setLease(res) })
      .catch(() => {})
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [])

  const handleView = async () => {
    if (!lease?.lease) return
    setBusy(true)
    try { await api.viewMyLease(lease.lease) }
    catch (e) { showToast(e.message || 'Could not open your lease.') }
    finally { setBusy(false) }
  }

  if (loading) return (
    <div className="space-y-5">
      <StatCardsSkeleton count={3} />
      <CardSkeleton lines={5} />
    </div>
  )

  if (!lease) {
    return (
      <div>
        <PageHeader title="My Lease & Unit" description="Details of your current tenancy agreement." />
        <Card><p className="text-sm text-slate-500 py-6 text-center">No active lease found on your account.</p></Card>
      </div>
    )
  }

  const rows = [
    { icon: Home, label: 'Property', value: lease.property_name },
    { icon: Home, label: 'Unit', value: lease.unit },
    { icon: User, label: 'Landlord', value: lease.landlord },
    { icon: User, label: 'Caretaker', value: lease.caretaker },
    { icon: Calendar, label: 'Lease Start', value: lease.lease_start },
    { icon: Calendar, label: 'Lease End', value: lease.lease_end },
    { icon: Wallet, label: 'Monthly Rent', value: formatKsh(lease.rent) },
    { icon: Wallet, label: 'Security Deposit', value: formatKsh(lease.deposit) },
  ]

  return (
    <div>
      <PageHeader
        title="My Lease & Unit"
        description="Details of your current tenancy agreement."
        actions={lease.has_lease_pdf && (
          <Button icon={FileText} onClick={handleView} disabled={busy}>
            {busy ? 'Opening…' : 'View Agreement'}
          </Button>
        )}
      />
      <Card>
        <div className="flex items-center gap-2 mb-4">
          {lease.is_signed ? (
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 size={12} /> Agreement signed
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              <AlertTriangle size={12} /> Agreement not signed
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
                <r.icon size={16} />
              </span>
              <div>
                <p className="text-xs text-slate-400">{r.label}</p>
                <p className="text-sm font-medium text-slate-800">{r.value || '—'}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
