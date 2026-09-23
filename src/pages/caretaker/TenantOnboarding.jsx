import { useState, useEffect } from 'react'
import { UserPlus, FileSignature, Smartphone } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../../components/ui/PageHeader'
import Card from '../../components/ui/Card'
import { Field, TextInput, Select, TextArea } from '../../components/ui/Field'
import Button from '../../components/ui/Button'
import DataTable from '../../components/ui/DataTable'
import Badge from '../../components/ui/Badge'
import IdCapture from '../../components/ui/IdCapture'
import LeaseAgreementDialog from '../../components/patterns/LeaseAgreementDialog'
import SearchSelect from '../../components/ui/SearchSelect'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../context/AuthContext'
import { tenants as initialTenants, properties as defaultProps } from '../../data/mockData'
import { api } from '../../api/client'

const INCOME_RANGES = ['Below 20K', '20K - 50K', 'Above 50K']

export default function TenantOnboarding() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { user } = useAuth()
  const [tenantsList, setTenantsList] = useState(initialTenants)
  const [leases, setLeases] = useState([])
  const [retryingLease, setRetryingLease] = useState(null)
  const [propertyList, setPropertyList] = useState([])
  const [availableUnits, setAvailableUnits] = useState([])
  const [form, setForm] = useState({
    name: '',
    phone: '',
    idNumber: '',
    email: '',
    property: '',
    unit: '',
    rent: '',
    deposit: '',
    incomeRange: '',
    leaseStart: new Date().toISOString().slice(0, 10),
    notes: '',
    idFront: null,
    idBack: null,
    acknowledged: false
  })
  // When the caretaker hasn't manually edited the deposit, it mirrors the rent.
  const [depositTouched, setDepositTouched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [tenantsLoading, setTenantsLoading] = useState(true)
  const [leaseOpen, setLeaseOpen] = useState(false)

  // Fetch properties from backend — a caretaker may only onboard tenants into
  // the properties assigned to them.
  useEffect(() => {
    let mounted = true
    // Only the properties assigned to this caretaker (resolved server-side).
    api.getMyProperties().then((props) => {
      if (!mounted) return
      const list = Array.isArray(props) ? props : []
      setPropertyList(list)
      if (list.length > 0) {
        setForm((prev) => ({ ...prev, property: prev.property || list[0].id || list[0].name }))
      }
    }).catch(() => {})

    // api.getTenants().then((res) => {
    //   if (mounted && res && res.length > 0) setTenantsList(res)
    // }).catch(() => {})

    loadLeases(mounted)

    return () => { mounted = false }
  }, [user?.name])

  const loadLeases = (mounted = true) => {
    setTenantsLoading(true)
    api.getLeases({ caretakerScope: true }).then((res) => {
      if (mounted !== false) setLeases(Array.isArray(res) ? res : [])
    }).catch(() => {}).finally(() => {
      if (mounted !== false) setTenantsLoading(false)
    })
  }

  // Retry the rent+deposit STK push for a lease whose payment failed / is pending.
  const retryPayment = async (row) => {
    setRetryingLease(row.lease)
    try {
      await api.initiateOnboardingPayment(row.lease, row.phone || null)
      showToast(`STK push re-sent to ${row.tenant_name}. Ask them to approve on their phone.`)
      // Reflect the "Initiated" state; the callback will flip it to Paid.
      setLeases((prev) => prev.map((l) => (l.lease === row.lease ? { ...l, initial_payment_status: 'Initiated' } : l)))
    } catch (err) {
      showToast(err?.message || 'Could not send the STK push. Check M-Pesa settings.')
    } finally {
      setRetryingLease(null)
    }
  }

  // Fetch units when property changes
  useEffect(() => {
    if (!form.property) return
    let mounted = true
    api.getUnits(form.property).then((all) => {
      // Only vacant units can be assigned to a new tenant.
      const units = (all || []).filter((u) => (u.status || 'Vacant') === 'Vacant')
      if (mounted && units.length > 0) {
        setAvailableUnits(units)
        if (!form.unit) {
          setForm((prev) => {
            const rent = units[0].rent || prev.rent
            return { ...prev, unit: units[0].id, rent, deposit: depositTouched ? prev.deposit : rent }
          })
        }
      } else if (mounted) {
        setAvailableUnits([])
        setForm((prev) => ({ ...prev, unit: '' }))
      }
    }).catch(() => {})
    return () => { mounted = false }
  }, [form.property])

  const handleUnitChange = (unitId) => {
    const matched = availableUnits.find((u) => u.id === unitId)
    setForm((prev) => {
      const rent = matched?.rent || prev.rent
      return { ...prev, unit: unitId, rent, deposit: depositTouched ? prev.deposit : rent }
    })
  }

  // Rent input handler: mirror the deposit unless the caretaker overrode it.
  const handleRentChange = (val) => {
    setForm((prev) => ({ ...prev, rent: val, deposit: depositTouched ? prev.deposit : val }))
  }

  // Step 1: validate the form, then open the lease agreement dialog for signing.
  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name || !form.phone || !form.incomeRange || !form.acknowledged) {
      showToast('Please complete all required fields, including income range and the acknowledgement.')
      return
    }
    if (!form.property) {
      showToast('Select a property to onboard the tenant into.')
      return
    }
    if (!form.unit) {
      showToast('Select a vacant unit to assign the tenant. If none are listed, this property is fully occupied.')
      return
    }
    setLeaseOpen(true)
  }

  const propertyName =
    propertyList.find((p) => (p.id || p.name) === form.property)?.name || form.property

  // Step 2: after both parties sign, persist the tenant.
  const handleLeaseComplete = async (signatures) => {
    setLoading(true)
    try {
      // onboardTenant creates the tenant + lease AND marks the unit Occupied.
      await api.onboardTenant({
        tenant_name: form.name,
        phone: form.phone,
        national_id: form.idNumber,
        email: form.email,
        income_range: form.incomeRange,
        property: form.property,
        unit: form.unit,
        rent: form.rent,
        deposit: form.deposit !== '' ? form.deposit : form.rent,
        lease_start: form.leaseStart,
        tenant_signature: signatures.tenantSignature,
        caretaker_signature: signatures.caretakerSignature,
        lease_signed_at: signatures.signedAt,
        national_id_front: form.idFront || null,
        national_id_back: form.idBack || null,
      })
      showToast(`${form.name} onboarded and assigned to the unit.`)
      setLeaseOpen(false)
      navigate('/caretaker/tenants')
    } catch (err) {
      // Do NOT falsely report success; keep the dialog open so it can be retried.
      showToast(err?.message || `Could not onboard ${form.name}. Please try again.`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <PageHeader title="Tenant Onboarding" description="Add a new tenant, assign a unit and sign the lease agreement." />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        <Card className="lg:col-span-2">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Full name">
                <TextInput
                  required
                  placeholder="e.g. Nancy Wairimu"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </Field>
              <Field label="Phone number">
                <TextInput
                  required
                  placeholder="+254 7XX XXX XXX"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="National ID">
                <TextInput
                  placeholder="ID number"
                  value={form.idNumber}
                  onChange={(e) => setForm({ ...form, idNumber: e.target.value })}
                />
              </Field>
              <Field label="Email address">
                <TextInput
                  type="email"
                  placeholder="tenant@email.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </Field>
            </div>

            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">National ID document (photo or upload)</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <IdCapture label="ID — Front" value={form.idFront} onChange={(v) => setForm({ ...form, idFront: v })} />
                <IdCapture label="ID — Back" value={form.idBack} onChange={(v) => setForm({ ...form, idBack: v })} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Assign property">
                <SearchSelect
                  value={form.property}
                  onChange={(val) => setForm({ ...form, property: val, unit: '' })}
                  options={propertyList.map((p) => ({ value: p.id || p.name, label: p.name }))}
                  placeholder="Select property…"
                  searchPlaceholder="Search properties…"
                  emptyMessage="No properties assigned to you"
                />
              </Field>
              <Field label="Unit">
                <SearchSelect
                  value={form.unit}
                  onChange={handleUnitChange}
                  disabled={!form.property}
                  options={availableUnits.map((u) => ({
                    value: u.id,
                    label: `${u.number} — ${u.status} (KSh ${Number(u.rent || 0).toLocaleString()})`,
                  }))}
                  placeholder={form.property ? 'Select unit…' : 'Select a property first'}
                  searchPlaceholder="Search units…"
                  emptyMessage="No units for this property"
                />
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Monthly rent (KSh)">
                <TextInput
                  type="number"
                  placeholder="32000"
                  value={form.rent}
                  onChange={(e) => handleRentChange(e.target.value)}
                />
              </Field>
              <Field label="Security deposit (KSh, refundable)">
                <TextInput
                  type="number"
                  placeholder="Same as rent"
                  value={form.deposit}
                  onChange={(e) => { setDepositTouched(true); setForm({ ...form, deposit: e.target.value }) }}
                />
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-lg bg-slate-50 border border-slate-100 p-3 text-sm flex items-center justify-between">
                <span className="text-slate-500">Due at onboarding (Rent + Deposit)</span>
                <span className="font-semibold text-slate-900">KSh {(Number(form.rent || 0) + Number(form.deposit || 0)).toLocaleString()}</span>
              </div>
              <Field label="Lease start date">
                <TextInput
                  type="date"
                  value={form.leaseStart}
                  onChange={(e) => setForm({ ...form, leaseStart: e.target.value })}
                />
              </Field>
            </div>

            <Field label="Monthly income range *">
              <Select
                required
                value={form.incomeRange}
                onChange={(e) => setForm({ ...form, incomeRange: e.target.value })}
              >
                <option value="" disabled>Select income range…</option>
                {INCOME_RANGES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </Select>
            </Field>

            <Field label="Notes">
              <TextArea
                placeholder="Emergency contact, special arrangements, etc."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </Field>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                required
                checked={form.acknowledged}
                onChange={(e) => setForm({ ...form, acknowledged: e.target.checked })}
                className="mt-0.5 w-4 h-4 rounded border-slate-300 text-brand-500 focus:ring-brand-400"
              />
              <span className="text-sm text-slate-600">
                I confirm the information above is accurate and the tenant will review and sign the tenancy agreement. <span className="text-red-500">*</span>
              </span>
            </label>

            <Button type="submit" icon={FileSignature} disabled={loading}>
              Review & Sign Lease Agreement
            </Button>
          </form>
        </Card>

        <Card className="bg-brand-50/60 border-brand-100">
          <h3 className="font-semibold text-slate-900 mb-2">Onboarding checklist</h3>
          <ul className="text-sm text-slate-600 space-y-2.5">
            <li>✓ Collect signed lease agreement</li>
            <li>✓ Verify ID and passport photo</li>
            <li>✓ Record deposit payment</li>
            <li>✓ Share move-in inspection report</li>
            <li>✓ Add tenant to WhatsApp updates</li>
          </ul>
        </Card>
      </div>

      {/* <Card padded={false} className="p-5">
        <h3 className="font-semibold text-slate-900 mb-4">Onboarded Tenants & Payment Status</h3>
        <DataTable
          columns={[
            { key: 'tenant_name', header: 'Tenant' },
            { key: 'unit', header: 'Unit' },
            { key: 'phone', header: 'Phone', render: (r) => r.phone || '—' },
            { key: 'initial_amount_due', header: 'Rent + Deposit', render: (r) => `KSh ${Number(r.initial_amount_due || 0).toLocaleString()}` },
            {
              key: 'initial_payment_status',
              header: 'Payment',
              render: (r) => {
                const s = r.initial_payment_status || 'Pending'
                const tone = s === 'Paid' ? 'green' : s === 'Failed' ? 'red' : s === 'Initiated' ? 'blue' : 'orange'
                return <Badge tone={tone}>{s}</Badge>
              },
            },
            {
              key: 'actions',
              header: '',
              render: (r) =>
                r.initial_payment_status !== 'Paid' ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={Smartphone}
                    disabled={retryingLease === r.lease}
                    onClick={() => retryPayment(r)}
                  >
                    {retryingLease === r.lease ? 'Sending…' : (r.initial_payment_status === 'Failed' ? 'Retry Payment' : 'Send STK')}
                  </Button>
                ) : null,
            },
          ]}
          rows={leases}
          loading={tenantsLoading}
          searchKeys={['tenant_name', 'unit']}
          searchPlaceholder="Search onboarded tenants…"
        />
      </Card> */}

      <LeaseAgreementDialog
        open={leaseOpen}
        onClose={() => setLeaseOpen(false)}
        onComplete={handleLeaseComplete}
        submitting={loading}
        caretakerName={user?.name || ''}
        tenant={{
          name: form.name,
          idNumber: form.idNumber,
          phone: form.phone,
          email: form.email,
          property: form.property,
          propertyName,
          unit: form.unit,
          incomeRange: form.incomeRange,
          leaseStart: form.leaseStart,
          rent: form.rent
        }}
      />
    </div>
  )
}
