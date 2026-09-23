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
  const [payments, setPayments] = useState([])
  const [balance, setBalance] = useState(0)
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    Promise.allSettled([api.getMyDashboard(), api.getMyPayments()])
      .then(([dash, pays]) => {
        if (dash.status === 'fulfilled' && dash.value) {
          setLease(dash.value.lease || null)
          setBalance(Number(dash.value.balance) || 0)
        }
        if (pays.status === 'fulfilled') setPayments(pays.value || [])
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const rent = lease?.rent || 0

  return (
    <>
      <ListPageTemplate
        title="Payments & Billing"
        description="Your rent payment history and current balance."
        loading={loading}
        actions={<Button onClick={() => setPayOpen(true)}>Pay Rent</Button>}
        stats={[
          { label: 'Monthly Rent', value: formatKsh(rent), icon: Receipt },
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
      />
      <PayRentModal
        open={payOpen}
        onClose={() => { setPayOpen(false); load() }}
        lease={lease?.lease || null}
        amount={balance > 0 ? balance : rent}
        defaultPhone={lease?.phone || ''}
        leaseInfo={lease}
      />
    </>
  )
}
