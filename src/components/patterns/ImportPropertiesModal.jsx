import { useRef, useState } from 'react'
import { Upload, Download, FileSpreadsheet, Trash2, CheckCircle, AlertTriangle } from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { TableSkeleton } from '../ui/Skeleton'

const TEMPLATE_HEADERS = [
  'property_id', 'property_name', 'property_type', 'physical_location', 'county', 'sub_county',
  'year_of_construction', 'number_of_units', 'number_of_floors', 'property_description',
  'amenities_available', 'landlord_name',
]

const PROPERTY_TYPES = ['Apartment', 'Villa / Maisonette', 'Bedsitter Block', 'Commercial Complex', 'Mixed Use']

// Split a single CSV line honoring simple double-quote quoting so values
// containing commas (e.g. an address) survive parsing.
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

export default function ImportPropertiesModal({ open, onClose, onImport }) {
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
      'PROP-001,Greenview Apartments,Apartment,"Argwings Kodhek Rd, Kilimani",Nairobi,Dagoretti North,2018,24,6,"Modern apartment block","Lift, borehole, CCTV, generator",Jane Njeri',
      'PROP-002,Riverside Villas,Villa / Maisonette,"Westlands",Nairobi,Westlands,2020,8,2,"Gated maisonettes","24/7 security, parking",John Kamau',
    ].join('\n')
    const uri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(sample)
    const link = document.createElement('a')
    link.setAttribute('href', uri)
    link.setAttribute('download', 'Properties_Import_Template.csv')
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
    const iId = idx('property_id', 'id')
    const iName = idx('property_name', 'name')
    const iType = idx('property_type', 'type')
    const iLoc = idx('physical_location', 'location', 'address')
    const iCounty = idx('county')
    const iSubCounty = idx('sub_county', 'sub-county', 'subcounty')
    const iYear = idx('year_of_construction', 'year_built', 'year')
    const iUnits = idx('number_of_units', 'units', 'total_units')
    const iFloors = idx('number_of_floors', 'floors')
    const iDesc = idx('property_description', 'description')
    const iAmenities = idx('amenities_available', 'amenities')
    const iLandlord = idx('landlord_name', 'landlord')

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
      if (!name) {
        rowErrors.push(`Row ${i + 1}: missing property name — skipped.`)
        continue
      }
      parsed.push({
        property_id: at(cols, iId, 0),
        property_name: name,
        property_type: at(cols, iType) || 'Apartment',
        location: at(cols, iLoc),
        county: at(cols, iCounty),
        sub_county: at(cols, iSubCounty),
        year_built: at(cols, iYear),
        total_units: at(cols, iUnits),
        floors: at(cols, iFloors),
        description: at(cols, iDesc),
        amenities: at(cols, iAmenities),
        landlord: at(cols, iLandlord),
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

  const handleImport = async () => {
    if (rows.length === 0) return
    setImporting(true)
    try {
      await onImport(rows)
      close()
    } finally {
      setImporting(false)
    }
  }

  return (
    <Modal open={open} onClose={close} title="Import Properties" description="Bulk-create multiple properties from a CSV file." size="lg">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFile}
            accept=".csv,.txt"
            className="hidden"
          />
          <Button type="button" variant="secondary" size="sm" icon={Download} onClick={downloadTemplate}>
            Download CSV Template
          </Button>
          <Button type="button" size="sm" icon={Upload} onClick={() => fileInputRef.current?.click()}>
            Upload CSV
          </Button>
        </div>

        <p className="text-xs text-slate-500">
          Columns: <span className="font-mono text-slate-600">{TEMPLATE_HEADERS.join(', ')}</span>. Only
          <span className="font-medium"> property_name</span> is required. Landlord name should match an existing landlord.
        </p>

        {errors.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-1">
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
            <p className="text-sm font-medium text-slate-600">No properties loaded yet</p>
            <p className="text-xs text-slate-400">Download the template, fill it in, then upload it here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-72 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-50 z-10">
                <tr className="text-slate-600 border-b border-slate-200">
                  <th className="p-2.5">Property Name</th>
                  <th className="p-2.5">Type</th>
                  <th className="p-2.5">Location</th>
                  <th className="p-2.5">County</th>
                  <th className="p-2.5">Units</th>
                  <th className="p-2.5">Landlord</th>
                  <th className="p-2.5 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {rows.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50/50">
                    <td className="p-1.5">
                      <input value={r.property_name} onChange={(e) => updateCell(i, 'property_name', e.target.value)}
                        className="w-full px-2 py-1 border border-slate-200 rounded text-xs font-medium focus:outline-none focus:ring-1 focus:ring-brand-500" />
                    </td>
                    <td className="p-1.5">
                      <select value={r.property_type} onChange={(e) => updateCell(i, 'property_type', e.target.value)}
                        className="w-full px-2 py-1 border border-slate-200 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-500">
                        {PROPERTY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                        {!PROPERTY_TYPES.includes(r.property_type) && <option value={r.property_type}>{r.property_type}</option>}
                      </select>
                    </td>
                    <td className="p-1.5">
                      <input value={r.location} onChange={(e) => updateCell(i, 'location', e.target.value)}
                        className="w-full px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand-500" />
                    </td>
                    <td className="p-1.5">
                      <input value={r.county} onChange={(e) => updateCell(i, 'county', e.target.value)}
                        className="w-full px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand-500" />
                    </td>
                    <td className="p-1.5">
                      <input value={r.total_units} onChange={(e) => updateCell(i, 'total_units', e.target.value)}
                        className="w-16 px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand-500" />
                    </td>
                    <td className="p-1.5">
                      <input value={r.landlord} onChange={(e) => updateCell(i, 'landlord', e.target.value)}
                        className="w-full px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand-500" />
                    </td>
                    <td className="p-1.5 text-center">
                      <button type="button" onClick={() => removeRow(i)} title="Remove"
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded">
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-slate-500">
            {rows.length > 0 ? `${rows.length} propert${rows.length === 1 ? 'y' : 'ies'} ready to import` : ''}
          </span>
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" onClick={close} disabled={importing}>Cancel</Button>
            <Button type="button" icon={CheckCircle} onClick={handleImport} disabled={rows.length === 0 || importing}>
              {importing ? 'Importing…' : `Import ${rows.length || ''} ${rows.length === 1 ? 'Property' : 'Properties'}`}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
