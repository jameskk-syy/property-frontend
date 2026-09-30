import { useEffect, useRef, useCallback } from 'react'

/**
 * Fire `onIdle` after `timeout` ms without any user activity, and `onActive`
 * when the user interacts again. Activity = mouse, keyboard, touch, scroll, or
 * wheel anywhere in the document.
 *
 * The timer is debounced through a ref so rapid events don't thrash React
 * state. Pass `enabled: false` to suspend tracking (e.g. when logged out or
 * while the warning dialog is already open).
 *
 * @param {object}   opts
 * @param {number}   opts.timeout   Idle threshold in ms (e.g. 10 * 60 * 1000).
 * @param {Function} opts.onIdle    Called once when the idle threshold is hit.
 * @param {Function} [opts.onActive] Called when activity resumes after a reset.
 * @param {boolean}  [opts.enabled=true] Whether tracking is active.
 */
export default function useIdleTimer({ timeout, onIdle, onActive, enabled = true }) {
  const timerRef = useRef(null)
  const onIdleRef = useRef(onIdle)
  const onActiveRef = useRef(onActive)

  // Keep the latest callbacks without re-subscribing listeners.
  useEffect(() => { onIdleRef.current = onIdle }, [onIdle])
  useEffect(() => { onActiveRef.current = onActive }, [onActive])

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  // Exposed so callers can restart the countdown (e.g. after the user cancels
  // the warning dialog).
  const reset = useCallback(() => {
    clear()
    if (!enabled) return
    timerRef.current = setTimeout(() => {
      onIdleRef.current?.()
    }, timeout)
  }, [clear, enabled, timeout])

  useEffect(() => {
    if (!enabled) {
      clear()
      return
    }

    let firedActive = false
    const handleActivity = () => {
      if (firedActive) {
        firedActive = false
      }
      onActiveRef.current?.()
      reset()
    }

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'wheel', 'click']
    // `scroll`/`wheel` fire rapidly; passive listeners keep them cheap.
    events.forEach((e) => window.addEventListener(e, handleActivity, { passive: true }))

    // Start the initial countdown.
    reset()

    return () => {
      events.forEach((e) => window.removeEventListener(e, handleActivity))
      clear()
    }
  }, [enabled, reset, clear])

  return { reset, clear }
}
