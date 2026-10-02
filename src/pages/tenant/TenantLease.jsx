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

  // A tenant may hold more than one unit. Prefer the full `leases` list; fall
  // back to the single primary lease for older backends.
  const unitLeases = Array.isArray(lease.leases) && lease.leases.length
    ? lease.leases
    : [{
        lease: lease.lease,
        unit: lease.unit,
        property_name: lease.property_name,
        rent: lease.rent,
        deposit: lease.deposit,
        status: lease.status,
      }]
  const multi = unitLeases.length > 1

  // Shared tenancy details (same across all units for this tenant).
  const sharedRows = [
    { icon: User, label: 'Landlord', value: lease.landlord },
    { icon: User, label: 'Caretaker', value: lease.caretaker },
    { icon: Calendar, label: 'Lease Start', value: lease.lease_start },
    { icon: Calendar, label: 'Lease End', value: lease.lease_end },
  ]

  return (
    <div>
      <PageHeader
        title="My Lease & Unit"
        description={multi ? `Your tenancy agreement covers ${unitLeases.length} units.` : 'Details of your current tenancy agreement.'}
        actions={lease.has_lease_pdf && (
          <Button icon={FileText} onClick={handleView} disabled={busy}>
            {busy ? 'Opening…' : 'View Agreement'}
          </Button>
        )}
      />
      <Card className="mb-5">
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
          {sharedRows.map((r) => (
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

      {/* One card per unit so a multi-unit tenant sees every unit's rent/deposit. */}
      <h3 className="text-sm font-semibold text-slate-700 mb-3">{multi ? 'Your Units' : 'Unit'}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {unitLeases.map((u) => (
          <Card key={u.lease || u.unit}>
            <div className="flex items-center gap-3 mb-4">
              <span className="w-9 h-9 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
                <Home size={16} />
              </span>
              <div>
                <p className="text-xs text-slate-400">{u.property_name}</p>
                <p className="text-sm font-semibold text-slate-800">Unit {u.unit}</p>
              </div>
            </div>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Monthly Rent</span><span className="font-medium text-slate-800">{formatKsh(u.rent)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Security Deposit</span><span className="font-medium text-slate-800">{formatKsh(u.deposit)}</span></div>
              {u.status && <div className="flex justify-between"><span className="text-slate-500">Status</span><span className="font-medium text-slate-800">{u.status}</span></div>}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
