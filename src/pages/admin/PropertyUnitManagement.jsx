import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import PageHeader from '../../components/ui/PageHeader'
import StatCard from '../../components/ui/StatCard'
import Card from '../../components/ui/Card'
import DataTable from '../../components/ui/DataTable'
import Tabs from '../../components/ui/Tabs'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { StatCardsSkeleton } from '../../components/ui/Skeleton'
import { properties as defaultProps, units as defaultUnits, formatKsh } from '../../data/mockData'
import { Building2, Home, Users } from 'lucide-react'
import { api } from '../../api/client'

export default function PropertyUnitManagement() {
  const [tab, setTab] = useState('Properties')
  const [propList, setPropList] = useState([])
  const [unitList, setUnitList] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    let mounted = true
    Promise.allSettled([api.getProperties(), api.getUnits(null, { page: 1, pageSize: 100 })]).then(([p, u]) => {
      if (!mounted) return
      if (p.status === 'fulfilled' && Array.isArray(p.value)) setPropList(p.value)
      // Handle paginated response: { data: [...], pagination: {...} }
      if (u.status === 'fulfilled') {
        const unitData = u.value?.data || u.value || []
        if (Array.isArray(unitData)) setUnitList(unitData)
      }
      setLoading(false)
    })
    return () => { mounted = false }
  }, [])

  // Unit counts: prefer the real Property Unit list; if it's empty, fall back to
  // the per-property counts returned by getProperties (total_units/occupied).
  const hasUnits = unitList && unitList.length > 0
  const totalUnits = hasUnits
    ? unitList.length
    : propList.reduce((s, p) => s + (p.units || 0), 0)
  const occupiedUnits = hasUnits
    ? unitList.filter((u) => u.status === 'Occupied').length
    : propList.reduce((s, p) => s + (p.occupied || 0), 0)
  const vacantUnits = hasUnits
    ? unitList.filter((u) => u.status === 'Vacant').length
    : Math.max(0, totalUnits - occupiedUnits)

  const propertyColumns = [
    { key: 'name', header: 'Property', render: (r) => (
      <div>
        <p className="font-medium text-slate-800">{r.name}</p>
        <p className="text-xs text-slate-400">{r.location}</p>
      </div>
    ) },
    { key: 'type', header: 'Type' },
    { key: 'landlord', header: 'Landlord' },
    { key: 'caretaker', header: 'Caretaker' },
    { key: 'occupancy', header: 'Occupancy', render: (r) => `${r.occupied}/${r.units} units` },
  ]

  const unitColumns = [
    { key: 'unit', header: 'Unit', render: (r) => <span className="font-medium text-slate-800">{r.property} · {r.number || r.unit}</span> },
    { key: 'type', header: 'Type', render: (r) => r.type || '—' },
    { key: 'tenant', header: 'Tenant' },
    { key: 'rent', header: 'Rent', render: (r) => formatKsh(r.rent) },
    { key: 'status', header: 'Status', render: (r) => <Badge>{r.status}</Badge> },
  ]

  return (
    <div>
      <PageHeader
        title="Properties & Units"
        description="Manage every property, block, and unit in your portfolio. Click a property to view its units."
        actions={<Link to="/admin/property-onboarding"><Button icon={Plus}>Add Property</Button></Link>}
      />

      {loading ? (
        <div className="mb-6"><StatCardsSkeleton count={4} /></div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Properties" value={propList.length} icon={Building2} />
          <StatCard label="Total Units" value={totalUnits} icon={Home} tone="blue" />
          <StatCard label="Occupied" value={occupiedUnits} icon={Users} tone="brand" />
          <StatCard label="Vacant" value={vacantUnits} icon={Home} tone="orange" />
        </div>
      )}

      <Card padded={false} className="p-5">
        <Tabs tabs={['Properties', 'Units']} active={tab} onChange={setTab} />
        {tab === 'Properties' ? (
          <DataTable
            loading={loading}
            columns={propertyColumns}
            rows={propList}
            searchKeys={['name', 'location', 'landlord']}
            searchPlaceholder="Search properties…"
            onRowClick={(row) => navigate(`/admin/properties/${row.id}`)}
          />
        ) : (
          <DataTable loading={loading} columns={unitColumns} rows={unitList} searchKeys={['property', 'unit', 'tenant']} searchPlaceholder="Search units…" />
        )}
      </Card>
    </div>
  )
}
