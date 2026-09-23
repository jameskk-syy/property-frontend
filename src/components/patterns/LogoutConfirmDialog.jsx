import { useEffect, useRef, useState } from 'react'
import { LogOut } from 'lucide-react'
import Button from '../ui/Button'

/**
 * Confirmation dialog shown before signing out. Runs a countdown and
 * automatically confirms when it reaches zero, unless the user cancels.
 * Kept intentionally standalone (not using Modal) so it can render above
 * everything and manage its own timer lifecycle.
 */
export default function LogoutConfirmDialog({ open, seconds = 10, onConfirm, onCancel }) {
  const [remaining, setRemaining] = useState(seconds)
  const confirmedRef = useRef(false)

  useEffect(() => {
    if (!open) return
    confirmedRef.current = false
    setRemaining(seconds)

    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          if (!confirmedRef.current) {
            confirmedRef.current = true
            onConfirm()
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    const onKey = (e) => {
      if (e.key === 'Escape') onCancel()
      if (e.key === 'Enter') {
        confirmedRef.current = true
        onConfirm()
      }
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'

    return () => {
      clearInterval(interval)
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, seconds, onConfirm, onCancel])

  if (!open) return null

  const handleConfirm = () => {
    confirmedRef.current = true
    onConfirm()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]" onClick={onCancel} />
      <div className="relative w-full max-w-sm bg-white rounded-xl2 shadow-xl border border-slate-100 p-6 text-center animate-modal-in">
        <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4 ring-8 ring-red-50/60">
          <LogOut size={26} />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-1">Sign out?</h3>
        <p className="text-sm text-slate-500 mb-1">
          You are about to be signed out of the system.
        </p>
        <p className="text-sm text-slate-400 mb-5">
          Signing out automatically in <span className="font-semibold text-slate-700">{remaining}s</span>.
        </p>
        <div className="flex items-center justify-center gap-2.5">
          <Button variant="secondary" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button variant="danger" onClick={handleConfirm} className="flex-1">
            Sign out now
          </Button>
        </div>
      </div>
    </div>
  )
}
