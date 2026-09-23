import { useState, useEffect } from 'react'
import ListPageTemplate from '../../components/patterns/ListPageTemplate'
import { Clock, Shield } from 'lucide-react'
import { api } from '../../api/client'

export default function AuditLog() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    api.getAuditLogs({ limit: 500 }).then((res) => {
      if (mounted && Array.isArray(res)) setLogs(res)
    }).catch(() => {}).finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [])

  return (
    <ListPageTemplate
      title="Audit Log"
      description="Track all system activities and changes."
      loading={loading}
      stats={[
        { label: 'Total Events', value: logs.length, icon: Shield },
        { label: 'Today', value: logs.filter(l => l.time && l.time.startsWith(new Date().toISOString().slice(0, 10))).length, icon: Clock, tone: 'blue' },
      ]}
      columns={[
        { key: 'actor', header: 'User' },
        { key: 'action', header: 'Action' },
        { key: 'doctype', header: 'DocType' },
        { key: 'document', header: 'Document' },
        { key: 'time', header: 'Timestamp', render: (r) => r.time ? new Date(r.time).toLocaleString() : '—' },
      ]}
      rows={logs}
      searchKeys={['actor', 'action', 'doctype']}
      searchPlaceholder="Search audit logs…"
    />
  )
}
