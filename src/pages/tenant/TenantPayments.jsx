import { useState, useEffect } from 'react'
import { Wallet, Receipt } from 'lucide-react'
import ListPageTemplate from '../../components/patterns/ListPageTemplate'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import PayRentModal from '../../components/patterns/PayRentModal'
import { formatKsh } from '../../data/mockData'
import { api } from '../../api/client'

export default function TenantPayments() {
  const [payOpen, setPayOpen] = useState(false)
  const [lease, setLease] = useState(null)
  const [leases, setLeases] = useState([]) // all units this tenant holds
  const [payLease, setPayLease] = useState(null) // the lease chosen to pay for
  const [payments, setPayments] = useState([])
  const [balance, setBalance] = useState(0)
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    Promise.allSettled([api.getMyDashboard(), api.getMyPayments()])
      .then(([dash, pays]) => {
        if (dash.status === 'fulfilled' && dash.value) {
          setLease(dash.value.lease || null)
          setLeases(Array.isArray(dash.value.leases) ? dash.value.leases : [])
          setBalance(Number(dash.value.balance) || 0)
        }
        if (pays.status === 'fulfilled') setPayments(pays.value || [])
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const hasMultiple = leases.length > 1
  // "Monthly Rent" = combined rent across ALL units when the tenant holds more
  // than one; otherwise the single unit's rent.
  const rent = leases.length
    ? leases.reduce((s, l) => s + (Number(l.rent) || 0), 0)
    : (lease?.rent || 0)

  // Open the pay modal. With multiple units, the tenant first picks a unit via
  // the per-unit "Pay" button; with a single unit, the top "Pay Rent" button
  // uses that one lease directly.
  const openPay = (chosen) => {
    setPayLease(chosen || null)
    setPayOpen(true)
  }

  // Resolve what the modal should charge/label based on the chosen unit (or the
  // single lease / overall balance when there's just one).
  const modalLease = payLease || (hasMultiple ? null : (leases[0] || null))
  const modalLeaseName = modalLease?.lease || lease?.lease || null
  const modalAmount = modalLease
    ? (modalLease.amount_due || modalLease.rent || 0)
    : (balance > 0 ? balance : rent)
  const modalInfo = modalLease
    ? { property_name: modalLease.property_name, unit: modalLease.unit, rent: modalLease.rent, phone: lease?.phone }
    : lease

  return (
    <>
      <ListPageTemplate
        title="Payments & Billing"
        description="Your rent payment history and current balance."
        loading={loading}
        actions={!hasMultiple ? <Button onClick={() => openPay(null)}>Pay Rent</Button> : null}
        stats={[
          { label: hasMultiple ? `Monthly Rent (${leases.length} units)` : 'Monthly Rent', value: formatKsh(rent), icon: Receipt },
          { label: 'Current Balance', value: balance > 0 ? formatKsh(balance) : 'KSh 0', icon: Wallet, tone: balance > 0 ? 'red' : 'brand' },
        ]}
        columns={[
          { key: 'date', header: 'Date' },
          { key: 'amount', header: 'Amount', render: (r) => formatKsh(r.amount) },
          { key: 'method', header: 'Method' },
          { key: 'status', header: 'Status', render: (r) => <Badge tone="brand">{r.status}</Badge> },
        ]}
        rows={payments}
        searchKeys={['date', 'method', 'id']}
        searchPlaceholder="Search payments…"
        emptyMessage="No payments yet."
      >
        {/* Multi-unit tenants choose which unit to pay for. */}
        {hasMultiple && (
          <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-slate-800 mb-1">Your Units</h3>
            <p className="text-xs text-slate-500 mb-4">You rent more than one unit. Choose which unit to pay rent for.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {leases.map((l) => (
                <div key={l.lease} className="flex items-center justify-between rounded-lg border border-slate-200 p-3.5">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 truncate">{l.property_name} · {l.unit}</p>
                    <p className="text-xs text-slate-500">
                      Rent {formatKsh(l.rent)}
                      {l.outstanding > 0 && <span className="text-rose-600"> · Due {formatKsh(l.outstanding)}</span>}
                    </p>
                  </div>
                  <Button size="sm" onClick={() => openPay(l)}>Pay</Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </ListPageTemplate>
      <PayRentModal
        open={payOpen}
        onClose={() => { setPayOpen(false); setPayLease(null); load() }}
        lease={modalLeaseName}
        amount={modalAmount}
        defaultPhone={lease?.phone || ''}
        leaseInfo={modalInfo}
      />
    </>
  )
}
