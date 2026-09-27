import { useState, useEffect, useCallback } from 'react'
import { MessageSquareWarning, Plus, Eye, X } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import Card from '../../components/ui/Card'
import DataTable from '../../components/ui/DataTable'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import FormModal from '../../components/patterns/FormModal'
import { Field, TextInput, TextArea, Select } from '../../components/ui/Field'
import { useToast } from '../../context/ToastContext'
import { api } from '../../api/client'

const CATEGORIES = ['General', 'Plumbing', 'Electrical', 'Structural', 'Security', 'Cleanliness', 'Noise', 'Appliance', 'Other']
const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent']
const EMPTY = { subject: '', description: '', category: 'General', priority: 'Medium' }

const statusTone = (s) => {
  const v = String(s || '').toLowerCase()
  if (v === 'resolved' || v === 'closed') return 'green'
  if (v === 'in progress') return 'blue'
  return 'orange'
}

const priorityTone = (p) => {
  const v = String(p || '').toLowerCase()
  if (v === 'urgent') return 'red'
  if (v === 'high') return 'orange'
  if (v === 'medium') return 'blue'
  return 'slate'
}

export default function TenantComplaints() {
  const { showToast } = useToast()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [viewing, setViewing] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    api.getMyComplaints()
      .then((res) => setRows(res || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const handleSubmit = async () => {
    if (!form.subject || !form.description) {
      showToast('Please add a subject and description.', 'error')
      return
    }
    try {
      await api.raiseComplaint(form)
      showToast('Your complaint has been submitted.')
      setOpen(false)
      setForm(EMPTY)
      load()
    } catch (err) {
      showToast(err.message || 'Could not submit your complaint.', 'error')
    }
  }

  const columns = [
    { key: 'date', header: 'Date', render: (r) => <span className="text-slate-600">{r.date}</span> },
    { key: 'subject', header: 'Subject', render: (r) => <span className="font-medium text-slate-800">{r.subject}</span> },
    { key: 'category', header: 'Category', render: (r) => <span className="text-slate-600">{r.category}</span> },
    { key: 'priority', header: 'Priority', render: (r) => <Badge tone={priorityTone(r.priority)}>{r.priority}</Badge> },
    { key: 'status', header: 'Status', render: (r) => <Badge tone={statusTone(r.status)}>{r.status}</Badge> },
    { key: 'actions', header: '', align: 'right', render: (r) => (
      <Button size="sm" variant="ghost" icon={Eye} onClick={() => setViewing(r)}>View</Button>
    )},
  ]

  return (
    <div>
      <PageHeader
        title="My Complaints"
        description="Report issues with your unit or property."
        actions={<Button icon={Plus} onClick={() => setOpen(true)}>Raise Complaint</Button>}
      />

      <Card padded={false} className="p-5">
        <DataTable
          loading={loading}
          columns={columns}
          rows={rows}
          searchKeys={['subject', 'category', 'status']}
          searchPlaceholder="Search complaints..."
          emptyIcon={MessageSquareWarning}
          emptyMessage="You haven't raised any complaints yet."
          pageSize={10}
        />
      </Card>

      <FormModal
        title="Raise a Complaint"
        description="Describe the issue clearly so management can act on it."
        open={open}
        onClose={() => setOpen(false)}
        onSubmit={handleSubmit}
        submitLabel="Submit Complaint"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Subject" className="sm:col-span-2">
            <TextInput value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="e.g. Leaking kitchen tap" />
          </Field>
          <Field label="Category">
            <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label="Priority">
            <Select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </Select>
          </Field>
          <Field label="Description" className="sm:col-span-2">
            <TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What's wrong, since when, and where in the unit?" />
          </Field>
        </div>
      </FormModal>

      {viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={() => setViewing(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900">Complaint Details</h2>
              <button onClick={() => setViewing(null)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">Subject</p>
                <p className="text-sm text-slate-800 font-medium">{viewing.subject}</p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Category</p>
                  <p className="text-sm text-slate-700">{viewing.category}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Priority</p>
                  <Badge tone={priorityTone(viewing.priority)}>{viewing.priority}</Badge>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Status</p>
                  <Badge tone={statusTone(viewing.status)}>{viewing.status}</Badge>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">Description</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{viewing.description}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">Raised On</p>
                <p className="text-sm text-slate-600">{viewing.date}{viewing.property ? ` - ${viewing.property}` : ''}{viewing.unit ? ` - Unit ${viewing.unit}` : ''}</p>
              </div>
              {viewing.response && (
                <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-4">
                  <p className="text-xs font-semibold text-emerald-700 mb-1">Management Response</p>
                  <p className="text-sm text-emerald-900">{viewing.response}</p>
                  {viewing.responded_at && <p className="text-xs text-emerald-600 mt-2">{String(viewing.responded_at).slice(0, 10)}</p>}
                </div>
              )}
            </div>
            <div className="p-5 border-t border-slate-100 flex justify-end">
              <Button variant="secondary" onClick={() => setViewing(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}