import { useState } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'

/**
 * Wraps Modal with a <form> and standard Cancel/Submit footer, so every
 * "Add X" flow in the app (Add Landlord, Log Expense, New Project…) is a
 * few lines: pass fields as children, handle submit, done.
 *
 * While onSubmit is in flight (it may return a promise), the submit button is
 * disabled and shows a "Submitting…" label, and Cancel is disabled — so a form
 * can't be double-submitted and the user gets clear feedback.
 */
export default function FormModal({
  open,
  onClose,
  title,
  description,
  onSubmit,
  submitLabel = 'Save',
  submittingLabel = 'Submitting…',
  size = 'xl',
  children,
}) {
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    try {
      await onSubmit(e)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={submitting ? () => {} : onClose} title={title} description={description} size={size}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {children}
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? submittingLabel : submitLabel}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
