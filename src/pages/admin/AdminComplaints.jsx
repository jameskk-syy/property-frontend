import { useState, useEffect, useCallback } from 'react'
import { MessageSquareWarning, Clock, Wrench, CheckCircle2, Building } from 'lucide-react'
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

const STATUSES = ['Open', 'In Progress', 'Resolved', 'Closed']

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

export default function AdminComplaints() {
  const { showToast } = useToast()
  const [rows, setRows] = useState([])
  const [stats, setStats] = useState(null)
  const [properties, setProperties] = useState([])
  const [tenants, setTenants] = useState([])
  const [loading, setLoading] = useState(true)
  const [propertyFilter, setPropertyFilter] = useState('')
  const [tenantFilter, setTenantFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [active, setActive] = useState(null) // complaint being responded to
  const [respForm, setRespForm] = useState({ response: '', status: '' })

  const load = useCallback(() => {
    setLoading(true)
    const filters = {
      property: propertyFilter || null,
      tenant: tenantFilter || null,
      status: statusFilter || null,
    }
    Promise.all([
      api.getComplaints(filters),
      api.getComplaintStats({ property: propertyFilter || null, tenant: tenantFilter || null }),
    ]).then(([list, st]) => {
      setRows(list || [])
      setStats(st || null)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [propertyFilter, tenantFilter, statusFilter])

  useEffect(() => { load() }, [load])

  // Load filter option lists once.
  useEffect(() => {
    api.getProperties().then((res) => setProperties(res || [])).catch(() => {})
  }, [])
  useEffect(() => {
    api.getComplaintTenants({ property: propertyFilter || null }).then((res) => setTenants(res || [])).catch(() => {})
  }, [propertyFilter])

  const openRespond = (row) => {
    setActive(row)
    setRespForm({ response: row.response || '', status: row.status || 'Open' })
  }

  const handleRespond = async () => {
    try {
      await api.respondComplaint(active.id, { response: respForm.response || null, status: respForm.status || null })
      showToast('Complaint updated.')
      setActive(null)
      load()
    } catch (err) {
      showToast(err.message || 'Could not update the complaint.', 'error')
    }
  }

  return (
    <div>
      <PageHeader
        title="Tenant Complaints"
        description="Complaints raised by tenants. Filter by property or tenant, then respond and update status."
        actions={
          <FilterDrawer 
            activeCount={[propertyFilter, tenantFilter, statusFilter].filter(Boolean).length}
            onClear={() => {
              setPropertyFilter('')
              setTenantFilter('')
              setStatusFilter('')
            }}
          >
            <FilterItem label="Property">
              <div className="flex items-center gap-1.5">
                <Building className="w-4 h-4 text-slate-400 hidden lg:block" />
                <Select value={propertyFilter} onChange={(e) => { setPropertyFilter(e.target.value); setTenantFilter('') }} className="w-full lg:w-44 text-sm py-1.5">
                  <option value="">All properties</option>
                  {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </Select>
              </div>
            </FilterItem>
            <FilterItem label="Tenant">
              <Select value={tenantFilter} onChange={(e) => setTenantFilter(e.target.value)} className="w-full lg:w-44 text-sm py-1.5">
                <option value="">All tenants</option>
                {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Select>
            </FilterItem>
            <FilterItem label="Status">
              <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full lg:w-36 text-sm py-1.5">
                <option value="">All statuses</option>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
            </FilterItem>
          </FilterDrawer>
        }
      />

      {loading ? (
        <div className="mb-6"><StatCardsSkeleton count={4} /></div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Total" value={stats?.total || 0} icon={MessageSquareWarning} />
          <StatCard label="Open" value={stats?.open || 0} icon={Clock} tone="orange" />
          <StatCard label="In Progress" value={stats?.in_progress || 0} icon={Wrench} tone="blue" />
          <StatCard label="Resolved" value={(stats?.resolved || 0) + (stats?.closed || 0)} icon={CheckCircle2} tone="brand" />
        </div>
      )}

      <Card padded={false} className="p-5">
        <DataTable
          loading={loading}
          columns={[
            { key: 'tenantName', header: 'Tenant' },
            { key: 'propertyName', header: 'Property', render: (r) => (
              <div>
                <p className="text-slate-700">{r.propertyName || '—'}</p>
                {r.unit && <p className="text-xs text-slate-400">Unit {r.unit}</p>}
              </div>
            ) },
            { key: 'subject', header: 'Complaint', render: (r) => (
              <div>
                <p className="font-medium text-slate-800">{r.subject}</p>
                <p className="text-xs text-slate-400">{r.category}</p>
              </div>
            ) },
            { key: 'priority', header: 'Priority', render: (r) => <Badge tone={prioTone(r.priority)}>{r.priority}</Badge> },
            { key: 'status', header: 'Status', render: (r) => <Badge tone={statusTone(r.status)}>{r.status}</Badge> },
            { key: 'date', header: 'Raised' },
            { key: 'actions', header: '', render: (r) => (
              <Button size="sm" variant="secondary" onClick={() => openRespond(r)}>
                {r.response ? 'Update' : 'Respond'}
              </Button>
            ) },
          ]}
          rows={rows}
          searchKeys={['tenantName', 'propertyName', 'subject', 'category']}
          searchPlaceholder="Search complaints…"
          emptyMessage="No complaints match these filters."
        />
      </Card>

      <FormModal
        title={active ? `Complaint — ${active.subject}` : 'Complaint'}
        description={active ? `${active.tenantName}${active.propertyName ? ` · ${active.propertyName}` : ''}${active.unit ? ` · Unit ${active.unit}` : ''}` : ''}
        open={!!active}
        onClose={() => setActive(null)}
        onSubmit={handleRespond}
        submitLabel="Save"
      >
        {active && (
          <div className="rounded-lg bg-slate-50 border border-slate-100 p-3 text-sm text-slate-600">
            {active.description}
          </div>
        )}
        <Field label="Status">
          <Select value={respForm.status} onChange={(e) => setRespForm({ ...respForm, status: e.target.value })}>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </Field>
        <Field label="Response to tenant">
          <TextArea value={respForm.response} onChange={(e) => setRespForm({ ...respForm, response: e.target.value })} placeholder="Let the tenant know what will be done…" />
        </Field>
      </FormModal>
    </div>
  )
}
