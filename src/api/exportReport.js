// Client-side report export helpers.
//
// Each report on the Financial Reports pages can be exported INDIVIDUALLY as
// either Excel or PDF. These helpers are backend-independent: they build the
// file from the rows already rendered on screen, so export always works even
// when the ERPNext PDF endpoint is unavailable.

import { fmtAccounting, cellFor } from './statementReports'

const brand = '#14b98a'

/** Escape a value for safe inclusion in HTML. */
function esc(v) {
  if (v === null || v === undefined) return ''
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Resolve a cell value for a column.
 * columns: [{ key, header, value?(row) }]
 * If a column provides value(row) we use it (so we export plain data, not JSX).
 * Otherwise we read row[key].
 */
function cellValue(col, row) {
  if (typeof col.value === 'function') return col.value(row)
  return row?.[col.key]
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function tableHtml(columns, rows) {
  const head = columns.map((c) => `<th>${esc(c.header)}</th>`).join('')
  const body = rows
    .map((r) => `<tr>${columns.map((c) => `<td>${esc(cellValue(c, r))}</td>`).join('')}</tr>`)
    .join('')
  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`
}

/**
 * Export a report to Excel (.xls). Uses the HTML-table trick which Excel and
 * LibreOffice open natively as a spreadsheet — no external library required.
 */
export function exportToExcel({ title, columns, rows, filename, branding = {} }) {
  const safeRows = Array.isArray(rows) ? rows : []
  const company = branding.company_name || 'NEST@R'
  const propertyLine = branding.property_name ? `<div style="font-size:12px;color:#475569;">Property: ${esc(branding.property_name)}</div>` : ''
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8" />
<style>
  table { border-collapse: collapse; }
  th, td { border: 1px solid #cbd5e1; padding: 6px 10px; font-family: Calibri, Arial, sans-serif; font-size: 12px; }
  th { background: ${brand}; color: #fff; text-align: left; }
</style></head>
<body>
  <div style="font-size:16px;font-weight:bold;color:#0f172a;">${esc(company)}</div>
  <div style="font-size:13px;color:#334155;">${esc(title || 'Report')}</div>
  ${propertyLine}
  <div style="font-size:11px;color:#94a3b8;margin-bottom:8px;">Generated ${esc(new Date().toLocaleString('en-KE'))}</div>
  ${tableHtml(columns, safeRows)}
</body></html>`

  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename || (title || 'report').toLowerCase().replace(/\s+/g, '_')}_${today()}.xls`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Export a report to PDF by opening a clean print window scoped to just this
 * report and triggering the browser's "Save as PDF". Works for a single report
 * at a time so each report is exported individually.
 */
export function exportToPdf({ title, subtitle, columns, rows, meta = [], branding = {} }) {
  const safeRows = Array.isArray(rows) ? rows : []
  const win = window.open('', '_blank')
  if (!win) return

  const company = branding.company_name || 'NEST@R'
  const propertyName = branding.property_name || null
  const logoUrl = branding.logo || null

  const metaHtml = meta.length
    ? `<div class="meta">${meta.map((m) => `<span><b>${esc(m.label)}:</b> ${esc(m.value)}</span>`).join('')}</div>`
    : ''

  const logoHtml = logoUrl
    ? `<img class="logo" src="${esc(logoUrl)}" alt="logo" />`
    : `<div class="logo-fallback">${esc(company.charAt(0))}</div>`

  win.document.write(`<!doctype html><html><head><meta charset="utf-8" />
<title>${esc(title || 'Report')}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; margin: 32px; }
  .brandbar { display: flex; align-items: center; gap: 14px; border-bottom: 3px solid ${brand}; padding-bottom: 14px; margin-bottom: 18px; }
  .logo { height: 52px; width: auto; object-fit: contain; }
  .logo-fallback { height: 48px; width: 48px; border-radius: 10px; background: ${brand}; color: #fff; font-size: 24px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
  .brand-text { flex: 1; }
  .company { font-size: 20px; font-weight: 700; color: #0f172a; margin: 0; }
  .report-title { font-size: 13px; color: #475569; margin: 2px 0 0; }
  .property { font-size: 12px; color: #0f766e; font-weight: 600; margin: 3px 0 0; }
  .sub { color: #64748b; font-size: 12px; margin: 0 0 16px; }
  .meta { display: flex; flex-wrap: wrap; gap: 16px; font-size: 12px; color: #334155; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #e2e8f0; padding: 8px 10px; font-size: 12px; text-align: left; }
  th { background: ${brand}; color: #fff; }
  tr:nth-child(even) td { background: #f8fafc; }
  .foot { margin-top: 24px; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; }
  @media print { body { margin: 12mm; } }
</style></head>
<body>
  <div class="brandbar">
    ${logoHtml}
    <div class="brand-text">
      <p class="company">${esc(company)}</p>
      <p class="report-title">${esc(title || 'Report')}</p>
      ${propertyName ? `<p class="property">Property: ${esc(propertyName)}</p>` : ''}
    </div>
  </div>
  ${subtitle && subtitle !== propertyName ? `<p class="sub">${esc(subtitle)}</p>` : ''}
  ${metaHtml}
  ${tableHtml(columns, safeRows)}
  <p class="foot">${esc(company)} • Generated ${esc(new Date().toLocaleString('en-KE'))} • Nest Property Management System</p>
  <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 250); };<\/script>
</body></html>`)
  win.document.close()
}


// ============================================================================
// STATEMENT EXPORTS — render the accounting workbook format (Income Statement,
// Balance Sheet, Cashflow, Cost Tracking, Loan Schedule, Project Pipeline).
//
// These consume the SAME statement model used on screen (src/api/statementReports.js
// + StatementTable.jsx), so the PDF/Excel output matches the UI exactly:
// bold section headers, indented items, sub-total/total rules, shaded totals,
// negatives in (parentheses), and month columns.
// ============================================================================

/** Build the <tr> rows for a statement model as an HTML string. */
function statementRowsHtml(model, values, { forExcel = false } = {}) {
  const { columns, rows } = model
  const colCount = columns.length

  const cellText = (r, col) => {
    if (col.kind === 'label') return esc(r.label)
    if (col.kind === 'text') {
      const v = r[col.key]
      return v === undefined || v === null ? '' : esc(v)
    }
    if (r.kind === 'section') return ''
    // Backend-shaped rows carry their own per-column values map (same as the
    // on-screen StatementTable). Prefer that; fall back to the legacy values map.
    if (r.values && Object.prototype.hasOwnProperty.call(r.values, col.key)) {
      return esc(fmtAccounting(r.values[col.key]))
    }
    if (r.values) return esc(fmtAccounting(null)) // known row, no value here -> dash
    return esc(fmtAccounting(cellFor(r.key, col.key, values)))
  }

  return rows
    .map((r) => {
      if (r.kind === 'spacer') {
        return `<tr class="spacer"><td colspan="${colCount}">&nbsp;</td></tr>`
      }
      const cls = ['row', r.kind].join(' ')
      const tds = columns
        .map((col) => {
          const align = col.kind === 'label' ? 'left' : 'right'
          const txt = cellText(r, col)
          const negative = typeof txt === 'string' && txt.startsWith('(')
          const classes = [
            `a-${align}`,
            r.kind === 'item' && col.kind === 'label' ? 'indent' : '',
            negative && !forExcel ? 'neg' : '',
            col.emphasise ? 'emph' : '',
          ].join(' ')
          return `<td class="${classes}">${txt}</td>`
        })
        .join('')
      return `<tr class="${cls}">${tds}</tr>`
    })
    .join('')
}

/** Header row (column titles) if the model defines any. */
function statementHeadHtml(model) {
  const hasHeaders = model.columns.some((c) => c.header)
  if (!hasHeaders) return ''
  const ths = model.columns
    .map((c) => `<th class="a-${c.kind === 'label' ? 'left' : 'right'}">${esc(c.header)}</th>`)
    .join('')
  return `<thead><tr>${ths}</tr></thead>`
}

const STATEMENT_CSS = `
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Calibri, Arial, sans-serif; color: #0f172a; margin: 28px; }
  .brandbar { display:flex; align-items:center; gap:12px; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 14px; }
  .company { font-size: 16px; font-weight: 700; margin: 0; }
  .scope { font-size: 11px; color: #475569; margin: 2px 0 0; }
  .stmt-title { font-size: 13px; font-weight: 700; margin: 4px 0 10px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { font-size: 11px; padding: 3px 8px; }
  thead th { border-bottom: 1px solid #334155; font-weight: 700; }
  .a-left { text-align: left; }
  .a-right { text-align: right; font-variant-numeric: tabular-nums; }
  .indent { padding-left: 20px; }
  .row.section td { font-weight: 700; }
  .row.subtotal td, .row.total td { font-weight: 700; border-top: 1px solid #64748b; }
  .row.total td { background: #f1f5f9; }
  .row.grand td { font-weight: 700; border-top: 2px solid #0f172a; background: #ecfdf5; }
  .emph { font-weight: 700; }
  .neg { color: #dc2626; }
  .spacer td { height: 8px; border: none; }
  .foot { margin-top: 22px; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 8px; }
  @media print { body { margin: 12mm; } }
`

/**
 * Export a statement to PDF (opens a print-ready window). Matches the UI layout.
 * @param {{ model: object, values: object, branding?: object }} args
 */
export function exportStatementToPdf({ model, values = {}, branding = {} }) {
  if (!model) return
  const win = window.open('', '_blank')
  if (!win) return

  const company = branding.company_name || 'NEST@R'
  const propertyName = branding.property_name || null
  const logoUrl = branding.logo || null
  const logoHtml = logoUrl
    ? `<img src="${esc(logoUrl)}" alt="logo" style="height:44px;width:auto;object-fit:contain;" />`
    : ''

  win.document.write(`<!doctype html><html><head><meta charset="utf-8" />
<title>${esc(model.title)}</title>
<style>${STATEMENT_CSS}</style></head>
<body>
  <div class="brandbar">
    ${logoHtml}
    <div>
      <p class="company">${esc(company)}</p>
      <p class="scope">${propertyName ? 'Property: ' + esc(propertyName) : 'All Properties'} • Generated ${esc(new Date().toLocaleString('en-KE'))}</p>
    </div>
  </div>
  <div class="stmt-title">${esc(model.title)}</div>
  <table>
    ${statementHeadHtml(model)}
    <tbody>${statementRowsHtml(model, values)}</tbody>
  </table>
  <p class="foot">${esc(company)} • Nest Property Management System</p>
  <script>window.onload=function(){setTimeout(function(){window.print();},250);};<\/script>
</body></html>`)
  win.document.close()
}

/**
 * Export a statement to Excel (.xls via the HTML-table trick). Same structure
 * as the PDF, so the workbook mirrors the on-screen statement.
 * @param {{ model: object, values: object, filename?: string, branding?: object }} args
 */
export function exportStatementToExcel({ model, values = {}, filename, branding = {} }) {
  if (!model) return
  const company = branding.company_name || 'NEST@R'
  const propertyName = branding.property_name || null

  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8" />
<style>
  table { border-collapse: collapse; }
  th, td { font-family: Calibri, Arial, sans-serif; font-size: 11px; padding: 3px 8px; }
  thead th { font-weight: bold; border-bottom: 1px solid #334155; }
  .a-left { text-align: left; mso-number-format:'\\@'; }
  .a-right { text-align: right; }
  .indent { padding-left: 20px; }
  .row.section td, .row.subtotal td, .row.total td, .row.grand td, .emph { font-weight: bold; }
  .row.subtotal td, .row.total td { border-top: 1px solid #64748b; }
  .row.total td { background: #f1f5f9; }
  .row.grand td { background: #ecfdf5; border-top: 2px solid #0f172a; }
</style></head>
<body>
  <div style="font-size:15px;font-weight:bold;">${esc(company)}</div>
  <div style="font-size:12px;">${esc(model.title)}</div>
  <div style="font-size:11px;color:#475569;">${propertyName ? 'Property: ' + esc(propertyName) : 'All Properties'}</div>
  <div style="font-size:10px;color:#94a3b8;margin-bottom:8px;">Generated ${esc(new Date().toLocaleString('en-KE'))}</div>
  <table>
    ${statementHeadHtml(model)}
    <tbody>${statementRowsHtml(model, values, { forExcel: true })}</tbody>
  </table>
</body></html>`

  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename || model.id || 'statement'}_${today()}.xls`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
