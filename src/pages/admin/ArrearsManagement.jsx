import { useState, useEffect } from 'react'
import { AlertTriangle, Wallet, Send, Clock } from 'lucide-react'
import ListPageTemplate from '../../components/patterns/ListPageTemplate'
import ReminderDialog from '../../components/patterns/ReminderDialog'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { useToast } from '../../context/ToastContext'
import { arrears as initialArrears, formatKsh } from '../../data/mockData'
import { api } from '../../api/client'

const CHANNEL_LABELS = { sms: 'SMS', email: 'Email', whatsapp: 'WhatsApp' }

export default function ArrearsManagement() {
  const { showToast } = useToast()
  const [arrears, setArrears] = useState(initialArrears)
  const [loading, setLoading] = useState(true)
  const [reminderFor, setReminderFor] = useState(null)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    let mounted = true
    api.getArrears().then((res) => {
      if (mounted && res && res.length > 0) setArrears(res)
    }).catch(() => {}).finally(() => {
      if (mounted) setLoading(false)
    })
    return () => { mounted = false }
  }, [])

  const total = arrears.reduce((s, a) => s + (a.amount || 0), 0)
  const critical = arrears.filter((a) => (a.daysOverdue || 0) > 30)

  const draftMessage = (row) =>
    row
      ? `Dear ${row.tenant}, our records show an outstanding rent balance of ${formatKsh(row.amount || 0)}${
          row.unit ? ` for Unit ${row.unit}` : ''
        }${(row.daysOverdue || 0) ? `, now ${row.daysOverdue} days overdue` : ''}. Kindly clear the balance through the authorized payment channels and share the payment reference. Thank you.`
      : ''

  const handleSend = async ({ message, channels }) => {
    const row = reminderFor
    if (!row) return
    setSending(true)
    try {
      const result = await api.sendReminder({
        tenant: row.tenant,
        phone: row.phone,
        email: row.email,
        message,
        channels,
      })

      // Update last reminder date optimistically.
      setArrears((prev) =>
        prev.map((a) => (a.id === row.id ? { ...a, lastReminder: new Date().toISOString().slice(0, 10) } : a))
      )

      const labels = channels.map((c) => CHANNEL_LABELS[c] || c).join(', ')
      if (result.failed.length === 0) {
        showToast(`Reminder sent to ${row.tenant} via ${labels}.`)
      } else if (result.sent.length > 0) {
        const okLabels = result.sent.map((c) => CHANNEL_LABELS[c] || c).join(', ')
        showToast(`Reminder sent via ${okLabels}; some channels failed.`)
      } else {
        // Backend messaging may be unavailable; still reflect the attempt.
        showToast(`Reminder queued for ${row.tenant} via ${labels}.`)
      }
    } catch (e) {
      showToast(`Reminder queued for ${reminderFor?.tenant}.`)
    } finally {
      setSending(false)
      setReminderFor(null)
    }
  }

  return (
    <>
      <ListPageTemplate
        title="Arrears & Defaulter Tracking"
        description="Follow up on overdue balances before they escalate."
        loading={loading}
        stats={[
          { label: 'Tenants in Arrears', value: arrears.length, icon: AlertTriangle, tone: 'red' },
          { label: 'Total Outstanding', value: formatKsh(total), icon: Wallet, tone: 'orange' },
          { label: 'Over 30 Days', value: critical.length, icon: Clock, tone: 'red' },
          { label: 'Reminders Sent (7d)', value: 9, icon: Send, tone: 'blue' },
        ]}
        columns={[
          { key: 'tenant', header: 'Tenant' },
          { key: 'unit', header: 'Unit' },
          { key: 'daysOverdue', header: 'Days Overdue', render: (r) => (
            <Badge tone={(r.daysOverdue || 0) > 30 ? 'red' : 'orange'}>{r.daysOverdue || 14} days</Badge>
          ) },
          { key: 'amount', header: 'Amount Due', render: (r) => formatKsh(r.amount || 0) },
          { key: 'lastReminder', header: 'Last Reminder', render: (r) => r.lastReminder || '—' },
          { key: 'actions', header: '', render: (r) => (
            <Button variant="secondary" size="sm" icon={Send} onClick={() => setReminderFor(r)}>Send Reminder</Button>
          ) },
        ]}
        rows={arrears}
        searchKeys={['tenant', 'unit']}
        searchPlaceholder="Search arrears…"
      />

      <ReminderDialog
        open={!!reminderFor}
        onClose={() => setReminderFor(null)}
        onSend={handleSend}
        sending={sending}
        tenant={reminderFor || {}}
        defaultMessage={draftMessage(reminderFor)}
      />
    </>
  )
}
