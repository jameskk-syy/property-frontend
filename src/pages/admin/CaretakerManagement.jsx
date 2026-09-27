import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ShieldCheck, Plus, Eye, Upload, Phone, Mail, Hash, Building2 } from 'lucide-react'
import ListPageTemplate from '../../components/patterns/ListPageTemplate'
import FormModal from '../../components/patterns/FormModal'
import ImportCaretakersModal from '../../components/patterns/ImportCaretakersModal'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Avatar from '../../components/ui/Avatar'
import { Field, TextInput } from '../../components/ui/Field'
import MultiSelect from '../../components/ui/MultiSelect'
import { useToast } from '../../context/ToastContext'
import { api } from '../../api/client'

export default function CaretakerManagement() {
  const [searchParams] = useSearchParams()
  const { showToast } = useToast()
  const [caretakers, setCaretakers] = useState([])
  const [pagination, setPagination] = useState(null)
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(searchParams.get('new') === 'true')
  const [importOpen, setImportOpen] = useState(false)
  const [detail, setDetail] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(8)
  const [form, setForm] = useState({ caretakerId: '', name: '', phone: '', email: '', properties: [] })

  // Fetch caretakers with pagination
  const fetchCaretakers = useCallback(async (page = 1, size = 8, search = '') => {
    setLoading(true)
    try {
      const res = await api.getCaretakers({ page, pageSize: size, search })
      if (res && res.data) {
        setCaretakers(res.data)
        setPagination(res.pagination)
      } else if (Array.isArray(res)) {
        setCaretakers(res)
        setPagination(null)
      }
    } catch (err) {
      console.error('Failed to fetch caretakers:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    fetchCaretakers(1, pageSize, '')
    api.getProperties().then((res) => {
      if (res) setProperties(res)
    }).catch(() => {})
  }, [fetchCaretakers, pageSize])

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
      fetchCaretakers(1, newPageSize, searchQuery)
    } else {
      setCurrentPage(newPage)
      fetchCaretakers(newPage, pageSize, searchQuery)
    }
  }, [fetchCaretakers, searchQuery, pageSize])

  // Handle search
  const handleSearch = useCallback((query) => {
    setSearchQuery(query)
    setCurrentPage(1)
    fetchCaretakers(1, pageSize, query)
  }, [fetchCaretakers, pageSize])

  const resetForm = () => setForm({ caretakerId: '', name: '', phone: '', email: '', properties: [] })

  const handleSubmit = async () => {
    if (!form.name || !form.phone) {
      showToast('Caretaker name and phone number are required.')
      return
    }
    const selectedIds = form.properties

    try {
      const created = await api.createCaretaker({
        caretaker_name: form.name,
        phone_number: form.phone,
        email: form.email,
        status: 'Active'
      })
      const caretakerId = created?.name || form.name
      await Promise.all(
        selectedIds.map((propId) =>
          api.assignCaretakerToProperty(propId, caretakerId).catch((e) =>
            console.warn('Assign caretaker to property failed:', e.message)
          )
        )
      )

      showToast(`${form.name} added as a caretaker.`)
      resetForm()
      setOpen(false)
      // Refresh list
      fetchCaretakers(currentPage, pageSize, searchQuery)
    } catch (err) {
      showToast(err?.message || 'Could not save the caretaker. Please try again.', 'error')
    }
  }

  const handleBulkImport = async (caretakerRows) => {
    const result = await api.bulkCreateCaretakers(caretakerRows)
    const okCount = result.created.length
    const failCount = result.failed.length
    if (okCount > 0 && failCount === 0) {
      showToast(`Imported ${okCount} caretaker${okCount === 1 ? '' : 's'} successfully!`)
    } else if (okCount > 0 && failCount > 0) {
      showToast(`Imported ${okCount}, but ${failCount} failed. Check details and retry.`)
    } else {
      showToast('Could not save caretakers to the server.')
    }
    // Refresh list
    fetchCaretakers(1, pageSize, searchQuery)
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
        title="Caretaker Administration"
        description="Manage on-site caretakers and which properties they oversee."
        loading={loading}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" icon={Upload} onClick={() => setImportOpen(true)}>Import</Button>
            <Button icon={Plus} onClick={() => setOpen(true)}>Add Caretaker</Button>
          </div>
        }
        stats={[
          { label: 'Total Caretakers', value: pagination?.total || caretakers.length, icon: ShieldCheck },
          { label: 'Active', value: caretakers.filter((c) => c.status === 'Active').length, icon: ShieldCheck, tone: 'brand' },
          { label: 'On Leave', value: caretakers.filter((c) => c.status === 'On Leave').length, icon: ShieldCheck, tone: 'orange' },
        ]}
        columns={[
          { key: 'name', header: 'Caretaker', render: (r) => (
            <div className="flex items-center gap-2.5">
              <Avatar name={r.name} size={30} />
              <p className="font-medium text-slate-800">{r.name}</p>
            </div>
          ) },
          { key: 'phone', header: 'Phone' },
          { key: 'email', header: 'Email', render: (r) => r.email || '—' },
          { key: 'properties', header: 'Assigned Properties', render: (r) => r.properties || '—' },
          { key: 'status', header: 'Status', render: (r) => <Badge>{r.status}</Badge> },
          { key: 'actions', header: '', render: (r) => (
            <Button variant="ghost" size="sm" icon={Eye} onClick={() => setDetail(r)}>View</Button>
          ) },
        ]}
        rows={caretakers}
        searchPlaceholder="Search caretakers…"
        serverPagination={serverPagination}
        onPageChange={handlePageChange}
        onSearch={handleSearch}
      />

      <FormModal
        open={open}
        onClose={() => { setOpen(false); resetForm() }}
        title="Add Caretaker"
        description="Add on-site staff who'll manage day-to-day operations."
        onSubmit={handleSubmit}
        submitLabel="Add Caretaker"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Caretaker ID">
            <TextInput
              value={form.caretakerId}
              onChange={(e) => setForm({ ...form, caretakerId: e.target.value })}
              placeholder="e.g. C-01 (leave blank to auto-generate)"
            />
          </Field>
          <Field label="Full name">
            <TextInput required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. John Kiptoo" />
          </Field>
          <Field label="Phone number">
            <TextInput required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+254 7XX XXX XXX" />
          </Field>
          <Field label="Email address">
            <TextInput type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="caretaker@email.com" />
          </Field>
          <Field label="Assigned properties (optional)" className="sm:col-span-2">
            <MultiSelect
              options={properties.map((p) => ({ value: p.id, label: p.name }))}
              value={form.properties}
              onChange={(vals) => setForm({ ...form, properties: vals })}
              placeholder="Optional — you can link properties later…"
            />
          </Field>
        </div>
        <p className="text-xs text-slate-400 mt-2">
          Property assignment is optional. You can link this caretaker to properties later from the property record.
        </p>
      </FormModal>

      <ImportCaretakersModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={handleBulkImport}
      />

      {/* Caretaker details */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title="Caretaker Details" size="lg">
        {detail && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <Avatar name={detail.name} size={52} />
              <div>
                <p className="text-lg font-semibold text-slate-900">{detail.name}</p>
                <Badge tone={detail.status === 'Active' ? 'green' : 'orange'}>{detail.status || 'Active'}</Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              <DetailRow icon={Hash} label="Caretaker ID" value={detail.id} />
              <DetailRow icon={Phone} label="Phone Number" value={detail.phone} />
              <DetailRow icon={Mail} label="Email Address" value={detail.email} />
            </div>

            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">Assigned Properties</p>
              {detail.propertyNames && detail.propertyNames.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {detail.propertyNames.map((name) => (
                    <span key={name} className="text-xs font-medium px-2 py-1 rounded bg-slate-100 text-slate-700">
                      {name}
                    </span>
                  ))}
                </div>
              ) : detail.properties && detail.properties !== '—' ? (
                <p className="text-sm text-slate-600">{detail.properties}</p>
              ) : (
                <p className="text-sm text-slate-400">No properties assigned yet. Link this caretaker from a property record.</p>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="secondary" onClick={() => setDetail(null)}>Close</Button>
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
      <div className="w-8 h-8 rounded-lg bg-slate-50 text-slate-500 flex items-center justify-center shrink-0">
        <Icon size={15} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-sm font-medium text-slate-800 break-words">{value || '—'}</p>
      </div>
    </div>
  )
}
