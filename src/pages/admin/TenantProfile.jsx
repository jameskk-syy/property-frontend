import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Phone, MessageCircle, Send, FileText } from 'lucide-react'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Avatar from '../../components/ui/Avatar'
import Tabs from '../../components/ui/Tabs'
import EmptyState from '../../components/ui/EmptyState'
import Skeleton, { CardSkeleton } from '../../components/ui/Skeleton'
import { useToast } from '../../context/ToastContext'
import { tenants as defaultTenants, payments, documents, formatKsh } from '../../data/mockData'
import { api } from '../../api/client'

export default function TenantProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [tab, setTab] = useState('Overview')
  const [tenant, setTenant] = useState(() => defaultTenants.find((t) => t.id === id) || null)

  useEffect(() => {
    let mounted = true
    api.getTenant(id).then((t) => {
      if (mounted && t) {
        setTenant({
          id: t.name || id,
          name: t.tenant_name || t.name || 'Tenant',
          unit: t.unit || 'Assigned',
          phone: t.phone_number || t.phone || '',
          rent: t.rent_amount || t.rent || 0,
          balance: 0,
          status: 'Current'
        })
      }
    }).catch(() => {})
    return () => { mounted = false }
  }, [id])

  if (!tenant) {
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

  const tenantPayments = payments.filter((p) => p.tenant === tenant.name)

  const handleSendReminder = async () => {
    showToast(`WhatsApp reminder sent to ${tenant.name}.`)
    try {
      await api.sendWhatsAppMessage({
        to: tenant.phone,
        message: `Hello ${tenant.name}, kindly note your rent account has a current balance of ${formatKsh(tenant.balance)}.`
      })
    } catch {}
  }

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
            <Avatar name={tenant.name} size={56} />
            <div>
              <h1 className="text-lg font-semibold text-slate-900">{tenant.name}</h1>
              <p className="text-sm text-slate-500">{tenant.unit}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <Badge>{tenant.status}</Badge>
                <span className="text-xs text-slate-400 flex items-center gap-1"><Phone size={12} /> {tenant.phone}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" icon={MessageCircle} onClick={() => navigate('/admin/whatsapp')}>Message</Button>
            <Button icon={Send} onClick={handleSendReminder}>
              Send Reminder
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <Card>
          <p className="text-xs text-slate-400 mb-1">Monthly Rent</p>
          <p className="text-lg font-semibold text-slate-900">{formatKsh(tenant.rent)}</p>
        </Card>
        <Card>
          <p className="text-xs text-slate-400 mb-1">Balance</p>
          <p className={`text-lg font-semibold ${tenant.balance > 0 ? 'text-red-600' : 'text-slate-900'}`}>
            {tenant.balance > 0 ? formatKsh(tenant.balance) : 'KSh 0'}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-slate-400 mb-1">Lease Status</p>
          <p className="text-lg font-semibold text-slate-900">Active</p>
        </Card>
        <Card>
          <p className="text-xs text-slate-400 mb-1">Tenant Since</p>
          <p className="text-lg font-semibold text-slate-900">Jun 2025</p>
        </Card>
      </div>

      <Card padded={false} className="p-5">
        <Tabs tabs={['Overview', 'Payment History', 'Documents']} active={tab} onChange={setTab} />

        {tab === 'Overview' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
            <div className="flex justify-between border-b border-slate-50 pb-2">
              <span className="text-slate-500">Unit</span>
              <span className="font-medium text-slate-800">{tenant.unit}</span>
            </div>
            <div className="flex justify-between border-b border-slate-50 pb-2">
              <span className="text-slate-500">Phone</span>
              <span className="font-medium text-slate-800">{tenant.phone}</span>
            </div>
            <div className="flex justify-between border-b border-slate-50 pb-2">
              <span className="text-slate-500">Monthly Rent</span>
              <span className="font-medium text-slate-800">{formatKsh(tenant.rent)}</span>
            </div>
            <div className="flex justify-between border-b border-slate-50 pb-2">
              <span className="text-slate-500">Status</span>
              <Badge>{tenant.status}</Badge>
            </div>
          </div>
        )}

        {tab === 'Payment History' && (
          tenantPayments.length ? (
            <div className="space-y-1">
              {tenantPayments.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0 text-sm">
                  <div>
                    <p className="font-medium text-slate-800">{p.date}</p>
                    <p className="text-xs text-slate-400">{p.method}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-800">{formatKsh(p.amount)}</p>
                    <Badge>{p.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="No recorded payments yet." />
          )
        )}

        {tab === 'Documents' && (
          <div className="space-y-1">
            {documents.slice(0, 2).map((d) => (
              <div key={d.id} className="flex items-center gap-3 py-2.5 border-b border-slate-50 last:border-0 text-sm">
                <FileText size={15} className="text-slate-400" />
                <span className="text-slate-700">{d.name}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
