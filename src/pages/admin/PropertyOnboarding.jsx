import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Home, Plus, Trash2, Upload, Download, Sparkles,
  Building, CheckCircle, FileSpreadsheet, Layers,
  DollarSign, Shield, ArrowRight
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../../components/ui/PageHeader'
import Card from '../../components/ui/Card'
import { Field, TextInput, Select, TextArea } from '../../components/ui/Field'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import ImageGallery from '../../components/ui/ImageGallery'
import AsyncSearchSelect from '../../components/ui/AsyncSearchSelect'
import ImportPropertiesModal from '../../components/patterns/ImportPropertiesModal'
import { useToast } from '../../context/ToastContext'
import { formatKsh } from '../../data/mockData'
import { api } from '../../api/client'

const PROPERTY_TYPES = ['Apartment', 'Villa / Maisonette', 'Bedsitter Block', 'Commercial Complex', 'Mixed Use']

// Kenya's 47 counties for the County selector.
const COUNTIES = [
  'Baringo', 'Bomet', 'Bungoma', 'Busia', 'Elgeyo-Marakwet', 'Embu', 'Garissa', 'Homa Bay',
  'Isiolo', 'Kajiado', 'Kakamega', 'Kericho', 'Kiambu', 'Kilifi', 'Kirinyaga', 'Kisii', 'Kisumu',
  'Kitui', 'Kwale', 'Laikipia', 'Lamu', 'Machakos', 'Makueni', 'Mandera', 'Marsabit', 'Meru',
  'Migori', 'Mombasa', "Murang'a", 'Nairobi', 'Nakuru', 'Nandi', 'Narok', 'Nyamira', 'Nyandarua',
  'Nyeri', 'Samburu', 'Siaya', 'Taita-Taveta', 'Tana River', 'Tharaka-Nithi', 'Trans Nzoia',
  'Turkana', 'Uasin Gishu', 'Vihiga', 'Wajir', 'West Pokot',
]

const UNIT_TYPES = [
  'Bedsitter',
  'Studio',
  '1 Bedroom',
  '2 Bedroom',
  '3 Bedroom',
  '4 Bedroom',
  'Penthouse',
  'Commercial Shop',
  'Office Space'
]

const FLOORS = [
  'Ground Floor',
  '1st Floor',
  '2nd Floor',
  '3rd Floor',
  '4th Floor',
  '5th Floor',
  '6th Floor',
  '7th Floor',
  '8th Floor',
  'Basement'
]

export default function PropertyOnboarding() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const fileInputRef = useRef(null)

  const [importOpen, setImportOpen] = useState(false)
  const [form, setForm] = useState({
    propertyId: '',
    name: '',
    type: 'Apartment',
    location: '',
    county: '',
    subCounty: '',
    yearBuilt: '',
    floors: '',
    description: '',
    amenities: '',
    images: [],
    landlord: '',
    caretaker: ''
  })

  // Units state
  const [units, setUnits] = useState([
    { unit_number: 'A-101', floor: '1st Floor', unit_type: '2 Bedroom', base_rent: 35000, security_deposit: 35000 },
    { unit_number: 'A-102', floor: '1st Floor', unit_type: '2 Bedroom', base_rent: 35000, security_deposit: 35000 },
    { unit_number: 'A-103', floor: '1st Floor', unit_type: '1 Bedroom', base_rent: 25000, security_deposit: 25000 },
    { unit_number: 'A-104', floor: '1st Floor', unit_type: '1 Bedroom', base_rent: 25000, security_deposit: 25000 }
  ])

  // Generator modal / panel state
  const [genConfig, setGenConfig] = useState({
    prefix: 'A-',
    startNum: 1,
    count: 8,
    floor: '1st Floor',
    unitType: '2 Bedroom',
    rent: 35000,
    deposit: 35000
  })
  const [showGenerator, setShowGenerator] = useState(false)
  const [loading, setLoading] = useState(false)

  // Fetch functions for AsyncSearchSelect
  const fetchLandlords = useCallback(async ({ search, page, pageSize }) => {
    return await api.getLandlords({ search, page, pageSize })
  }, [])

  const fetchCaretakers = useCallback(async ({ search, page, pageSize }) => {
    return await api.getCaretakers({ search, page, pageSize })
  }, [])

  const handleLandlordChange = (option) => {
    setForm({ ...form, landlord: option?.name || '' })
  }

  const handleCaretakerChange = (option) => {
    setForm({ ...form, caretaker: option?.name || '' })
  }

  const handleAddNewLandlord = () => {
    showToast('Redirecting to Onboard Landlord…')
    navigate('/admin/landlords?new=true')
  }

  const handleAddNewCaretaker = () => {
    showToast('Redirecting to Onboard Caretaker…')
    navigate('/admin/caretakers?new=true')
  }

  // --- UNIT LIST ACTIONS ---
  const handleAddSingleUnit = () => {
    const nextIdx = units.length + 1
    setUnits([
      ...units,
      {
        unit_number: `Unit-${String(nextIdx).padStart(2, '0')}`,
        floor: 'Ground Floor',
        unit_type: '2 Bedroom',
        base_rent: 30000,
        security_deposit: 30000
      }
    ])
  }

  const handleRemoveUnit = (index) => {
    setUnits(units.filter((_, i) => i !== index))
  }

  const handleUnitFieldChange = (index, field, value) => {
    const updated = [...units]
    updated[index][field] = value
    setUnits(updated)
  }

  const handleBatchGenerate = () => {
    const count = parseInt(genConfig.count) || 1
    const start = parseInt(genConfig.startNum) || 1
    const generated = []

    for (let i = 0; i < count; i++) {
      const num = start + i
      generated.push({
        unit_number: `${genConfig.prefix}${num}`,
        floor: genConfig.floor,
        unit_type: genConfig.unitType,
        base_rent: Number(genConfig.rent) || 0,
        security_deposit: Number(genConfig.deposit) || 0
      })
    }

    setUnits([...units, ...generated])
    setShowGenerator(false)
    showToast(`Generated ${count} units successfully!`)
  }

  // --- CSV / EXCEL IMPORT ---
  const handleDownloadTemplate = () => {
    const csvContent = 'data:text/csv;charset=utf-8,unit_number,floor,unit_type,base_rent,security_deposit\n' +
      'A-101,1st Floor,2 Bedroom,35000,35000\n' +
      'A-102,1st Floor,2 Bedroom,35000,35000\n' +
      'B-201,2nd Floor,1 Bedroom,25000,25000\n' +
      'B-202,2nd Floor,Studio,18000,18000\n'

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', 'Property_Units_Template.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showToast('Template downloaded. Fill in Excel and upload below.')
  }

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const text = event.target.result
        const lines = text.split(/\r\n|\n/).filter((l) => l.trim().length > 0)
        if (lines.length < 2) {
          showToast('File is empty or missing data.')
          return
        }

        const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/['"]+/g, ''))
        const parsedUnits = []

        for (let i = 1; i < lines.length; i++) {
          const row = lines[i].split(',').map((c) => c.trim().replace(/['"]+/g, ''))
          if (row.length >= 2) {
            const unitObj = {
              unit_number: row[0] || `Unit-${i}`,
              floor: row[1] || 'Ground Floor',
              unit_type: row[2] || '2 Bedroom',
              base_rent: Number(row[3]) || 30000,
              security_deposit: Number(row[4]) || 30000
            }
            parsedUnits.push(unitObj)
          }
        }

        if (parsedUnits.length > 0) {
          setUnits([...units, ...parsedUnits])
          showToast(`Successfully imported ${parsedUnits.length} units from spreadsheet!`)
        } else {
          showToast('Could not parse units from file format.')
        }
      } catch (err) {
        showToast('Error reading file. Please use CSV format.')
      }
    }
    reader.readAsText(file)
  }

  // --- SUBMISSION ---
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name || !form.location) {
      showToast('Please specify property name and location.')
      return
    }

    setLoading(true)
    try {
      // Create the property AND its units in one backend call, so units inherit
      // the organization server-side (Property Unit requires it).
      const createdProp = await api.createProperty({
        property_id: form.propertyId,
        property_name: form.name,
        property_type: form.type,
        location: form.location,
        county: form.county,
        sub_county: form.subCounty,
        year_built: form.yearBuilt,
        total_units: units.length || 1,
        floors: form.floors,
        description: form.description,
        amenities: form.amenities,
        images: form.images,
        landlord: form.landlord,
        caretaker: form.caretaker,
        units,
      })

      const result = createdProp?.units || { created: [], failed: [] }
      const createdCount = result.created?.length || 0
      const failedCount = result.failed?.length || 0

      if (failedCount > 0) {
        showToast(`${form.name} created with ${createdCount} units; ${failedCount} unit(s) failed. Check unit details.`)
      } else {
        showToast(`${form.name} registered with ${createdCount} unit(s).`)
      }
      navigate('/admin/properties')
    } catch (err) {
      // Do NOT mask the failure with a success message.
      showToast(err?.message || `Could not register ${form.name}. Please try again.`)
    } finally {
      setLoading(false)
    }
  }

  const handleBulkImport = async (propertyRows) => {
    const result = await api.bulkCreateProperties(propertyRows)
    const okCount = result.created.length
    const failCount = result.failed.length
    if (okCount > 0 && failCount === 0) {
      showToast(`Imported ${okCount} propert${okCount === 1 ? 'y' : 'ies'} successfully!`)
    } else if (okCount > 0 && failCount > 0) {
      showToast(`Imported ${okCount}, but ${failCount} failed. Check names and try again.`)
    } else {
      showToast('Could not import properties. Please check the file and try again.')
    }
    if (okCount > 0) navigate('/admin/properties')
  }

  const totalMonthlyRent = units.reduce((s, u) => s + (Number(u.base_rent) || 0), 0)
  const totalDeposit = units.reduce((s, u) => s + (Number(u.security_deposit) || 0), 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Property & Unit Onboarding"
        description="Register a new building, configure landlord linkages, and set up individual units in bulk."
        actions={
          <Button type="button" variant="secondary" icon={Upload} onClick={() => setImportOpen(true)}>
            Import Properties
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Property Master Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Card className="lg:col-span-2 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Building className="w-4 h-4 text-brand-600" />
                Property Specifications
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Property ID">
                <TextInput
                  placeholder="e.g. PROP-001 (leave blank to auto-generate)"
                  value={form.propertyId}
                  onChange={(e) => setForm({ ...form, propertyId: e.target.value })}
                />
              </Field>
              <Field label="Property Name">
                <TextInput
                  required
                  placeholder="e.g. Greenview Apartments"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Property Type">
                <Select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  {PROPERTY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </Select>
              </Field>
              <Field label="Physical Location">
                <TextInput
                  required
                  placeholder="e.g. Argwings Kodhek Rd, Kilimani"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="County">
                <Select
                  value={form.county}
                  onChange={(e) => setForm({ ...form, county: e.target.value })}
                >
                  <option value="">Select county…</option>
                  {COUNTIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
              </Field>
              <Field label="Sub-County">
                <TextInput
                  placeholder="e.g. Dagoretti North"
                  value={form.subCounty}
                  onChange={(e) => setForm({ ...form, subCounty: e.target.value })}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Year of Construction">
                <TextInput
                  type="number"
                  min="1900"
                  max={new Date().getFullYear()}
                  placeholder="e.g. 2018"
                  value={form.yearBuilt}
                  onChange={(e) => setForm({ ...form, yearBuilt: e.target.value })}
                />
              </Field>
              <Field label="Number of Units">
                <div className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 bg-slate-50 text-slate-700 flex items-center justify-between">
                  <span className="font-medium">{units.length}</span>
                  <span className="text-xs text-slate-400">auto from units below</span>
                </div>
              </Field>
              <Field label="Number of Floors">
                <TextInput
                  type="number"
                  min="0"
                  placeholder="e.g. 6"
                  value={form.floors}
                  onChange={(e) => setForm({ ...form, floors: e.target.value })}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Assigned Landlord">
                <AsyncSearchSelect
                  value={form.landlord}
                  onChange={handleLandlordChange}
                  fetchOptions={fetchLandlords}
                  placeholder="Search landlord by name..."
                  labelKey="name"
                  valueKey="name"
                  addNewLabel="Add / Onboard New Landlord"
                  onAddNew={handleAddNewLandlord}
                />
              </Field>
              <Field label="On-Site Caretaker">
                <AsyncSearchSelect
                  value={form.caretaker}
                  onChange={handleCaretakerChange}
                  fetchOptions={fetchCaretakers}
                  placeholder="Search caretaker by name..."
                  labelKey="name"
                  valueKey="name"
                  addNewLabel="Add / Onboard New Caretaker"
                  onAddNew={handleAddNewCaretaker}
                />
              </Field>
            </div>

            <Field label="Property Description">
              <TextArea
                placeholder="Overview of the property, neighbourhood, and any notes…"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </Field>

            <Field label="Amenities Available">
              <TextArea
                placeholder="High-speed lifts, borehole water, 24/7 CCTV, backup generator, rooftop terrace, parking…"
                value={form.amenities}
                onChange={(e) => setForm({ ...form, amenities: e.target.value })}
              />
            </Field>

            <div>
              <span className="block text-sm font-medium text-slate-700 mb-1.5">Property Images</span>
              <ImageGallery
                value={form.images}
                onChange={(images) => setForm({ ...form, images })}
              />
            </div>
          </Card>

          {/* Portfolio Summary Card */}
          <Card className="bg-slate-900 text-white flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Yield Projection</span>
              <h3 className="text-lg font-bold text-white mt-1">{form.name || 'New Property'}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{form.location || 'Location pending'}</p>

              <div className="mt-6 space-y-3.5 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Total Configured Units</span>
                  <span className="font-bold text-emerald-400 text-sm">{units.length} Units</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Expected Gross Monthly Rent</span>
                  <span className="font-bold text-white text-sm">{formatKsh(totalMonthlyRent)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Total Security Deposits</span>
                  <span className="font-bold text-white text-sm">{formatKsh(totalDeposit)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Average Unit Rent</span>
                  <span className="font-semibold text-slate-300">
                    {units.length > 0 ? formatKsh(Math.round(totalMonthlyRent / units.length)) : 'KSh 0'}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800">
              <Button
                type="submit"
                icon={Home}
                disabled={loading}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold"
              >
                {loading ? 'Registering Property…' : `Submit & Register ${units.length} Units`}
              </Button>
            </div>
          </Card>
        </div>

        {/* Section 2: Unit Configuration & Batch Tools */}
        <Card className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-brand-600" />
                Unit Inventory & Apartment Breakdown ({units.length} Units)
              </h3>
              <p className="text-xs text-slate-500">
                Specify unit names/numbers, floor, bedroom types, base rent, and deposit.
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".csv, .xlsx, .xls, .txt"
                className="hidden"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                icon={Download}
                onClick={handleDownloadTemplate}
              >
                Download Excel/CSV Template
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                icon={Upload}
                onClick={() => fileInputRef.current?.click()}
              >
                Upload Excel / CSV
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                icon={Sparkles}
                onClick={() => setShowGenerator(!showGenerator)}
              >
                {showGenerator ? 'Close Generator' : '⚡ Batch Generator'}
              </Button>
              <Button
                type="button"
                size="sm"
                icon={Plus}
                onClick={handleAddSingleUnit}
              >
                Add Single Unit
              </Button>
            </div>
          </div>

          {/* Quick Batch Generator Drawer */}
          {showGenerator && (
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-900 uppercase tracking-wide flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  Quick Batch Unit Generator
                </span>
                <span className="text-xs text-emerald-700">Auto-appends numbered unit series</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Prefix</label>
                  <TextInput
                    value={genConfig.prefix}
                    onChange={(e) => setGenConfig({ ...genConfig, prefix: e.target.value })}
                    placeholder="e.g. A-, Apt "
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Start #</label>
                  <TextInput
                    type="number"
                    value={genConfig.startNum}
                    onChange={(e) => setGenConfig({ ...genConfig, startNum: e.target.value })}
                    placeholder="1"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Quantity</label>
                  <TextInput
                    type="number"
                    value={genConfig.count}
                    onChange={(e) => setGenConfig({ ...genConfig, count: e.target.value })}
                    placeholder="10"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Floor</label>
                  <Select
                    value={genConfig.floor}
                    onChange={(e) => setGenConfig({ ...genConfig, floor: e.target.value })}
                  >
                    {FLOORS.map((f) => <option key={f} value={f}>{f}</option>)}
                  </Select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Unit Type</label>
                  <Select
                    value={genConfig.unitType}
                    onChange={(e) => setGenConfig({ ...genConfig, unitType: e.target.value })}
                  >
                    {UNIT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </Select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Rent (KSh)</label>
                  <TextInput
                    type="number"
                    value={genConfig.rent}
                    onChange={(e) => setGenConfig({ ...genConfig, rent: e.target.value })}
                    placeholder="35000"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Deposit (KSh)</label>
                  <TextInput
                    type="number"
                    value={genConfig.deposit}
                    onChange={(e) => setGenConfig({ ...genConfig, deposit: e.target.value })}
                    placeholder="35000"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowGenerator(false)}>
                  Cancel
                </Button>
                <Button type="button" size="sm" icon={CheckCircle} onClick={handleBatchGenerate}>
                  Generate {genConfig.count} Units
                </Button>
              </div>
            </div>
          )}

          {/* Unit Table */}
          {units.length === 0 ? (
            <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-xl space-y-3">
              <Layers className="w-8 h-8 text-slate-300 mx-auto" />
              <div>
                <p className="font-semibold text-slate-700">No units added yet</p>
                <p className="text-xs text-slate-400">Use the batch generator, upload an Excel file, or add units manually.</p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-2">
                <Button type="button" size="sm" icon={Sparkles} onClick={() => setShowGenerator(true)}>
                  Generate Units
                </Button>
                <Button type="button" variant="secondary" size="sm" icon={Upload} onClick={() => fileInputRef.current?.click()}>
                  Upload CSV/Excel
                </Button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200/80 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-700 font-semibold border-b border-slate-200">
                    <th className="p-3 w-12 text-center">#</th>
                    <th className="p-3">Unit Name / Number</th>
                    <th className="p-3">Floor</th>
                    <th className="p-3">Unit Type</th>
                    <th className="p-3">Base Rent (KSh)</th>
                    <th className="p-3">Deposit (KSh)</th>
                    <th className="p-3 w-12 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {units.map((unit, index) => (
                    <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-3 text-center text-slate-400 font-mono">{index + 1}</td>
                      <td className="p-2.5">
                        <input
                          type="text"
                          required
                          value={unit.unit_number}
                          onChange={(e) => handleUnitFieldChange(index, 'unit_number', e.target.value)}
                          placeholder="e.g. A-101"
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                      </td>
                      <td className="p-2.5">
                        <select
                          value={unit.floor}
                          onChange={(e) => handleUnitFieldChange(index, 'floor', e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white"
                        >
                          {FLOORS.map((f) => <option key={f} value={f}>{f}</option>)}
                        </select>
                      </td>
                      <td className="p-2.5">
                        <select
                          value={unit.unit_type}
                          onChange={(e) => handleUnitFieldChange(index, 'unit_type', e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white"
                        >
                          {UNIT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </td>
                      <td className="p-2.5">
                        <input
                          type="number"
                          required
                          value={unit.base_rent}
                          onChange={(e) => handleUnitFieldChange(index, 'base_rent', Number(e.target.value))}
                          placeholder="30000"
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                      </td>
                      <td className="p-2.5">
                        <input
                          type="number"
                          value={unit.security_deposit}
                          onChange={(e) => handleUnitFieldChange(index, 'security_deposit', Number(e.target.value))}
                          placeholder="30000"
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                      </td>
                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveUnit(index)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Remove unit"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </form>

      <ImportPropertiesModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={handleBulkImport}
      />
    </div>
  )
}
