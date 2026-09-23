const COLORS = [
  'bg-brand-100 text-brand-700',
  'bg-blue-100 text-blue-700',
  'bg-violet-100 text-violet-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
]

function initials(name = '') {
  let str = ''
  if (typeof name === 'string') {
    str = name
  } else if (name && typeof name === 'object') {
    str = name.message || name.name || name.full_name || ''
  } else {
    str = String(name || '')
  }
  const parts = str.trim().split(/\s+/)
  return (((parts[0]?.[0] || '') + (parts[1]?.[0] || '')) || 'U').toUpperCase()
}

function hash(str) {
  const s = typeof str === 'string' ? str : (str && typeof str === 'object' ? str.message || str.name || '' : String(str || ''))
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

export default function Avatar({ name, size = 36 }) {
  const color = COLORS[hash(name || '') % COLORS.length]
  return (
    <div
      className={`rounded-full flex items-center justify-center font-semibold shrink-0 ${color}`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials(name)}
    </div>
  )
}
