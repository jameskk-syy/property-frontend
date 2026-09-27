import { useState, useEffect, useRef } from 'react'
import { Smartphone, CheckCircle2, XCircle, Clock } from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { Field, TextInput } from '../ui/Field'
import { formatKsh } from '../../data/mockData'
import { api } from '../../api/client'

// How long to poll for the callback result before showing "still pending".
const POLL_INTERVAL_MS = 3000
const POLL_MAX_TRIES = 20 // ~60s

export default function PayRentModal({ open, onClose, invoice = null, amount = null, defaultPhone = '', lease = null, leaseInfo = null }) {
  const [phone, setPhone] = useState(defaultPhone || '')
  const [stage, setStage] = useState('form') // form | waiting | paid | failed | pending
  const [error, setError] = useState('')
  const [detail, setDetail] = useState('')
  const pollRef = useRef(null)

  useEffect(() => {
    if (open) { setPhone(defaultPhone || ''); setStage('form'); setError(''); setDetail('') }
  }, [open, defaultPhone])

  // Clean up any polling timer on close/unmount.
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current) }, [])

  const dueAmount = amount != null ? amount : (leaseInfo?.rent || 0)
  const propLabel = leaseInfo?.property_name || 'Your rental'
  const unitLabel = leaseInfo?.unit || ''

  const startPolling = (checkoutRequestId) => {
    let tries = 0
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      tries += 1
      try {
        const res = await api.getPaymentStatus({
          checkoutRequestId,
          lease: !checkoutRequestId ? lease : null,
          invoice: !checkoutRequestId ? invoice : null,
        })
        const s = res?.status
        if (s === 'Paid') {
          clearInterval(pollRef.current)
          setDetail(res.mpesa_receipt ? `M-Pesa ref: ${res.mpesa_receipt}` : '')
          setStage('paid')
        } else if (s === 'Failed') {
          clearInterval(pollRef.current)
          setDetail(res.result_desc || 'The payment was not completed.')
          setStage('failed')
        }
      } catch { /* keep polling */ }
      if (tries >= POLL_MAX_TRIES && pollRef.current) {
        clearInterval(pollRef.current)
        setStage('pending')
      }
    }, POLL_INTERVAL_MS)
  }

  const handlePay = async (e) => {
    e.preventDefault()
    setStage('waiting')
    setError('')
    try {
      let resp
      if (invoice) {
        resp = await api.payInvoiceMpesa(invoice, { phone, amount: dueAmount })
      } else if (lease) {
        resp = await api.initiateOnboardingPayment(lease, phone)
      } else {
        resp = await api.triggerMpesaStk({
          phone, amount: dueAmount, reference: unitLabel || 'RENT',
          description: `Rent payment for ${propLabel} ${unitLabel}`.trim(),
        })
      }
      startPolling(resp?.checkout_request_id || null)
    } catch (err) {
      setError(err?.message || 'Could not send the STK push.')
      setStage('form')
    }
  }

  const handleClose = () => {
    if (pollRef.current) clearInterval(pollRef.current)
    onClose()
    setTimeout(() => setStage('form'), 200)
  }

  return (
    <Modal open={open} onClose={handleClose} title="Pay Rent" description={unitLabel ? `${propLabel} · Unit ${unitLabel}` : propLabel} size="lg">
      {stage === 'form' && (
        <form onSubmit={handlePay} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-lg bg-slate-50 border border-slate-100 p-4 flex items-center justify-between">
              <span className="text-sm text-slate-500">Amount due</span>
              <span className="text-lg font-semibold text-slate-900">{formatKsh(dueAmount)}</span>
            </div>
            <Field label="M-Pesa phone number">
              <TextInput value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+254 7XX XXX XXX" />
            </Field>
          </div>
          <p className="text-[11px] text-slate-400">The STK prompt is sent to this number. You can enter a different M-Pesa number to pay from.</p>
          {error && <p className="text-xs text-rose-600">{error}</p>}
          <Button type="submit" className="w-full" icon={Smartphone}>Send STK Push</Button>
        </form>
      )}

      {stage === 'waiting' && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-10 h-10 rounded-full border-4 border-brand-100 border-t-brand-500 animate-spin mb-4" />
          <p className="text-sm font-medium text-slate-700">Check your phone for the M-Pesa prompt…</p>
          <p className="text-xs text-slate-400 mt-1">Enter your PIN. This screen updates automatically once confirmed.</p>
        </div>
      )}

      {stage === 'paid' && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <CheckCircle2 size={40} className="text-emerald-500 mb-3" />
          <p className="text-sm font-semibold text-slate-800">Payment received</p>
          <p className="text-xs text-slate-500 mt-1 mb-1">{formatKsh(dueAmount)} confirmed.</p>
          {detail && <p className="text-[11px] text-slate-400 mb-4">{detail}</p>}
          <Button variant="secondary" onClick={handleClose}>Done</Button>
        </div>
      )}

      {stage === 'failed' && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <XCircle size={40} className="text-rose-500 mb-3" />
          <p className="text-sm font-semibold text-slate-800">Payment not completed</p>
          <p className="text-xs text-slate-500 mt-1 mb-4">{detail}</p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setStage('form')}>Try again</Button>
            <Button variant="ghost" onClick={handleClose}>Close</Button>
          </div>
        </div>
      )}

      {stage === 'pending' && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Clock size={40} className="text-amber-500 mb-3" />
          <p className="text-sm font-semibold text-slate-800">Still awaiting confirmation</p>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            The prompt was sent. If you completed it, your balance will update shortly.
          </p>
          <Button variant="secondary" onClick={handleClose}>Close</Button>
        </div>
      )}
    </Modal>
  )
}
