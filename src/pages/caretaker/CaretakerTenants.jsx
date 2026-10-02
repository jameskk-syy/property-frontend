import { useState, useEffect, useCallback } from 'react'
import { Users, Smartphone, CheckCircle2, Clock, AlertTriangle, LogOut, Plus, Trash2, Upload, Pencil } from 'lucide-react'
import ListPageTemplate from '../../components/patterns/ListPageTemplate'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import { Field, TextInput, TextArea } from '../../components/ui/Field'
import IdCapture from '../../components/ui/IdCapture'
import ImportTenantsModal from '../../components/patterns/ImportTenantsModal'
import TenantDetailDrawer from '../../components/patterns/TenantDetailDrawer'
import { useToast } from '../../context/ToastContext'
import { formatKsh } from '../../data/mockData'
import { api } from '../../api/client'

const emptyItem = () => ({ item_name: '', description: '', quantity: 1, estimated_value: '', photo: null })

// STK Push Dialog Component
function StkDialog({ open, onClose, tenant, onSend, sending }) {
  const [phone, setPhone] = useState('')

  useEffect(() => {
    if (open && tenant) {
      setPhone(tenant.phone || '')
    }
  }, [open, tenant])

  if (!open || !tenant) return null

  const handleSend = () => {
    if (!phone.trim()) return
    onSend(phone.trim())
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Send M-Pesa STK Push"
      description={`Send payment request to ${tenant.tenant_name} for rent + deposit.`}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Phone Number" hint="The M-Pesa number to receive the STK push">
            <TextInput
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 0712345678 or 254712345678"
              autoFocus
            />
          </Field>

          <Field label="Amount (KES)" hint="Rent + Deposit amount">
            <TextInput
              type="text"
              value={formatKsh(tenant.initial_amount_due || 0)}
              disabled
              className="bg-slate-100 text-slate-600"
            />
          </Field>
        </div>

        <Field label="Unit">
          <TextInput
            type="text"
            value={tenant.unit || '—'}
            disabled
            className="bg-slate-100 text-slate-600"
          />
        </Field>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <Button variant="ghost" onClick={onClose} disabled={sending}>Cancel</Button>
          <Button 
            icon={Smartphone} 
            onClick={handleSend} 
            disabled={sending || !phone.trim()}
          >
            {sending ? 'Sending…' : 'Send STK Push'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default function CaretakerTenants() {
  const { showToast } = useToast()
  const [rows, setRows] = useState([])
  const [pagination, setPagination] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(8)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(null)

  // STK dialog state
  const [stkFor, setStkFor] = useState(null)
  const [stkSending, setStkSending] = useState(false)

  // Vacate modal state
  const [vacateFor, setVacateFor] = useState(null) // the tenant row being vacated
  const [reason, setReason] = useState('')
  const [items, setItems] = useState([])
  const [saving, setSaving] = useState(false)

  // Import + edit-drawer state
  const [importOpen, setImportOpen] = useState(false)
  const [editTenantId, setEditTenantId] = useState(null)

  const load = useCallback((page = currentPage, size = pageSize, search = searchQuery) => {
    setLoading(true)
    api.getMyTenants({ page, pageSize: size, search })
      .then((res) => {
        if (res && res.data) {
          setRows(res.data)
          setPagination(res.pagination)
        } else if (Array.isArray(res)) {
          setRows(res)
          setPagination(null)
        }
      })
      .catch((err) => showToast(err?.message || 'Could not load tenants.'))
      .finally(() => setLoading(false))
  }, [showToast, currentPage, pageSize, searchQuery])

  // Initial load (and when page size changes).
  useEffect(() => { load(1, pageSize, searchQuery) }, [pageSize]) // eslint-disable-line react-hooks/exhaustive-deps

  const handlePageChange = useCallback((newPage, newPageSize) => {
    if (newPageSize && newPageSize !== pageSize) {
      setPageSize(newPageSize)
      setCurrentPage(1)
      load(1, newPageSize, searchQuery)
    } else {
      setCurrentPage(newPage)
      load(newPage, pageSize, searchQuery)
    }
  }, [load, pageSize, searchQuery])

  const handleSearch = useCallback((query) => {
    setSearchQuery(query)
    setCurrentPage(1)
    load(1, pageSize, query)
  }, [load, pageSize])

  const serverPagination = pagination ? {
    page: pagination.page,
    pageSize: pagination.pageSize,
    total: pagination.total,
    hasNext: pagination.hasNext,
    hasPrev: pagination.hasPrev,
  } : null

  // Open STK dialog instead of sending directly
  const openStkDialog = (row) => {
    if (!row.lease) {
      showToast('This tenant has no lease/unit yet. Assign a unit first.')
      return
    }
    setStkFor(row)
  }

  // Send STK with the phone from dialog
  const sendStk = async (phone) => {
    if (!stkFor) return
    setStkSending(true)
    setBusy(stkFor.tenant)
    try {
      const resp = await api.initiateOnboardingPayment(stkFor.lease, phone)
      showToast(`STK push sent to ${stkFor.tenant_name}. Ask them to approve on their phone.`)
      setRows((prev) => prev.map((r) => (r.tenant === stkFor.tenant ? { ...r, initial_payment_status: 'Initiated' } : r)))
      pollStatus(stkFor, resp?.checkout_request_id || null)
      setStkFor(null)
    } catch (err) {
      showToast(err?.message || 'Could not send the STK push. Check M-Pesa settings.')
    } finally {
      setStkSending(false)
      setBusy(null)
    }
  }

  // Poll the callback result and update the row's status live.
  const pollStatus = (row, checkoutRequestId) => {
    let tries = 0
    const timer = setInterval(async () => {
      tries += 1
      try {
        const res = await api.getPaymentStatus({
          checkoutRequestId,
          lease: !checkoutRequestId ? row.lease : null,
        })
        const s = res?.status
        if (s === 'Paid' || s === 'Failed') {
          clearInterval(timer)
          setBusy(null)
          setRows((prev) => prev.map((r) => (r.tenant === row.tenant ? { ...r, initial_payment_status: s } : r)))
          showToast(s === 'Paid'
            ? `${row.tenant_name}'s rent + deposit received.`
            : `Payment not completed: ${res.result_desc || 'no response'}.`)
        }
      } catch { /* keep polling */ }
      if (tries >= 20) { clearInterval(timer); setBusy(null) }
    }, 3000)
  }

  // --- Vacate flow ---
  const openVacate = (row) => {
    if (!row.lease) {
      showToast('This tenant has no active lease/unit to vacate.')
      return
    }
    setVacateFor(row)
    setReason('')
    setItems([])
  }

  const closeVacate = () => {
    if (saving) return
    setVacateFor(null)
    setReason('')
    setItems([])
  }

  const addItem = () => setItems((prev) => [...prev, emptyItem()])
  const removeItem = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx))
  const setItem = (idx, patch) => setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)))

  const submitVacate = async () => {
    if (!vacateFor) return
    // Drop blank item rows; keep only ones with a name.
    const heldItems = items
      .filter((it) => (it.item_name || '').trim())
      .map((it) => ({
        item_name: it.item_name.trim(),
        description: it.description || '',
        quantity: Number(it.quantity) || 1,
        estimated_value: Number(it.estimated_value) || 0,
        photo: it.photo || null,
      }))
    setSaving(true)
    try {
      await api.vacateUnit(vacateFor.lease, reason || null, heldItems)
      showToast(`${vacateFor.tenant_name} moved out. Unit ${vacateFor.unit || ''} is now vacant.`)
      setVacateFor(null)
      setReason('')
      setItems([])
      load()
    } catch (err) {
      showToast(err?.message || 'Could not complete the move-out.')
    } finally {
      setSaving(false)
    }
  }

  const handleImport = async (tenantRows) => {
    try {
      const res = await api.bulkCreateTenants(tenantRows)
      const created = (res?.created?.length) || 0
      const updated = (res?.updated?.length) || 0
      const failed = (res?.failed?.length) || 0
      showToast(
        failed
          ? `Imported ${created + updated} tenant(s). ${failed} row(s) failed.`
          : `Imported ${created} new + ${updated} updated tenant(s). Open each to assign a unit & sign the lease.`
      )
      load()
    } catch (err) {
      showToast(err?.message || 'Could not import tenants.')
      throw err // keep the modal open on failure
    }
  }

  const paid = rows.filter((r) => r.initial_payment_status === 'Paid').length
  const pending = rows.filter((r) => ['Pending', 'Initiated', 'Failed'].includes(r.initial_payment_status) && r.assigned).length
  const unassigned = rows.filter((r) => !r.assigned).length

  return (
    <>
      <ListPageTemplate
        title="My Tenants"
        description="Tenants you've onboarded, their unit and initial payment status."
        loading={loading}
        actions={
          <Button icon={Upload} onClick={() => setImportOpen(true)}>Import Tenants</Button>
        }
        stats={[
          { label: 'Total Tenants', value: pagination?.total ?? rows.length, icon: Users },
          { label: 'Paid (this page)', value: paid, icon: CheckCircle2, tone: 'brand' },
          { label: 'Awaiting (this page)', value: pending, icon: Clock, tone: 'orange' },
          { label: 'Not Assigned (this page)', value: unassigned, icon: AlertTriangle, tone: 'red' },
        ]}
        columns={[
          { key: 'tenant_name', header: 'Tenant' },
          { key: 'phone', header: 'Phone', render: (r) => r.phone || '—' },
          { key: 'unit', header: 'Unit', render: (r) => r.unit || '—' },
          { key: 'initial_amount_due', header: 'Rent + Deposit', render: (r) => (r.assigned ? formatKsh(r.initial_amount_due || 0) : '—') },
          {
            key: 'status',
            header: 'Tenant',
            render: (r) => {
              const s = r.status || 'Active'
              const tone = s === 'Moved Out' ? 'slate' : s === 'Notice' ? 'orange' : 'green'
              return <Badge tone={tone}>{s}</Badge>
            },
          },
          {
            key: 'initial_payment_status',
            header: 'Payment',
            render: (r) => {
              if (!r.assigned) return <Badge tone="slate">No unit</Badge>
              const s = r.initial_payment_status || 'Pending'
              const tone = s === 'Paid' ? 'green' : s === 'Failed' ? 'red' : s === 'Initiated' ? 'blue' : 'orange'
              return <Badge tone={tone}>{s}</Badge>
            },
          },
          {
            key: 'actions',
            header: '',
            render: (r) => (
              <div className="flex items-center justify-end gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  icon={Pencil}
                  onClick={() => setEditTenantId(r.tenant)}
                >
                  {r.assigned ? 'Manage' : 'Assign Unit'}
                </Button>
                {r.assigned && r.initial_payment_status !== 'Paid' && (
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={Smartphone}
                    disabled={busy === r.tenant}
                    onClick={() => openStkDialog(r)}
                  >
                    {busy === r.tenant ? 'Sending…' : (r.initial_payment_status === 'Failed' ? 'Retry Payment' : 'Send STK')}
                  </Button>
                )}
                {r.assigned && r.status !== 'Moved Out' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={LogOut}
                    onClick={() => openVacate(r)}
                  >
                    Vacate
                  </Button>
                )}
              </div>
            ),
          },
        ]}
        rows={rows}
        searchPlaceholder="Search your tenants…"
        emptyMessage="You haven't onboarded any tenants yet."
        serverPagination={serverPagination}
        onPageChange={handlePageChange}
        onSearch={handleSearch}
      />

      <Modal
        open={!!vacateFor}
        onClose={closeVacate}
        size="xl"
        title={vacateFor ? `Vacate ${vacateFor.tenant_name}` : 'Vacate Unit'}
        description={vacateFor ? `Terminate the lease on unit ${vacateFor.unit || '—'}. The unit becomes vacant and re-appears in listings.` : ''}
      >
        <div className="space-y-5">
          <Field label="Reason for move-out (optional)">
            <TextArea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Lease ended, unable to pay rent, relocated…"
            />
          </Field>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="block text-sm font-medium text-slate-700">Held tenant items</span>
                <span className="block text-xs text-slate-500">Belongings held against unpaid rent or dues. Leave empty if none.</span>
              </div>
              <Button size="sm" variant="secondary" icon={Plus} onClick={addItem}>Add item</Button>
            </div>

            {items.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 py-6 text-center text-sm text-slate-400">
                No held items added.
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((it, idx) => (
                  <div key={idx} className="rounded-lg border border-slate-200 p-4 bg-slate-50/60">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <span className="text-xs font-semibold text-slate-500">Item {idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="text-rose-500 hover:text-rose-600"
                        title="Remove item"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Field label="Item name">
                        <TextInput
                          value={it.item_name}
                          onChange={(e) => setItem(idx, { item_name: e.target.value })}
                          placeholder="e.g. TV, Sofa set…"
                        />
                      </Field>
                      <Field label="Quantity">
                        <TextInput
                          type="number"
                          min="1"
                          value={it.quantity}
                          onChange={(e) => setItem(idx, { quantity: e.target.value })}
                        />
                      </Field>
                      <Field label="Estimated value (KSh)">
                        <TextInput
                          type="number"
                          min="0"
                          value={it.estimated_value}
                          onChange={(e) => setItem(idx, { estimated_value: e.target.value })}
                          placeholder="0"
                        />
                      </Field>
                      <Field label="Description (optional)">
                        <TextInput
                          value={it.description}
                          onChange={(e) => setItem(idx, { description: e.target.value })}
                          placeholder="Condition, notes…"
                        />
                      </Field>
                    </div>
                    <div className="mt-3">
                      <IdCapture
                        label="Photo (optional)"
                        value={it.photo}
                        onChange={(dataUrl) => setItem(idx, { photo: dataUrl })}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="ghost" onClick={closeVacate} disabled={saving}>Cancel</Button>
            <Button variant="danger" icon={LogOut} onClick={submitVacate} disabled={saving}>
              {saving ? 'Processing…' : 'Confirm Move-Out'}
            </Button>
          </div>
        </div>
      </Modal>

      <ImportTenantsModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={handleImport}
      />

      <TenantDetailDrawer
        open={!!editTenantId}
        tenantId={editTenantId}
        onClose={() => setEditTenantId(null)}
        onSaved={load}
      />

      <StkDialog
        open={!!stkFor}
        onClose={() => setStkFor(null)}
        tenant={stkFor}
        onSend={sendStk}
        sending={stkSending}
      />
    </>
  )
}
