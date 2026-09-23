import { useState, useEffect } from 'react'
import { Plus, Receipt, Wallet, Clock, CheckCircle } from 'lucide-react'
import ListPageTemplate from '../../components/patterns/ListPageTemplate'
import FormModal from '../../components/patterns/FormModal'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { Field, TextInput, Select, TextArea } from '../../components/ui/Field'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../context/AuthContext'
import { formatKsh } from '../../data/mockData'
import { api } from '../../api/client'

export default function CaretakerExpenses() {
  const { showToast } = useToast()
  const { user } = useAuth()
  const [expenses, setExpenses] = useState([])
  const [properties, setProperties] = useState([])
  const [categories, setCategories] = useState([])
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ vendor: '', vendorPhone: '', category: '', amount: '', property: '', description: '' })

  useEffect(() => {
    let mounted = true
    // Only show expenses this caretaker raised.
    api.getExpenses({ mine: true }).then((res) => {
      if (mounted) setExpenses(Array.isArray(res) ? res : [])
    }).catch(() => {}).finally(() => {
      if (mounted) setLoading(false)
    })

    api.getProperties().then((res) => {
      if (mounted && res && res.length > 0) setProperties(res)
    }).catch(() => {})

    api.getExpenseCategories().then((res) => {
      if (mounted && res && res.length > 0) {
        setCategories(res)
        setForm((f) => (f.category ? f : { ...f, category: res[0].id }))
      }
    }).catch(() => {})

    return () => { mounted = false }
  }, [])

  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0)
  const pending = expenses.filter(e => e.status !== 'Approved')
  const approved = expenses.filter(e => e.status === 'Approved')

  const handleSubmit = async () => {
    if (!form.vendor || !form.amount) {
      showToast('Please enter a vendor and amount.')
      return
    }
    setSaving(true)
    try {
      await api.createExpense({
        vendor: form.vendor,
        vendor_phone: form.vendorPhone,
        category: form.category,
        amount: Number(form.amount),
        property: form.property,
        description: form.description
      })
      showToast(`Expense of ${formatKsh(form.amount)} raised for approval.`)
      const updated = await api.getExpenses({ mine: true })
      setExpenses(Array.isArray(updated) ? updated : [])
      setOpen(false)
      setForm({ vendor: '', vendorPhone: '', category: categories[0]?.id || '', amount: '', property: '', description: '' })
    } catch (err) {
      showToast(err?.message || 'Could not raise expense.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <ListPageTemplate
        title="Expense Management"
        description="Raise property operating expenses for approval and track their status."
        actions={<Button icon={Plus} onClick={() => setOpen(true)}>Raise Expense</Button>}
        stats={[
          { label: 'Total Raised', value: formatKsh(totalExpenses), icon: Wallet, tone: 'red' },
          { label: 'Records', value: expenses.length, icon: Receipt },
          { label: 'Pending Approval', value: pending.length, icon: Clock, tone: 'orange' },
          { label: 'Approved', value: approved.length, icon: CheckCircle, tone: 'green' },
        ]}
        columns={[
          { key: 'vendor', header: 'Vendor' },
          { key: 'category', header: 'Category', render: (r) => <Badge>{r.category}</Badge> },
          { key: 'amount', header: 'Amount', render: (r) => formatKsh(r.amount || 0) },
          { key: 'date', header: 'Date', render: (r) => r.date || '—' },
          { key: 'status', header: 'Status', render: (r) => <Badge tone={r.status === 'Approved' ? 'green' : 'orange'}>{r.status}</Badge> },
        ]}
        rows={expenses}
        loading={loading}
        searchKeys={['vendor', 'category']}
        searchPlaceholder="Search expenses…"
      />
      <FormModal
        title="Raise Expense"
        description="Submitted expenses are sent to management for approval before posting."
        open={open}
        onClose={() => setOpen(false)}
        onSubmit={handleSubmit}
        submitLabel={saving ? 'Submitting…' : 'Raise for Approval'}
      >
        <Field label="Vendor Name">
          <TextInput value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} placeholder="e.g. Kijani Plumbing" />
        </Field>
        <Field label="Vendor M-Pesa Phone">
          <TextInput value={form.vendorPhone} onChange={(e) => setForm({ ...form, vendorPhone: e.target.value })} placeholder="2547XXXXXXXX" />
        </Field>
        <Field label="Category">
          <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {categories.length === 0 && <option value="">No categories configured</option>}
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Amount (KSh)">
          <TextInput type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="15000" />
        </Field>
        <Field label="Property">
          <Select value={form.property} onChange={(e) => setForm({ ...form, property: e.target.value })}>
            <option value="">Select property…</option>
            {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </Field>
        <Field label="Work Description">
          <TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe the work or purpose…" />
        </Field>
      </FormModal>
    </>
  )
}
