// Financial statement definitions + rendering model.
//
// These mirror the client's accounting workbook exactly: sectioned statements
// (Income Statement, Balance Sheet, Cashflow, Cost Tracking, Loan Schedule,
// Project Pipeline) with section headers, sub-total rows, total rows, month
// columns, and negatives shown in parentheses.
//
// A single "statement model" (rows + columns) drives BOTH the on-screen tables
// and the PDF/Excel export, so the UI and the export look identical.

export const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

// ---- Row types --------------------------------------------------------------
// Each statement is a list of rows. `kind` controls how the row renders:
//   'section'  -> bold section header (e.g. "A - Rental Income"), no numbers
//   'item'     -> a normal line item with values per column
//   'subtotal' -> bold, top border, summed row (e.g. "Sub-Total")
//   'total'    -> bold, shaded, double border (e.g. "Operating Revenue")
//   'grand'    -> the final emphasised result (e.g. "Profit")
//   'spacer'   -> blank spacing row

const row = (kind, label, extra = {}) => ({ kind, label, ...extra })
const section = (label) => row('section', label)
const item = (label, key) => row('item', label, { key: key || slug(label) })
const subtotal = (label, key) => row('subtotal', label, { key: key || slug(label) })
const total = (label, key) => row('total', label, { key: key || slug(label) })
const grand = (label, key) => row('grand', label, { key: key || slug(label) })
const spacer = () => row('spacer', '')

function slug(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
}

// ============================================================================
// 1. INCOME STATEMENT  (months across, sectioned A–E)
// ============================================================================
export function incomeStatementModel(year = new Date().getFullYear(), monthCount = 7) {
  const months = MONTHS.slice(0, monthCount)
  return {
    id: 'income_statement',
    title: `INCOME STATEMENT \u2013 ${year} (KShs.)`,
    columns: [{ key: 'label', header: '', kind: 'label' }, ...months.map((m) => ({ key: m, header: m, kind: 'money' }))],
    rows: [
      section('Revenues'),
      section('A - Rental Income'),
      item('Oak Greens'), item('Oak Ridge'), item('Oak Gate'), item('Oak Heights'),
      item('Oak Manor'), item('Oak Leaf'), item('Oak Villa'), item('Oak Wood'), item('Oak Palace'),
      subtotal('Sub-Total', 'rental_income_subtotal'),
      spacer(),
      section('B - Services Income'),
      item('Electricity', 'services_electricity'), item('Water', 'services_water'),
      subtotal('Sub-Total', 'services_income_subtotal'),
      spacer(),
      section('C - Rent Deposits'),
      section('D - Dadis Academy'),
      section('E - Oseko Advocates'),
      total('Operating Revenue', 'operating_revenue'),
      spacer(),
      section('Expenses'),
      section('A - Rental Operating Costs'),
      item('Salaries & Wages', 'exp_salaries'),
      item('Electricity', 'exp_electricity'),
      item('Water & Sewer', 'exp_water'),
      item('Repairs & Maintainance - Cost of Materils and Labour', 'exp_repairs'),
      item('Office Expenses - Stationary, Transport, Airtime etc', 'exp_office'),
      item('Land Rent & Rates', 'exp_land_rent'),
      item('Costs for financial transactions - Mpesa, Bank', 'exp_finance_txn'),
      item('Administrative costs', 'exp_admin'),
      item('Deposit Refund', 'exp_deposit_refund'),
      section('B - Dadis Academy'),
      section('C - Oseko Advocates LLP'),
      total('Operating Expenses', 'operating_expenses'),
      spacer(),
      total('Revenue', 'revenue_after_expenses'),
      spacer(),
      section('Financing Costs'),
      total('Profit Before Tax', 'profit_before_tax'),
      item('Rental Tax', 'rental_tax'),
      spacer(),
      grand('Profit', 'profit'),
    ],
  }
}

// ============================================================================
// 2. BALANCE SHEET  (single "Yr <year>" column)
// ============================================================================
export function balanceSheetModel(year = new Date().getFullYear()) {
  return {
    id: 'balance_sheet',
    title: `BALANCE SHEET \u2013 ${year} (KShs.)`,
    columns: [
      { key: 'label', header: 'ASSETS', kind: 'label' },
      { key: 'amount', header: `Yr ${year} KShs.`, kind: 'money' },
    ],
    rows: [
      section('Non-Current Assets'),
      item('Kisii Municipality/Block 1/763'), item('Mavoko Plot 25047/7'), item('Mavoko Plot 25047/8'),
      item('Ruiru/Kiu Block 2/5786'), item('Ruiru/Kiu Block 2/11184'), item('Zimman Plot No. D271'),
      item('Zimman Plot No. D255'), item('Ruiru/Kiu Block 2/17233'), item('Chokaa Plot No. 8 & 9'),
      item('Zimman Plot No. D256'), item('Zimman Plot No. D269'), item('Ruiru/Kiu Block 2/11183'),
      item('Zimman Plot No. H135'), item('Ngong/Ngong/90200'), item('Zimman Plot No. C217/C218'),
      item('Zimman Plot No. D270'), item('L.R. NO.10090/27-(Allotment No. 295)'),
      subtotal('Sub-Totals', 'nca_subtotal'),
      spacer(),
      section('Non- Current Assets'),
      item('Cash'), item('Stima Sacco Shares'),
      total('Total Assets', 'total_assets'),
      spacer(),
      section('EQUITY'),
      item('Owner Land and Properties'), item('Retained Earnings', 'retained_earnings'),
      total('Total Equity', 'total_equity'),
      spacer(),
      section('Non-Current Liabilities'),
      item('KCB Mortage - May 2019'), item('KCB Mortage - November 2021'),
      item('Stima Sacco - 01-02-2022'), item('Stima Sacco - 20-08-2024'),
      subtotal('Sub-Total', 'ncl_subtotal'),
      spacer(),
      section('Current Liabilities'),
      item('Coop - Kiarie'), item('Loan - Muoki'), item('Rent Deposits'),
      subtotal('Sub-Total', 'cl_subtotal'),
      spacer(),
      total('Total Equity & Liabilities', 'total_equity_liabilities'),
    ],
  }
}

// ============================================================================
// 3. CASHFLOW STATEMENT
// ============================================================================
export function cashflowStatementModel(year = new Date().getFullYear()) {
  return {
    id: 'cashflow_statement',
    title: `CASHFLOW STATEMENT \u2013 ${year} (KShs.)`,
    columns: [
      { key: 'label', header: '', kind: 'label' },
      { key: 'amount', header: '', kind: 'money' },
    ],
    rows: [
      section('Cashflow From Operating Activities'),
      item('Cash Generated from Operations', 'cash_from_ops'),
      section('Add Depreciation for:'),
      item('Blue Future Contract'), item('Slowsand Filters'), item('Motorcycles and Trucks'),
      total('Net cash generated from Operating Activities', 'net_operating'),
      spacer(),
      section('Cash from Investing Activities'),
      item('Slowsand filters', 'inv_slowsand'), item('Motorcycle and trucks', 'inv_motorcycle'),
      total('Net Cash used in Investing Activities', 'net_investing'),
      spacer(),
      section('Cash from Financing Activities'),
      item('Pain in Capital', 'fin_capital'), item('Debt', 'fin_debt'),
      total('Net Cash from Financing Activities', 'net_financing'),
      spacer(),
      total('Net increase/decrease in Cash and cash equivalents', 'net_change'),
    ],
  }
}

// ============================================================================
// 4. COST TRACKING  (Jan–Dec + Totals)
// ============================================================================
export function costTrackingModel(year = new Date().getFullYear()) {
  return {
    id: 'cost_tracking',
    title: `COST TRACKING \u2013 ${year} (KShs.)`,
    columns: [
      { key: 'label', header: 'Operating Costs', kind: 'label' },
      ...MONTHS.map((m) => ({ key: m, header: m, kind: 'money' })),
      { key: 'total', header: 'Totals', kind: 'money', emphasise: true },
    ],
    rows: [
      section('Operating Costs'),
      item('Salaries', 'ct_salaries'),
      item('Electricity', 'ct_electricity'),
      item('Water & Sewer', 'ct_water'),
      item('Repairs & Maintainance - Cost of Materils and Labour', 'ct_repairs'),
      item('Office Expenses - Stationary, Transport, Airtime etc', 'ct_office'),
      item('Land Rent & Rates', 'ct_land_rent'),
      item('Costs for financial transactions - Mpesa, Bank', 'ct_finance_txn'),
      item('Administrative costs: Stationery', 'ct_admin'),
      item('Dadis Academy', 'ct_dadis'),
      item('Oseko Advocates', 'ct_oseko'),
      total('Total', 'ct_total'),
      spacer(),
      section('Financing Costs'),
      item('Bank Loan Interest', 'ct_bank_interest'),
      item('Deposit Refunds', 'ct_deposit_refunds'),
      item('Rental tax', 'ct_rental_tax'),
    ],
  }
}

// ============================================================================
// 5. FINANCING COSTS – LOAN SCHEDULE
// ============================================================================
export function loanScheduleModel() {
  return {
    id: 'loan_schedule',
    title: 'FINANCING COSTS \u2013 LOAN SCHEDULE (KShs.)',
    columns: [
      { key: 'label', header: 'Loans', kind: 'label' },
      { key: 'loan_amount', header: 'Loan Amount', kind: 'money' },
      { key: 'loan_bal', header: 'Loan Bal - March 2026', kind: 'money' },
      { key: 'principal', header: 'Principal', kind: 'money' },
      { key: 'interest', header: 'Interest', kind: 'money' },
      { key: 'total_repay', header: 'Total Repay', kind: 'money' },
      { key: 'top_up', header: 'Potential Loan Top-Up', kind: 'money' },
    ],
    rows: [
      item('KCB Mortage - May 2019'),
      item('KCB Mortage - November 2021'),
      item('Stima Sacco - 01-02-2022'),
      item('Stima Sacco - 20-08-2024'),
      item('Coop - Kiarie'),
      item('Soft Loan - Muoki'),
      total('TOTAL', 'loan_total'),
    ],
  }
}

// ============================================================================
// 6. PROJECT PIPELINE
// ============================================================================
export function projectPipelineModel() {
  return {
    id: 'project_pipeline',
    title: 'PROJECT PIPELINE',
    columns: [
      { key: 'no', header: 'No.', kind: 'text' },
      { key: 'label', header: 'Project Name', kind: 'label' },
      { key: 'sqf', header: 'SQF', kind: 'text' },
      { key: 'delivery', header: 'Delivery Date', kind: 'text' },
      { key: 'units', header: 'Units', kind: 'text' },
      { key: 'rent_per_unit', header: 'Rent Per Unit', kind: 'money' },
      { key: 'project_cost', header: 'Project Cost', kind: 'money' },
    ],
    rows: [
      { ...item('The Studio - Zimman - Plots C217 & C218'), no: 1 },
      { ...item('Dadis Juja - L.R. NO.10090/27-(Allotment No. 295)'), no: 2 },
      { ...item('The Nest - Zimma'), no: 3 },
      { ...item('A&S Kwihota'), no: 4 },
      { ...item('A&S Annex'), no: 5 },
      { ...item('Zuri - Katani'), no: 6 },
      { ...item('Upendo Centre'), no: 7 },
      { ...item('Amani - Kisii'), no: 8 },
      total('USD', 'pipeline_usd'),
      item('Return on Investment (RoI) -20% costs', 'roi'),
      item('Payback Period (Years)', 'payback'),
    ],
  }
}

export const STATEMENT_BUILDERS = {
  income_statement: incomeStatementModel,
  balance_sheet: balanceSheetModel,
  cashflow_statement: cashflowStatementModel,
  cost_tracking: costTrackingModel,
  loan_schedule: loanScheduleModel,
  project_pipeline: projectPipelineModel,
}

// ---- Value formatting -------------------------------------------------------
// Accounting style: thousands separators, negatives in (parentheses), and a
// dash for zero/empty (matching the attached statements).
export function fmtAccounting(value) {
  if (value === null || value === undefined || value === '') return '-'
  const n = Number(value)
  if (!Number.isFinite(n)) return String(value)
  if (n === 0) return '-'
  const abs = Math.abs(n).toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  return n < 0 ? `(${abs})` : abs
}

// ---- Data mapping -----------------------------------------------------------
// Fill statement line items from real backend data where we can match them.
// Anything we can't map stays blank/zero, exactly like the source workbook.

function norm(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

// Fuzzy: does the account name relate to this line item's keywords?
function matchAny(accountName, keywords) {
  const a = norm(accountName)
  return keywords.some((k) => a.includes(k))
}

// Keyword hints per Income Statement / Cost Tracking expense line.
const EXPENSE_HINTS = {
  exp_salaries: ['salary', 'salaries', 'wage', 'payroll'],
  exp_electricity: ['electric', 'power', 'kplc'],
  exp_water: ['water', 'sewer'],
  exp_repairs: ['repair', 'maintenance', 'maintainance'],
  exp_office: ['office', 'stationery', 'stationary', 'transport', 'airtime'],
  exp_land_rent: ['land rent', 'rates', 'land rate'],
  exp_finance_txn: ['mpesa', 'm pesa', 'bank charge', 'transaction fee', 'financial transaction'],
  exp_admin: ['admin', 'administrative'],
  exp_deposit_refund: ['deposit refund', 'refund'],
}

const COST_TRACKING_HINTS = {
  ct_salaries: EXPENSE_HINTS.exp_salaries,
  ct_electricity: EXPENSE_HINTS.exp_electricity,
  ct_water: EXPENSE_HINTS.exp_water,
  ct_repairs: EXPENSE_HINTS.exp_repairs,
  ct_office: EXPENSE_HINTS.exp_office,
  ct_land_rent: EXPENSE_HINTS.exp_land_rent,
  ct_finance_txn: EXPENSE_HINTS.exp_finance_txn,
  ct_admin: EXPENSE_HINTS.exp_admin,
}

/**
 * Produce a { rowKey/colKey -> value } map from live data.
 * We only populate what we can confidently map; the renderer treats missing
 * cells as blank ("-"), matching the template.
 *
 * @param {string} statementId
 * @param {object} ctx  { pnlData, expensesData, trendData, balanceSheet }
 */
export function mapStatementValues(statementId, ctx = {}) {
  const values = {}
  const { pnlData, trendData, balanceSheet } = ctx

  if (statementId === 'income_statement') {
    // Map current-period totals into the first month column as a starting point
    // (the workbook is month-by-month; live GL gives us period aggregates).
    const firstMonth = MONTHS[0]
    const expenses = pnlData?.expense_breakdown || []
    for (const [rowKey, hints] of Object.entries(EXPENSE_HINTS)) {
      const matched = expenses.filter((e) => matchAny(e.account_name || e.account, hints))
      const sum = matched.reduce((s, e) => s + Number(e.balance || 0), 0)
      if (sum) values[`${rowKey}.${firstMonth}`] = sum
    }
    if (pnlData?.total_income) values[`operating_revenue.${firstMonth}`] = pnlData.total_income
    if (pnlData?.total_expenses) values[`operating_expenses.${firstMonth}`] = pnlData.total_expenses
    if (pnlData?.net_profit != null) {
      values[`revenue_after_expenses.${firstMonth}`] = pnlData.net_profit
      values[`profit_before_tax.${firstMonth}`] = pnlData.net_profit
      values[`profit.${firstMonth}`] = pnlData.net_profit
    }
  }

  if (statementId === 'cost_tracking') {
    // Spread monthly trend expense into each month; map account breakdown into Totals.
    const expenses = pnlData?.expense_breakdown || []
    for (const [rowKey, hints] of Object.entries(COST_TRACKING_HINTS)) {
      const matched = expenses.filter((e) => matchAny(e.account_name || e.account, hints))
      const sum = matched.reduce((s, e) => s + Number(e.balance || 0), 0)
      if (sum) values[`${rowKey}.total`] = sum
    }
    if (Array.isArray(trendData)) {
      trendData.forEach((t) => {
        const m = (t.month || '').slice(0, 3)
        if (MONTHS.includes(m) && t.expenses) values[`ct_total.${m}`] = t.expenses
      })
    }
    if (pnlData?.total_expenses) values['ct_total.total'] = pnlData.total_expenses
  }

  if (statementId === 'balance_sheet' && balanceSheet) {
    // Section totals straight from the GL-backed balance_sheet endpoint.
    const totalAssets = Number(balanceSheet.total_assets || 0)
    const totalLiab = Number(balanceSheet.total_liabilities || 0)
    const totalEquity = Number(balanceSheet.total_equity || 0)
    const netProfit = Number(balanceSheet.net_profit || 0)

    if (totalAssets) {
      values['nca_subtotal.amount'] = totalAssets
      values['total_assets.amount'] = totalAssets
    }
    // Net profit rolls into retained earnings / equity.
    if (netProfit) values['retained_earnings.amount'] = netProfit
    if (totalEquity) values['total_equity.amount'] = totalEquity
    if (totalLiab) {
      values['ncl_subtotal.amount'] = totalLiab
      values['total_equity_liabilities.amount'] = totalEquity + totalLiab
    } else if (totalEquity) {
      values['total_equity_liabilities.amount'] = totalEquity
    }
  }

  if (statementId === 'cashflow_statement') {
    // Derive cash movement from what the ledger gives us:
    //   operating cash  ≈ net profit (income − expense) for the period
    //   net change      ≈ operating + investing + financing (only operating known)
    const netProfit = Number(pnlData?.net_profit ?? 0)
    if (netProfit) {
      values['cash_from_ops'] = netProfit
      values['net_operating'] = netProfit
      values['net_change'] = netProfit
    }
  }

  return values
}

/**
 * Resolve the display value for a (row, column) pair given a values map.
 * Supports keys of the form `rowKey.colKey` and plain `rowKey` (single-column).
 */
export function cellFor(rowKey, colKey, values) {
  if (!rowKey) return ''
  if (Object.prototype.hasOwnProperty.call(values, `${rowKey}.${colKey}`)) return values[`${rowKey}.${colKey}`]
  if (colKey === 'amount' && Object.prototype.hasOwnProperty.call(values, rowKey)) return values[rowKey]
  return null
}
