export function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700 mb-1.5">{label}</span>
      {children}
    </label>
  )
}

const inputClass =
  'w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400 placeholder:text-slate-400'

export function TextInput({ className = '', ...props }) {
  return <input className={`${inputClass} ${className}`} {...props} />
}

export function Select({ children, className = '', ...props }) {
  return (
    <select className={`${inputClass} ${className}`} {...props}>
      {children}
    </select>
  )
}

export function TextArea({ className = '', ...props }) {
  return <textarea className={`${inputClass} min-h-[90px] ${className}`} {...props} />
}
