import { useRef, useState, useEffect } from 'react'
import { Upload, Download, FileSpreadsheet, Trash2, CheckCircle, AlertTriangle } from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { TableSkeleton } from '../ui/Skeleton'
import { api } from '../../api/client'

const TEMPLATE_HEADERS = ['Tenant Name', 'National ID', 'Phone', 'Email', 'Income Range', 'Property', 'Unit', 'Rent', 'Deposit', 'Already Paid']

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

export default function ImportTenantsModal({ open, onClose, onImport }) {
  const fileInputRef = useRef(null)
  const [rows, setRows] = useState([])
  const [errors, setErrors] = useState([])
  const [importing, setImporting] = useState(false)
  const [properties, setProperties] = useState([])
  const [defaultProperty, setDefaultProperty] = useState(null) // caretaker's default property
  const [units, setUnits] = useState({}) // { propertyId: [units] }

  // Load properties on open and auto-select first property for caretaker
  useEffect(() => {
    if (open) {
      api.getMyProperties().then((res) => {
        const list = res?.data || res || []
        setProperties(list)
        // Auto-select first property if caretaker has only one assigned
        if (list.length === 1) {
          setDefaultProperty(list[0].id)
          // Pre-load units for the default property
          loadUnitsForProperty(list[0].id)
        } else if (list.length > 0) {
          setDefaultProperty(list[0].id)
          loadUnitsForProperty(list[0].id)
        }
      }).catch(() => {})
    }
  }, [open])

  // Load units when property changes for a row - handles paginated response
  const loadUnitsForProperty = async (propertyId) => {
    if (!propertyId || units[propertyId]) return
    try {
      // Load all units with a large page size for the dropdown
      const result = await api.getUnits(propertyId, { pageSize: 100 })
      const unitList = result?.data || result || []
      setUnits((prev) => ({ ...prev, [propertyId]: unitList }))
    } catch {}
  }

  const reset = () => {
    setRows([])
    setErrors([])
    setImporting(false)
    setDefaultProperty(null)
  }

  const close = () => {
    reset()
    onClose()
  }

  const downloadTemplate = () => {
    const sample = [
      TEMPLATE_HEADERS.join(','),
      'Nancy Wairimu,29642998,+254712345678,nancy@email.com,20K - 50K,Sunset Apartments,A101,15000,30000,yes',
      'James Otieno,41738947,+254720111222,james@email.com,Below 20K,,,,,no',
    ].join('\n')
    const uri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(sample)
    const link = document.createElement('a')
    link.setAttribute('href', uri)
    link.setAttribute('download', 'Tenants_Import_Template.csv')
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
    const iName = idx('tenant name', 'list of tenants', 'name', 'tenant')
    const iId = idx('national id', 'national_id', 'id', 'id no', 'id number')
    const iPhone = idx('phone', 'phone number', 'phone_number', 'mobile')
    const iEmail = idx('email', 'email address', 'email_address')
    const iIncome = idx('income range', 'income_range', 'income')
    const iProperty = idx('property', 'property name', 'property_name')
    const iUnit = idx('unit', 'unit number', 'unit_number')
    const iRent = idx('rent', 'rent amount', 'rent_amount')
    const iDeposit = idx('deposit', 'deposit amount', 'deposit_amount', 'security deposit')
    const iAlreadyPaid = idx('already paid', 'already_paid', 'paid', 'migrated')

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
      const phone = at(cols, iPhone, 2)
      if (!name) {
        rowErrors.push(`Row ${i + 1}: missing tenant name — skipped.`)
        continue
      }
      if (!phone) {
        rowErrors.push(`Row ${i + 1}: "${name}" is missing a phone number — please complete before importing.`)
      }
      
      const alreadyPaidVal = at(cols, iAlreadyPaid, 9).toLowerCase()
      const alreadyPaid = ['yes', 'true', '1', 'y'].includes(alreadyPaidVal)
      
      parsed.push({
        name,
        national_id: at(cols, iId, 1),
        phone,
        email: at(cols, iEmail, 3),
        income_range: at(cols, iIncome, 4),
        property: at(cols, iProperty, 5) || defaultProperty || '', // auto-populate caretaker's property
        unit: at(cols, iUnit, 6),
        rent: at(cols, iRent, 7),
        deposit: at(cols, iDeposit, 8),
        already_paid: alreadyPaid,
      })
    }

    setRows(parsed)
    setErrors(rowErrors)
    // Pre-load units for the default property if rows use it
    if (defaultProperty && parsed.some(r => r.property === defaultProperty)) {
      loadUnitsForProperty(defaultProperty)
    }
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
    setRows((prev) => prev.map((r, i) => {
      if (i !== index) return r
      const updated = { ...r, [field]: value }
      // If property changed, clear unit and load units
      if (field === 'property') {
        updated.unit = ''
        if (value) loadUnitsForProperty(value)
      }
      return updated
    }))
  }

  const removeRow = (index) => {
    setRows((prev) => prev.filter((_, i) => i !== index))
  }

  const canImport = rows.length > 0 && rows.every((r) => r.name && r.phone)

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
    <Modal  open={open} onClose={close} title="Import Tenants" description="Bulk-create tenants from a CSV file. For existing tenants who already paid, check 'Already Paid' to mark them as migrated." size="2xl">
      <div className="space-y-4 ">
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
          <span className="font-medium">Required:</span> Tenant Name, Phone.
          <span className="font-medium ml-2">Migration:</span> If tenant already paid rent+deposit, set Property, Unit, Rent, Deposit and check "Already Paid" — accounting entries will be created automatically.
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
            <p className="text-sm font-medium text-slate-600">No tenants loaded yet</p>
            <p className="text-xs text-slate-400">Download the template, fill it in, then upload it here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-72 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-50 z-10">
                <tr className="text-slate-600 border-b border-slate-200">
                  <th className="p-2.5">Tenant Name</th>
                  <th className="p-2.5">Phone</th>
                  <th className="p-2.5">Property</th>
                  <th className="p-2.5">Unit</th>
                  <th className="p-2.5">Rent</th>
                  <th className="p-2.5">Deposit</th>
                  <th className="p-2.5 text-center">Already Paid</th>
                  <th className="p-2.5 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {rows.map((r, i) => {
                  const missing = !r.name || !r.phone
                  const propertyUnits = units[r.property] || []
                  return (
                    <tr key={i} className={missing ? 'bg-amber-50/40' : r.already_paid ? 'bg-green-50/40' : 'hover:bg-slate-50/50'}>
                      <td className="p-1.5">
                        <input value={r.name} onChange={(e) => updateCell(i, 'name', e.target.value)}
                          className="w-full px-2 py-1 border border-slate-200 rounded text-xs font-medium focus:outline-none focus:ring-1 focus:ring-brand-500" />
                      </td>
                      <td className="p-1.5">
                        <input value={r.phone} onChange={(e) => updateCell(i, 'phone', e.target.value)}
                          className="w-28 px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand-500" />
                      </td>
                      <td className="p-1.5">
                        <select 
                          value={r.property} 
                          onChange={(e) => updateCell(i, 'property', e.target.value)}
                          onFocus={() => r.property && loadUnitsForProperty(r.property)}
                          className="w-32 px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
                        >
                          <option value="">— Select —</option>
                          {properties.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-1.5">
                        <select 
                          value={r.unit} 
                          onChange={(e) => updateCell(i, 'unit', e.target.value)}
                          disabled={!r.property}
                          className="w-24 px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:bg-slate-100"
                        >
                          <option value="">— Select —</option>
                          {propertyUnits.map((u) => (
                            <option key={u.id} value={u.id}>{u.number}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-1.5">
                        <input 
                          type="number" 
                          value={r.rent} 
                          onChange={(e) => updateCell(i, 'rent', e.target.value)}
                          placeholder="0"
                          className="w-20 px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand-500" 
                        />
                      </td>
                      <td className="p-1.5">
                        <input 
                          type="number" 
                          value={r.deposit} 
                          onChange={(e) => updateCell(i, 'deposit', e.target.value)}
                          placeholder="0"
                          className="w-20 px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand-500" 
                        />
                      </td>
                      <td className="p-1.5 text-center">
                        <input 
                          type="checkbox" 
                          checked={r.already_paid || false}
                          onChange={(e) => updateCell(i, 'already_paid', e.target.checked)}
                          className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                          title="Check if this tenant has already paid rent + deposit (migration)"
                        />
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
            {rows.length > 0 ? `${rows.length} tenant${rows.length === 1 ? '' : 's'} loaded` : ''}
            {rows.filter(r => r.already_paid).length > 0 ? ` · ${rows.filter(r => r.already_paid).length} marked as already paid` : ''}
            {rows.length > 0 && !canImport ? ' · complete required fields to import' : ''}
          </span>
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" onClick={close} disabled={importing}>Cancel</Button>
            <Button type="button" icon={CheckCircle} onClick={handleImport} disabled={!canImport || importing}>
              {importing ? 'Importing…' : `Import ${rows.length || ''} Tenant${rows.length === 1 ? '' : 's'}`}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
