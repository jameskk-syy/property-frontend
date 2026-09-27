import { useState } from 'react'
import { Wrench, Plus, CheckCircle2 } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import StatCard from '../../components/ui/StatCard'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import FormModal from '../../components/patterns/FormModal'
import { Field, TextInput, Select } from '../../components/ui/Field'
import { useToast } from '../../context/ToastContext'

const initialTasks = [
  { id: 'MT-01', title: 'Fix water heater — Palm Heights 3C', reportedBy: 'Fatuma Hassan', priority: 'High', status: 'Open' },
  { id: 'MT-02', title: 'Repaint hallway — Greenview Block A', reportedBy: 'Grace Wanjiru', priority: 'Low', status: 'Scheduled' },
  { id: 'MT-03', title: 'Fix leaking tap — Riverside 12B', reportedBy: 'Samuel Kiplagat', priority: 'Medium', status: 'Open' },
  { id: 'MT-04', title: 'Replace door lock — Cedar Villas V2', reportedBy: 'James Omondi', priority: 'Medium', status: 'Completed' },
]

const PRIORITY_TONE = { High: 'red', Medium: 'orange', Low: 'blue' }

export default function CaretakerMaintenance() {
  const { showToast } = useToast()
  const [tasks, setTasks] = useState(initialTasks)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ title: '', priority: 'Medium' })

  const handleSubmit = () => {
    if (!form.title) return
    setTasks((prev) => [
      { id: `MT-${String(prev.length + 1).padStart(2, '0')}`, title: form.title, reportedBy: 'You', priority: form.priority, status: 'Open' },
      ...prev,
    ])
    showToast('Task logged.')
    setForm({ title: '', priority: 'Medium' })
    setOpen(false)
  }

  const complete = (id) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: 'Completed' } : t)))
    showToast('Task marked complete.')
  }

  return (
    <div>
      <PageHeader
        title="Maintenance Requests"
        description="Track and resolve maintenance issues reported by tenants."
        actions={<Button icon={Plus} onClick={() => setOpen(true)}>Log Task</Button>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Open Tasks" value={tasks.filter((t) => t.status === 'Open').length} icon={Wrench} tone="orange" />
        <StatCard label="Scheduled" value={tasks.filter((t) => t.status === 'Scheduled').length} icon={Wrench} tone="blue" />
        <StatCard label="Completed (30d)" value={tasks.filter((t) => t.status === 'Completed').length} icon={CheckCircle2} tone="brand" />
        <StatCard label="High Priority" value={tasks.filter((t) => t.priority === 'High').length} icon={Wrench} tone="red" />
      </div>

      <Card padded={false}>
        {tasks.map((t) => (
          <div key={t.id} className="flex items-center justify-between gap-3 p-4 border-b border-slate-50 last:border-0">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">{t.title}</p>
              <p className="text-xs text-slate-400">Reported by {t.reportedBy}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge tone={PRIORITY_TONE[t.priority]}>{t.priority}</Badge>
              <Badge>{t.status}</Badge>
              {t.status !== 'Completed' && (
                <Button variant="ghost" size="sm" onClick={() => complete(t.id)}>Mark Done</Button>
              )}
            </div>
          </div>
        ))}
      </Card>

      <FormModal
        open={open}
        onClose={() => setOpen(false)}
        title="Log Maintenance Task"
        description="Record a new maintenance issue to follow up on."
        onSubmit={handleSubmit}
        submitLabel="Log Task"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="What needs fixing?" className="sm:col-span-2">
            <TextInput required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Fix broken window — Greenview A3" />
          </Field>
          <Field label="Priority">
            <Select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
            </Select>
          </Field>
        </div>
      </FormModal>
    </div>
  )
}
