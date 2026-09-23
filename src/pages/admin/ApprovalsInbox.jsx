import { useState, useEffect, useCallback } from 'react'
import { CheckCircle2, XCircle, ClipboardCheck, Clock, RefreshCw } from 'lucide-react'
import ListPageTemplate from '../../components/patterns/ListPageTemplate'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { useToast } from '../../context/ToastContext'
import { api } from '../../api/client'

export default function ApprovalsInbox() {
  const { showToast } = useToast()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    api.getPendingApprovals()
      .then((res) => setRequests(res || []))
      .catch((err) => showToast(err?.message || 'Could not load approvals.'))
      .finally(() => setLoading(false))
  }, [showToast])

  useEffect(() => { load() }, [load])

  const act = async (id, kind) => {
    setBusyId(id)
    try {
      if (kind === 'approve') {
        await api.approveRequest(id)
        showToast('Request approved. Expense posted to the ledger.')
      } else {
        await api.rejectRequest(id)
        showToast('Request rejected.')
      }
      setRequests((prev) => prev.filter((r) => r.id !== id))
    } catch (err) {
      showToast(err?.message || 'Action failed.')
    } finally {
      setBusyId(null)
    }
  }

  const expenseCount = requests.filter((r) => r.type === 'Expense').length

  return (
    <ListPageTemplate
      title="Approvals Inbox"
      description="Maker-checker queue. Approving an expense posts it to the accounts. You cannot approve a request you raised yourself."
      loading={loading}
      actions={
        <Button variant="ghost" icon={RefreshCw} onClick={load} className={loading ? 'animate-spin' : ''}>
          Refresh
        </Button>
      }
      stats={[
        { label: 'Pending', value: requests.length, icon: Clock, tone: 'orange' },
        { label: 'Expense Requests', value: expenseCount, icon: ClipboardCheck, tone: 'brand' },
      ]}
      columns={[
        { key: 'type', header: 'Type', render: (r) => <Badge>{r.type}</Badge> },
        { key: 'reference', header: 'Reference', render: (r) => `${r.doctype} · ${r.reference}` },
        { key: 'requestedBy', header: 'Requested By' },
        { key: 'organization', header: 'Organization', render: (r) => r.organization || '—' },
        { key: 'comment', header: 'Note', render: (r) => r.comment || '—' },
        {
          key: 'actions',
          header: '',
          render: (r) => (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                icon={CheckCircle2}
                disabled={busyId === r.id}
                onClick={() => act(r.id, 'approve')}
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="secondary"
                icon={XCircle}
                disabled={busyId === r.id}
                onClick={() => act(r.id, 'reject')}
              >
                Reject
              </Button>
            </div>
          ),
        },
      ]}
      rows={requests}
      searchKeys={['type', 'reference', 'requestedBy', 'organization']}
      searchPlaceholder="Search pending approvals…"
    />
  )
}
