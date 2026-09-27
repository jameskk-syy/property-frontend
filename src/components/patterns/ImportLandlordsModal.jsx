import { useRef, useState } from 'react'
import { Upload, Download, FileSpreadsheet, Trash2, CheckCircle, AlertTriangle } from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { TableSkeleton } from '../ui/Skeleton'

const TEMPLATE_HEADERS = ['landlord_id', 'landlord_name', 'phone_number', 'email_address', 'properties_owned']

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

export default function ImportLandlordsModal({ open, onClose, onImport }) {
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
      'L-01,Susan Njoroge,+254712345678,susan@email.com,"Greenview Apartments; Riverside Villas"',
      'L-02,John Kamau,+254720111222,john@email.com,Parklands Court',
    ].join('\n')
    const uri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(sample)
    const link = document.createElement('a')
    link.setAttribute('href', uri)
    link.setAttribute('download', 'Landlords_Import_Template.csv')
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

    const headers = splitCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/['"]+/g, ''))
    const idx = (...names) => {
      for (const n of names) {
        const i = headers.indexOf(n)
        if (i !== -1) return i
      }
      return -1
    }
    const iId = idx('landlord_id', 'id')
    const iName = idx('landlord_name', 'name')
    const iPhone = idx('phone_number', 'phone')
    const iEmail = idx('email_address', 'email')
    const iProps = idx('properties_owned', 'properties', 'property')

    const at = (cols, i, fallbackIndex) => {
      if (i !== -1) return (cols[i] || '').trim()
      if (fallbackIndex != null) return (cols[fallbackIndex] || '').trim()
      return ''
    }

    const parsed = []
    const rowErrors = []

    for (let i = 1; i < lines.length; i++) {
      const cols = splitCsvLine(lines[i])
      const name = at(cols, iName, 1)
      const phone = at(cols, iPhone, 2)
      const email = at(cols, iEmail, 3)
      if (!name) {
        rowErrors.push(`Row ${i + 1}: missing landlord name — skipped.`)
        continue
      }
      if (!phone || !email) {
        rowErrors.push(`Row ${i + 1}: "${name}" is missing phone or email — please complete before importing.`)
      }
      parsed.push({
        landlord_id: at(cols, iId, 0),
        landlord_name: name,
        phone_number: phone,
        email_address: email,
        properties_owned: at(cols, iProps),
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

  const canImport = rows.length > 0 && rows.every((r) => r.landlord_name && r.phone_number && r.email_address)

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
    <Modal open={open} onClose={close} title="Import Landlords" description="Bulk-create multiple landlords from a CSV file." size="2xl">
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
          <span className="font-medium"> landlord_name, phone_number and email_address</span> are required. Separate multiple properties with a semicolon.
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
          <TableSkeleton columns={4} rows={4} />
        ) : rows.length === 0 ? (
          <div className="py-10 text-center border-2 border-dashed border-slate-200 rounded-xl">
            <FileSpreadsheet className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-600">No landlords loaded yet</p>
            <p className="text-xs text-slate-400">Download the template, fill it in, then upload it here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-72 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-50 z-10">
                <tr className="text-slate-600 border-b border-slate-200">
                  <th className="p-2.5">ID</th>
                  <th className="p-2.5">Landlord Name</th>
                  <th className="p-2.5">Phone</th>
                  <th className="p-2.5">Email</th>
                  <th className="p-2.5">Properties Owned</th>
                  <th className="p-2.5 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {rows.map((r, i) => {
                  const missing = !r.landlord_name || !r.phone_number || !r.email_address
                  return (
                    <tr key={i} className={missing ? 'bg-amber-50/40' : 'hover:bg-slate-50/50'}>
                      <td className="p-1.5">
                        <input value={r.landlord_id} onChange={(e) => updateCell(i, 'landlord_id', e.target.value)}
                          className="w-20 px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand-500" />
                      </td>
                      <td className="p-1.5">
                        <input value={r.landlord_name} onChange={(e) => updateCell(i, 'landlord_name', e.target.value)}
                          className="w-full px-2 py-1 border border-slate-200 rounded text-xs font-medium focus:outline-none focus:ring-1 focus:ring-brand-500" />
                      </td>
                      <td className="p-1.5">
                        <input value={r.phone_number} onChange={(e) => updateCell(i, 'phone_number', e.target.value)}
                          className="w-full px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand-500" />
                      </td>
                      <td className="p-1.5">
                        <input value={r.email_address} onChange={(e) => updateCell(i, 'email_address', e.target.value)}
                          className="w-full px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand-500" />
                      </td>
                      <td className="p-1.5">
                        <input value={r.properties_owned} onChange={(e) => updateCell(i, 'properties_owned', e.target.value)}
                          className="w-full px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand-500" />
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
            {rows.length > 0 ? `${rows.length} landlord${rows.length === 1 ? '' : 's'} loaded` : ''}
            {rows.length > 0 && !canImport ? ' · complete required fields to import' : ''}
          </span>
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" onClick={close} disabled={importing}>Cancel</Button>
            <Button type="button" icon={CheckCircle} onClick={handleImport} disabled={!canImport || importing}>
              {importing ? 'Importing…' : `Import ${rows.length || ''} Landlord${rows.length === 1 ? '' : 's'}`}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
