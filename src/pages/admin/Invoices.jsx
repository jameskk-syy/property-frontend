import { useState, useEffect, useCallback } from 'react'
import { FileText, TrendingUp, TrendingDown, Printer } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import StatCard from '../../components/ui/StatCard'
import Card from '../../components/ui/Card'
import DataTable from '../../components/ui/DataTable'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Tabs from '../../components/ui/Tabs'
import { StatCardsSkeleton } from '../../components/ui/Skeleton'
import { formatKsh } from '../../data/mockData'
import { api } from '../../api/client'

const TABS = ['All', 'Sales', 'Purchase']
const KIND = { All: null, Sales: 'sales', Purchase: 'purchase' }

export default function Invoices() {
  const [tab, setTab] = useState('All')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback((kind) => {
    setLoading(true)
    api.getAllInvoices({ kind })
      .then((res) => setRows(res || []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load(KIND[tab]) }, [tab, load])

  const sales = rows.filter((r) => r.type === 'Sales')
  const purchase = rows.filter((r) => r.type === 'Purchase')
  const salesTotal = sales.reduce((s, r) => s + (r.total || 0), 0)
  const purchaseTotal = purchase.reduce((s, r) => s + (r.total || 0), 0)

  const statusTone = (s) => {
    const v = String(s || '').toLowerCase()
    if (v === 'paid') return 'green'
    if (v.includes('unpaid') || v.includes('overdue')) return 'red'
    if (v.includes('partly')) return 'orange'
    return 'slate'
  }

  const [opening, setOpening] = useState(null)

  // Open the invoice PDF in a new tab (fetched with the session cookie so it
  // works for private docs, and never shows the Frappe desk UI).
  const openPrint = async (r) => {
    if (!r.printUrl) return
    setOpening(r.id)
    try {
      const res = await fetch(r.printUrl, { credentials: 'include' })
      if (!res.ok) throw new Error('Could not open the invoice.')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank', 'noopener')
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch {
      // Fallback: direct navigation (still same-origin, sends the cookie).
      window.open(r.printUrl, '_blank', 'noopener')
    } finally {
      setOpening(null)
    }
  }

  return (
    <div>
      <PageHeader
        title="Invoices"
        description="All sales and purchase invoices. View and print any document."
      />

      {loading ? (
        <div className="mb-6"><StatCardsSkeleton count={4} /></div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Total Invoices" value={rows.length} icon={FileText} />
          <StatCard label="Sales Invoices" value={sales.length} icon={TrendingUp} tone="brand" />
          <StatCard label="Purchase Invoices" value={purchase.length} icon={TrendingDown} tone="orange" />
          <StatCard label="Sales Value" value={formatKsh(salesTotal)} icon={TrendingUp} tone="blue" />
        </div>
      )}

      <Card padded={false} className="p-5">
        <Tabs tabs={TABS} active={tab} onChange={setTab} />
        <DataTable
          loading={loading}
          columns={[
            { key: 'id', header: 'Invoice #', render: (r) => <span className="font-medium text-slate-800">{r.id}</span> },
            { key: 'type', header: 'Type', render: (r) => <Badge tone={r.type === 'Sales' ? 'brand' : 'purple'}>{r.type}</Badge> },
            { key: 'party', header: 'Party', render: (r) => r.party || '—' },
            { key: 'date', header: 'Date' },
            { key: 'total', header: 'Total', render: (r) => formatKsh(r.total) },
            { key: 'outstanding', header: 'Outstanding', render: (r) => (
              <span className={(r.outstanding || 0) > 0 ? 'text-rose-600 font-medium' : 'text-slate-400'}>
                {(r.outstanding || 0) > 0 ? formatKsh(r.outstanding) : '—'}
              </span>
            ) },
            { key: 'status', header: 'Status', render: (r) => <Badge tone={statusTone(r.status)}>{r.status}</Badge> },
            { key: 'actions', header: '', render: (r) => (
              <Button size="sm" variant="secondary" icon={Printer} onClick={() => openPrint(r)} {...(opening === r.id ? { disabled: true } : {})}>
                {opening === r.id ? 'Opening…' : 'View / Print'}
              </Button>
            ) },
          ]}
          rows={rows.map((r) => ({ ...r, id: r.id }))}
          searchKeys={['id', 'party', 'status', 'type']}
          searchPlaceholder="Search invoices…"
          emptyMessage="No invoices found."
        />
      </Card>
    </div>
  )
}
