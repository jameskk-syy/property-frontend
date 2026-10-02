import { useState, useEffect, useCallback } from 'react'
import { MessageSquare, Plus, Eye, X } from 'lucide-react'
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
const EMPTY = { feedback: '', category: 'General' }

const statusTone = (s) => {
  const v = String(s || '').toLowerCase()
  if (v === 'resolved' || v === 'closed') return 'green'
  if (v === 'in progress') return 'blue'
  return 'orange'
}

export default function TenantFeedback() {
  const { showToast } = useToast()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [viewing, setViewing] = useState(null)
  const [profile, setProfile] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    api.getMyFeedback()
      .then((res) => setRows(res || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  // Load tenant profile for auto-fill info
  useEffect(() => {
    api.getMyProfile().then((res) => setProfile(res || null)).catch(() => {})
  }, [])

  const handleSubmit = async () => {
    if (!form.feedback || !form.feedback.trim()) {
      showToast('Please provide your feedback.', 'error')
      return
    }
    try {
      await api.raiseFeedback(form)
      showToast('Your feedback has been submitted.')
      setOpen(false)
      setForm(EMPTY)
      load()
    } catch (err) {
      showToast(err.message || 'Could not submit your feedback.', 'error')
    }
  }

  const columns = [
    { key: 'date', header: 'Date', render: (r) => <span className="text-slate-600">{r.date}</span> },
    { key: 'category', header: 'Category', render: (r) => <span className="text-slate-600">{r.category}</span> },
    { key: 'status', header: 'Status', render: (r) => <Badge tone={statusTone(r.status)}>{r.status}</Badge> },
    { key: 'actions', header: '', align: 'right', truncate: false, render: (r) => (
      <Button size="sm" variant="ghost" icon={Eye} onClick={() => setViewing(r)}>View</Button>
    )},
  ]

  return (
    <div>
      <PageHeader
        title="My Feedback"
        description="Share feedback or report issues with your unit or property."
        actions={<Button icon={Plus} onClick={() => setOpen(true)}>Submit Feedback</Button>}
      />

      <Card padded={false} className="p-5">
        <DataTable
          loading={loading}
          columns={columns}
          rows={rows}
          searchKeys={['feedback', 'category', 'status']}
          searchPlaceholder="Search feedback..."
          emptyIcon={MessageSquare}
          emptyMessage="You haven't submitted any feedback yet."
          pageSize={10}
        />
      </Card>

      <FormModal
        title="Submit Feedback"
        description="Share your feedback or report an issue."
        open={open}
        onClose={() => setOpen(false)}
        onSubmit={handleSubmit}
        submitLabel="Submit Feedback"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Auto-filled fields (read-only) */}
          <Field label="Property">
            <TextInput 
              value={profile?.property_name || profile?.property || '—'} 
              disabled 
              className="bg-slate-50"
            />
          </Field>
          <Field label="Unit">
            <TextInput 
              value={profile?.unit_number || profile?.unit || '—'} 
              disabled 
              className="bg-slate-50"
            />
          </Field>
          <Field label="Phone Number">
            <TextInput 
              value={profile?.phone || '—'} 
              disabled 
              className="bg-slate-50"
            />
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
              placeholder="Describe your feedback or the issue you're experiencing..."
              rows={4}
            />
          </Field>
        </div>
      </FormModal>

      {viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={() => setViewing(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900">Feedback Details</h2>
              <button onClick={() => setViewing(null)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Category</p>
                  <p className="text-sm text-slate-700">{viewing.category}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Status</p>
                  <Badge tone={statusTone(viewing.status)}>{viewing.status}</Badge>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">Feedback</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{viewing.feedback}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">Submitted On</p>
                <p className="text-sm text-slate-600">{viewing.date}{viewing.property ? ` · ${viewing.property}` : ''}{viewing.unit ? ` · Unit ${viewing.unit}` : ''}</p>
              </div>
              {viewing.response && (
                <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-4">
                  <p className="text-xs font-semibold text-emerald-700 mb-1">Response</p>
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
