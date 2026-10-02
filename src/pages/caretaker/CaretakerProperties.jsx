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

  // Load the caretaker's assigned properties once (for the dropdown + stats).
  // Resolved server-side, not by name-guessing. Default the selection to the
  // first property so the table starts scoped to a real property.
  useEffect(() => {
    let mounted = true
    api.getMyProperties().then((props) => {
      if (!mounted) return
      const mine = Array.isArray(props) ? props : []
      setMyProperties(mine)
      if (mine.length > 0) {
        setExportProperty(mine[0].id)
      } else {
        // No assigned properties: nothing to fetch, settle to empty state.
        setUnits([])
        setLoading(false)
      }
    }).catch(() => {
      if (mounted) setLoading(false)
    })
    return () => { mounted = false }
  }, [user?.name])

  // Fetch units from the backend whenever the selected property changes, so the
  // filter happens server-side (not by filtering an already-loaded list). A
  // specific selection fetches that property's units; 'All properties' fetches
  // units across every assigned property and merges them.
  useEffect(() => {
    let mounted = true
    // Wait until properties are known so 'All properties' can fan out correctly.
    if (myProperties.length === 0) return

    setLoading(true)
    const targets = exportProperty
      ? [exportProperty]
      : myProperties.map((p) => p.id)

    Promise.all(
      targets.map((pid) =>
        api.getUnits(pid, { page: 1, pageSize: 1000 })
          .then((result) => result?.data || result || [])
          .catch(() => [])
      )
    ).then((results) => {
      if (mounted) setUnits(results.flat())
    }).finally(() => {
      if (mounted) setLoading(false)
    })

    return () => { mounted = false }
  }, [exportProperty, myProperties])

  // `units` is already scoped by the backend to the current selection, so the
  // table renders it directly. A caretaker can hold two or more properties;
  // 'All properties' fetches them all, a specific selection just that one.
  const visibleUnits = units

  const handleExport = () => {
    if (!exportProperty) {
      showToast('Please select a property to export.')
      return
    }
    const prop = myProperties.find(p => p.id === exportProperty)
    const propName = prop?.name || 'Property'
    // Units are already server-filtered to the selected property.
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

  // Unit totals come from the per-property summary (getMyProperties), a grouped
  // DB aggregate, so they stay accurate even when a property has more than the
  // fetched page of units. Counting the merged unit list would cap per property.
  // The stats follow the dropdown: a specific property shows that property's own
  // aggregate, 'All properties' shows the portfolio total.
  const statsScope = exportProperty
    ? myProperties.filter((p) => p.id === exportProperty)
    : myProperties
  const totalUnitsCount = statsScope.reduce((s, p) => s + (p.units || 0), 0) || visibleUnits.length
  const occupied = statsScope.reduce((s, p) => s + (p.occupied || 0), 0)
    || visibleUnits.filter((u) => u.status === 'Occupied').length
  const vacant = statsScope.reduce((s, p) => s + (p.vacant || 0), 0)
    || visibleUnits.filter((u) => u.status === 'Vacant').length

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
            <option value="">All properties</option>
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
        { label: 'Total Units', value: totalUnitsCount, icon: Home, tone: 'blue' },
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
      rows={visibleUnits}
      searchKeys={['property', 'number', 'type']}
      searchPlaceholder="Search units…"
      emptyMessage="No units found for your assigned properties."
    />
  )
}
