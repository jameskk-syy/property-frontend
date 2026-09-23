import { useState, useEffect, useCallback } from 'react'
import { Plus, Package, Clock, CheckCircle2, Check, X, Building } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import StatCard from '../../components/ui/StatCard'
import Card from '../../components/ui/Card'
import DataTable from '../../components/ui/DataTable'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
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
  const [projects, setProjects] = useState([])
  const [vendors, setVendors] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(null) // id being approved/rejected
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY)

  const load = useCallback(() => {
    setLoading(true)
    return api.getConstructionPurchases()
      .then((res) => setRows(res || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
    api.getConstructionProjectsV2().then((res) => setProjects(res || [])).catch(() => {})
    api.getVendors().then((res) => setVendors(res || [])).catch(() => {})
    api.getConstructionCategories().then((res) => setCategories(res || [])).catch(() => {})
  }, [load])

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
      load()
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
      load()
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
      load()
    } catch (err) {
      showToast(err.message || 'Rejection failed.', 'error')
    } finally {
      setBusy(null)
    }
  }

  const statusTone = (s) => (s === 'Approved' ? 'green' : s === 'Rejected' ? 'red' : s === 'Pending Approval' ? 'orange' : 'slate')

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
          <StatCard label="Total Purchases" value={rows.length} icon={Package} />
          <StatCard label="Pending Approval" value={pending.length} icon={Clock} tone="orange" />
          <StatCard label="Approved Spend" value={formatKsh(totalApproved)} icon={CheckCircle2} tone="brand" />
        </div>
      )}

      <Card padded={false} className="p-5">
        <DataTable
          loading={loading}
          columns={[
            { key: 'projectName', header: 'Project' },
            { key: 'description', header: 'Item', render: (r) => (
              <div>
                <p className="font-medium text-slate-800">{r.description}</p>
                {r.category && <p className="text-xs text-slate-400">{r.category}</p>}
              </div>
            ) },
            { key: 'vendorName', header: 'Supplier', render: (r) => r.vendorName || '—' },
            { key: 'amount', header: 'Amount', render: (r) => formatKsh(r.amount) },
            { key: 'date', header: 'Date' },
            { key: 'status', header: 'Status', render: (r) => <Badge tone={statusTone(r.status)}>{r.status}</Badge> },
            { key: 'actions', header: '', render: (r) => (
              r.status === 'Pending Approval' ? (
                <div className="flex items-center gap-1.5">
                  <Button size="sm" icon={Check} onClick={() => handleApprove(r)} {...(busy === r.id ? { disabled: true } : {})}>
                    Approve
                  </Button>
                  <Button size="sm" variant="danger" icon={X} onClick={() => handleReject(r)} {...(busy === r.id ? { disabled: true } : {})}>
                    Reject
                  </Button>
                </div>
              ) : (
                r.purchaseInvoice
                  ? <span className="text-xs text-slate-400">PI: {r.purchaseInvoice}</span>
                  : <span className="text-xs text-slate-300">—</span>
              )
            ) },
          ]}
          rows={rows}
          searchKeys={['projectName', 'description', 'vendorName', 'category']}
          searchPlaceholder="Search purchases…"
          emptyMessage="No material purchases recorded yet."
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
        <Field label="Item Description">
          <TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. 50 bags of cement + steel bars" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
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
        <p className="text-xs text-slate-400 -mt-1">
          Paying workers? Choose <span className="font-medium text-slate-500">Labour / Wages</span> and set the supplier to the worker or labour crew.
        </p>
      </FormModal>
    </>
  )
}
