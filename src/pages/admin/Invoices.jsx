import { useState, useEffect, useCallback } from 'react'
import { FileText, TrendingUp, TrendingDown, Printer } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import StatCard from '../../components/ui/StatCard'
import Card from '../../components/ui/Card'
import DataTable from '../../components/ui/DataTable'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Tabs from '../../components/ui/Tabs'
import PropertyFilter from '../../components/patterns/PropertyFilter'
import { StatCardsSkeleton } from '../../components/ui/Skeleton'
import { formatKsh } from '../../data/mockData'
import { api } from '../../api/client'

const TABS = ['All', 'Sales', 'Purchase']
const KIND = { All: null, Sales: 'sales', Purchase: 'purchase' }

export default function Invoices() {
  const [tab, setTab] = useState('All')
  const [rows, setRows] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(8)
  const [opening, setOpening] = useState(null)
  const [propertyFilter, setPropertyFilter] = useState('')

  // Fetch invoices with pagination
  const fetchInvoices = useCallback(async (page = 1, size = 8, search = '', kind = null, property = '') => {
    setLoading(true)
    try {
      const res = await api.getAllInvoices({ kind, page, pageSize: size, search, property: property || null })
      if (res && res.data) {
        setRows(res.data)
        setPagination(res.pagination)
      } else if (Array.isArray(res)) {
        setRows(res)
        setPagination(null)
      }
    } catch (err) {
      console.error('Failed to fetch invoices:', err)
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial load, tab change, and property filter change
  useEffect(() => {
    fetchInvoices(1, pageSize, searchQuery, KIND[tab], propertyFilter)
    setCurrentPage(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, fetchInvoices, pageSize, propertyFilter])

  // Handle page change
  const handlePageChange = useCallback((newPage, newPageSize) => {
    if (newPageSize && newPageSize !== pageSize) {
      setPageSize(newPageSize)
      setCurrentPage(1)
      fetchInvoices(1, newPageSize, searchQuery, KIND[tab], propertyFilter)
    } else {
      setCurrentPage(newPage)
      fetchInvoices(newPage, pageSize, searchQuery, KIND[tab], propertyFilter)
    }
  }, [fetchInvoices, searchQuery, pageSize, tab, propertyFilter])

  // Handle search
  const handleSearch = useCallback((query) => {
    setSearchQuery(query)
    setCurrentPage(1)
    fetchInvoices(1, pageSize, query, KIND[tab], propertyFilter)
  }, [fetchInvoices, pageSize, tab, propertyFilter])

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

  // Open the invoice PDF in a new tab
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
      window.open(r.printUrl, '_blank', 'noopener')
    } finally {
      setOpening(null)
    }
  }

  // Build server pagination props
  const serverPagination = pagination ? {
    page: pagination.page,
    pageSize: pagination.pageSize,
    total: pagination.total,
    hasNext: pagination.hasNext,
    hasPrev: pagination.hasPrev,
  } : null

  return (
    <div>
      <PageHeader
        title="Invoices"
        description="All sales and purchase invoices. View and print any document."
        actions={<PropertyFilter value={propertyFilter} onChange={setPropertyFilter} />}
      />

      {loading ? (
        <div className="mb-6"><StatCardsSkeleton count={4} /></div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Total Invoices" value={pagination?.total || rows.length} icon={FileText} />
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
          searchPlaceholder="Search invoices…"
          emptyMessage="No invoices found."
          serverPagination={serverPagination}
          onPageChange={handlePageChange}
          onSearch={handleSearch}
        />
      </Card>
    </div>
  )
}
