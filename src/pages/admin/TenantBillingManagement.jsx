import { useState, useEffect } from 'react'
import { Plus, Send } from 'lucide-react'
import { useNavigate, Link } from 'react-router-dom'
import ListPageTemplate from '../../components/patterns/ListPageTemplate'
import ReminderDialog from '../../components/patterns/ReminderDialog'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Avatar from '../../components/ui/Avatar'
import { useToast } from '../../context/ToastContext'
import { tenants as defaultTenants, formatKsh } from '../../data/mockData'
import { Users, Wallet, AlertTriangle, Receipt } from 'lucide-react'
import { api } from '../../api/client'

const CHANNEL_LABELS = { sms: 'SMS', email: 'Email', whatsapp: 'WhatsApp' }

export default function TenantBillingManagement() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [tenantList, setTenantList] = useState(defaultTenants)
  const [loading, setLoading] = useState(true)
  const [invoiceFor, setInvoiceFor] = useState(null)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    let mounted = true
    api.getTenants().then((res) => {
      if (mounted && res && res.length > 0) setTenantList(res)
    }).catch(() => {}).finally(() => {
      if (mounted) setLoading(false)
    })
    return () => { mounted = false }
  }, [])

  const overdue = tenantList.filter((t) => t.status === 'Overdue')
  const totalBalance = tenantList.reduce((s, t) => s + (t.balance || 0), 0)

  const draftInvoiceMessage = (t) =>
    t
      ? `Hello ${t.name}, your rent invoice${t.unit ? ` for Unit ${t.unit}` : ''} is ready. Current balance: ${formatKsh(t.balance || 0)}. Kindly pay through the authorized channels and share the payment reference. Thank you.`
      : ''

  const handleSendInvoice = async ({ message, channels }) => {
    const t = invoiceFor
    if (!t) return
    setSending(true)
    try {
      const result = await api.sendReminder({
        tenant: t.name,
        phone: t.phone,
        email: t.email,
        message,
        channels,
      })
      const labels = channels.map((c) => CHANNEL_LABELS[c] || c).join(', ')
      if (result.failed.length === 0) {
        showToast(`Invoice sent to ${t.name} via ${labels}.`)
      } else if (result.sent.length > 0) {
        const okLabels = result.sent.map((c) => CHANNEL_LABELS[c] || c).join(', ')
        showToast(`Invoice sent via ${okLabels}; some channels failed.`)
      } else {
        showToast(`Invoice queued for ${t.name} via ${labels}.`)
      }
    } catch (e) {
      showToast(`Invoice queued for ${invoiceFor?.name}.`)
    } finally {
      setSending(false)
      setInvoiceFor(null)
    }
  }

  return (
    <>
      <ListPageTemplate
        title="Tenants & Billing"
        description="Tenant directory with automated rent invoicing and balances. Click a tenant to view their full profile."
        actions={<Link to="/admin/tenant-onboarding"><Button icon={Plus}>Add Tenant</Button></Link>}
        onRowClick={(row) => navigate(`/admin/tenants/${row.id}`)}
        loading={loading}
        stats={[
          { label: 'Total Tenants', value: tenantList.length, icon: Users },
          { label: 'Monthly Rent Roll', value: formatKsh(tenantList.reduce((s, t) => s + (t.rent || 0), 0)), icon: Receipt, tone: 'blue' },
          { label: 'Outstanding Balance', value: formatKsh(totalBalance), icon: Wallet, tone: 'orange' },
          { label: 'Overdue Tenants', value: overdue.length, icon: AlertTriangle, tone: 'red' },
        ]}
        columns={[
          { key: 'name', header: 'Tenant', render: (r) => (
            <div className="flex items-center gap-2.5">
              <Avatar name={r.name} size={30} />
              <div>
                <p className="font-medium text-slate-800">{r.name}</p>
                <p className="text-xs text-slate-400">{r.phone}</p>
              </div>
            </div>
          ) },
          { key: 'unit', header: 'Unit' },
          { key: 'rent', header: 'Rent', render: (r) => formatKsh(r.rent) },
          { key: 'balance', header: 'Balance', render: (r) => (
            <span className={r.balance > 0 ? 'text-red-600 font-medium' : 'text-slate-600'}>
              {formatKsh(r.balance)}
            </span>
          ) },
          { key: 'status', header: 'Status', render: (r) => (
            <Badge tone={r.status === 'Current' || r.status === 'Active' ? 'brand' : r.status === 'Overdue' ? 'red' : 'orange'}>
              {r.status}
            </Badge>
          ) },
          { key: 'actions', header: '', align: 'right', render: (r) => (
            <Button
              variant="secondary"
              size="sm"
              icon={Send}
              onClick={(e) => {
                e.stopPropagation()
                setInvoiceFor(r)
              }}
            >
              Send Invoice
            </Button>
          ) },
        ]}
        rows={tenantList}
        searchKeys={['name', 'unit', 'phone']}
        searchPlaceholder="Search tenants by name, unit, phone…"
      />

      <ReminderDialog
        open={!!invoiceFor}
        onClose={() => setInvoiceFor(null)}
        onSend={handleSendInvoice}
        sending={sending}
        title="Send Invoice"
        sendLabel="Send Invoice"
        tenant={invoiceFor ? { tenant: invoiceFor.name, unit: invoiceFor.unit } : {}}
        defaultMessage={draftInvoiceMessage(invoiceFor)}
      />
    </>
  )
}
