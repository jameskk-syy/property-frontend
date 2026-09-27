import { useEffect, useState } from 'react'
import { MessageSquare, Mail, MessageCircle, Send } from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { TextArea } from '../ui/Field'

const CHANNELS = [
  { key: 'sms', label: 'SMS', icon: MessageSquare },
  { key: 'email', label: 'Email', icon: Mail },
  { key: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
]

/**
 * Dialog for composing an arrears reminder and choosing which channels to
 * send it through (SMS, Email, WhatsApp, or all). Calls onSend({ message,
 * channels }) when confirmed.
 */
export default function ReminderDialog({
  open,
  onClose,
  onSend,
  tenant = {},
  defaultMessage = '',
  sending = false,
  title = 'Send Rent Reminder',
  sendLabel = 'Send Reminder',
}) {
  const [message, setMessage] = useState(defaultMessage)
  const [channels, setChannels] = useState(['whatsapp'])

  useEffect(() => {
    if (open) {
      setMessage(defaultMessage)
      setChannels(['whatsapp'])
    }
  }, [open, defaultMessage])

  const toggle = (key) => {
    setChannels((prev) => (prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key]))
  }

  const allSelected = channels.length === CHANNELS.length
  const toggleAll = () => setChannels(allSelected ? [] : CHANNELS.map((c) => c.key))

  const canSend = message.trim().length > 0 && channels.length > 0 && !sending

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={tenant.tenant ? `To ${tenant.tenant}${tenant.unit ? ` · Unit ${tenant.unit}` : ''}` : 'Compose and send the message.'}
      size="xl"
    >
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="block text-sm font-medium text-slate-700">Message</span>
            <span className="text-xs text-slate-400">{message.length} chars</span>
          </div>
          <TextArea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type the reminder message to send to the tenant…"
            rows={5}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="block text-sm font-medium text-slate-700">Send via</span>
            <button
              type="button"
              onClick={toggleAll}
              className={`text-xs font-medium px-2 py-1 rounded-md border transition-colors ${
                allSelected
                  ? 'bg-brand-500 text-white border-brand-500'
                  : 'text-brand-600 border-brand-200 hover:bg-brand-50'
              }`}
            >
              {allSelected ? 'All selected' : 'Select all'}
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {CHANNELS.map(({ key, label, icon: Icon }) => {
              const active = channels.includes(key)
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggle(key)}
                  className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-lg border text-sm font-medium transition-colors ${
                    active
                      ? 'bg-brand-50 border-brand-300 text-brand-700 ring-1 ring-brand-300'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Icon size={18} />
                  {label}
                </button>
              )
            })}
          </div>
          {channels.length === 0 && (
            <p className="text-xs text-amber-600 mt-1.5">Select at least one channel to send.</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose} disabled={sending}>Cancel</Button>
          <Button
            icon={Send}
            disabled={!canSend}
            onClick={() => onSend({ message: message.trim(), channels })}
          >
            {sending ? 'Sending…' : `${sendLabel}${channels.length > 1 ? ` (${channels.length})` : ''}`}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
