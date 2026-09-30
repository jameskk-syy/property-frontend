import { useState, useEffect } from 'react'
import { CheckCircle2, Wallet, AlertCircle, Clock } from 'lucide-react'
import ListPageTemplate from '../../components/patterns/ListPageTemplate'
import FormModal from '../../components/patterns/FormModal'
import PropertyFilter from '../../components/patterns/PropertyFilter'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { Field, TextInput, Select } from '../../components/ui/Field'
import { useToast } from '../../context/ToastContext'
import { payments as initialPayments, formatKsh } from '../../data/mockData'
import { api } from '../../api/client'

export default function PaymentReconciliation() {
  const { showToast } = useToast()
  const [rows, setRows] = useState([])
  const [payments, setPayments] = useState(initialPayments)
  const [properties, setProperties] = useState([])
  const [tenants, setTenants] = useState([])
  const [loading, setLoading] = useState(true)
  const [matchFor, setMatchFor] = useState(null)
  const [saving, setSaving] = useState(false)
  const [propertyFilter, setPropertyFilter] = useState('')
  const [form, setForm] = useState({ property: '', tenant: '', amount: '' })

  const load = (property = propertyFilter) => {
    setLoading(true)
    Promise.all([
      api.listUnreconciled({ property: property || null }).catch(() => []),
      api.getPayments().catch(() => []),
    ]).then(([unrec, pays]) => {
      setRows(Array.isArray(unrec) ? unrec : [])
      if (pays && pays.length > 0) setPayments(pays)
    }).finally(() => setLoading(false))
  }

  useEffect(() => {
    load(propertyFilter)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyFilter])

  useEffect(() => {
    api.getProperties().then((res) => { if (res) setProperties(res) }).catch(() => {})
    api.getTenants({ pageSize: 100 }).then((res) => { 
      if (res && res.data) setTenants(res.data)
      else if (Array.isArray(res)) setTenants(res)
    }).catch(() => {})
  }, [])

  const total = rows.reduce((s, p) => s + (p.amount || 0), 0)
  const reconciledCount = payments.filter((p) => p.status === 'Reconciled').length

  const openMatch = (row) => {
    setForm({ property: properties[0]?.id || '', tenant: '', amount: row.amount || '' })
    setMatchFor(row)
  }

  const handleMatch = async () => {
    if (!matchFor || !form.property) {
      showToast('Select a property to match this payment to.')
      return
    }
    setSaving(true)
    try {
      await api.reconcilePayment({
        bankTransaction: matchFor.name,
        property: form.property,
        amount: form.amount || matchFor.amount,
        tenant: form.tenant || null,
        referenceNo: matchFor.reference || null,
      })
      showToast('Payment reconciled and recorded successfully.')
      setMatchFor(null)
      load()
    } catch (err) {
      showToast(err?.message || 'Could not reconcile this payment.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <ListPageTemplate
        title="Payment Reconciliation"
        description="Match incoming M-Pesa and bank payments against tenant invoices."
        actions={<PropertyFilter value={propertyFilter} onChange={setPropertyFilter} />}
        loading={loading}
        stats={[
          { label: 'Unreconciled Value', value: formatKsh(total), icon: Wallet, tone: 'orange' },
          { label: 'Unreconciled', value: rows.length, icon: AlertCircle, tone: 'red' },
          { label: 'Reconciled Payments', value: reconciledCount, icon: CheckCircle2, tone: 'brand' },
          { label: 'Recorded Payments', value: payments.length, icon: Clock, tone: 'blue' },
        ]}
        columns={[
          { key: 'reference', header: 'Reference', render: (r) => r.reference || r.name },
          { key: 'bank_account', header: 'Account' },
          { key: 'amount', header: 'Amount', render: (r) => formatKsh(r.amount) },
          { key: 'transaction_date', header: 'Date', render: (r) => r.transaction_date || '—' },
          { key: 'actions', header: '', render: (r) => (
            <Button variant="secondary" size="sm" onClick={() => openMatch(r)}>Match</Button>
          ) },
        ]}
        rows={rows}
        searchKeys={['reference', 'bank_account']}
        searchPlaceholder="Search transactions…"
        emptyMessage="No unreconciled transactions. All payments are matched."
      />

      <FormModal
        open={!!matchFor}
        onClose={() => setMatchFor(null)}
        title="Match Payment"
        description={matchFor ? `Reconcile ${formatKsh(matchFor.amount)} (${matchFor.reference || matchFor.name})` : ''}
        onSubmit={handleMatch}
        submitLabel={saving ? 'Matching…' : 'Match & Record'}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Property">
            <Select value={form.property} onChange={(e) => setForm({ ...form, property: e.target.value })}>
              <option value="">Select property…</option>
              {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </Field>
          <Field label="Tenant (optional)">
            <Select value={form.tenant} onChange={(e) => setForm({ ...form, tenant: e.target.value })}>
              <option value="">Unassigned</option>
              {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          </Field>
          <Field label="Amount (KSh)">
            <TextInput type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </Field>
        </div>
      </FormModal>
    </>
  )
}
