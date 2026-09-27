import { useState, useEffect, useCallback } from 'react'
import { Gauge, Plus, Droplets, Zap } from 'lucide-react'
import ListPageTemplate from '../../components/patterns/ListPageTemplate'
import FormModal from '../../components/patterns/FormModal'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { Field, TextInput, Select } from '../../components/ui/Field'
import AsyncSearchSelect from '../../components/ui/AsyncSearchSelect'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../context/AuthContext'
import { formatKsh } from '../../data/mockData'
import { api } from '../../api/client'

export default function CaretakerMeterReadings() {
  const { showToast } = useToast()
  const { user } = useAuth()
  const [readings, setReadings] = useState([])
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ property: '', unit: '', utilityType: 'Water', currentReading: '', previousReading: '', ratePerUnit: 150 })
  // Key to force AsyncSearchSelect to reset when property changes
  const [unitSelectKey, setUnitSelectKey] = useState(0)

  const loadReadings = (property) => {
    setLoading(true)
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

  // Server-side search for units
  const fetchUnits = useCallback(async ({ search, page, pageSize }) => {
    if (!form.property) return { data: [] }
    try {
      const result = await api.getUnits(form.property, { search, page, pageSize: pageSize || 20 })
      const unitList = result?.data || result || []
      return {
        data: unitList.map((u) => ({
          ...u,
          name: u.id,
          label: u.number || u.id,
        })),
        pagination: result?.pagination
      }
    } catch (err) {
      console.error('Error fetching units:', err)
      return { data: [] }
    }
  }, [form.property])

  const handlePropertyChange = (propertyId) => {
    setForm({ ...form, property: propertyId, unit: '' })
    // Increment key to force AsyncSearchSelect to reset and refetch
    setUnitSelectKey(k => k + 1)
  }

  const handleUnitChange = (unit) => {
    const unitId = unit?.id || unit?.name || unit
    setForm({ ...form, unit: unitId })
  }

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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Property">
            <Select value={form.property} onChange={(e) => handlePropertyChange(e.target.value)}>
              {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </Field>
          <Field label="Unit (searchable)">
            <AsyncSearchSelect
              key={unitSelectKey}
              value={form.unit}
              onChange={handleUnitChange}
              fetchOptions={fetchUnits}
              disabled={!form.property}
              placeholder={form.property ? 'Search units…' : 'Select a property first'}
              labelKey="label"
              valueKey="id"
            />
          </Field>
          <Field label="Utility">
            <Select value={form.utilityType} onChange={(e) => setForm({ ...form, utilityType: e.target.value })}>
              <option>Water</option>
              <option>Electricity</option>
            </Select>
          </Field>
          <Field label="Rate per unit (KSh)">
            <TextInput type="number" value={form.ratePerUnit} onChange={(e) => setForm({ ...form, ratePerUnit: e.target.value })} />
          </Field>
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
