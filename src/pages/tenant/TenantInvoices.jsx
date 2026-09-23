import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Receipt, Wallet, FileText } from 'lucide-react'
import ListPageTemplate from '../../components/patterns/ListPageTemplate'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import PayRentModal from '../../components/patterns/PayRentModal'
import { formatKsh } from '../../data/mockData'
import { api } from '../../api/client'

const statusTone = (s) =>
  s === 'Paid' ? 'brand' : s === 'Overdue' ? 'red' : s === 'Draft' ? 'slate' : 'orange'

export default function TenantInvoices() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [data, setData] = useState({ invoices: [], total_billed: 0, total_outstanding: 0, count: 0 })
  const [lease, setLease] = useState(null)
  const [loading, setLoading] = useState(true)
  const [payFor, setPayFor] = useState(null) // invoice row being paid

  const load = () => {
    setLoading(true)
    return Promise.allSettled([api.getMyInvoices(), api.getMyLease()])
      .then(([inv, ls]) => {
        if (inv.status === 'fulfilled' && inv.value) setData(inv.value)
        if (ls.status === 'fulfilled') setLease(ls.value || null)
        return inv.status === 'fulfilled' ? inv.value : null
      })
      .finally(() => setLoading(false))
  }

  // On mount, load invoices; if arriving via a reminder pay link (?pay=<invoice>),
  // auto-open the Pay modal for that invoice.
  useEffect(() => {
    load().then((invData) => {
      const payId = searchParams.get('pay')
      if (payId && invData?.invoices) {
        const match = invData.invoices.find((i) => i.id === payId)
        if (match && match.outstanding > 0 && !match.is_draft) {
          setPayFor(match)
        }
        // Clear the param so a refresh doesn't re-trigger.
        searchParams.delete('pay')
        setSearchParams(searchParams, { replace: true })
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <ListPageTemplate
        title="My Invoices"
        description="Rent and utility invoices billed to your account."
        loading={loading}
        stats={[
          { label: 'Total Invoices', value: data.count, icon: FileText },
          { label: 'Total Billed', value: formatKsh(data.total_billed), icon: Receipt, tone: 'blue' },
          { label: 'Outstanding', value: formatKsh(data.total_outstanding), icon: Wallet, tone: data.total_outstanding > 0 ? 'red' : 'brand' },
        ]}
        columns={[
          { key: 'id', header: 'Invoice' },
          { key: 'posting_date', header: 'Date' },
          { key: 'due_date', header: 'Due' },
          { key: 'total', header: 'Amount', render: (r) => formatKsh(r.total) },
          { key: 'paid', header: 'Paid', render: (r) => <span className="text-emerald-600">{formatKsh(r.paid)}</span> },
          { key: 'outstanding', header: 'Balance', render: (r) => (
            <span className={r.outstanding > 0 ? 'text-rose-600 font-semibold' : 'text-slate-400'}>{formatKsh(r.outstanding)}</span>
          ) },
          { key: 'status', header: 'Status', render: (r) => <Badge tone={statusTone(r.status)}>{r.status}</Badge> },
          { key: 'actions', header: '', align: 'right', render: (r) => (
            r.outstanding > 0 && !r.is_draft
              ? <Button size="sm" onClick={() => setPayFor(r)}>Pay</Button>
              : null
          ) },
        ]}
        rows={data.invoices}
        searchKeys={['id', 'status']}
        searchPlaceholder="Search invoices…"
        emptyMessage="No invoices yet. Monthly rent invoices will appear here once generated."
      />
      <PayRentModal
        open={!!payFor}
        onClose={() => { setPayFor(null); load() }}
        invoice={payFor?.id || null}
        amount={payFor?.outstanding || 0}
        defaultPhone={lease?.phone || ''}
        leaseInfo={lease}
      />
    </>
  )
}
