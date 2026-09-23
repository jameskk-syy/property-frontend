import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, MapPin, Building2, ImageOff, Home, DoorOpen, DoorClosed,
  CalendarDays, Layers, User, X,
} from 'lucide-react'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Tabs from '../../components/ui/Tabs'
import DataTable from '../../components/ui/DataTable'
import Skeleton, { CardSkeleton } from '../../components/ui/Skeleton'
import { formatKsh } from '../../data/mockData'
import { api } from '../../api/client'

/** Small labelled KPI shown in the floating stat strip. */
function Stat({ icon: Icon, label, value, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-600',
    brand: 'bg-brand-50 text-brand-600',
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
  }
  return (
    <div className="flex items-center gap-3">
      <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tones[tone]}`}>
        <Icon size={18} />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-slate-400 font-medium">{label}</p>
        <p className="text-base font-semibold text-slate-900 truncate">{value}</p>
      </div>
    </div>
  )
}

export default function LandlordPropertyDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [tab, setTab] = useState('Overview')
  const [property, setProperty] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lightbox, setLightbox] = useState(null) // image url or null

  useEffect(() => {
    let mounted = true
    setLoading(true)
    api.getLandlordProperty(id)
      .then((res) => { if (mounted) setProperty(res) })
      .catch(() => {})
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [id])

  const BackLink = () => (
    <button
      onClick={() => navigate(-1)}
      className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-4 transition-colors"
    >
      <ArrowLeft size={15} /> Back to properties
    </button>
  )

  if (loading) {
    return (
      <div>
        <BackLink />
        <Skeleton className="h-56 w-full rounded-2xl mb-6" />
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
        <BackLink />
        <Card className="text-center py-16 text-slate-500">Property not found.</Card>
      </div>
    )
  }

  const coverImage = property.cover_image || (property.images && property.images[0]) || null
  const images = property.images || []
  const units = property.unit_list || []
  const occupancy = property.units ? Math.round((property.occupied / property.units) * 100) : 0
  const amenities = (property.amenities || '')
    .split(/[,\n]/)
    .map((a) => a.trim())
    .filter(Boolean)

  return (
    <div>
      <BackLink />

      {/* Hero banner */}
      <div className="relative rounded-2xl overflow-hidden mb-6 border border-slate-200 shadow-card">
        {coverImage ? (
          <img src={coverImage} alt={property.name} className="w-full h-56 sm:h-64 object-cover" />
        ) : (
          <div className="w-full h-56 sm:h-64 bg-gradient-to-br from-brand-500 to-emerald-700 flex items-center justify-center">
            <Building2 size={56} className="text-white/40" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/85 via-slate-900/25 to-transparent" />

        <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-2">
            <Badge tone="green">{property.status}</Badge>
            <Badge tone="blue">{property.type}</Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white drop-shadow-sm">{property.name}</h1>
          <p className="text-sm text-white/85 flex items-center gap-1.5 mt-1">
            <MapPin size={14} /> {property.location || 'Location not set'}
          </p>
        </div>
      </div>

      {/* Floating KPI strip */}
      <Card className="mb-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          <Stat icon={Home} label="Total Units" value={property.units} tone="brand" />
          <Stat icon={DoorClosed} label="Occupied" value={property.occupied} tone="blue" />
          <Stat icon={DoorOpen} label="Vacant" value={property.vacant} tone="amber" />
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 relative">
              <span className="text-xs font-bold">{occupancy}%</span>
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] uppercase tracking-wide text-slate-400 font-medium">Occupancy</p>
              <div className="h-1.5 rounded-full bg-slate-100 mt-1.5 overflow-hidden">
                <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${occupancy}%` }} />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Tabbed content */}
      <Card padded={false} className="p-5">
        <Tabs tabs={['Overview', 'Units', `Images${images.length ? ` (${images.length})` : ''}`]} active={tab} onChange={setTab} />

        {tab === 'Overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5">
                <p className="text-[11px] uppercase tracking-wide text-slate-400 font-medium flex items-center gap-1"><CalendarDays size={12} /> Year Built</p>
                <p className="text-sm font-semibold text-slate-800 mt-1">{property.year_built || '—'}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5">
                <p className="text-[11px] uppercase tracking-wide text-slate-400 font-medium flex items-center gap-1"><Layers size={12} /> Floors</p>
                <p className="text-sm font-semibold text-slate-800 mt-1">{property.floors || '—'}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5">
                <p className="text-[11px] uppercase tracking-wide text-slate-400 font-medium flex items-center gap-1"><User size={12} /> Caretaker</p>
                <p className="text-sm font-semibold text-slate-800 mt-1 truncate">{property.caretaker}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5">
                <p className="text-[11px] uppercase tracking-wide text-slate-400 font-medium flex items-center gap-1"><Building2 size={12} /> Code</p>
                <p className="text-sm font-semibold text-slate-800 mt-1 truncate">{property.property_code || '—'}</p>
              </div>
            </div>

            {property.description && (
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-1.5">About this property</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{property.description}</p>
              </div>
            )}

            {amenities.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">Amenities</h3>
                <div className="flex flex-wrap gap-2">
                  {amenities.map((a, i) => (
                    <span key={i} className="text-xs font-medium px-2.5 py-1 rounded-lg bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100">
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {!property.description && amenities.length === 0 && (
              <p className="text-sm text-slate-400 py-4 text-center">No additional details recorded for this property.</p>
            )}
          </div>
        )}

        {tab === 'Units' && (
          <DataTable
            columns={[
              { key: 'number', header: 'Unit' },
              { key: 'type', header: 'Type' },
              { key: 'floor', header: 'Floor' },
              { key: 'rent', header: 'Rent', render: (r) => formatKsh(r.rent) },
              { key: 'status', header: 'Status', render: (r) => <Badge>{r.status}</Badge> },
            ]}
            rows={units}
            searchKeys={['number', 'type']}
            searchPlaceholder="Search units…"
            emptyMessage="No units recorded for this property."
          />
        )}

        {tab.startsWith('Images') && (
          <div>
            {images.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {images.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => setLightbox(url)}
                    className="group relative aspect-video rounded-xl overflow-hidden border border-slate-200 bg-slate-50"
                  >
                    <img src={url} alt={`Property image ${i + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/15 transition-colors" />
                    {url === coverImage && (
                      <span className="absolute top-2 left-2 text-[10px] font-semibold bg-brand-600 text-white px-2 py-0.5 rounded-md">Cover</span>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="py-14 text-center text-slate-400">
                <ImageOff className="w-9 h-9 mx-auto mb-2" />
                <p className="text-sm">No images uploaded for this property.</p>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <X size={20} />
          </button>
          <img
            src={lightbox}
            alt="Property"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] max-w-full rounded-xl shadow-2xl object-contain"
          />
        </div>
      )}
    </div>
  )
}
