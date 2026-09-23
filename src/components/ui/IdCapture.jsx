import { useRef } from 'react'
import { Camera, Upload, X, CreditCard } from 'lucide-react'

/**
 * Single-image capture for a national ID side (front/back).
 * - "Take photo" opens the device camera on mobile (input capture="environment").
 * - "Upload" picks an existing image.
 * The image is read as a base64 data URL and reported via onChange(dataUrl|null).
 *
 * value: a base64 data URL string (or empty).
 */
export default function IdCapture({ label, value, onChange }) {
  const cameraRef = useRef(null)
  const uploadRef = useRef(null)

  const read = (file) => {
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (e) => onChange(e.target.result)
    reader.readAsDataURL(file)
  }

  const onPick = (e) => {
    const f = e.target.files && e.target.files[0]
    read(f)
    e.target.value = ''
  }

  return (
    <div>
      <span className="block text-sm font-medium text-slate-700 mb-1.5">{label}</span>

      <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={onPick} className="hidden" />
      <input ref={uploadRef} type="file" accept="image/*" onChange={onPick} className="hidden" />

      {value ? (
        <div className="relative group aspect-[16/10] rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
          <img src={value} alt={label} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
            <button type="button" onClick={() => cameraRef.current?.click()} title="Retake"
              className="w-8 h-8 rounded-md bg-white/90 text-slate-700 flex items-center justify-center hover:bg-white">
              <Camera size={15} />
            </button>
            <button type="button" onClick={() => onChange(null)} title="Remove"
              className="w-8 h-8 rounded-md bg-white/90 text-rose-600 flex items-center justify-center hover:bg-white">
              <X size={16} />
            </button>
          </div>
        </div>
      ) : (
        <div className="aspect-[16/10] rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-2 text-slate-400">
          <CreditCard size={24} />
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => cameraRef.current?.click()}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:border-brand-400 hover:text-brand-500 transition-colors">
              <Camera size={14} /> Take photo
            </button>
            <button type="button" onClick={() => uploadRef.current?.click()}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:border-brand-400 hover:text-brand-500 transition-colors">
              <Upload size={14} /> Upload
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
