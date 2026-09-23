import { useState, useEffect } from 'react'
import { Store, Eye, Users, Plus } from 'lucide-react'
import ListPageTemplate from '../../components/patterns/ListPageTemplate'
import FormModal from '../../components/patterns/FormModal'
import Button from '../../components/ui/Button'
import { Field, TextInput, Select } from '../../components/ui/Field'
import { useToast } from '../../context/ToastContext'
import { vacancies as initialVacancies, properties, formatKsh } from '../../data/mockData'
import { api } from '../../api/client'

export default function VacancyManagement() {
  const { showToast } = useToast()
  const [vacancies, setVacancies] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ property: properties[0]?.name || 'Greenview Apartments', unit: '', rent: '' })

  useEffect(() => {
    let mounted = true
    api.getUnits().then((units) => {
      if (mounted && Array.isArray(units)) {
        const vacantUnits = units.filter(u => u.status === 'Vacant').map((u, i) => ({
          id: `V-0${i + 1}`,
          property: u.property,
          unit: u.unit,
          rent: u.rent,
          listedOn: '2026-09-01',
          views: 0,
          leads: 0
        }))
        setVacancies(vacantUnits)
      }
    }).catch(() => {}).finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [])

  const handleSubmit = () => {
    if (!form.unit || !form.rent) return
    setVacancies((prev) => [
      { id: `V-${String(prev.length + 1).padStart(2, '0')}`, property: form.property, unit: form.unit, rent: Number(form.rent), listedOn: new Date().toISOString().slice(0, 10), views: 0, leads: 0 },
      ...prev,
    ])
    showToast('Vacancy listed on the marketplace.')
    setForm({ property: properties[0]?.name || 'Greenview Apartments', unit: '', rent: '' })
    setOpen(false)
  }

  return (
    <>
      <ListPageTemplate
        title="Vacancy Management"
        description="Track vacant units and how they're performing once listed."
        loading={loading}
        actions={<Button icon={Plus} onClick={() => setOpen(true)}>List Vacancy</Button>}
        stats={[
          { label: 'Open Vacancies', value: vacancies.length, icon: Store },
          { label: 'Total Views', value: vacancies.reduce((s, v) => s + (v.views || 0), 0), icon: Eye, tone: 'blue' },
          { label: 'Total Leads', value: vacancies.reduce((s, v) => s + (v.leads || 0), 0), icon: Users, tone: 'brand' },
          { label: 'Avg. Days Listed', value: 12, icon: Store, tone: 'orange' },
        ]}
        columns={[
          { key: 'property', header: 'Property' },
          { key: 'unit', header: 'Unit' },
          { key: 'rent', header: 'Rent', render: (r) => formatKsh(r.rent) },
          { key: 'listedOn', header: 'Listed On' },
          { key: 'views', header: 'Views' },
          { key: 'leads', header: 'Leads' },
        ]}
        rows={vacancies}
        searchKeys={['property', 'unit']}
        searchPlaceholder="Search vacancies…"
      />

      <FormModal
        open={open}
        onClose={() => setOpen(false)}
        title="List Vacancy"
        description="Publish a vacant unit to the marketplace."
        onSubmit={handleSubmit}
        submitLabel="List Vacancy"
      >
        <Field label="Property">
          <Select value={form.property} onChange={(e) => setForm({ ...form, property: e.target.value })}>
            {properties.map((p) => <option key={p.id}>{p.name}</option>)}
          </Select>
        </Field>
        <Field label="Unit">
          <TextInput required value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="e.g. C2" />
        </Field>
        <Field label="Monthly rent (KSh)">
          <TextInput type="number" required value={form.rent} onChange={(e) => setForm({ ...form, rent: e.target.value })} placeholder="32000" />
        </Field>
      </FormModal>
    </>
  )
}
