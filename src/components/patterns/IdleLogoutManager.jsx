import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import useIdleTimer from '../../hooks/useIdleTimer'
import LogoutConfirmDialog from './LogoutConfirmDialog'

// After this much inactivity we warn the user. The LogoutConfirmDialog then
// counts down `WARNING_SECONDS` before logging out automatically.
const IDLE_TIMEOUT_MS = 10 * 60 * 1000 // 10 minutes
const WARNING_SECONDS = 30

/**
 * Watches for user inactivity across the authenticated app. After 10 minutes
 * with no interaction it shows the sign-out dialog; if the user doesn't respond
 * within the dialog's countdown, they are fully logged out and sent to /login.
 * Any activity before the warning resets the timer.
 *
 * Mounted once inside DashboardLayout so it covers every authenticated page and
 * never runs on public routes (login, etc.).
 */
export default function IdleLogoutManager() {
  const { logout, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [warning, setWarning] = useState(false)

  const enabled = isAuthenticated() && !warning

  // While the warning dialog is open we stop the idle timer (enabled=false) so
  // its own countdown owns the final decision.
  const { reset } = useIdleTimer({
    timeout: IDLE_TIMEOUT_MS,
    enabled,
    onIdle: () => setWarning(true),
  })

  const handleLogout = useCallback(async () => {
    setWarning(false)
    await logout()
    navigate('/login', { replace: true })
  }, [logout, navigate])

  const handleStay = useCallback(() => {
    setWarning(false)
    reset() // restart the 10-minute idle countdown
  }, [reset])

  return (
    <LogoutConfirmDialog
      open={warning}
      seconds={WARNING_SECONDS}
      onConfirm={handleLogout}
      onCancel={handleStay}
    />
  )
}
