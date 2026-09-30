import { useState, useEffect, useCallback } from 'react'
import { MessageSquare, Clock, CheckCircle2, Building, User, Users } from 'lucide-react'
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
const RAISED_BY_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'Tenant', label: 'Tenants' },
  { value: 'Caretaker', label: 'Caretakers' },
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

export default function AdminFeedback() {
  const { showToast } = useToast()
  const [rows, setRows] = useState([])
  const [pagination, setPagination] = useState(null)
  const [stats, setStats] = useState(null)
  const [properties, setProperties] = useState([])
  const [tenants, setTenants] = useState([])
  const [caretakers, setCaretakers] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Filters
  const [propertyFilter, setPropertyFilter] = useState('')
  const [tenantFilter, setTenantFilter] = useState('')
  const [caretakerFilter, setCaretakerFilter] = useState('')
  const [raisedByFilter, setRaisedByFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(8)
  
  // Respond modal
  const [active, setActive] = useState(null)
  const [respForm, setRespForm] = useState({ response: '', status: '' })

  // Fetch feedback with pagination
  const fetchFeedback = useCallback(async (page = 1, size = 8, search = '') => {
    setLoading(true)
    const filters = {
      property: propertyFilter || null,
      tenant: tenantFilter || null,
      caretaker: caretakerFilter || null,
      raisedBy: raisedByFilter || null,
      status: statusFilter || null,
      search: search || null,
      page,
      pageSize: size,
    }
    try {
      const [result, st] = await Promise.all([
        api.getFeedback(filters),
        api.getFeedbackStats({ 
          property: propertyFilter || null, 
          tenant: tenantFilter || null,
          caretaker: caretakerFilter || null,
          raisedBy: raisedByFilter || null,
        }),
      ])
      if (result && result.data) {
        setRows(result.data)
        setPagination(result.pagination)
      } else if (Array.isArray(result)) {
        setRows(result)
        setPagination(null)
      }
      setStats(st || null)
    } catch (err) {
      console.error('Failed to fetch feedback:', err)
    } finally {
      setLoading(false)
    }
  }, [propertyFilter, tenantFilter, caretakerFilter, raisedByFilter, statusFilter])

  // Initial load and when filters change
  useEffect(() => {
    fetchFeedback(1, pageSize, searchQuery)
    setCurrentPage(1)
  }, [fetchFeedback, pageSize, propertyFilter, tenantFilter, caretakerFilter, raisedByFilter, statusFilter])

  // Load filter option lists
  useEffect(() => {
    api.getProperties().then((res) => setProperties(res || [])).catch(() => {})
  }, [])
  
  useEffect(() => {
    api.getFeedbackTenants({ property: propertyFilter || null }).then((res) => setTenants(res || [])).catch(() => {})
  }, [propertyFilter])

  useEffect(() => {
    api.getFeedbackCaretakers({ property: propertyFilter || null }).then((res) => setCaretakers(res || [])).catch(() => {})
  }, [propertyFilter])

  // Handle page change
  const handlePageChange = useCallback((newPage, newPageSize) => {
    if (newPageSize && newPageSize !== pageSize) {
      setPageSize(newPageSize)
      setCurrentPage(1)
      fetchFeedback(1, newPageSize, searchQuery)
    } else {
      setCurrentPage(newPage)
      fetchFeedback(newPage, pageSize, searchQuery)
    }
  }, [fetchFeedback, searchQuery, pageSize])

  // Handle search
  const handleSearch = useCallback((query) => {
    setSearchQuery(query)
    setCurrentPage(1)
    fetchFeedback(1, pageSize, query)
  }, [fetchFeedback, pageSize])

  const openRespond = (row) => {
    setActive(row)
    setRespForm({ response: row.response || '', status: row.status || 'Open' })
  }

  const handleRespond = async () => {
    try {
      await api.respondFeedback(active.id, { response: respForm.response || null, status: respForm.status || null })
      showToast('Feedback updated.')
      setActive(null)
      fetchFeedback(currentPage, pageSize, searchQuery)
    } catch (err) {
      showToast(err.message || 'Could not update the feedback.', 'error')
    }
  }

  // Clear all filters
  const clearFilters = () => {
    setPropertyFilter('')
    setTenantFilter('')
    setCaretakerFilter('')
    setRaisedByFilter('')
    setStatusFilter('')
  }

  // Build server pagination props
  const serverPagination = pagination ? {
    page: pagination.page,
    pageSize: pagination.pageSize,
    total: pagination.total,
    hasNext: pagination.hasNext,
    hasPrev: pagination.hasPrev,
  } : null

  const activeFilterCount = [propertyFilter, tenantFilter, caretakerFilter, raisedByFilter, statusFilter].filter(Boolean).length

  return (
    <div>
      <PageHeader
        title="Feedback"
        description="Feedback raised by tenants and caretakers. Filter by property, tenant, caretaker, or who raised it."
        actions={
          <FilterDrawer 
            activeCount={activeFilterCount}
            onClear={clearFilters}
          >
            <FilterItem label="Raised By">
              <Select value={raisedByFilter} onChange={(e) => setRaisedByFilter(e.target.value)} className="w-full lg:w-36 text-sm py-1.5">
                {RAISED_BY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
            </FilterItem>
            <FilterItem label="Property">
              <div className="flex items-center gap-1.5">
                <Building className="w-4 h-4 text-slate-400 hidden lg:block" />
                <Select value={propertyFilter} onChange={(e) => { setPropertyFilter(e.target.value); setTenantFilter(''); setCaretakerFilter('') }} className="w-full lg:w-44 text-sm py-1.5">
                  <option value="">All properties</option>
                  {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </Select>
              </div>
            </FilterItem>
            <FilterItem label="Tenant">
              <div className="flex items-center gap-1.5">
                <User className="w-4 h-4 text-slate-400 hidden lg:block" />
                <Select value={tenantFilter} onChange={(e) => setTenantFilter(e.target.value)} className="w-full lg:w-44 text-sm py-1.5">
                  <option value="">All tenants</option>
                  {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </Select>
              </div>
            </FilterItem>
            <FilterItem label="Caretaker">
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-slate-400 hidden lg:block" />
                <Select value={caretakerFilter} onChange={(e) => setCaretakerFilter(e.target.value)} className="w-full lg:w-44 text-sm py-1.5">
                  <option value="">All caretakers</option>
                  {caretakers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </div>
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
          <StatCard label="Total" value={stats?.total || 0} icon={MessageSquare} />
          <StatCard label="Open" value={stats?.open || 0} icon={Clock} tone="orange" />
          <StatCard label="In Progress" value={stats?.in_progress || 0} icon={Users} tone="blue" />
          <StatCard label="Resolved" value={(stats?.resolved || 0) + (stats?.closed || 0)} icon={CheckCircle2} tone="brand" />
        </div>
      )}

      <Card padded={false} className="p-5">
        <DataTable
          loading={loading}
          columns={[
            { key: 'raisedBy', header: 'From', render: (r) => (
              <Badge tone={r.raisedBy === 'Caretaker' ? 'blue' : 'slate'}>{r.raisedBy}</Badge>
            ) },
            { key: 'tenantName', header: 'Tenant', render: (r) => (
              <div>
                <p className="text-slate-700">{r.tenantName || '—'}</p>
                {r.mobileNumber && <p className="text-xs text-slate-400">{r.mobileNumber}</p>}
              </div>
            ) },
            { key: 'caretakerName', header: 'Caretaker', render: (r) => (
              <span className="text-slate-600">{r.caretakerName || '—'}</span>
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
            { key: 'priority', header: 'Priority', render: (r) => <Badge tone={prioTone(r.priority)}>{r.priority}</Badge> },
            { key: 'status', header: 'Status', render: (r) => <Badge tone={statusTone(r.status)}>{r.status}</Badge> },
            { key: 'date', header: 'Date' },
            { key: 'actions', header: '', render: (r) => (
              <Button size="sm" variant="secondary" onClick={() => openRespond(r)}>
                {r.response ? 'Update' : 'Respond'}
              </Button>
            ) },
          ]}
          rows={rows}
          searchPlaceholder="Search feedback..."
          emptyMessage="No feedback matches these filters."
          serverPagination={serverPagination}
          onPageChange={handlePageChange}
          onSearch={handleSearch}
        />
      </Card>

      <FormModal
        title={active ? 'Feedback Details' : 'Feedback'}
        description={active ? `${active.raisedBy === 'Caretaker' ? `Raised by ${active.caretakerName || 'Caretaker'}` : `From ${active.tenantName || 'Tenant'}`}${active.propertyName ? ` · ${active.propertyName}` : ''}${active.unit ? ` · Unit ${active.unit}` : ''}` : ''}
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
              placeholder="Add a response..."
              rows={3}
            />
          </Field>
        </div>
      </FormModal>
    </div>
  )
}
