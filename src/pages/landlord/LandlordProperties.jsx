import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, Home } from 'lucide-react'
import ListPageTemplate from '../../components/patterns/ListPageTemplate'
import { api } from '../../api/client'

export default function LandlordProperties() {
  const navigate = useNavigate()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    api.getLandlordProperties()
      .then((res) => { if (mounted) setRows(res || []) })
      .catch(() => {})
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [])

  return (
    <ListPageTemplate
      title="My Properties"
      description="Properties you own, managed by Nest on your behalf."
      loading={loading}
      onRowClick={(r) => navigate(`/landlord/properties/${encodeURIComponent(r.id)}`)}
      stats={[
        { label: 'Properties', value: rows.length, icon: Building2 },
        { label: 'Total Units', value: rows.reduce((s, p) => s + (p.units || 0), 0), icon: Home, tone: 'blue' },
      ]}
      columns={[
        { key: 'name', header: 'Property', render: (r) => (
          <div>
            <p className="font-medium text-slate-800">{r.name}</p>
            <p className="text-xs text-slate-400">{r.location}</p>
          </div>
        ) },
        { key: 'caretaker', header: 'Caretaker' },
        { key: 'occupancy', header: 'Occupancy', render: (r) => `${r.occupied}/${r.units} units` },
        { key: 'vacant', header: 'Vacant', render: (r) => `${r.vacant} units` },
      ]}
      rows={rows}
      searchKeys={['name', 'location', 'caretaker']}
      searchPlaceholder="Search your properties…"
      emptyMessage="No properties linked to your account yet."
    />
  )
}
