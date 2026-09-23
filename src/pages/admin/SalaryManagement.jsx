import { useState, useEffect } from 'react'
import { Banknote, Users, Plus, PlayCircle, Upload } from 'lucide-react'
import ListPageTemplate from '../../components/patterns/ListPageTemplate'
import FormModal from '../../components/patterns/FormModal'
import ImportStaffModal from '../../components/patterns/ImportStaffModal'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { Field, TextInput, Select } from '../../components/ui/Field'
import { useToast } from '../../context/ToastContext'
import { formatKsh } from '../../data/mockData'
import { api } from '../../api/client'

const DESIGNATIONS = [
  'Caretaker',
  'Office Staff',
  'Construction Worker',
  'Security Guard',
  'Property Manager',
  'Accountant',
]

const emptyForm = { name: '', role: 'Caretaker', property: '', salary: '', phone: '', email: '' }

export default function SalaryManagement() {
  const { showToast } = useToast()
  const [employees, setEmployees] = useState([])
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [running, setRunning] = useState(false)
  const [statutory, setStatutory] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [payrollScope, setPayrollScope] = useState('') // '' = whole organization
  const [importOpen, setImportOpen] = useState(false)

  useEffect(() => {
    let mounted = true
    api.getEmployees().then((res) => {
      if (mounted && Array.isArray(res)) setEmployees(res)
    }).catch(() => {}).finally(() => { if (mounted) setLoading(false) })
    api.getProperties().then((res) => {
      if (mounted && res && res.length > 0) setProperties(res)
    }).catch(() => {})
    return () => { mounted = false }
  }, [])

  // Live statutory preview (PAYE / NSSF / SHIF / Housing Levy) as gross changes
  useEffect(() => {
    const gross = Number(form.salary)
    if (!open || !gross) { setStatutory(null); return }
    let active = true
    const t = setTimeout(() => {
      api.previewStatutory(gross)
        .then((res) => { if (active) setStatutory(res) })
        .catch(() => { if (active) setStatutory(null) })
    }, 400)
    return () => { active = false; clearTimeout(t) }
  }, [form.salary, open])

  const totalPayroll = employees.reduce((s, p) => s + (p.salary || 0), 0)

  const refresh = async () => {
    const updated = await api.getEmployees()
    if (updated && updated.length > 0) setEmployees(updated)
  }

  const handleSubmit = async () => {
    if (!form.name || !form.salary) {
      showToast('Name and gross salary are required.')
      return
    }
    setSaving(true)
    try {
      const res = await api.createEmployeeWithPayroll({
        name: form.name,
        role: form.role,
        property: form.property || null,
        salary: Number(form.salary),
        phone: form.phone || null,
        email: form.email || null,
      })
      showToast(
        res && res.payroll_enrolled === false
          ? `${form.name} added to HR. Payroll enrollment pending backend setup.`
          : `${form.name} added to HR and enrolled on payroll.`
      )
      await refresh()
      setOpen(false)
      setForm(emptyForm)
    } catch (err) {
      showToast(err.message || 'Could not add employee.')
    } finally {
      setSaving(false)
    }
  }

  const handleImportStaff = async (staffRows) => {
    try {
      const res = await api.bulkCreateEmployees(staffRows)
      const created = (res && res.created && res.created.length) || 0
      const failed = (res && res.failed && res.failed.length) || 0
      showToast(
        failed
          ? `Imported ${created} staff. ${failed} row${failed === 1 ? '' : 's'} failed — check names and salaries.`
          : `Imported ${created} staff and enrolled them on payroll.`
      )
      await refresh()
    } catch (err) {
      showToast(err.message || 'Could not import staff.')
      throw err // keep the modal open on failure
    }
  }

  const handleRunPayroll = async () => {
    setRunning(true)
    try {
      const period = new Date().toISOString().slice(0, 7) // YYYY-MM
      // Scope by property if chosen; otherwise the backend resolves the
      // organization (single/first org, or the user's assigned org).
      const res = await api.runPayroll({ period, property: payrollScope || undefined })
      // Backend returns { slips: <count>, salary_slips: [...], total_net }
      const count = res && typeof res.slips === 'number'
        ? res.slips
        : (res && res.salary_slips && res.salary_slips.length) || 0
      showToast(count ? `Payroll run complete: ${count} salary slips generated.` : 'Payroll run submitted (no eligible employees).')
      await refresh()
    } catch (err) {
      showToast(err.message || 'Payroll run failed. Check company/payroll setup.')
    } finally {
      setRunning(false)
    }
  }

  return (
    <>
      <ListPageTemplate
        title="Salary & Payroll"
        description="Manage employee salaries and run monthly HRMS payroll."
        loading={loading}
        actions={
          <div className="flex items-center gap-2.5">
            <div className="w-52">
              <Select value={payrollScope} onChange={(e) => setPayrollScope(e.target.value)} className="text-sm">
                <option value="">Whole organization</option>
                {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </div>
            <Button variant="secondary" icon={PlayCircle} onClick={handleRunPayroll} disabled={running}>
              {running ? 'Running…' : 'Run Payroll'}
            </Button>
            <Button variant="secondary" icon={Upload} onClick={() => setImportOpen(true)}>Import Staff</Button>
            <Button icon={Plus} onClick={() => setOpen(true)}>Add Staff</Button>
          </div>
        }
        stats={[
          { label: 'Employees', value: employees.length, icon: Users },
          { label: 'Monthly Payroll', value: formatKsh(totalPayroll), icon: Banknote, tone: 'blue' },
        ]}
        columns={[
          { key: 'name', header: 'Employee' },
          { key: 'role', header: 'Designation' },
          { key: 'property', header: 'Property', render: (r) => r.property || '—' },
          { key: 'salary', header: 'Gross Salary', render: (r) => formatKsh(r.salary || 0) },
          { key: 'status', header: 'Status', render: (r) => <Badge>{r.status || 'Active'}</Badge> },
        ]}
        rows={employees}
        searchKeys={['name', 'role', 'property']}
        searchPlaceholder="Search employees…"
      />
      <ImportStaffModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={handleImportStaff}
      />
      <FormModal
        title="Add Staff"
        description="Adds the person as an HR Employee and enrolls them on payroll."
        open={open}
        onClose={() => setOpen(false)}
        onSubmit={handleSubmit}
        submitLabel={saving ? 'Saving…' : 'Add to HR & Payroll'}
      >
        <Field label="Full Name">
          <TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Grace Wanjiru" />
        </Field>
        <Field label="Designation">
          <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            {DESIGNATIONS.map((d) => <option key={d} value={d}>{d}</option>)}
          </Select>
        </Field>
        <Field label="Property (optional)">
          <Select value={form.property} onChange={(e) => setForm({ ...form, property: e.target.value })}>
            <option value="">— Not assigned —</option>
            {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="M-Pesa Phone">
            <TextInput value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="2547XXXXXXXX" />
          </Field>
          <Field label="Email (optional)">
            <TextInput type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@nest.co.ke" />
          </Field>
        </div>
        <Field label="Gross Salary (KSh)">
          <TextInput type="number" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} placeholder="25000" />
        </Field>

        {statutory && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 space-y-1.5">
            <p className="font-semibold text-slate-700">Statutory deductions preview</p>
            <div className="flex justify-between"><span>PAYE</span><span>{formatKsh(statutory.paye)}</span></div>
            <div className="flex justify-between"><span>NSSF</span><span>{formatKsh(statutory.nssf)}</span></div>
            <div className="flex justify-between"><span>SHIF</span><span>{formatKsh(statutory.shif)}</span></div>
            <div className="flex justify-between"><span>Housing Levy</span><span>{formatKsh(statutory.housing_levy)}</span></div>
            <div className="flex justify-between font-semibold text-slate-800 border-t border-slate-200 pt-1.5">
              <span>Estimated Net Pay</span>
              <span>{formatKsh(statutory.net_pay != null ? statutory.net_pay : (Number(form.salary) - (statutory.total_deductions || 0)))}</span>
            </div>
          </div>
        )}
      </FormModal>
    </>
  )
}
