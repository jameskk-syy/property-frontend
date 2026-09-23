import { useState, useEffect } from 'react'
import {
  FileText, Download, Eye, FileCheck2, FileWarning, CreditCard,
  X, PenLine, CheckCircle2, AlertTriangle, Building2, Phone, Mail, CalendarDays,
} from 'lucide-react'
import ListPageTemplate from '../../components/patterns/ListPageTemplate'
import FilterDrawer, { FilterItem } from '../../components/patterns/FilterDrawer'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Avatar from '../../components/ui/Avatar'
import { Select } from '../../components/ui/Field'
import { useToast } from '../../context/ToastContext'
import { api } from '../../api/client'

function SignedPill({ signed }) {
  return signed ? (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
      <CheckCircle2 size={12} /> Signed
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
      <AlertTriangle size={12} /> Unsigned
    </span>
  )
}

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2 py-2 border-b border-slate-100 last:border-0">
      {Icon ? <Icon size={15} className="text-slate-400 shrink-0" /> : null}
      <span className="text-sm text-slate-500 w-40 shrink-0">{label}</span>
      <span className="text-sm font-medium text-slate-800">{value || '—'}</span>
    </div>
  )
}

function DocumentDrawer({ row, onClose, onView, onDownload, busy, onImage }) {
  if (!row) return null
  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-modal-in">
      <div className="absolute inset-0 bg-slate-900/30" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white h-full shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <Avatar name={row.tenant_name} size={38} />
            <div>
              <p className="font-semibold text-slate-900">{row.tenant_name}</p>
              <p className="text-xs text-slate-500">{row.lease}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="flex items-center gap-2">
            <SignedPill signed={row.is_signed} />
            <Badge tone={row.status === 'Active' ? 'brand' : row.status === 'Terminated' ? 'red' : 'slate'}>{row.status}</Badge>
          </div>

          <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
            <h4 className="text-sm font-semibold text-slate-700 mb-1">Tenant & Premises</h4>
            <DetailRow icon={CreditCard} label="National ID / Passport" value={row.national_id || 'Not on record'} />
            <DetailRow icon={Phone} label="Telephone" value={row.phone} />
            <DetailRow icon={Mail} label="Email" value={row.email} />
            <DetailRow icon={Building2} label="Property" value={row.property_name} />
            <DetailRow icon={Building2} label="Unit" value={row.unit} />
            <DetailRow icon={CalendarDays} label="Commencement" value={row.start_date} />
            <DetailRow icon={CalendarDays} label="End Date" value={row.end_date} />
          </div>

          {(row.id_front || row.id_back) && (
            <div className="rounded-xl border border-slate-200 p-4">
              <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <CreditCard size={15} className="text-slate-400" /> National ID Document
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {row.id_front && (
                  <button onClick={() => onImage(row.id_front)} className="rounded-lg overflow-hidden border border-slate-200 aspect-[16/10]">
                    <img src={row.id_front} alt="ID front" className="w-full h-full object-cover" />
                  </button>
                )}
                {row.id_back && (
                  <button onClick={() => onImage(row.id_back)} className="rounded-lg overflow-hidden border border-slate-200 aspect-[16/10]">
                    <img src={row.id_back} alt="ID back" className="w-full h-full object-cover" />
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-2">Click to enlarge.</p>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 p-4">
            <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <PenLine size={15} className="text-slate-400" /> Signatures
            </h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className={`p-3 rounded-lg border ${row.has_tenant_signature ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                <p className="text-xs">Tenant</p>
                <p className="font-semibold">{row.has_tenant_signature ? 'Signed' : 'Pending'}</p>
              </div>
              <div className={`p-3 rounded-lg border ${row.has_caretaker_signature ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                <p className="text-xs">Caretaker / Witness</p>
                <p className="font-semibold">{row.has_caretaker_signature ? 'Signed' : 'Pending'}</p>
              </div>
            </div>
            {row.signed_on && <p className="text-xs text-slate-400 mt-2">Signed on {String(row.signed_on).slice(0, 16).replace('T', ' ')}</p>}
          </div>

          {!row.is_signed && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
              <AlertTriangle size={15} className="shrink-0 mt-0.5" />
              This lease has not been digitally signed yet. The document is available but may not be legally executed.
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-slate-200 flex items-center gap-2.5">
          <Button
            variant="secondary" icon={Eye} className="flex-1"
            disabled={!row.has_lease_pdf || busy === `${row.lease}:view`}
            onClick={() => onView(row.lease)}
          >
            View
          </Button>
          <Button
            icon={Download} className="flex-1"
            disabled={!row.has_lease_pdf || busy === `${row.lease}:download`}
            onClick={() => onDownload(row.lease)}
          >
            {busy === `${row.lease}:download` ? 'Downloading…' : 'Download'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function DocumentManagement() {
  const { showToast } = useToast()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(null)
  const [selected, setSelected] = useState(null)
  const [properties, setProperties] = useState([])
  const [propertyFilter, setPropertyFilter] = useState('')
  const [tenantFilter, setTenantFilter] = useState('')
  const [lightbox, setLightbox] = useState(null)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    api.getTenantDocuments({ property: propertyFilter || null, tenant: tenantFilter || null })
      .then((res) => { if (mounted) setRows(res || []) })
      .catch(() => {})
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [propertyFilter, tenantFilter])

  useEffect(() => {
    api.getProperties().then((res) => setProperties(res || [])).catch(() => {})
  }, [])

  // Distinct tenants from the current rows, for the tenant filter dropdown.
  const tenantOptions = Array.from(
    new Map(rows.map((r) => [r.tenant, r.tenant_name || r.tenant])).entries()
  ).map(([id, name]) => ({ id, name }))

  const handleView = async (lease) => {
    setBusy(`${lease}:view`)
    try {
      await api.viewLease(lease)
    } catch (e) {
      showToast(e.message || 'Could not open the signed lease.')
    } finally {
      setBusy(null)
    }
  }

  const handleDownload = async (lease) => {
    setBusy(`${lease}:download`)
    try {
      await api.downloadLease(lease)
      showToast('Downloading lease agreement…')
    } catch (e) {
      showToast(e.message || 'Could not download the lease.')
    } finally {
      setBusy(null)
    }
  }

  const signedCount = rows.filter((r) => r.is_signed).length
  const unsignedCount = rows.length - signedCount
  const withId = rows.filter((r) => r.national_id).length

  return (
    <>
      <ListPageTemplate
        title="Documents"
        description="Tenancy agreements and tenant records. Open a row to review details, then view or download the agreement."
        loading={loading}
        actions={
          <FilterDrawer
            activeCount={[propertyFilter, tenantFilter].filter(Boolean).length}
            onClear={() => {
              setPropertyFilter('')
              setTenantFilter('')
            }}
          >
            <FilterItem label="Property">
              <Select value={propertyFilter} onChange={(e) => setPropertyFilter(e.target.value)} className="w-full lg:w-44 text-sm py-1.5">
                <option value="">All properties</option>
                {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </FilterItem>
            <FilterItem label="Tenant">
              <Select value={tenantFilter} onChange={(e) => setTenantFilter(e.target.value)} className="w-full lg:w-44 text-sm py-1.5">
                <option value="">All tenants</option>
                {tenantOptions.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Select>
            </FilterItem>
          </FilterDrawer>
        }
        stats={[
          { label: 'Leases on File', value: rows.length, icon: FileText },
          { label: 'Signed', value: signedCount, icon: FileCheck2, tone: 'brand' },
          { label: 'Unsigned', value: unsignedCount, icon: FileWarning, tone: 'orange' },
          { label: 'National ID on Record', value: withId, icon: CreditCard, tone: 'blue' },
        ]}
        onRowClick={(row) => setSelected(row)}
        columns={[
          {
            key: 'tenant_name', header: 'Tenant', render: (r) => (
              <div className="flex items-center gap-2.5">
                <Avatar name={r.tenant_name} size={30} />
                <div>
                  <p className="font-medium text-slate-800">{r.tenant_name}</p>
                  <p className="text-xs text-slate-400">{r.phone || r.email || '—'}</p>
                </div>
              </div>
            ),
          },
          {
            key: 'national_id', header: 'National ID', render: (r) =>
              r.national_id
                ? <span className="font-mono text-slate-700">{r.national_id}</span>
                : <span className="text-xs text-slate-400">Not on record</span>,
          },
          {
            key: 'property_name', header: 'Property / Unit', render: (r) => (
              <div>
                <p className="text-slate-800">{r.property_name}</p>
                <p className="text-xs text-slate-400">Unit {r.unit}</p>
              </div>
            ),
          },
          { key: 'is_signed', header: 'Agreement', render: (r) => <SignedPill signed={r.is_signed} /> },
          {
            key: 'signed_on', header: 'Signed On', render: (r) =>
              r.signed_on
                ? <span className="text-slate-600">{String(r.signed_on).slice(0, 10)}</span>
                : <span className="text-xs text-slate-400">—</span>,
          },
          {
            key: 'actions', header: '', align: 'right', render: (r) => (
              <div className="flex items-center justify-end gap-1.5">
                <Button
                  variant="ghost" size="sm" icon={Eye}
                  disabled={!r.has_lease_pdf || busy === `${r.lease}:view`}
                  onClick={(e) => { e.stopPropagation(); handleView(r.lease) }}
                >
                  View
                </Button>
                <Button
                  variant="secondary" size="sm" icon={Download}
                  disabled={!r.has_lease_pdf || busy === `${r.lease}:download`}
                  onClick={(e) => { e.stopPropagation(); handleDownload(r.lease) }}
                >
                  {busy === `${r.lease}:download` ? '…' : 'Download'}
                </Button>
              </div>
            ),
          },
        ]}
        rows={rows}
        searchKeys={['tenant_name', 'national_id', 'property_name', 'unit', 'lease']}
        searchPlaceholder="Search by tenant, national ID, property, unit…"
        emptyMessage="No lease documents yet. They appear here once tenants are onboarded."
      />

      <DocumentDrawer
        row={selected}
        onClose={() => setSelected(null)}
        onView={handleView}
        onDownload={handleDownload}
        busy={busy}
        onImage={setLightbox}
      />

      {lightbox && (
        <div onClick={() => setLightbox(null)} className="fixed inset-0 z-[60] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <button onClick={() => setLightbox(null)} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20">
            <X size={20} />
          </button>
          <img src={lightbox} alt="ID document" onClick={(e) => e.stopPropagation()} className="max-h-[85vh] max-w-full rounded-xl shadow-2xl object-contain" />
        </div>
      )}
    </>
  )
}
