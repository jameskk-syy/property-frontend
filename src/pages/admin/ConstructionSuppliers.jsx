import { useState, useEffect, useCallback } from 'react'
import { Plus, Store, Package } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import StatCard from '../../components/ui/StatCard'
import Card from '../../components/ui/Card'
import DataTable from '../../components/ui/DataTable'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Avatar from '../../components/ui/Avatar'
import FormModal from '../../components/patterns/FormModal'
import { Field, TextInput, TextArea, Select } from '../../components/ui/Field'
import { StatCardsSkeleton } from '../../components/ui/Skeleton'
import { useToast } from '../../context/ToastContext'
import { api } from '../../api/client'

const CATEGORIES = ['General', 'Plumbing', 'Electrical', 'Painting', 'Carpentry']
const EMPTY = { name: '', category: 'General', phone: '', notes: '' }

export default function ConstructionSuppliers() {
  const { showToast } = useToast()
  const [rows, setRows] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(8)

  // Fetch vendors with pagination
  const fetchVendors = useCallback(async (page = 1, size = 8, search = '') => {
    setLoading(true)
    try {
      const res = await api.getVendors({ page, pageSize: size, search })
      if (res && res.data) {
        setRows(res.data)
        setPagination(res.pagination)
      } else if (Array.isArray(res)) {
        setRows(res)
        setPagination(null)
      }
    } catch (err) {
      console.error('Failed to fetch vendors:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    fetchVendors(1, pageSize, '')
  }, [fetchVendors, pageSize])

  // Handle page change
  const handlePageChange = useCallback((newPage, newPageSize) => {
    if (newPageSize && newPageSize !== pageSize) {
      setPageSize(newPageSize)
      setCurrentPage(1)
      fetchVendors(1, newPageSize, searchQuery)
    } else {
      setCurrentPage(newPage)
      fetchVendors(newPage, pageSize, searchQuery)
    }
  }, [fetchVendors, searchQuery, pageSize])

  // Handle search
  const handleSearch = useCallback((query) => {
    setSearchQuery(query)
    setCurrentPage(1)
    fetchVendors(1, pageSize, query)
  }, [fetchVendors, pageSize])

  const handleCreate = async () => {
    if (!form.name) {
      showToast('Supplier name is required.', 'error')
      return
    }
    try {
      const res = await api.createVendor(form)
      showToast(res?.created === false ? `Supplier "${form.name}" updated.` : `Supplier "${form.name}" onboarded.`)
      setOpen(false)
      setForm(EMPTY)
      fetchVendors(currentPage, pageSize, searchQuery)
    } catch (err) {
      showToast(err.message || 'Could not save the supplier.', 'error')
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
    <>
      <PageHeader
        title="Suppliers"
        description="Vendors you buy construction materials from. Onboarded here and reused on purchases."
        actions={<Button icon={Plus} onClick={() => setOpen(true)}>Onboard Supplier</Button>}
      />

      {loading ? (
        <div className="mb-6"><StatCardsSkeleton count={2} /></div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <StatCard label="Suppliers" value={pagination?.total || rows.length} icon={Store} />
          <StatCard label="Total Purchases" value={rows.reduce((s, v) => s + (v.purchases || 0), 0)} icon={Package} tone="blue" />
        </div>
      )}

      <Card padded={false} className="p-5">
        <DataTable
          loading={loading}
          columns={[
            { key: 'name', header: 'Supplier', render: (r) => (
              <div className="flex items-center gap-2.5">
                <Avatar name={r.name} size={30} />
                <p className="font-medium text-slate-800">{r.name}</p>
              </div>
            ) },
            { key: 'category', header: 'Category', render: (r) => <Badge tone="blue">{r.category}</Badge> },
            { key: 'phone', header: 'Phone', render: (r) => r.phone || '—' },
            { key: 'purchases', header: 'Purchases', render: (r) => r.purchases || 0 },
            { key: 'notes', header: 'Notes', render: (r) => r.notes || '—' },
          ]}
          rows={rows}
          searchPlaceholder="Search suppliers…"
          emptyMessage="No suppliers onboarded yet."
          serverPagination={serverPagination}
          onPageChange={handlePageChange}
          onSearch={handleSearch}
        />
      </Card>

      <FormModal
        title="Onboard Supplier"
        open={open}
        onClose={() => setOpen(false)}
        onSubmit={handleCreate}
        submitLabel="Save Supplier"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Supplier Name" className="sm:col-span-2">
            <TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. BuildRite Hardware" />
          </Field>
          <Field label="Category">
            <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label="Phone">
            <TextInput value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0712 345 678" />
          </Field>
          <Field label="Notes (optional)" className="sm:col-span-2">
            <TextArea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Payment terms, contact person, etc." />
          </Field>
        </div>
      </FormModal>
    </>
  )
}
