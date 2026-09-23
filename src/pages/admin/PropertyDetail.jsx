import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, Building2, Edit3, ImageOff } from 'lucide-react'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Tabs from '../../components/ui/Tabs'
import DataTable from '../../components/ui/DataTable'
import Skeleton, { CardSkeleton } from '../../components/ui/Skeleton'
import { formatKsh } from '../../data/mockData'
import { api } from '../../api/client'

export default function PropertyDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [tab, setTab] = useState('Units')
  const [property, setProperty] = useState(null)
  const [propUnits, setPropUnits] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    api.getProperty(id).then((res) => {
      if (mounted && res) {
        setProperty(res)
        api.getUnits(res.id).then((uList) => {
          if (mounted && Array.isArray(uList)) setPropUnits(uList)
        }).catch(() => {})
      }
    }).catch(() => {}).finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [id])

  if (loading && !property) {
    return (
      <div>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4"
        >
          <ArrowLeft size={15} /> Back
        </button>
        <Skeleton className="h-24 w-full rounded-xl2 mb-6" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl2" />)}
        </div>
        <CardSkeleton height={220} />
      </div>
    )
  }

  if (!property) {
    return (
      <div>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4"
        >
          <ArrowLeft size={15} /> Back
        </button>
        <Card className="text-center py-12 text-slate-500">Property not found.</Card>
      </div>
    )
  }

  const coverImage = property.coverImage || (property.images && property.images[0]) || null

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4"
      >
        <ArrowLeft size={15} /> Back
      </button>

      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {coverImage ? (
              <img
                src={coverImage}
                alt={property.name}
                className="w-14 h-14 rounded-xl object-cover shrink-0 border border-slate-200"
              />
            ) : (
              <span className="w-14 h-14 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
                <Building2 size={24} />
              </span>
            )}
            <div>
              <h1 className="text-lg font-semibold text-slate-900">{property.name}</h1>
              <p className="text-sm text-slate-500 flex items-center gap-1"><MapPin size={13} /> {property.location}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <Badge tone="blue">{property.type}</Badge>
                <span className="text-xs text-slate-400">Landlord: {property.landlord}</span>
              </div>
            </div>
          </div>
          <Button variant="secondary" icon={Edit3}>Edit Property</Button>
        </div>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <Card>
          <p className="text-xs text-slate-400 mb-1">Total Units</p>
          <p className="text-lg font-semibold text-slate-900">{property.units}</p>
        </Card>
        <Card>
          <p className="text-xs text-slate-400 mb-1">Occupied</p>
          <p className="text-lg font-semibold text-slate-900">{property.occupied}</p>
        </Card>
        <Card>
          <p className="text-xs text-slate-400 mb-1">Vacant</p>
          <p className="text-lg font-semibold text-amber-600">{Math.max(0, property.units - property.occupied)}</p>
        </Card>
        <Card>
          <p className="text-xs text-slate-400 mb-1">Caretaker</p>
          <p className="text-lg font-semibold text-slate-900 truncate">{property.caretaker}</p>
        </Card>
      </div>

      <Card padded={false} className="p-5">
        <Tabs tabs={['Units', 'Images']} active={tab} onChange={setTab} />

        {tab === 'Units' ? (
          <DataTable
            columns={[
              { key: 'number', header: 'Unit' },
              { key: 'type', header: 'Type' },
              { key: 'floor', header: 'Floor' },
              { key: 'tenant', header: 'Tenant' },
              { key: 'rent', header: 'Rent', render: (r) => formatKsh(r.rent) },
              { key: 'status', header: 'Status', render: (r) => <Badge>{r.status}</Badge> },
            ]}
            rows={propUnits}
            searchKeys={['number', 'type', 'tenant']}
            searchPlaceholder="Search units…"
          />
        ) : (
          <div>
            {property.images && property.images.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {property.images.map((img, i) => {
                  const url = typeof img === 'string' ? img : img.url
                  return (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="group relative aspect-video rounded-xl overflow-hidden border border-slate-200 bg-slate-50"
                    >
                      <img src={url} alt={`Property image ${i + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      {url === coverImage && (
                        <span className="absolute top-2 left-2 text-[10px] font-semibold bg-brand-600 text-white px-2 py-0.5 rounded-md">Cover</span>
                      )}
                    </a>
                  )
                })}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400">
                <ImageOff className="w-8 h-8 mx-auto mb-2" />
                <p className="text-sm">No images uploaded for this property.</p>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}
