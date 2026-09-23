import { useState, useEffect, useCallback } from 'react'
import { X, Save, FileSignature, Plus, Home, Loader2 } from 'lucide-react'
import Button from '../ui/Button'
import { Field, TextInput, Select } from '../ui/Field'
import SearchSelect from '../ui/SearchSelect'
import IdCapture from '../ui/IdCapture'
import LeaseAgreementDialog from './LeaseAgreementDialog'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../api/client'

const INCOME_RANGES = ['', 'Below 20K', '20K - 50K', 'Above 50K']

/**
 * Slide-over drawer to view/update a tenant after import: edit details, capture
 * ID front/back + extra document images (base64), and assign a unit + sign the
 * lease (or re-sign an existing lease).
 */
export default function TenantDetailDrawer({ open, tenantId, onClose, onSaved }) {
  const { showToast } = useToast()
  const { user } = useAuth()

  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(null)
  const [newDocs, setNewDocs] = useState([]) // base64 data URLs pending upload

  // Sign-lease sub-flow
  const [properties, setProperties] = useState([])
  const [units, setUnits] = useState([])
  const [signProperty, setSignProperty] = useState('')
  const [signUnit, setSignUnit] = useState('')
  const [signRent, setSignRent] = useState('')
  const [signDeposit, setSignDeposit] = useState('')
  const [leaseOpen, setLeaseOpen] = useState(false)
  const [signing, setSigning] = useState(false)

  const load = useCallback(() => {
    if (!tenantId) return
    setLoading(true)
    api.getTenantDetail(tenantId)
      .then((d) => {
        setDetail(d)
        setForm({
          tenant_name: d.tenant_name || '',
          phone: d.phone || '',
          email: d.email || '',
          national_id: d.national_id || '',
          income_range: d.income_range || '',
          emergency_contact: d.emergency_contact || '',
          status: d.status || 'Active',
          idFront: d.id_front || null,
          idBack: d.id_back || null,
        })
        setSignRent(d.rent_amount || '')
        setSignDeposit(d.deposit_amount || '')
        setSignProperty(d.property || '')
      })
      .catch((err) => showToast(err?.message || 'Could not load tenant.'))
      .finally(() => setLoading(false))
  }, [tenantId, showToast])

  useEffect(() => { if (open) { setNewDocs([]); load() } }, [open, load])

  // Load caretaker properties for the sign-lease unit picker.
  useEffect(() => {
    if (!open) return
    api.getMyProperties().then((res) => setProperties(Array.isArray(res) ? res : [])).catch(() => {})
  }, [open])

  // Load vacant units when a property is chosen for signing.
  useEffect(() => {
    if (!signProperty) { setUnits([]); return }
    api.getUnits(signProperty)
      .then((res) => setUnits((res || []).filter((u) => u.status === 'Vacant')))
      .catch(() => setUnits([]))
  }, [signProperty])

  if (!open) return null

  const setField = (patch) => setForm((prev) => ({ ...prev, ...patch }))

  const handleSave = async () => {
    if (!form.tenant_name || !form.phone) {
      showToast('Name and phone are required.')
      return
    }
    setSaving(true)
    try {
      const payload = {
        tenant_name: form.tenant_name,
        phone: form.phone,
        email: form.email,
        national_id: form.national_id,
        income_range: form.income_range,
        emergency_contact: form.emergency_contact,
        status: form.status,
        documents: newDocs.map((d) => ({ data_url: d })),
      }
      // Only send ID images when a NEW capture (data URL) was made.
      if (form.idFront && String(form.idFront).startsWith('data:')) payload.national_id_front = form.idFront
      if (form.idBack && String(form.idBack).startsWith('data:')) payload.national_id_back = form.idBack

      const updated = await api.updateTenant(tenantId, payload)
      setDetail(updated)
      setNewDocs([])
      showToast('Tenant updated.')
      onSaved && onSaved()
    } catch (err) {
      showToast(err?.message || 'Could not update tenant.')
    } finally {
      setSaving(false)
    }
  }

  const openSign = () => {
    if (!signProperty || !signUnit) {
      showToast('Pick a property and a vacant unit first.')
      return
    }
    setLeaseOpen(true)
  }

  const propertyName = properties.find((p) => (p.id || p.name) === signProperty)?.name || signProperty
  const unitLabel = units.find((u) => u.id === signUnit)?.number || signUnit

  const handleLeaseComplete = async (signatures) => {
    setSigning(true)
    try {
      await api.signLease({
        tenant: tenantId,
        unit: signUnit,
        property: signProperty,
        rent: signRent !== '' ? signRent : null,
        deposit: signDeposit !== '' ? signDeposit : signRent,
        tenant_signature: signatures.tenantSignature,
        caretaker_signature: signatures.caretakerSignature,
        signed_at: signatures.signedAt,
        lease: detail?.lease || null, // re-sign if a lease already exists
      })
      showToast(`Lease signed. Unit ${unitLabel} assigned to ${form.tenant_name}.`)
      setLeaseOpen(false)
      load()
      onSaved && onSaved()
    } catch (err) {
      showToast(err?.message || 'Could not sign the lease.')
    } finally {
      setSigning(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 flex justify-end">
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px]" onClick={onClose} />
        <div className="relative w-full max-w-lg bg-white h-full shadow-2xl overflow-y-auto animate-slide-in-right">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                {detail?.tenant_name || 'Tenant'}
              </h3>
              <p className="text-xs text-slate-500">
                {detail?.lease
                  ? `Unit ${detail.unit_label || detail.unit} · Lease ${detail.lease_status || ''}`
                  : 'No unit assigned yet'}
              </p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100">
              <X size={18} />
            </button>
          </div>

          {loading || !form ? (
            <div className="flex items-center justify-center py-24 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {/* Details */}
              <section className="space-y-4">
                <h4 className="text-sm font-semibold text-slate-700">Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Full name">
                    <TextInput value={form.tenant_name} onChange={(e) => setField({ tenant_name: e.target.value })} />
                  </Field>
                  <Field label="Phone">
                    <TextInput value={form.phone} onChange={(e) => setField({ phone: e.target.value })} />
                  </Field>
                  <Field label="Email">
                    <TextInput type="email" value={form.email} onChange={(e) => setField({ email: e.target.value })} />
                  </Field>
                  <Field label="National ID">
                    <TextInput value={form.national_id} onChange={(e) => setField({ national_id: e.target.value })} />
                  </Field>
                  <Field label="Income range">
                    <Select value={form.income_range} onChange={(e) => setField({ income_range: e.target.value })}>
                      {INCOME_RANGES.map((r) => <option key={r} value={r}>{r || '—'}</option>)}
                    </Select>
                  </Field>
                  <Field label="Status">
                    <Select value={form.status} onChange={(e) => setField({ status: e.target.value })}>
                      {['Active', 'Notice', 'Moved Out'].map((s) => <option key={s} value={s}>{s}</option>)}
                    </Select>
                  </Field>
                </div>
                <Field label="Emergency contact">
                  <TextInput value={form.emergency_contact} onChange={(e) => setField({ emergency_contact: e.target.value })} />
                </Field>
              </section>

              {/* ID documents */}
              <section className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-700">National ID documents</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <IdCapture label="ID — Front" value={form.idFront} onChange={(v) => setField({ idFront: v })} />
                  <IdCapture label="ID — Back" value={form.idBack} onChange={(v) => setField({ idBack: v })} />
                </div>
              </section>

              {/* Extra documents */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-700">Other documents</h4>
                  <span className="text-xs text-slate-400">{(detail?.documents?.length || 0) + newDocs.length} on file</span>
                </div>
                {detail?.documents?.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {detail.documents.map((d) => (
                      <a key={d.name} href={d.data_url} target="_blank" rel="noreferrer"
                        className="block aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                        {d.data_url
                          ? <img src={d.data_url} alt={d.file_name} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-xs text-slate-400 p-1">{d.file_name}</div>}
                      </a>
                    ))}
                  </div>
                )}
                {newDocs.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {newDocs.map((d, i) => (
                      <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-brand-200">
                        <img src={d} alt="new document" className="w-full h-full object-cover" />
                        <button onClick={() => setNewDocs((prev) => prev.filter((_, x) => x !== i))}
                          className="absolute top-1 right-1 w-6 h-6 rounded-md bg-white/90 text-rose-600 flex items-center justify-center">
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="max-w-[200px]">
                  <IdCapture label="Add a document" value={null} onChange={(v) => v && setNewDocs((prev) => [...prev, v])} />
                </div>
              </section>

              <div className="flex justify-end">
                <Button icon={Save} onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving…' : 'Save Changes'}
                </Button>
              </div>

              {/* Assign unit & sign lease */}
              <section className="space-y-4 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <Home size={16} className="text-brand-500" />
                  <h4 className="text-sm font-semibold text-slate-700">
                    {detail?.lease ? 'Re-assign unit / re-sign lease' : 'Assign unit & sign lease'}
                  </h4>
                </div>
                {detail?.is_signed && (
                  <p className="text-xs text-emerald-600">This lease is already signed. Re-signing replaces the signed agreement.</p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Property">
                    <SearchSelect
                      value={signProperty}
                      onChange={(val) => { setSignProperty(val); setSignUnit('') }}
                      options={properties.map((p) => ({ value: p.id || p.name, label: p.name }))}
                      placeholder="Select property…"
                      searchPlaceholder="Search…"
                      emptyMessage="No properties assigned to you"
                    />
                  </Field>
                  <Field label="Vacant unit">
                    <SearchSelect
                      value={signUnit}
                      onChange={(val) => {
                        setSignUnit(val)
                        const u = units.find((x) => x.id === val)
                        if (u) { setSignRent(u.rent || ''); setSignDeposit(u.deposit || u.rent || '') }
                      }}
                      options={units.map((u) => ({ value: u.id, label: `${u.number} · ${u.type}` }))}
                      placeholder={signProperty ? 'Select unit…' : 'Pick a property first'}
                      searchPlaceholder="Search…"
                      emptyMessage="No vacant units"
                    />
                  </Field>
                  <Field label="Rent (KSh)">
                    <TextInput type="number" value={signRent} onChange={(e) => setSignRent(e.target.value)} />
                  </Field>
                  <Field label="Deposit (KSh)">
                    <TextInput type="number" value={signDeposit} onChange={(e) => setSignDeposit(e.target.value)} />
                  </Field>
                </div>
                <div className="flex justify-end">
                  <Button variant="secondary" icon={detail?.lease ? FileSignature : Plus} onClick={openSign} disabled={signing}>
                    {detail?.lease ? 'Re-sign Lease' : 'Assign & Sign Lease'}
                  </Button>
                </div>
              </section>
            </div>
          )}
        </div>
      </div>

      <LeaseAgreementDialog
        open={leaseOpen}
        onClose={() => setLeaseOpen(false)}
        onComplete={handleLeaseComplete}
        submitting={signing}
        caretakerName={user?.name || ''}
        tenant={{
          name: form?.tenant_name,
          idNumber: form?.national_id,
          phone: form?.phone,
          email: form?.email,
          incomeRange: form?.income_range,
          propertyName,
          unit: unitLabel,
          rent: signRent,
          leaseStart: new Date().toISOString().slice(0, 10),
        }}
      />
    </>
  )
}
