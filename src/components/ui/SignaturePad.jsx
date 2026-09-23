import { useRef, useState, useEffect } from 'react'
import { Eraser } from 'lucide-react'

/**
 * A lightweight canvas-based signature pad. Captures a hand-drawn signature
 * and reports it back as a PNG data URL via onChange. Supports both mouse and
 * touch input.
 */
export default function SignaturePad({ label, onChange, height = 160 }) {
  const canvasRef = useRef(null)
  const drawing = useRef(false)
  const last = useRef({ x: 0, y: 0 })
  const [hasInk, setHasInk] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ratio = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * ratio
    canvas.height = height * ratio
    const ctx = canvas.getContext('2d')
    ctx.scale(ratio, ratio)
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#0f172a'
  }, [height])

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    const point = e.touches ? e.touches[0] : e
    return { x: point.clientX - rect.left, y: point.clientY - rect.top }
  }

  const start = (e) => {
    e.preventDefault()
    drawing.current = true
    last.current = getPos(e)
  }

  const move = (e) => {
    if (!drawing.current) return
    e.preventDefault()
    const ctx = canvasRef.current.getContext('2d')
    const pos = getPos(e)
    ctx.beginPath()
    ctx.moveTo(last.current.x, last.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    last.current = pos
    if (!hasInk) setHasInk(true)
  }

  const end = () => {
    if (!drawing.current) return
    drawing.current = false
    if (onChange) onChange(canvasRef.current.toDataURL('image/png'))
  }

  const clear = () => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasInk(false)
    if (onChange) onChange('')
  }

  return (
    <div>
      {label && (
        <div className="flex items-center justify-between mb-1.5">
          <span className="block text-sm font-medium text-slate-700">{label}</span>
          {hasInk && (
            <button
              type="button"
              onClick={clear}
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-red-600"
            >
              <Eraser size={13} /> Clear
            </button>
          )}
        </div>
      )}
      <div className="rounded-lg border border-slate-300 bg-white overflow-hidden">
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height, touchAction: 'none', cursor: 'crosshair' }}
          onMouseDown={start}
          onMouseMove={move}
          onMouseUp={end}
          onMouseLeave={end}
          onTouchStart={start}
          onTouchMove={move}
          onTouchEnd={end}
        />
      </div>
      {!hasInk && <p className="text-xs text-slate-400 mt-1">Sign above using your mouse or finger.</p>}
    </div>
  )
}
