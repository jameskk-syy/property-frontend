import { useState, useEffect, useCallback } from 'react'
import { MessageSquare, Plus, Clock, CheckCircle2, Building, User, Users } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import StatCard from '../../components/ui/StatCard'
import Card from '../../components/ui/Card'
import DataTable from '../../components/ui/DataTable'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import FormModal from '../../components/patterns/FormModal'
import FilterDrawer, { FilterItem } from '../../components/patterns/FilterDrawer'
import { Field, TextArea, Select } from '../../components/ui/Field'
import { StatCardsSkeleton } from '../../components/ui/Skeleton'
import { useToast } from '../../context/ToastContext'
import { api } from '../../api/client'

const CATEGORIES = ['General', 'Plumbing', 'Electrical', 'Structural', 'Security', 'Cleanliness', 'Noise', 'Appliance', 'Other']
const STATUSES = ['Open', 'In Progress', 'Resolved', 'Closed']
const RAISED_BY_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'Tenant', label: 'Tenants' },
  { value: 'Caretaker', label: 'Caretaker (Me)' },
]

const statusTone = (s) => {
  const v = String(s || '').toLowerCase()
  if (v === 'resolved' || v === 'closed') return 'green'
  if (v === 'in progress') return 'blue'
  return 'orange'
}

const prioTone = (p) => {
  const v = String(p || '').toLowerCase()
  if (v === 'urgent') return 'red'
  if (v === 'high') return 'orange'
  return 'slate'
}

const EMPTY_FORM = { feedback: '', property: '', category: 'General' }

export default function CaretakerFeedback() {
  const { showToast } = useToast()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [properties, setProperties] = useState([])
  
  // Filters
  const [raisedByFilter, setRaisedByFilter] = useState('')
  const [propertyFilter, setPropertyFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  
  // Raise feedback modal
  const [openRaise, setOpenRaise] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  
  // Respond modal
  const [active, setActive] = useState(null)
  const [respForm, setRespForm] = useState({ response: '', status: '' })

  // Calculate stats from rows
  const stats = {
    total: rows.length,
    open: rows.filter((r) => r.status === 'Open').length,
    in_progress: rows.filter((r) => r.status === 'In Progress').length,
    resolved: rows.filter((r) => r.status === 'Resolved' || r.status === 'Closed').length,
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.getCaretakerFeedback()
      setRows(data || [])
    } catch (err) {
      console.error('Failed to load feedback:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Load properties for the raise form
  useEffect(() => {
    api.getMyProperties().then((res) => setProperties(res || [])).catch(() => {})
  }, [])

  // Filter rows
  const filteredRows = rows.filter((r) => {
    if (raisedByFilter && r.raisedBy !== raisedByFilter) return false
    if (propertyFilter && r.property !== propertyFilter) return false
    if (statusFilter && r.status !== statusFilter) return false
    return true
  })

  const handleRaise = async () => {
    if (!form.feedback || !form.feedback.trim()) {
      showToast('Please provide your feedback.', 'error')
      return
    }
    try {
      await api.caretakerRaiseFeedback({
        feedback: form.feedback,
        property: form.property || null,
        category: form.category,
      })
      showToast('Feedback submitted successfully.')
      setOpenRaise(false)
      setForm(EMPTY_FORM)
      load()
    } catch (err) {
      showToast(err.message || 'Could not submit feedback.', 'error')
    }
  }

  const openRespond = (row) => {
    setActive(row)
    setRespForm({ response: row.response || '', status: row.status || 'Open' })
  }

  const handleRespond = async () => {
    try {
      await api.respondFeedback(active.id, { response: respForm.response || null, status: respForm.status || null })
      showToast('Feedback updated.')
      setActive(null)
      load()
    } catch (err) {
      showToast(err.message || 'Could not update feedback.', 'error')
    }
  }

  const columns = [
    { key: 'raisedBy', header: 'From', render: (r) => (
      <div className="flex items-center gap-2">
        {r.raisedBy === 'Caretaker' ? (
          <Badge tone="blue">Me</Badge>
        ) : (
          <Badge tone="slate">Tenant</Badge>
        )}
      </div>
    ) },
    { key: 'tenantName', header: 'Tenant', render: (r) => (
      <div>
        <p className="text-slate-700">{r.tenantName || '—'}</p>
        {r.mobileNumber && <p className="text-xs text-slate-400">{r.mobileNumber}</p>}
      </div>
    ) },
    { key: 'propertyName', header: 'Property', render: (r) => (
      <div>
        <p className="text-slate-700">{r.propertyName || '—'}</p>
        {r.unit && <p className="text-xs text-slate-400">Unit {r.unit}</p>}
      </div>
    ) },
    { key: 'feedback', header: 'Feedback', render: (r) => (
      <p className="font-medium text-slate-800 line-clamp-2 max-w-xs">{r.feedback}</p>
    ) },
    { key: 'category', header: 'Category', render: (r) => <span className="text-slate-600">{r.category}</span> },
    { key: 'priority', header: 'Priority', render: (r) => <Badge tone={prioTone(r.priority)}>{r.priority}</Badge> },
    { key: 'status', header: 'Status', render: (r) => <Badge tone={statusTone(r.status)}>{r.status}</Badge> },
    { key: 'date', header: 'Date' },
    { key: 'actions', header: '', render: (r) => (
      <Button size="sm" variant="secondary" onClick={() => openRespond(r)}>
        {r.response ? 'Update' : 'Respond'}
      </Button>
    ) },
  ]

  return (
    <div>
      <PageHeader
        title="Feedback"
        description="View and respond to feedback from tenants, or raise your own observations."
        actions={
          <div className="flex items-center gap-2">
            <FilterDrawer
              activeCount={[raisedByFilter, propertyFilter, statusFilter].filter(Boolean).length}
              onClear={() => {
                setRaisedByFilter('')
                setPropertyFilter('')
                setStatusFilter('')
              }}
            >
              <FilterItem label="Raised By">
                <Select value={raisedByFilter} onChange={(e) => setRaisedByFilter(e.target.value)} className="w-full text-sm py-1.5">
                  {RAISED_BY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </Select>
              </FilterItem>
              <FilterItem label="Property">
                <Select value={propertyFilter} onChange={(e) => setPropertyFilter(e.target.value)} className="w-full text-sm py-1.5">
                  <option value="">All properties</option>
                  {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </Select>
              </FilterItem>
              <FilterItem label="Status">
                <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full text-sm py-1.5">
                  <option value="">All statuses</option>
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </Select>
              </FilterItem>
            </FilterDrawer>
            <Button icon={Plus} onClick={() => setOpenRaise(true)}>Raise Feedback</Button>
          </div>
        }
      />

      {loading ? (
        <div className="mb-6"><StatCardsSkeleton count={4} /></div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Total" value={stats.total} icon={MessageSquare} />
          <StatCard label="Open" value={stats.open} icon={Clock} tone="orange" />
          <StatCard label="In Progress" value={stats.in_progress} icon={Users} tone="blue" />
          <StatCard label="Resolved" value={stats.resolved} icon={CheckCircle2} tone="brand" />
        </div>
      )}

      <Card padded={false} className="p-5">
        <DataTable
          loading={loading}
          columns={columns}
          rows={filteredRows}
          searchKeys={['feedback', 'tenantName', 'propertyName', 'category']}
          searchPlaceholder="Search feedback..."
          emptyIcon={MessageSquare}
          emptyMessage="No feedback matches these filters."
          pageSize={10}
        />
      </Card>

      {/* Raise Feedback Modal */}
      <FormModal
        title="Raise Feedback"
        description="Log an observation or issue for a property."
        open={openRaise}
        onClose={() => setOpenRaise(false)}
        onSubmit={handleRaise}
        submitLabel="Submit"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Property">
            <Select value={form.property} onChange={(e) => setForm({ ...form, property: e.target.value })}>
              <option value="">Select property</option>
              {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </Field>
          <Field label="Category">
            <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label="Feedback" className="sm:col-span-2">
            <TextArea 
              value={form.feedback} 
              onChange={(e) => setForm({ ...form, feedback: e.target.value })} 
              placeholder="Describe the issue or observation..."
              rows={4}
            />
          </Field>
        </div>
      </FormModal>

      {/* Respond Modal */}
      <FormModal
        title={active ? 'Feedback Details' : 'Feedback'}
        description={active ? `${active.raisedBy === 'Caretaker' ? 'Raised by you' : `From ${active.tenantName || 'Tenant'}`}${active.propertyName ? ` · ${active.propertyName}` : ''}${active.unit ? ` · Unit ${active.unit}` : ''}` : ''}
        open={!!active}
        onClose={() => setActive(null)}
        onSubmit={handleRespond}
        submitLabel="Save"
      >
        {active && (
          <>
            <div className="rounded-lg bg-slate-50 border border-slate-100 p-3 text-sm text-slate-600 mb-4 whitespace-pre-wrap">
              {active.feedback}
            </div>
            {active.mobileNumber && (
              <p className="text-sm text-slate-500 mb-4">
                <span className="font-medium">Mobile:</span> {active.mobileNumber}
              </p>
            )}
          </>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Status">
            <Select value={respForm.status} onChange={(e) => setRespForm({ ...respForm, status: e.target.value })}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </Field>
          <Field label="Response" className="sm:col-span-2">
            <TextArea 
              value={respForm.response} 
              onChange={(e) => setRespForm({ ...respForm, response: e.target.value })} 
              placeholder="Add a response or update..."
              rows={3}
            />
          </Field>
        </div>
      </FormModal>
    </div>
  )
}
