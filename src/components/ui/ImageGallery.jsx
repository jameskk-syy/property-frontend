import { useRef } from 'react'
import { ImagePlus, X, Star } from 'lucide-react'

/**
 * Multi-image uploader with thumbnail previews. Reads selected files as data
 * URLs and reports the full list back via onChange. The first image is treated
 * as the cover/primary image.
 *
 * value: array of { name, url } objects
 */
export default function ImageGallery({ value = [], onChange, max = 12 }) {
  const inputRef = useRef(null)

  const addFiles = (fileList) => {
    const files = Array.from(fileList || []).filter((f) => f.type.startsWith('image/'))
    if (files.length === 0) return

    const room = Math.max(0, max - value.length)
    const toRead = files.slice(0, room)

    Promise.all(
      toRead.map(
        (file) =>
          new Promise((resolve) => {
            const reader = new FileReader()
            reader.onload = (e) => resolve({ name: file.name, url: e.target.result })
            reader.onerror = () => resolve(null)
            reader.readAsDataURL(file)
          })
      )
    ).then((results) => {
      const valid = results.filter(Boolean)
      if (valid.length > 0) onChange([...value, ...valid])
    })
  }

  const handleSelect = (e) => {
    addFiles(e.target.files)
    e.target.value = ''
  }

  const handleDrop = (e) => {
    e.preventDefault()
    addFiles(e.dataTransfer.files)
  }

  const remove = (index) => {
    onChange(value.filter((_, i) => i !== index))
  }

  const makeCover = (index) => {
    if (index === 0) return
    const next = [...value]
    const [item] = next.splice(index, 1)
    next.unshift(item)
    onChange(next)
  }

  return (
    <div>
      <input ref={inputRef} type="file" accept="image/*" multiple onChange={handleSelect} className="hidden" />

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {value.map((img, i) => (
          <div key={i} className="relative group aspect-[4/3] rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
            <img src={img.url} alt={img.name || `Image ${i + 1}`} className="w-full h-full object-cover" />

            {i === 0 && (
              <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-brand-500 text-white">
                <Star size={10} /> Cover
              </span>
            )}

            <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/40 transition-colors flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100">
              {i !== 0 && (
                <button
                  type="button"
                  onClick={() => makeCover(i)}
                  title="Set as cover"
                  className="w-7 h-7 rounded-md bg-white/90 text-slate-700 flex items-center justify-center hover:bg-white"
                >
                  <Star size={14} />
                </button>
              )}
              <button
                type="button"
                onClick={() => remove(i)}
                title="Remove"
                className="w-7 h-7 rounded-md bg-white/90 text-rose-600 flex items-center justify-center hover:bg-white"
              >
                <X size={15} />
              </button>
            </div>
          </div>
        ))}

        {value.length < max && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="aspect-[4/3] rounded-lg border-2 border-dashed border-slate-300 text-slate-400 flex flex-col items-center justify-center gap-1 hover:border-brand-400 hover:text-brand-500 transition-colors"
          >
            <ImagePlus size={22} />
            <span className="text-xs font-medium">Add images</span>
          </button>
        )}
      </div>

      <p className="text-xs text-slate-400 mt-2">
        {value.length}/{max} images. The first image is used as the cover. Drag to the tile or click to add more.
      </p>
    </div>
  )
}
