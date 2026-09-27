import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { UserCog, Building2, Plus, Eye, Phone, Mail, Hash, Upload } from 'lucide-react'
import ListPageTemplate from '../../components/patterns/ListPageTemplate'
import FormModal from '../../components/patterns/FormModal'
import ImportLandlordsModal from '../../components/patterns/ImportLandlordsModal'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Avatar from '../../components/ui/Avatar'
import { Field, TextInput } from '../../components/ui/Field'
import MultiSelect from '../../components/ui/MultiSelect'
import { useToast } from '../../context/ToastContext'
import { api } from '../../api/client'

export default function LandlordManagement() {
  const [searchParams] = useSearchParams()
  const { showToast } = useToast()
  const [landlords, setLandlords] = useState([])
  const [pagination, setPagination] = useState(null)
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(searchParams.get('new') === 'true')
  const [importOpen, setImportOpen] = useState(false)
  const [detail, setDetail] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(8)
  const [form, setForm] = useState({
    landlordId: '',
    name: '',
    phone: '',
    email: '',
    properties: []
  })

  // Fetch landlords with pagination
  const fetchLandlords = useCallback(async (page = 1, size = 8, search = '') => {
    setLoading(true)
    try {
      const res = await api.getLandlords({ page, pageSize: size, search })
      if (res && res.data) {
        setLandlords(res.data)
        setPagination(res.pagination)
      } else if (Array.isArray(res)) {
        // Backward compatibility
        setLandlords(res)
        setPagination(null)
      }
    } catch (err) {
      console.error('Failed to fetch landlords:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    fetchLandlords(1, pageSize, '')
    api.getProperties().then((res) => {
      if (res) setProperties(res)
    }).catch(() => {})
  }, [fetchLandlords, pageSize])

  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setOpen(true)
    }
  }, [searchParams])

  // Handle page change
  const handlePageChange = useCallback((newPage, newPageSize) => {
    if (newPageSize && newPageSize !== pageSize) {
      setPageSize(newPageSize)
      setCurrentPage(1)
      fetchLandlords(1, newPageSize, searchQuery)
    } else {
      setCurrentPage(newPage)
      fetchLandlords(newPage, pageSize, searchQuery)
    }
  }, [fetchLandlords, searchQuery, pageSize])

  // Handle search
  const handleSearch = useCallback((query) => {
    setSearchQuery(query)
    setCurrentPage(1)
    fetchLandlords(1, pageSize, query)
  }, [fetchLandlords, pageSize])

  const resetForm = () => setForm({
    landlordId: '', name: '', phone: '', email: '', properties: []
  })

  const handleSubmit = async () => {
    if (!form.name || !form.phone || !form.email) {
      showToast('Landlord name, phone number and email address are required.')
      return
    }
    const selectedIds = form.properties

    try {
      const created = await api.createLandlord({
        landlord_name: form.name,
        phone_number: form.phone,
        email: form.email,
        status: 'Active'
      })

      const landlordId = created?.name || form.name
      await Promise.all(
        selectedIds.map((propId) =>
          api.assignLandlordToProperty(propId, landlordId).catch((e) =>
            console.warn('Assign landlord to property failed:', e.message)
          )
        )
      )

      showToast(`${form.name} added as a landlord.`)
      resetForm()
      setOpen(false)
      // Refresh list
      fetchLandlords(currentPage, pageSize, searchQuery)
    } catch (err) {
      showToast(err?.message || 'Could not save the landlord. Please try again.', 'error')
    }
  }

  const handleBulkImport = async (landlordRows) => {
    const result = await api.bulkCreateLandlords(landlordRows)
    const okCount = result.created.length
    const failCount = result.failed.length
    if (okCount > 0 && failCount === 0) {
      showToast(`Imported ${okCount} landlord${okCount === 1 ? '' : 's'} successfully!`)
    } else if (okCount > 0 && failCount > 0) {
      showToast(`Imported ${okCount}, but ${failCount} failed. Check details and retry.`)
    } else if (failCount > 0) {
      showToast('Could not save landlords to the server.')
    }
    // Refresh list
    fetchLandlords(1, pageSize, searchQuery)
  }

  // Build server pagination props
  const serverPagination = pagination ? {
    page: pagination.page,
    pageSize: pagination.pageSize,
    total: pagination.total,
    hasNext: pagination.hasNext,
    hasPrev: pagination.hasPrev,
  } : null

  return (
    <>
      <ListPageTemplate
        title="Landlord Management"
        description="Manage property owners and their contact details."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" icon={Upload} onClick={() => setImportOpen(true)}>Import</Button>
            <Button icon={Plus} onClick={() => setOpen(true)}>Add Landlord</Button>
          </div>
        }
        loading={loading}
        stats={[
          { label: 'Total Landlords', value: pagination?.total || landlords.length, icon: UserCog },
          { label: 'Properties Managed', value: landlords.reduce((s, l) => s + (l.properties || 0), 0), icon: Building2, tone: 'blue' },
          { label: 'Units Managed', value: landlords.reduce((s, l) => s + (l.units || 0), 0), icon: Building2, tone: 'brand' },
        ]}
        columns={[
          { key: 'name', header: 'Landlord', render: (r) => (
            <div className="flex items-center gap-2.5">
              <Avatar name={r.name} size={30} />
              <div>
                <p className="font-medium text-slate-800">{r.name}</p>
                <p className="text-xs text-slate-400">{r.phone}</p>
              </div>
            </div>
          ) },
          { key: 'email', header: 'Email', render: (r) => r.email || '—' },
          { key: 'properties', header: 'Number of Properties', render: (r) => (
            <Badge tone="blue">{r.properties || 0}</Badge>
          ) },
          { key: 'units', header: 'Units' },
          { key: 'status', header: 'Status', render: (r) => <Badge>{r.status}</Badge> },
          { key: 'actions', header: '', render: (r) => (
            <Button variant="ghost" size="sm" icon={Eye} onClick={() => setDetail(r)}>View</Button>
          ) },
        ]}
        rows={landlords}
        searchPlaceholder="Search landlords…"
        serverPagination={serverPagination}
        onPageChange={handlePageChange}
        onSearch={handleSearch}
      />

      <FormModal
        open={open}
        onClose={() => { setOpen(false); resetForm() }}
        title="Add Landlord"
        description="Register a new property owner."
        onSubmit={handleSubmit}
        submitLabel="Add Landlord"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Landlord ID">
            <TextInput
              value={form.landlordId}
              onChange={(e) => setForm({ ...form, landlordId: e.target.value })}
              placeholder="e.g. L-01 (leave blank to auto-generate)"
            />
          </Field>
          <Field label="Landlord name">
            <TextInput required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Susan Njoroge" />
          </Field>
          <Field label="Phone number">
            <TextInput required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+254 7XX XXX XXX" />
          </Field>
          <Field label="Email address">
            <TextInput required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="landlord@email.com" />
          </Field>
          <Field label="Properties owned (optional)" className="sm:col-span-2">
            <MultiSelect
              options={properties.map((p) => ({ value: p.id, label: p.name }))}
              value={form.properties}
              onChange={(vals) => setForm({ ...form, properties: vals })}
              placeholder="Optionally link one or more properties…"
            />
          </Field>
        </div>
      </FormModal>

      <ImportLandlordsModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={handleBulkImport}
      />

      {/* Landlord details */}
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title="Landlord Details"
        size="lg"
      >
        {detail && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <Avatar name={detail.name} size={52} />
              <div>
                <p className="text-lg font-semibold text-slate-900">{detail.name}</p>
                <Badge tone={detail.status === 'Active' ? 'green' : 'red'}>{detail.status || 'Active'}</Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              <DetailRow icon={Hash} label="Landlord ID" value={detail.id} />
              <DetailRow icon={Phone} label="Phone Number" value={detail.phone} />
              <DetailRow icon={Mail} label="Email Address" value={detail.email} />
              <DetailRow icon={Building2} label="Number of Properties" value={detail.properties ?? 0} />
              <DetailRow icon={Building2} label="Units Managed" value={detail.units ?? 0} />
            </div>

            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">Properties Owned</p>
              {detail.propertyNames && detail.propertyNames.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {detail.propertyNames.map((name) => (
                    <span key={name} className="text-xs font-medium px-2 py-1 rounded bg-slate-100 text-slate-700">
                      {name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">No linked properties</p>
              )}
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-sm font-medium text-slate-700">{value ?? '—'}</p>
      </div>
    </div>
  )
}
