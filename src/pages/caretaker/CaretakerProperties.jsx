import { useState, useEffect } from 'react'
import { Building2, Home, CheckCircle2 } from 'lucide-react'
import ListPageTemplate from '../../components/patterns/ListPageTemplate'
import Badge from '../../components/ui/Badge'
import { useAuth } from '../../context/AuthContext'
import { formatKsh } from '../../data/mockData'
import { api } from '../../api/client'

export default function CaretakerProperties() {
  const { user } = useAuth()
  const [myProperties, setMyProperties] = useState([])
  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    setLoading(true)

    // Assigned properties resolved server-side (not by name-guessing).
    api.getMyProperties().then(async (props) => {
      const mine = Array.isArray(props) ? props : []
      if (mounted) setMyProperties(mine)

      // Pull units for each assigned property and merge.
      const results = await Promise.all(
        mine.map((p) => api.getUnits(p.id).catch(() => []))
      )
      if (mounted) setUnits(results.flat())
    }).catch(() => {}).finally(() => {
      if (mounted) setLoading(false)
    })

    return () => { mounted = false }
  }, [user?.name])

  const occupied = units.filter((u) => u.status === 'Occupied').length
  const vacant = units.filter((u) => u.status === 'Vacant').length

  return (
    <ListPageTemplate
      title="Properties & Units"
      description="Units you're responsible for day-to-day."
      loading={loading}
      stats={[
        { label: 'Assigned Properties', value: myProperties.length, icon: Building2 },
        { label: 'Total Units', value: units.length, icon: Home, tone: 'blue' },
        { label: 'Occupied Units', value: occupied, icon: CheckCircle2, tone: 'brand' },
        { label: 'Vacant Units', value: vacant, icon: Home, tone: 'orange' },
      ]}
      columns={[
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
