import { useRef, useState } from 'react'
import { Upload, Download, FileSpreadsheet, Trash2, CheckCircle, AlertTriangle } from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { TableSkeleton } from '../ui/Skeleton'

// Matches the payroll staff sheet columns.
const TEMPLATE_HEADERS = ['List of Staff', 'National ID', 'Designation', 'Salary', 'Due date', 'Bonus - Deposits']

// Split a single CSV line honoring simple double-quote quoting.
function splitCsvLine(line) {
  const out = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++ } else { inQuotes = !inQuotes }
    } else if (ch === ',' && !inQuotes) {
      out.push(cur); cur = ''
    } else {
      cur += ch
    }
  }
  out.push(cur)
  return out.map((c) => c.trim())
}

// Strip commas / currency symbols from a number-ish string.
const toNumber = (v) => {
  const n = Number(String(v || '').replace(/[^0-9.-]/g, ''))
  return Number.isFinite(n) ? n : ''
}

export default function ImportStaffModal({ open, onClose, onImport }) {
  const fileInputRef = useRef(null)
  const [rows, setRows] = useState([])
  const [errors, setErrors] = useState([])
  const [importing, setImporting] = useState(false)

  const reset = () => {
    setRows([])
    setErrors([])
    setImporting(false)
  }

  const close = () => {
    reset()
    onClose()
  }

  const downloadTemplate = () => {
    const sample = [
      TEMPLATE_HEADERS.join(','),
      'Justus Wesonga,29642998,Caretaker,10000,,',
      'William Samuel,41738947,Caretaker,10000,,',
      'Robert Chemosi Kisa,28139952,Caretaker,10000,,',
      'Doreen Wafula,36665533,Office Staff,10000,,',
    ].join('\n')
    const uri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(sample)
    const link = document.createElement('a')
    link.setAttribute('href', uri)
    link.setAttribute('download', 'Staff_Payroll_Import_Template.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const parseText = (text) => {
    const lines = text.split(/\r\n|\n/).filter((l) => l.trim().length > 0)
    if (lines.length < 2) {
      setErrors(['File is empty or has no data rows below the header.'])
      setRows([])
      return
    }

    const headers = splitCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/['"]+/g, '').trim())
    const idx = (...names) => {
      for (const n of names) {
        const i = headers.indexOf(n)
        if (i !== -1) return i
      }
      return -1
    }
    const iName = idx('list of staff', 'name', 'staff', 'employee_name')
    const iId = idx('national id', 'national_id', 'id', 'id no')
    const iDesig = idx('designation', 'role', 'title')
    const iSalary = idx('salary', 'gross salary', 'gross_salary')
    const iBonus = idx('bonus - deposits', 'bonus-deposits', 'bonus', 'bonus_deposit', 'deposits')

    const at = (cols, i, fallbackIndex) => {
      if (i !== -1) return (cols[i] || '').trim()
      if (fallbackIndex != null) return (cols[fallbackIndex] || '').trim()
      return ''
    }

    const parsed = []
    const rowErrors = []

    for (let i = 1; i < lines.length; i++) {
      const cols = splitCsvLine(lines[i])
      const name = at(cols, iName, 0)
      const salary = toNumber(at(cols, iSalary, 3))
      if (!name) {
        rowErrors.push(`Row ${i + 1}: missing staff name — skipped.`)
        continue
      }
      if (salary === '' || salary <= 0) {
        rowErrors.push(`Row ${i + 1}: "${name}" is missing a salary — please complete before importing.`)
      }
      parsed.push({
        name,
        national_id: at(cols, iId, 1),
        designation: at(cols, iDesig, 2) || 'Office Staff',
        salary,
        bonus_deposit: toNumber(at(cols, iBonus)),
      })
    }

    setRows(parsed)
    setErrors(rowErrors)
  }

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        parseText(ev.target.result)
      } catch {
        setErrors(['Could not read the file. Please use a CSV file matching the template.'])
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const updateCell = (index, field, value) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)))
  }

  const removeRow = (index) => {
    setRows((prev) => prev.filter((_, i) => i !== index))
  }

  const canImport = rows.length > 0 && rows.every((r) => r.name && Number(r.salary) > 0)

  const handleImport = async () => {
    if (!canImport) return
    setImporting(true)
    try {
      await onImport(rows)
      close()
    } finally {
      setImporting(false)
    }
  }

  return (
    <Modal open={open} onClose={close} title="Import Staff" description="Bulk-create staff and enroll them on payroll from a CSV file." size="lg">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <input type="file" ref={fileInputRef} onChange={handleFile} accept=".csv,.txt" className="hidden" />
          <Button type="button" variant="secondary" size="sm" icon={Download} onClick={downloadTemplate}>
            Download CSV Template
          </Button>
          <Button type="button" size="sm" icon={Upload} onClick={() => fileInputRef.current?.click()}>
            Upload CSV
          </Button>
        </div>

        <p className="text-xs text-slate-500">
          Columns: <span className="font-mono text-slate-600">{TEMPLATE_HEADERS.join(', ')}</span>.
          <span className="font-medium"> List of Staff and Salary</span> are required. Due date is optional and applies at payroll run time (not stored per employee).
        </p>

        {errors.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-1 max-h-28 overflow-y-auto">
            {errors.map((e, i) => (
              <p key={i} className="text-xs text-amber-700 flex items-start gap-1.5">
                <AlertTriangle size={13} className="mt-0.5 shrink-0" /> {e}
              </p>
            ))}
          </div>
        )}

        {importing ? (
          <TableSkeleton columns={5} rows={4} />
        ) : rows.length === 0 ? (
          <div className="py-10 text-center border-2 border-dashed border-slate-200 rounded-xl">
            <FileSpreadsheet className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-600">No staff loaded yet</p>
            <p className="text-xs text-slate-400">Download the template, fill it in, then upload it here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-72 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-50 z-10">
                <tr className="text-slate-600 border-b border-slate-200">
                  <th className="p-2.5">List of Staff</th>
                  <th className="p-2.5">National ID</th>
                  <th className="p-2.5">Designation</th>
                  <th className="p-2.5">Salary</th>
                  <th className="p-2.5">Bonus / Deposits</th>
                  <th className="p-2.5 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {rows.map((r, i) => {
                  const missing = !r.name || !(Number(r.salary) > 0)
                  return (
                    <tr key={i} className={missing ? 'bg-amber-50/40' : 'hover:bg-slate-50/50'}>
                      <td className="p-1.5">
                        <input value={r.name} onChange={(e) => updateCell(i, 'name', e.target.value)}
                          className="w-full px-2 py-1 border border-slate-200 rounded text-xs font-medium focus:outline-none focus:ring-1 focus:ring-brand-500" />
                      </td>
                      <td className="p-1.5">
                        <input value={r.national_id} onChange={(e) => updateCell(i, 'national_id', e.target.value)}
                          className="w-28 px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand-500" />
                      </td>
                      <td className="p-1.5">
                        <input value={r.designation} onChange={(e) => updateCell(i, 'designation', e.target.value)}
                          className="w-full px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand-500" />
                      </td>
                      <td className="p-1.5">
                        <input type="number" value={r.salary} onChange={(e) => updateCell(i, 'salary', e.target.value)}
                          className="w-24 px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand-500" />
                      </td>
                      <td className="p-1.5">
                        <input type="number" value={r.bonus_deposit} onChange={(e) => updateCell(i, 'bonus_deposit', e.target.value)}
                          className="w-24 px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand-500" />
                      </td>
                      <td className="p-1.5 text-center">
                        <button type="button" onClick={() => removeRow(i)} title="Remove"
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded">
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-slate-500">
            {rows.length > 0 ? `${rows.length} staff loaded` : ''}
            {rows.length > 0 && !canImport ? ' · complete required fields to import' : ''}
          </span>
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" onClick={close} disabled={importing}>Cancel</Button>
            <Button type="button" icon={CheckCircle} onClick={handleImport} disabled={!canImport || importing}>
              {importing ? 'Importing…' : `Import ${rows.length || ''} Staff`}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
