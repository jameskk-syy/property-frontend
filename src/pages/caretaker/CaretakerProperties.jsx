import { useState, useEffect } from 'react'
import { Building2, Home, CheckCircle2, Download } from 'lucide-react'
import ListPageTemplate from '../../components/patterns/ListPageTemplate'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { Select } from '../../components/ui/Field'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { formatKsh } from '../../data/mockData'
import { api } from '../../api/client'

export default function CaretakerProperties() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [myProperties, setMyProperties] = useState([])
  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(true)
  const [exportProperty, setExportProperty] = useState('')

  useEffect(() => {
    let mounted = true
    setLoading(true)
    // Assigned properties resolved server-side (not by name-guessing).
    api.getMyProperties().then(async (props) => {
      const mine = Array.isArray(props) ? props : []
      if (mounted) {
        setMyProperties(mine)
        // Default export property to first one
        if (mine.length > 0) setExportProperty(mine[0].id)
      }
      // Pull units for each assigned property and merge - handle paginated response
      const results = await Promise.all(
        mine.map((p) => api.getUnits(p.id, { page: 1, pageSize: 100 }).then((result) => {
          // Handle paginated response: { data: [...], pagination: {...} }
          return result?.data || result || []
        }).catch(() => []))
      )
      if (mounted) setUnits(results.flat())
    }).catch(() => {}).finally(() => {
      if (mounted) setLoading(false)
    })
    return () => { mounted = false }
  }, [user?.name])

  const handleExport = () => {
    if (!exportProperty) {
      showToast('Please select a property to export.')
      return
    }
    const prop = myProperties.find(p => p.id === exportProperty)
    const propName = prop?.name || 'Property'
    // Filter by property ID (u.property holds the property ID like PROP-78FE9E)
    const propUnits = units.filter(u => u.property === exportProperty)
    
    if (propUnits.length === 0) {
      showToast('No units found for this property.')
      return
    }

    // Build CSV
    const headers = ['Unit ID', 'Unit Number', 'Type', 'Floor', 'Rent (KSh)', 'Deposit (KSh)', 'Status', 'Tenant']
    const rows = propUnits.map(u => [
      u.id || u.name || '',
      u.number || '',
      u.type || '',
      u.floor || '',
      u.rent || 0,
      u.deposit || 0,
      u.status || '',
      u.tenant || ''
    ])
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${propName.replace(/[^a-zA-Z0-9]/g, '_')}_Units.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    showToast(`Exported ${propUnits.length} units for ${propName}.`)
  }

  const occupied = units.filter((u) => u.status === 'Occupied').length
  const vacant = units.filter((u) => u.status === 'Vacant').length

  return (
    <ListPageTemplate
      title="Properties & Units"
      description="Units you're responsible for day-to-day."
      loading={loading}
      tableActions={
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <Select
            value={exportProperty}
            onChange={(e) => setExportProperty(e.target.value)}
            className="w-full sm:w-48"
          >
            {myProperties.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </Select>
          <Button icon={Download} variant="secondary" onClick={handleExport} disabled={!exportProperty} className="w-full sm:w-auto">
            Export Units
          </Button>
        </div>
      }
      stats={[
        { label: 'Assigned Properties', value: myProperties.length, icon: Building2 },
        { label: 'Total Units', value: units.length, icon: Home, tone: 'blue' },
        { label: 'Occupied Units', value: occupied, icon: CheckCircle2, tone: 'brand' },
        { label: 'Vacant Units', value: vacant, icon: Home, tone: 'orange' },
      ]}
      columns={[
        { key: 'id', header: 'Unit ID', render: (r) => <span className="text-xs text-slate-500 font-mono">{r.id || r.name || '—'}</span> },
        { key: 'unit', header: 'Unit', render: (r) => <span className="font-medium text-slate-800">{r.property} · {r.number}</span> },
        { key: 'type', header: 'Type', render: (r) => r.type || '—' },
        { key: 'rent', header: 'Rent', render: (r) => formatKsh(r.rent) },
        { key: 'status', header: 'Status', render: (r) => (
          <Badge tone={r.status === 'Occupied' ? 'brand' : r.status === 'Vacant' ? 'orange' : 'red'}>{r.status}</Badge>
        ) },
      ]}
      rows={units}
      searchKeys={['property', 'number', 'type']}
      searchPlaceholder="Search units…"
      emptyMessage="No units found for your assigned properties."
    />
  )
}
