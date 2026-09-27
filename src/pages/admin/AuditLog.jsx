import { useState, useEffect, useCallback } from 'react'
import ListPageTemplate from '../../components/patterns/ListPageTemplate'
import { Clock, Shield } from 'lucide-react'
import { api } from '../../api/client'

export default function AuditLog() {
  const [logs, setLogs] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(8)
  const [searchQuery, setSearchQuery] = useState('')

  const fetchLogs = useCallback(async (page = 1, size = 8, search = '') => {
    setLoading(true)
    try {
      const res = await api.getAuditLogs({ page, pageSize: size, search })
      if (res && res.data) {
        setLogs(res.data)
        setPagination(res.pagination)
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLogs(1, pageSize, '')
  }, [fetchLogs, pageSize])

  const handlePageChange = useCallback((newPage, newPageSize) => {
    if (newPageSize && newPageSize !== pageSize) {
      setPageSize(newPageSize)
      setCurrentPage(1)
      fetchLogs(1, newPageSize, searchQuery)
    } else {
      setCurrentPage(newPage)
      fetchLogs(newPage, pageSize, searchQuery)
    }
  }, [fetchLogs, searchQuery, pageSize])

  const handleSearch = useCallback((query) => {
    setSearchQuery(query)
    setCurrentPage(1)
    fetchLogs(1, pageSize, query)
  }, [fetchLogs, pageSize])

  // Build server pagination props
  const serverPagination = pagination ? {
    page: pagination.page,
    pageSize: pagination.pageSize,
    total: pagination.total,
    hasNext: pagination.hasNext,
    hasPrev: pagination.hasPrev,
  } : null

  return (
    <ListPageTemplate
      title="Audit Log"
      description="Track all system activities and changes."
      loading={loading}
      stats={[
        { label: 'Total Events', value: pagination?.total || logs.length, icon: Shield },
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
      searchPlaceholder="Search by user…"
      serverPagination={serverPagination}
      onPageChange={handlePageChange}
      onSearch={handleSearch}
    />
  )
}
