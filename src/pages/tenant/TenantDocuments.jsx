import { useState, useEffect } from 'react'
import { FileText, Download, Eye, CheckCircle2, AlertTriangle, X } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import Card from '../../components/ui/Card'
import DataTable from '../../components/ui/DataTable'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { useToast } from '../../context/ToastContext'
import { api } from '../../api/client'

export default function TenantDocuments() {
  const { showToast } = useToast()
  const [docs, setDocs] = useState([])
  const [idDocs, setIdDocs] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lightbox, setLightbox] = useState(null)
  const [busy, setBusy] = useState(null)

  useEffect(() => {
    let mounted = true
    Promise.all([api.getMyDocuments(), api.getMyIdDocuments()])
      .then(([d, id]) => { if (mounted) { setDocs(d || []); setIdDocs(id || null) } })
      .catch(() => {})
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [])

  const viewDoc = async (lease) => {
    setBusy(`${lease}:view`)
    try {
      await api.viewMyLease(lease)
    } catch (e) {
      showToast(e.message || 'Could not open your document.', 'error')
    } finally {
      setBusy(null)
    }
  }

  const downloadDoc = async (lease) => {
    setBusy(`${lease}:download`)
    try {
      await api.downloadMyLease(lease)
      showToast('Downloading your agreement...')
    } catch (e) {
      showToast(e.message || 'Could not download your document.', 'error')
    } finally {
      setBusy(null)
    }
  }

  const columns = [
    { key: 'title', header: 'Document', render: (r) => (
      <div className="flex items-center gap-3">
        <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
          <FileText size={16} />
        </span>
        <span className="font-medium text-slate-800">{r.title}</span>
      </div>
    )},
    { key: 'status', header: 'Status', render: (r) => (
      r.is_signed ? (
        <Badge tone="green" className="inline-flex items-center gap-1">
          <CheckCircle2 size={12} /> Signed
        </Badge>
      ) : (
        <Badge tone="orange" className="inline-flex items-center gap-1">
          <AlertTriangle size={12} /> Unsigned
        </Badge>
      )
    )},
    { key: 'signed_on', header: 'Signed Date', render: (r) => (
      <span className="text-slate-600">{r.signed_on ? String(r.signed_on).slice(0, 10) : '-'}</span>
    )},
    { key: 'actions', header: '', align: 'right', render: (r) => (
      r.has_lease_pdf ? (
        <div className="flex items-center gap-1.5 justify-end">
          <Button variant="ghost" size="sm" icon={Eye} disabled={busy === `${r.lease}:view`} onClick={() => viewDoc(r.lease)}>
            {busy === `${r.lease}:view` ? '...' : 'View'}
          </Button>
          <Button variant="secondary" size="sm" icon={Download} disabled={busy === `${r.lease}:download`} onClick={() => downloadDoc(r.lease)}>
            {busy === `${r.lease}:download` ? '...' : 'Download'}
          </Button>
        </div>
      ) : (
        <span className="text-xs text-slate-400">Not available</span>
      )
    )},
  ]

  const idRows = []
  if (idDocs) {
    if (idDocs.id_front) {
      idRows.push({ id: 'id_front', label: 'National ID (Front)', image: idDocs.id_front })
    }
    if (idDocs.id_back) {
      idRows.push({ id: 'id_back', label: 'National ID (Back)', image: idDocs.id_back })
    }
  }

  const idColumns = [
    { key: 'label', header: 'Document', render: (r) => (
      <div className="flex items-center gap-3">
        <span className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
          <FileText size={16} />
        </span>
        <div>
          <span className="font-medium text-slate-800">{r.label}</span>
          {idDocs?.national_id && r.id === 'id_front' && (
            <p className="text-xs text-slate-400">ID No. {idDocs.national_id}</p>
          )}
        </div>
      </div>
    )},
    { key: 'status', header: 'Status', render: () => (
      <Badge tone="green" className="inline-flex items-center gap-1">
        <CheckCircle2 size={12} /> Uploaded
      </Badge>
    )},
    { key: 'actions', header: '', align: 'right', render: (r) => (
      <Button variant="ghost" size="sm" icon={Eye} onClick={() => setLightbox(r.image)}>View</Button>
    )},
  ]

  return (
    <div>
      <PageHeader title="My Documents" description="Your tenancy agreements and identity documents." />

      {!loading && idRows.length > 0 && (
        <Card padded={false} className="p-5 mb-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Identity Documents</h3>
          <DataTable columns={idColumns} rows={idRows} loading={false} emptyMessage="No ID documents uploaded." />
        </Card>
      )}

      <Card padded={false} className="p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Lease Agreements</h3>
        <DataTable
          loading={loading}
          columns={columns}
          rows={docs}
          searchKeys={['title']}
          searchPlaceholder="Search documents..."
          emptyIcon={FileText}
          emptyMessage="No lease documents on file yet."
          pageSize={10}
        />
      </Card>

      {lightbox && (
        <div onClick={() => setLightbox(null)} className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <button onClick={() => setLightbox(null)} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20">
            <X size={20} />
          </button>
          <img src={lightbox} alt="Document" onClick={(e) => e.stopPropagation()} className="max-h-[85vh] max-w-full rounded-xl shadow-2xl object-contain" />
        </div>
      )}
    </div>
  )
}