import { useState, useEffect } from 'react'
import { Plus, Receipt, Wallet, PieChart as PieIcon, CheckCircle } from 'lucide-react'
import ListPageTemplate from '../../components/patterns/ListPageTemplate'
import FormModal from '../../components/patterns/FormModal'
import PropertyFilter from '../../components/patterns/PropertyFilter'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { Field, TextInput, Select, TextArea } from '../../components/ui/Field'
import { useToast } from '../../context/ToastContext'
import { formatKsh } from '../../data/mockData'
import { api } from '../../api/client'

export default function ExpenseManagement() {
  const { showToast } = useToast()
  const [expenses, setExpenses] = useState([])
  const [properties, setProperties] = useState([])
  const [categories, setCategories] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [propertyFilter, setPropertyFilter] = useState('')
  const [form, setForm] = useState({ vendor: '', category: '', amount: '', property: '', description: '' })

  useEffect(() => {
    let mounted = true
    setLoading(true)
    api.getExpenses({ page: 1, pageSize: 100, property: propertyFilter || null }).then((res) => {
      if (mounted) {
        // Handle paginated response: { data: [...], pagination: {...} }
        const list = res?.data || res || []
        setExpenses(Array.isArray(list) ? list : [])
      }
    }).catch(() => {}).finally(() => {
      if (mounted) setLoading(false)
    })
    return () => { mounted = false }
  }, [propertyFilter])

  useEffect(() => {
    let mounted = true
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
  const approved = expenses.filter(e => e.status === 'Approved')

  const handleSubmit = async () => {
    if (!form.vendor || !form.amount) return
    try {
      await api.createExpense({
        vendor: form.vendor,
        category: form.category,
        amount: Number(form.amount),
        property: form.property,
        description: form.description
      })
      showToast(`Expense of ${formatKsh(form.amount)} raised for approval.`)
      const updated = await api.getExpenses({ page: 1, pageSize: 100, property: propertyFilter || null })
      const list = updated?.data || updated || []
      setExpenses(Array.isArray(list) ? list : [])
    } catch (err) {
      showToast(err?.message || 'Could not raise expense.')
    }
    setOpen(false)
    setForm({ vendor: '', category: categories[0]?.id || '', amount: '', property: '', description: '' })
  }

  return (
    <>
      <ListPageTemplate
        title="Expense Management"
        description="Track and approve property operating expenses."
        actions={
          <div className="flex items-center gap-2.5">
            <PropertyFilter value={propertyFilter} onChange={setPropertyFilter} />
            <Button icon={Plus} onClick={() => setOpen(true)}>Add Expense</Button>
          </div>
        }
        stats={[
          { label: 'Total Expenses', value: formatKsh(totalExpenses), icon: Wallet, tone: 'red' },
          { label: 'Records', value: expenses.length, icon: Receipt },
          { label: 'Approved', value: approved.length, icon: CheckCircle, tone: 'green' },
          { label: 'Categories', value: new Set(expenses.map(e => e.category)).size, icon: PieIcon, tone: 'blue' },
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
      <FormModal title="Add Expense" open={open} onClose={() => setOpen(false)} onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Vendor Name">
            <TextInput value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} placeholder="e.g. Kijani Plumbing" />
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
              <option value="">All Properties</option>
              {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </Field>
          <Field label="Description" className="sm:col-span-2">
            <TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Work description…" />
          </Field>
        </div>
      </FormModal>
    </>
  )
}
