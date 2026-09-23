import { useState, useEffect } from 'react'
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
import { landlords as initialLandlords } from '../../data/mockData'
import { api } from '../../api/client'

export default function LandlordManagement() {
  const [searchParams] = useSearchParams()
  const { showToast } = useToast()
  const [landlords, setLandlords] = useState(initialLandlords)
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(searchParams.get('new') === 'true')
  const [importOpen, setImportOpen] = useState(false)
  const [detail, setDetail] = useState(null)
  const [form, setForm] = useState({
    landlordId: '',
    name: '',
    phone: '',
    email: '',
    properties: []
  })

  useEffect(() => {
    let mounted = true
    api.getLandlords().then((res) => {
      if (mounted && res && res.length > 0) setLandlords(res)
    }).catch(() => {}).finally(() => {
      if (mounted) setLoading(false)
    })
    api.getProperties().then((res) => {
      if (mounted && res) setProperties(res)
    }).catch(() => {})
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setOpen(true)
    }
  }, [searchParams])

  const resetForm = () => setForm({
    landlordId: '', name: '', phone: '', email: '', properties: []
  })

  const handleSubmit = async () => {
    if (!form.name || !form.phone || !form.email) {
      showToast('Landlord name, phone number and email address are required.')
      return
    }
    const selectedNames = properties
      .filter((p) => form.properties.includes(p.id))
      .map((p) => p.name)
    const selectedIds = form.properties

    // Save to the backend first; only reflect success in the UI if it worked.
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

      setLandlords((prev) => [{
        id: landlordId || form.landlordId,
        name: form.name,
        phone: form.phone,
        email: form.email,
        properties: form.properties.length,
        propertyNames: selectedNames,
        units: 0,
        status: 'Active'
      }, ...prev])
      showToast(`${form.name} added as a landlord.`)
      resetForm()
      setOpen(false)
    } catch (err) {
      showToast(err?.message || 'Could not save the landlord. Please try again.', 'error')
    }
  }

  const handleBulkImport = async (landlordRows) => {
    // Optimistically add to the visible list.
    const localRows = landlordRows.map((r, idx) => ({
      id: r.landlord_id || `L-${String(landlords.length + idx + 1).padStart(2, '0')}`,
      name: r.landlord_name,
      phone: r.phone_number,
      email: r.email_address,
      properties: r.properties_owned
        ? r.properties_owned.split(/[;,]/).map((s) => s.trim()).filter(Boolean).length
        : 0,
      propertyNames: r.properties_owned
        ? r.properties_owned.split(/[;,]/).map((s) => s.trim()).filter(Boolean)
        : [],
      units: 0,
      status: 'Active',
    }))
    setLandlords((prev) => [...localRows, ...prev])

    const result = await api.bulkCreateLandlords(landlordRows)
    const okCount = result.created.length
    const failCount = result.failed.length
    if (okCount > 0 && failCount === 0) {
      showToast(`Imported ${okCount} landlord${okCount === 1 ? '' : 's'} successfully!`)
    } else if (okCount > 0 && failCount > 0) {
      showToast(`Imported ${okCount}, but ${failCount} failed. Check details and retry.`)
    } else if (failCount > 0) {
      showToast('Could not save landlords to the server, but they are shown locally.')
    }
  }

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
          { label: 'Total Landlords', value: landlords.length, icon: UserCog },
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
        searchKeys={['name', 'phone', 'email']}
        searchPlaceholder="Search landlords…"
      />

      <FormModal
        open={open}
        onClose={() => { setOpen(false); resetForm() }}
        title="Add Landlord"
        description="Register a new property owner."
        onSubmit={handleSubmit}
        submitLabel="Add Landlord"
      >
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Phone number">
            <TextInput required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+254 7XX XXX XXX" />
          </Field>
          <Field label="Email address">
            <TextInput required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="landlord@email.com" />
          </Field>
        </div>
        <Field label="Properties owned (optional)">
          <MultiSelect
            options={properties.map((p) => ({ value: p.id, label: p.name }))}
            value={form.properties}
            onChange={(vals) => setForm({ ...form, properties: vals })}
            placeholder="Optionally link one or more properties…"
          />
        </Field>
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
                <p className="text-sm text-slate-400">
                  {detail.properties > 0
                    ? `${detail.properties} propert${detail.properties === 1 ? 'y' : 'ies'} linked.`
                    : 'No properties linked to this landlord yet.'}
                </p>
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
