// Shared renderer for the accounting statement layout.
//
// Renders a statement "model" (from src/api/statementReports.js) as a table
// that matches the client's workbook: bold section headers, indented line
// items, sub-total rows with a top rule, shaded total rows, an emphasised grand
// total, month columns, and negatives shown in (parentheses).
//
// The SAME model is used by the PDF/Excel export (see exportReport.js) so the
// on-screen view and the exported files look identical.

import { fmtAccounting, cellFor } from '../../api/statementReports'

export default function StatementTable({ model, values = {} }) {
  if (!model) return null
  const { columns, rows, title } = model
  const moneyCols = columns.filter((c) => c.kind === 'money')

  const renderCell = (rowObj, col) => {
    if (col.kind === 'label') return null // label handled separately
    // For text columns (No., Status, Delivery Date, etc.) read directly off the row.
    if (col.kind === 'text') {
      const v = rowObj[col.key]
      return v === undefined || v === null ? '' : String(v)
    }
    // Backend-shaped rows carry their own per-column values map.
    if (rowObj.values && Object.prototype.hasOwnProperty.call(rowObj.values, col.key)) {
      return fmtAccounting(rowObj.values[col.key])
    }
    if (rowObj.values) return fmtAccounting(null) // known row, no value for this col -> dash
    // Fallback: legacy client-side model driven by the external `values` map.
    const raw = cellFor(rowObj.key, col.key, values)
    return fmtAccounting(raw)
  }

  return (
    <div className="overflow-x-auto">
      <table className="statement-table w-full border-collapse text-[13px] text-slate-800">
        <caption className="text-left font-bold text-slate-900 text-sm mb-2 pb-1">{title}</caption>
        {columns.some((c) => c.header) && (
          <thead>
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={`px-2 py-1.5 font-bold text-slate-900 border-b border-slate-300 ${
                    c.kind === 'label' ? 'text-left' : 'text-right'
                  }`}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map((r, idx) => {
            if (r.kind === 'spacer') {
              return (
                <tr key={idx} className="statement-spacer">
                  <td colSpan={columns.length} className="py-1.5">&nbsp;</td>
                </tr>
              )
            }

            const isSection = r.kind === 'section'
            const isSubtotal = r.kind === 'subtotal'
            const isTotal = r.kind === 'total'
            const isGrand = r.kind === 'grand'
            const emphasised = isSubtotal || isTotal || isGrand

            const rowClass = [
              isTotal ? 'bg-slate-50' : '',
              isGrand ? 'bg-emerald-50' : '',
            ].join(' ')

            const labelClass = [
              'px-2 py-1',
              isSection ? 'font-bold text-slate-900' : '',
              emphasised ? 'font-bold text-slate-900' : 'text-slate-700',
              r.kind === 'item' ? 'pl-4' : '',
            ].join(' ')

            const cellBorder =
              isSubtotal || isTotal ? 'border-t border-slate-400'
              : isGrand ? 'border-t-2 border-slate-800'
              : ''

            return (
              <tr key={idx} className={rowClass}>
                {columns.map((col, ci) => {
                  if (col.kind === 'label') {
                    return (
                      <td key={col.key} className={`${labelClass} ${cellBorder}`}>
                        {/* project pipeline row-number column handled as its own text col */}
                        {r.label}
                      </td>
                    )
                  }
                  const content = isSection ? '' : renderCell(r, col)
                  const negative = typeof content === 'string' && content.startsWith('(')
                  return (
                    <td
                      key={col.key}
                      className={[
                        'px-2 py-1 text-right tabular-nums',
                        emphasised ? 'font-bold' : '',
                        negative ? 'text-rose-600' : 'text-slate-800',
                        col.emphasise ? 'font-bold' : '',
                        cellBorder,
                      ].join(' ')}
                    >
                      {content}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
