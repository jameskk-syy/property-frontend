import { useState, useEffect } from 'react'
import { Gauge, Plus, Droplets, Zap } from 'lucide-react'
import ListPageTemplate from '../../components/patterns/ListPageTemplate'
import FormModal from '../../components/patterns/FormModal'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { Field, TextInput, Select } from '../../components/ui/Field'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../context/AuthContext'
import { formatKsh } from '../../data/mockData'
import { api } from '../../api/client'

export default function CaretakerMeterReadings() {
  const { showToast } = useToast()
  const { user } = useAuth()
  const [readings, setReadings] = useState([])
  const [properties, setProperties] = useState([])
  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ property: '', unit: '', utilityType: 'Water', currentReading: '', previousReading: '', ratePerUnit: 150 })

  const loadReadings = (property) => {
    setLoading(true)
    // Only readings captured by this caretaker.
    api.getMeterReadings({ property: property || null, capturedBy: user?.email || user?.id || null }).then((res) => {
      setReadings(Array.isArray(res) ? res : [])
    }).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => {
    // Only the properties assigned to this caretaker (resolved server-side).
    api.getMyProperties().then((res) => {
      if (res && res.length > 0) {
        setProperties(res)
        setForm((f) => ({ ...f, property: f.property || res[0].id }))
      } else {
        setProperties([])
      }
    }).catch(() => {})
    loadReadings()
  }, [])

  // Load units when the selected property changes.
  useEffect(() => {
    if (!form.property) return
    api.getUnits(form.property).then((res) => {
      setUnits(Array.isArray(res) ? res : [])
      if (res && res[0]) setForm((f) => ({ ...f, unit: f.unit || res[0].id }))
    }).catch(() => {})
  }, [form.property])

  const handleSubmit = async () => {
    if (!form.unit || form.currentReading === '') {
      showToast('Select a unit and enter the current meter reading.')
      return
    }
    setSaving(true)
    try {
      const res = await api.captureMeterReading({
        unitId: form.unit,
        utilityType: form.utilityType,
        currentReading: form.currentReading,
        previousReading: form.previousReading,
        ratePerUnit: form.ratePerUnit,
      })
      const consumption = res?.consumption ?? 0
      const billed = res?.billed_amount ?? res?.billing_amount ?? 0
      showToast(`Reading saved. Consumption ${consumption} units → ${formatKsh(billed)}.`)
      setOpen(false)
      setForm((f) => ({ ...f, currentReading: '', previousReading: '' }))
      loadReadings(form.property)
    } catch (err) {
      showToast(err?.message || 'Could not save the meter reading.')
    } finally {
      setSaving(false)
    }
  }

  const waterCount = readings.filter((r) => r.utilityType === 'Water').length
  const totalBilled = readings.reduce((s, r) => s + (r.amount || 0), 0)

  return (
    <>
      <ListPageTemplate
        title="Meter Readings"
        description="Submit water and electricity units used per tenant unit. Consumption and charges are calculated automatically."
        loading={loading}
        actions={<Button icon={Plus} onClick={() => setOpen(true)}>Submit Reading</Button>}
        stats={[
          { label: 'Total Readings', value: readings.length, icon: Gauge },
          { label: 'Water Readings', value: waterCount, icon: Droplets, tone: 'blue' },
          { label: 'Billed This Period', value: formatKsh(totalBilled), icon: Zap, tone: 'orange' },
        ]}
        columns={[
          { key: 'unit', header: 'Unit' },
          { key: 'utilityType', header: 'Utility', render: (r) => <Badge tone={r.utilityType === 'Water' ? 'blue' : 'orange'}>{r.utilityType}</Badge> },
          { key: 'previous', header: 'Previous' },
          { key: 'current', header: 'Current' },
          { key: 'consumption', header: 'Units Used' },
          { key: 'amount', header: 'Billed', render: (r) => formatKsh(r.amount) },
          { key: 'date', header: 'Date', render: (r) => r.date || '—' },
        ]}
        rows={readings}
        searchKeys={['unit', 'utilityType']}
        searchPlaceholder="Search readings…"
      />

      <FormModal
        open={open}
        onClose={() => setOpen(false)}
        title="Submit Meter Reading"
        description="Enter the current meter value. The system computes units used since the last reading."
        onSubmit={handleSubmit}
        submitLabel={saving ? 'Saving…' : 'Save Reading'}
      >
        <Field label="Property">
          <Select value={form.property} onChange={(e) => setForm({ ...form, property: e.target.value, unit: '' })}>
            {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </Field>
        <Field label="Unit">
          <Select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
            <option value="">Select unit…</option>
            {units.map((u) => <option key={u.id} value={u.id}>{u.number || u.id}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Utility">
            <Select value={form.utilityType} onChange={(e) => setForm({ ...form, utilityType: e.target.value })}>
              <option>Water</option>
              <option>Electricity</option>
            </Select>
          </Field>
          <Field label="Rate per unit (KSh)">
            <TextInput type="number" value={form.ratePerUnit} onChange={(e) => setForm({ ...form, ratePerUnit: e.target.value })} />
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Previous reading (optional)">
            <TextInput type="number" value={form.previousReading} onChange={(e) => setForm({ ...form, previousReading: e.target.value })} placeholder="Auto from last reading" />
          </Field>
          <Field label="Current meter reading">
            <TextInput type="number" value={form.currentReading} onChange={(e) => setForm({ ...form, currentReading: e.target.value })} placeholder="e.g. 1420" />
          </Field>
        </div>
      </FormModal>
    </>
  )
}
