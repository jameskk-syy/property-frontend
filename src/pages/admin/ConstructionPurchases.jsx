import { useState, useEffect, useCallback } from 'react'
import { Plus, Package, Clock, CheckCircle2, Check, X, Building, Eye } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import StatCard from '../../components/ui/StatCard'
import Card from '../../components/ui/Card'
import DataTable from '../../components/ui/DataTable'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import FormModal from '../../components/patterns/FormModal'
import { Field, TextInput, TextArea, Select } from '../../components/ui/Field'
import { StatCardsSkeleton } from '../../components/ui/Skeleton'
import { useToast } from '../../context/ToastContext'
import { formatKsh } from '../../data/mockData'
import { api } from '../../api/client'

const EMPTY = { project: '', vendor: '', category: '', description: '', amount: '' }

export default function ConstructionPurchases() {
  const { showToast } = useToast()
  const [rows, setRows] = useState([])
  const [pagination, setPagination] = useState(null)
  const [projects, setProjects] = useState([])
  const [vendors, setVendors] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(null)
  const [open, setOpen] = useState(false)
  const [viewRow, setViewRow] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(8)

  // Fetch purchases with pagination
  const fetchPurchases = useCallback(async (page = 1, size = 8, search = '') => {
    setLoading(true)
    try {
      const res = await api.getConstructionPurchases({ page, pageSize: size, search })
      if (res && res.data) {
        setRows(res.data)
        setPagination(res.pagination)
      } else if (Array.isArray(res)) {
        setRows(res)
        setPagination(null)
      }
    } catch (err) {
      console.error('Failed to fetch purchases:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    fetchPurchases(1, pageSize, '')
    api.getConstructionProjectsV2().then((res) => {
      if (res && res.data) setProjects(res.data)
      else if (Array.isArray(res)) setProjects(res)
    }).catch(() => {})
    api.getVendors().then((res) => {
      if (res && res.data) setVendors(res.data)
      else if (Array.isArray(res)) setVendors(res)
    }).catch(() => {})
    api.getConstructionCategories().then((res) => setCategories(res || [])).catch(() => {})
  }, [fetchPurchases, pageSize])

  // Handle page change
  const handlePageChange = useCallback((newPage, newPageSize) => {
    if (newPageSize && newPageSize !== pageSize) {
      setPageSize(newPageSize)
      setCurrentPage(1)
      fetchPurchases(1, newPageSize, searchQuery)
    } else {
      setCurrentPage(newPage)
      fetchPurchases(newPage, pageSize, searchQuery)
    }
  }, [fetchPurchases, searchQuery, pageSize])

  // Handle search
  const handleSearch = useCallback((query) => {
    setSearchQuery(query)
    setCurrentPage(1)
    fetchPurchases(1, pageSize, query)
  }, [fetchPurchases, pageSize])

  const pending = rows.filter((r) => r.status === 'Pending Approval')
  const approved = rows.filter((r) => r.status === 'Approved')
  const totalApproved = approved.reduce((s, r) => s + (r.amount || 0), 0)

  const handleCreate = async () => {
    if (!form.project || !form.description || !form.amount) {
      showToast('Project, description and amount are required.', 'error')
      return
    }
    try {
      await api.createConstructionPurchase(form)
      showToast('Purchase recorded and sent for Director approval.')
      setOpen(false)
      setForm(EMPTY)
      fetchPurchases(currentPage, pageSize, searchQuery)
    } catch (err) {
      showToast(err.message || 'Could not record the purchase.', 'error')
    }
  }

  const handleApprove = async (row) => {
    setBusy(row.id)
    try {
      const res = await api.approveConstructionPurchase(row.id)
      showToast(res?.purchaseInvoice
        ? `Approved. Purchase Invoice ${res.purchaseInvoice} posted.`
        : 'Purchase approved.')
      fetchPurchases(currentPage, pageSize, searchQuery)
    } catch (err) {
      showToast(err.message || 'Approval failed.', 'error')
    } finally {
      setBusy(null)
    }
  }

  const handleReject = async (row) => {
    setBusy(row.id)
    try {
      await api.rejectConstructionPurchase(row.id)
      showToast('Purchase rejected.')
      fetchPurchases(currentPage, pageSize, searchQuery)
    } catch (err) {
      showToast(err.message || 'Rejection failed.', 'error')
    } finally {
      setBusy(null)
    }
  }

  const statusTone = (s) => (s === 'Approved' ? 'green' : s === 'Rejected' ? 'red' : s === 'Pending Approval' ? 'orange' : 'slate')

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
        title="Material Purchases"
        description="Construction material and input purchases. Approval is restricted to a Director."
        actions={<Button icon={Plus} onClick={() => setOpen(true)}>Record Purchase</Button>}
      />

      {loading ? (
        <div className="mb-6"><StatCardsSkeleton count={3} /></div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <StatCard label="Total Purchases" value={pagination?.total || rows.length} icon={Package} />
          <StatCard label="Pending Approval" value={pending.length} icon={Clock} tone="orange" />
          <StatCard label="Approved Spend" value={formatKsh(totalApproved)} icon={CheckCircle2} tone="brand" />
        </div>
      )}

      <Card padded={false} className="p-5">
        <DataTable
          loading={loading}
          columns={[
            { key: 'projectName', header: 'Project' },
            { key: 'vendorName', header: 'Supplier', render: (r) => r.vendorName || '—' },
            { key: 'amount', header: 'Amount', render: (r) => formatKsh(r.amount) },
            { key: 'date', header: 'Date' },
            { key: 'status', header: 'Status', render: (r) => <Badge tone={statusTone(r.status)}>{r.status}</Badge> },
            { key: 'actions', header: '', truncate: false, render: (r) => (
              <div className="flex items-center justify-end gap-1.5">
                <Button size="sm" variant="secondary" icon={Eye} onClick={() => setViewRow(r)}>
                  View more
                </Button>
                {r.status === 'Pending Approval' && (
                  <>
                    <Button size="sm" icon={Check} onClick={() => handleApprove(r)} {...(busy === r.id ? { disabled: true } : {})}>
                      Approve
                    </Button>
                    <Button size="sm" variant="danger" icon={X} onClick={() => handleReject(r)} {...(busy === r.id ? { disabled: true } : {})}>
                      Reject
                    </Button>
                  </>
                )}
              </div>
            ) },
          ]}
          rows={rows}
          searchPlaceholder="Search purchases…"
          emptyMessage="No material purchases recorded yet."
          serverPagination={serverPagination}
          onPageChange={handlePageChange}
          onSearch={handleSearch}
        />
      </Card>

      <FormModal
        title="Record Material Purchase"
        description="This will be sent to a Director for approval before it posts to the ledger."
        open={open}
        onClose={() => setOpen(false)}
        onSubmit={handleCreate}
        submitLabel="Submit for Approval"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Construction Project">
            <Select value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })}>
              <option value="">— Select project —</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </Field>
          <Field label="Supplier (optional)">
            <Select value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })}>
              <option value="">— Select supplier —</option>
              {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </Select>
          </Field>
          <Field label="Item Description" className="sm:col-span-2">
            <TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. 50 bags of cement + steel bars" />
          </Field>
          <Field label="Category">
            <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              <option value="">— Select category —</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label="Amount (KSh)">
            <TextInput type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="150000" />
          </Field>
        </div>
        <p className="text-xs text-slate-400 mt-2">
          Paying workers? Choose <span className="font-medium text-slate-500">Labour / Wages</span> and set the supplier to the worker or labour crew.
        </p>
      </FormModal>

      <Modal
        open={!!viewRow}
        onClose={() => setViewRow(null)}
        title="Purchase Details"
        description={viewRow?.projectName ? `Project: ${viewRow.projectName}` : undefined}
        size="md"
      >
        {viewRow && (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Item Description</p>
              <p className="text-sm text-slate-800 whitespace-pre-wrap break-words">{viewRow.description || '—'}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Category</p>
                <p className="text-sm text-slate-800">{viewRow.category || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Supplier</p>
                <p className="text-sm text-slate-800">{viewRow.vendorName || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Amount</p>
                <p className="text-sm font-semibold text-slate-900">{formatKsh(viewRow.amount)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Date</p>
                <p className="text-sm text-slate-800">{viewRow.date || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Status</p>
                <Badge tone={statusTone(viewRow.status)}>{viewRow.status}</Badge>
              </div>
              {viewRow.purchaseInvoice && (
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Purchase Invoice</p>
                  <p className="text-sm text-slate-800">{viewRow.purchaseInvoice}</p>
                </div>
              )}
            </div>

            {viewRow.status === 'Pending Approval' && (
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <Button
                  icon={Check}
                  onClick={() => { handleApprove(viewRow); setViewRow(null) }}
                  {...(busy === viewRow.id ? { disabled: true } : {})}
                >
                  Approve
                </Button>
                <Button
                  variant="danger"
                  icon={X}
                  onClick={() => { handleReject(viewRow); setViewRow(null) }}
                  {...(busy === viewRow.id ? { disabled: true } : {})}
                >
                  Reject
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  )
}
