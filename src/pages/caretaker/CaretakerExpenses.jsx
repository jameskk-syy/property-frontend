import { useState, useEffect } from 'react'
import { Plus, Receipt, Wallet, Clock, CheckCircle } from 'lucide-react'
import ListPageTemplate from '../../components/patterns/ListPageTemplate'
import FormModal from '../../components/patterns/FormModal'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { Field, TextInput, Select, TextArea } from '../../components/ui/Field'
import SearchSelect from '../../components/ui/SearchSelect'
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
  const [form, setForm] = useState({ vendor: '', vendorPhone: '', category: '', amount: '', property: '', description: '', scope: 'Property', unit: '', deductFromDeposit: false })
  const [units, setUnits] = useState([])
  const [unitsLoading, setUnitsLoading] = useState(false)
  
  // Stats from server or computed
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, totalAmount: 0 })

  const loadExpenses = async () => {
    setLoading(true)
    try {
      // Only show expenses this caretaker raised - handle paginated response
      const result = await api.getExpenses({ mine: true, pageSize: 100 })
      const expenseList = result?.data || result || []
      setExpenses(Array.isArray(expenseList) ? expenseList : [])
      
      // Calculate stats from the data
      const totalAmount = expenseList.reduce((s, e) => s + (e.amount || 0), 0)
      const pending = expenseList.filter(e => e.status !== 'Approved').length
      const approved = expenseList.filter(e => e.status === 'Approved').length
      setStats({
        total: expenseList.length,
        pending,
        approved,
        totalAmount
      })
    } catch (err) {
      console.error('Error loading expenses:', err)
      setExpenses([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let mounted = true
    
    loadExpenses()
    
    // Use getMyProperties for caretaker's assigned properties
    api.getMyProperties().then((res) => {
      if (mounted && res && res.length > 0) {
        setProperties(res)
        // Auto-select first property
        setForm((f) => ({ ...f, property: f.property || res[0].id }))
      }
    }).catch(() => {})
    
    api.getExpenseCategories().then((res) => {
      if (mounted && res && res.length > 0) {
        setCategories(res)
        setForm((f) => (f.category ? f : { ...f, category: res[0].id }))
      }
    }).catch(() => {})
    
    return () => { mounted = false }
  }, [])

  // Fetch the selected property's units whenever the scope is Unit/Tenant and a
  // property is chosen. The picker itself is searchable; we pull a generous page
  // so search filters across all units of the property.
  useEffect(() => {
    if (form.scope !== 'Unit / Tenant' || !form.property) {
      setUnits([])
      return
    }
    let mounted = true
    setUnitsLoading(true)
    api.getUnits(form.property, { pageSize: 200 })
      .then((res) => {
        const list = res?.data || res || []
        if (mounted) setUnits(Array.isArray(list) ? list : [])
      })
      .catch(() => { if (mounted) setUnits([]) })
      .finally(() => { if (mounted) setUnitsLoading(false) })
    return () => { mounted = false }
  }, [form.scope, form.property])

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
        description: form.description,
        expense_scope: form.scope,
        unit: form.scope === 'Unit / Tenant' ? (form.unit || null) : null,
        deduct_from_deposit: form.scope === 'Unit / Tenant' && form.unit ? form.deductFromDeposit : false,
      })
      showToast(`Expense of ${formatKsh(form.amount)} raised for approval.`)
      await loadExpenses()
      setOpen(false)
      setForm({ vendor: '', vendorPhone: '', category: categories[0]?.id || '', amount: '', property: properties[0]?.id || '', description: '', scope: 'Property', unit: '', deductFromDeposit: false })
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
          { label: 'Total Raised', value: formatKsh(stats.totalAmount), icon: Wallet, tone: 'red' },
          { label: 'Records', value: stats.total, icon: Receipt },
          { label: 'Pending Approval', value: stats.pending, icon: Clock, tone: 'orange' },
          { label: 'Approved', value: stats.approved, icon: CheckCircle, tone: 'green' },
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          <Field label="Property" className="sm:col-span-2">
            <Select value={form.property} onChange={(e) => setForm({ ...form, property: e.target.value, unit: '' })}>
              <option value="">Select property…</option>
              {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </Field>

          <Field label="Expense Attached To" className="sm:col-span-2">
            <Select
              value={form.scope}
              onChange={(e) => setForm({ ...form, scope: e.target.value, unit: '', deductFromDeposit: false })}
            >
              <option value="Property">Whole property (general operating cost)</option>
              <option value="Unit / Tenant">A specific unit / tenant</option>
            </Select>
          </Field>

          {form.scope === 'Unit / Tenant' && (
            <>
              <Field label="Unit (optional)" className="sm:col-span-2">
                <SearchSelect
                  value={form.unit}
                  onChange={(val) => setForm({ ...form, unit: val, deductFromDeposit: false })}
                  options={units.map((u) => ({
                    value: u.id,
                    label: `${u.number}${u.type ? ' · ' + u.type : ''}${u.status ? ' · ' + u.status : ''}`,
                  }))}
                  placeholder={form.property ? (unitsLoading ? 'Loading units…' : 'Select a unit…') : 'Select a property first'}
                  searchPlaceholder="Search units by number…"
                  disabled={!form.property || unitsLoading}
                  emptyMessage={form.property ? 'No units for this property' : 'Select a property first'}
                />
              </Field>

              {form.unit && (
                <Field label="Deduct From Tenant Deposit" className="sm:col-span-2">
                  <label className="flex items-start gap-2.5 rounded-lg border border-slate-200 p-3 cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-500 focus:ring-brand-400"
                      checked={form.deductFromDeposit}
                      onChange={(e) => setForm({ ...form, deductFromDeposit: e.target.checked })}
                    />
                    <span className="text-sm text-slate-600">
                      This is a repair chargeable to the tenant. On approval, the amount is deducted
                      from the unit tenant's deposit balance (capped at the available balance).
                    </span>
                  </label>
                </Field>
              )}
            </>
          )}

          <Field label="Work Description" className="sm:col-span-2">
            <TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe the work or purpose…" />
          </Field>
        </div>
      </FormModal>
    </>
  )
}
