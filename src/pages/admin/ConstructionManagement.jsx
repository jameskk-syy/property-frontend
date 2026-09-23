import { useState, useEffect, useCallback } from 'react'
import { HardHat, Plus, TrendingUp, TrendingDown, Clock, Wallet, ArrowDownToLine } from 'lucide-react'
import ListPageTemplate from '../../components/patterns/ListPageTemplate'
import FormModal from '../../components/patterns/FormModal'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { Field, TextInput, Select } from '../../components/ui/Field'
import { useToast } from '../../context/ToastContext'
import { formatKsh } from '../../data/mockData'
import { api } from '../../api/client'

const EMPTY = { name: '', property: '', budget: '', startDate: '', endDate: '', status: 'Planning' }

export default function ConstructionManagement() {
  const { showToast } = useToast()
  const [projects, setProjects] = useState([])
  const [properties, setProperties] = useState([])
  const [sources, setSources] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [fundFor, setFundFor] = useState(null) // project row being funded
  const [fundForm, setFundForm] = useState({ sourceAccount: '', amount: '' })

  const loadProjects = useCallback(async () => {
    setLoading(true)
    const res = await api.getConstructionProjectsV2().catch(() => [])
    if (Array.isArray(res)) setProjects(res)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadProjects()
    api.getProperties().then((res) => { if (res?.length) setProperties(res) }).catch(() => {})
    api.getFundingSources().then((res) => setSources(res || [])).catch(() => {})
  }, [loadProjects])

  const totalBudget = projects.reduce((s, p) => s + (p.budget || 0), 0)
  const totalFunded = projects.reduce((s, p) => s + (p.funded || 0), 0)
  const totalSpent = projects.reduce((s, p) => s + (p.spent || 0), 0)
  const active = projects.filter((p) => p.status === 'In Progress')

  const handleSubmit = async () => {
    if (!form.name) return
    try {
      await api.createConstructionProjectV2({
        name: form.name,
        property: form.property || null,
        budget: Number(form.budget || 0),
        startDate: form.startDate,
        endDate: form.endDate,
        status: form.status,
      })
      showToast(`Project "${form.name}" created.`)
      await loadProjects()
      setOpen(false)
      setForm(EMPTY)
    } catch (err) {
      showToast(err.message || 'Could not create the project.', 'error')
    }
  }

  const openFund = (row) => {
    setFundFor(row)
    setFundForm({ sourceAccount: sources[0]?.id || '', amount: '' })
  }

  const handleFund = async () => {
    if (!fundForm.sourceAccount || !fundForm.amount) {
      showToast('Choose a source account and amount.', 'error')
      return
    }
    try {
      await api.fundConstructionProject({
        project: fundFor.id,
        sourceAccount: fundForm.sourceAccount,
        amount: fundForm.amount,
      })
      showToast(`Funded ${formatKsh(Number(fundForm.amount))} into "${fundFor.name}".`)
      await loadProjects()
      setFundFor(null)
    } catch (err) {
      showToast(err.message || 'Funding failed.', 'error')
    }
  }

  return (
    <>
      <ListPageTemplate
        title="Construction & Projects"
        description="Track construction budgets, funding and spending. Fund a project from bank/cash, then purchases draw down from it."
        loading={loading}
        actions={<Button icon={Plus} onClick={() => setOpen(true)}>New Project</Button>}
        stats={[
          { label: 'Total Projects', value: projects.length, icon: HardHat },
          { label: 'Active', value: active.length, icon: Clock, tone: 'blue' },
          { label: 'Total Funded', value: formatKsh(totalFunded), icon: Wallet, tone: 'brand' },
          { label: 'Total Spent', value: formatKsh(totalSpent), icon: TrendingDown, tone: 'orange' },
        ]}
        columns={[
          { key: 'name', header: 'Project' },
          { key: 'property', header: 'Property', render: (r) => r.property || <span className="text-slate-400">New build</span> },
          { key: 'status', header: 'Status', render: (r) => <Badge tone={r.status === 'In Progress' ? 'blue' : r.status === 'Completed' ? 'green' : 'slate'}>{r.status}</Badge> },
          { key: 'budget', header: 'Budget', render: (r) => formatKsh(r.budget || 0) },
          { key: 'funded', header: 'Funded', render: (r) => <span className="text-emerald-600 font-medium">{formatKsh(r.funded || 0)}</span> },
          { key: 'spent', header: 'Spent', render: (r) => formatKsh(r.spent || 0) },
          { key: 'available', header: 'Available', render: (r) => (
            <span className={(r.available || 0) > 0 ? 'font-semibold text-slate-800' : 'text-slate-400'}>{formatKsh(r.available || 0)}</span>
          ) },
          { key: 'actions', header: '', render: (r) => (
            <Button size="sm" variant="secondary" icon={ArrowDownToLine} onClick={() => openFund(r)}>Fund</Button>
          ) },
        ]}
        rows={projects}
        searchKeys={['name', 'property', 'status']}
        searchPlaceholder="Search projects…"
      />

      <FormModal title="New Construction Project" open={open} onClose={() => setOpen(false)} onSubmit={handleSubmit}>
        <Field label="Project Name">
          <TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Green Court Apartments (New Build)" />
        </Field>
        <Field label="Property (optional)">
          <Select value={form.property} onChange={(e) => setForm({ ...form, property: e.target.value })}>
            <option value="">— None (new build, not linked to a property) —</option>
            {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
          <p className="text-xs text-slate-400 mt-1.5">Leave empty for a brand-new apartment/property. The project is tied to your organization.</p>
        </Field>
        <Field label="Budget (KSh)">
          <TextInput type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} placeholder="500000" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Start Date">
            <TextInput type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
          </Field>
          <Field label="Expected End Date">
            <TextInput type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
          </Field>
        </div>
        <Field label="Status">
          <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="Planning">Planning</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="On Hold">On Hold</option>
          </Select>
        </Field>
      </FormModal>

      <FormModal
        title={fundFor ? `Fund "${fundFor.name}"` : 'Fund Project'}
        description="Transfer cash from a bank/cash account into this project's budget. Purchases can only be approved up to the funded amount."
        open={!!fundFor}
        onClose={() => setFundFor(null)}
        onSubmit={handleFund}
        submitLabel="Transfer Funds"
      >
        {fundFor && (
          <div className="rounded-lg bg-slate-50 border border-slate-100 p-3 text-sm text-slate-600 grid grid-cols-3 gap-2">
            <div><p className="text-xs text-slate-400">Funded</p><p className="font-semibold text-emerald-600">{formatKsh(fundFor.funded || 0)}</p></div>
            <div><p className="text-xs text-slate-400">Spent</p><p className="font-semibold">{formatKsh(fundFor.spent || 0)}</p></div>
            <div><p className="text-xs text-slate-400">Available</p><p className="font-semibold">{formatKsh(fundFor.available || 0)}</p></div>
          </div>
        )}
        <Field label="Source Account (Bank / Cash)">
          <Select value={fundForm.sourceAccount} onChange={(e) => setFundForm({ ...fundForm, sourceAccount: e.target.value })}>
            <option value="">— Select account —</option>
            {sources.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.type})</option>)}
          </Select>
        </Field>
        <Field label="Amount (KSh)">
          <TextInput type="number" value={fundForm.amount} onChange={(e) => setFundForm({ ...fundForm, amount: e.target.value })} placeholder="200000" />
        </Field>
      </FormModal>
    </>
  )
}
