import { useState, useEffect } from 'react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts'
import {
  Download, Wallet, TrendingUp, Receipt, PiggyBank,
  FileText, Calendar, Building, Printer, CheckCircle2,
  AlertTriangle, Users, ArrowUpRight, ArrowDownRight, RefreshCw, Layers
} from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import StatCard from '../../components/ui/StatCard'
import Card from '../../components/ui/Card'
import DataTable from '../../components/ui/DataTable'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Skeleton, { StatCardsSkeleton, TableSkeleton, CardSkeleton } from '../../components/ui/Skeleton'
import { FileSpreadsheet } from 'lucide-react'
import { Select } from '../../components/ui/Field'
import { api } from '../../api/client'
import { useToast } from '../../context/ToastContext'
import { exportToExcel, exportToPdf } from '../../api/exportReport'

const REPORT_TABS = [
  { id: 'overview', label: 'Executive Overview', icon: TrendingUp },
  { id: 'collections', label: 'Rent Collections', icon: Wallet },
  { id: 'pnl', label: 'Profit & Loss (P&L)', icon: PiggyBank },
  { id: 'arrears', label: 'Arrears & Aging', icon: AlertTriangle },
  { id: 'remittances', label: 'Landlord Remittances', icon: Users },
  { id: 'expenses', label: 'Operating Expenses', icon: Receipt },
]

export const formatKsh = (amount) => {
  return `KSh ${Number(amount || 0).toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

// A chart-panel placeholder (title + faux bars) so charts don't pop in.
function ChartCardSkeleton({ className = '' }) {
  return (
    <Card className={`p-5 ${className}`}>
      <Skeleton className="h-4 w-48 mb-2" />
      <Skeleton className="h-3 w-64 mb-5" />
      <div className="flex items-end gap-2 h-[240px]">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="flex-1 rounded-t" style={{ height: `${30 + ((i * 37) % 65)}%` }} />
        ))}
      </div>
    </Card>
  )
}

// A side panel placeholder (title + rows).
function PanelSkeleton({ className = '', rows = 5 }) {
  return (
    <Card className={`p-5 ${className}`}>
      <Skeleton className="h-4 w-40 mb-2" />
      <Skeleton className="h-3 w-52 mb-5" />
      <Skeleton className="h-16 w-full mb-4 rounded-xl" />
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex justify-between">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3.5 w-20" />
          </div>
        ))}
      </div>
    </Card>
  )
}

// Card wrapper around a TableSkeleton for the list-style report tabs.
function TableCardSkeleton({ columns = 6, rows = 8, strip = false }) {
  return (
    <Card padded={false} className="p-5 space-y-4">
      <Skeleton className="h-4 w-56" />
      <Skeleton className="h-3 w-72" />
      {strip && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      )}
      <TableSkeleton columns={columns} rows={rows} />
    </Card>
  )
}

export default function FinancialReports() {
  const { showToast } = useToast()
  const [activeTab, setActiveTab] = useState('overview')
  const [propertyFilter, setPropertyFilter] = useState('')
  const [timeRange, setTimeRange] = useState('6mo')
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  // Real database reports state
  const [trendData, setTrendData] = useState([])
  const [collectionData, setCollectionData] = useState(null)
  const [pnlData, setPnlData] = useState(null)
  const [remittanceData, setRemittanceData] = useState(null)
  const [arrearsData, setArrearsData] = useState([])
  const [expensesData, setExpensesData] = useState([])
  const [paymentsData, setPaymentsData] = useState([])
  const [agingBuckets, setAgingBuckets] = useState(null)
  const [ageFilter, setAgeFilter] = useState('all')
  const [branding, setBranding] = useState({ company_name: 'Dadis Estates Limited', logo: null, property_name: null })

  useEffect(() => {
    let mounted = true
    api.getProperties().then((res) => {
      if (mounted && res) setProperties(res)
    }).catch(() => {})

    loadLiveReports()
    return () => { mounted = false }
  }, [propertyFilter, timeRange])

  const loadLiveReports = async () => {
    setLoading(true)
    try {
      const [colRes, pnlRes, remRes, arrRes, expRes, payRes, trendRes] = await Promise.allSettled([
        api.getRentCollectionReport(propertyFilter),
        api.getProfitAndLoss(propertyFilter),
        api.getLandlordRemittances(propertyFilter),
        api.getArrears(propertyFilter),
        api.getExpenseReport(propertyFilter),
        api.getPayments(),
        api.getRevenueAndExpenseTrend(propertyFilter),
      ])

      if (colRes.status === 'fulfilled' && colRes.value) setCollectionData(colRes.value)
      if (pnlRes.status === 'fulfilled' && pnlRes.value) setPnlData(pnlRes.value)
      if (remRes.status === 'fulfilled' && remRes.value) setRemittanceData(remRes.value)
      if (arrRes.status === 'fulfilled' && arrRes.value) {
        setArrearsData(arrRes.value)
        const b = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 }
        arrRes.value.forEach((a) => {
          const d = Number(a.daysOverdue || 0)
          const amt = Number(a.amount || 0)
          if (d <= 30) b['0-30'] += amt
          else if (d <= 60) b['31-60'] += amt
          else if (d <= 90) b['61-90'] += amt
          else b['90+'] += amt
        })
        setAgingBuckets(b)
      }
      if (expRes.status === 'fulfilled' && expRes.value) setExpensesData(expRes.value.expense_records || [])
      if (payRes.status === 'fulfilled' && payRes.value) setPaymentsData(payRes.value)
      if (trendRes.status === 'fulfilled' && trendRes.value) setTrendData(trendRes.value)

      api.getReportBranding(propertyFilter || null).then((b) => { if (b) setBranding(b) }).catch(() => {})
    } catch (err) {
      console.warn('Real report fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Build the export payload (title + columns + plain-data rows) for the
  // CURRENT report tab, so each report exports its own data individually.
  const buildExportPayload = () => {
    const propLabel = propertyFilter
      ? (properties.find((p) => p.id === propertyFilter)?.name || propertyFilter)
      : 'All Properties'
    const meta = [{ label: 'Scope', value: propLabel }, { label: 'Range', value: timeRange }]

    switch (activeTab) {
      case 'collections':
        return {
          title: 'Rent Collection Report', subtitle: propLabel, meta,
          columns: [
            { key: 'name', header: 'Invoice ID' },
            { key: 'tenant', header: 'Customer / Tenant' },
            { key: 'posting_date', header: 'Date' },
            { key: 'total_amount', header: 'Invoiced', value: (r) => formatKsh(r.total_amount) },
            { key: 'paid_amount', header: 'Paid', value: (r) => formatKsh(r.paid_amount) },
            { key: 'outstanding_amount', header: 'Balance', value: (r) => formatKsh(r.outstanding_amount) },
            { key: 'status', header: 'Status' },
          ],
          // Always include a summary row so the export is meaningful even before
          // per-invoice rows exist (collected rent is recognised in the GL).
          rows: [
            ...(collectionData?.invoices || []),
            { name: 'TOTAL', tenant: '', posting_date: '',
              total_amount: collectionData?.total_invoiced || 0,
              paid_amount: collectionData?.total_collected || 0,
              outstanding_amount: collectionData?.total_outstanding || 0,
              status: '' },
          ],
        }
      case 'pnl': {
        const rows = [
          ...(pnlData?.income_breakdown || []).map((i) => ({ section: 'Revenue', account: i.account_name || i.account, amount: i.balance })),
          ...(pnlData?.expense_breakdown || []).map((e) => ({ section: 'Expense', account: e.account_name || e.account, amount: e.balance })),
          { section: 'Summary', account: 'Total Revenue', amount: pnlData?.total_income ?? totalCollected },
          { section: 'Summary', account: 'Total Expenses', amount: pnlData?.total_expenses ?? totalExpenses },
          { section: 'Summary', account: 'Net Operating Income (NOI)', amount: pnlData?.net_profit ?? netIncome },
        ]
        return {
          title: 'Profit & Loss Statement', subtitle: propLabel, meta,
          columns: [
            { key: 'section', header: 'Section' },
            { key: 'account', header: 'Account' },
            { key: 'amount', header: 'Amount', value: (r) => formatKsh(r.amount) },
          ],
          rows,
        }
      }
      case 'arrears':
        return {
          title: 'Rent Arrears & Aging', subtitle: propLabel, meta,
          columns: [
            { key: 'id', header: 'Invoice ID' },
            { key: 'tenant', header: 'Tenant' },
            { key: 'daysOverdue', header: 'Days Overdue', value: (r) => `${r.daysOverdue || 0} days` },
            { key: 'amount', header: 'Outstanding', value: (r) => formatKsh(r.amount) },
            { key: 'lastReminder', header: 'Due Date' },
          ],
          rows: arrearsData.length ? arrearsData : [{ id: 'No overdue invoices', tenant: '', daysOverdue: 0, amount: 0, lastReminder: '' }],
        }
      case 'remittances':
        return {
          title: 'Landlord Remittance Statement', subtitle: propLabel, meta,
          columns: [
            { key: 'property_name', header: 'Property' },
            { key: 'landlord', header: 'Landlord' },
            { key: 'gross_collected', header: 'Gross Rent', value: (r) => formatKsh(r.gross_collected) },
            { key: 'management_fee', header: 'Commission', value: (r) => formatKsh(r.management_fee) },
            { key: 'property_expenses', header: 'Expenses', value: (r) => formatKsh(r.property_expenses) },
            { key: 'net_remittance', header: 'Net Payout', value: (r) => formatKsh(r.net_remittance) },
            { key: 'status', header: 'Status' },
          ],
          rows: remittanceData?.remittances || [],
        }
      case 'expenses':
        return {
          title: 'Operating Expenses Ledger', subtitle: propLabel, meta,
          columns: [
            { key: 'account', header: 'Account Code' },
            { key: 'account_name', header: 'Expense Account', value: (r) => r.account_name || r.account },
            { key: 'account_type', header: 'Type', value: (r) => r.account_type || 'Expense' },
            { key: 'balance', header: 'Total Disbursed', value: (r) => formatKsh(r.balance ?? r.amount) },
          ],
          rows: expensesData.length ? expensesData : [{ account: 'No posted expenses', account_name: '', account_type: '', balance: 0 }],
        }
      case 'overview':
      default:
        return {
          title: 'Monthly Collections vs Expenses', subtitle: propLabel, meta,
          columns: [
            { key: 'full_month', header: 'Period' },
            { key: 'revenue', header: 'Collections', value: (r) => formatKsh(r.revenue) },
            { key: 'expenses', header: 'Expenses', value: (r) => formatKsh(r.expenses) },
            { key: 'net', header: 'Net', value: (r) => formatKsh((Number(r.revenue) || 0) - (Number(r.expenses) || 0)) },
          ],
          rows: trendData,
        }
    }
  }

  const handleExportPdf = () => {
    const payload = buildExportPayload()
    if (!payload.rows.length) { showToast('No data to export for this report.'); return }
    exportToPdf({ ...payload, branding })
    showToast('Opening print-ready PDF for this report…')
  }

  const handleExportExcel = () => {
    const payload = buildExportPayload()
    if (!payload.rows.length) { showToast('No data to export for this report.'); return }
    exportToExcel({ ...payload, filename: activeTab, branding })
    showToast('Exporting this report to Excel…')
  }

  // Live Database Calculated Numbers
  const totalInvoiced = collectionData?.total_invoiced || 0
  const totalCollected = collectionData?.total_collected || 0
  const totalArrears = arrearsData.reduce((s, a) => s + (Number(a.amount) || 0), 0) || (collectionData?.total_outstanding || 0)
  const totalExpenses = pnlData?.total_expenses ?? expensesData.reduce((s, e) => s + (Number(e.balance ?? e.amount) || 0), 0)
  const netIncome = (pnlData?.net_profit != null) ? pnlData.net_profit : (totalCollected - totalExpenses)
  const totalRemittances = remittanceData?.total_net_remittance || 0

  const collectionRate = totalInvoiced > 0 ? ((totalCollected / totalInvoiced) * 100).toFixed(1) : '100.0'

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Financial & Accounting Intelligence"
        description="Audited financial statements, real-time rent collections, P&L, arrears aging, and landlord remittance ledgers."
        actions={
          <div className="flex items-center gap-2.5">
            <Button variant="ghost" icon={Printer} onClick={() => window.print()}>
              Print
            </Button>
            <Button variant="secondary" icon={FileSpreadsheet} onClick={handleExportExcel}>
              Export Excel
            </Button>
            <Button icon={FileText} onClick={handleExportPdf}>
              Export PDF
            </Button>
          </div>
        }
      />

      {/* Filter Toolbar */}
      <Card className="p-4 bg-white/90 backdrop-blur border-slate-200/80 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
            {REPORT_TABS.map((tab) => {
              const Icon = tab.icon
              const active = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    active
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-emerald-400' : 'text-slate-400'}`} />
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Real Filter Options */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <Building className="w-3.5 h-3.5" />
              <Select
                value={propertyFilter}
                onChange={(e) => setPropertyFilter(e.target.value)}
                className="text-xs py-1.5 pr-8"
              >
                <option value="">All Properties</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </Select>
            </div>

            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <Calendar className="w-3.5 h-3.5" />
              <Select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="text-xs py-1.5 pr-8"
              >
                <option value="1mo">This Month</option>
                <option value="3mo">Last Quarter (3 Mo)</option>
                <option value="6mo">Last 6 Months</option>
                <option value="ytd">Year to Date (YTD)</option>
                <option value="all">All Time</option>
              </Select>
            </div>

            <Button
              variant="ghost"
              size="sm"
              icon={RefreshCw}
              onClick={loadLiveReports}
              className={loading ? 'animate-spin' : ''}
              title="Refresh from MariaDB"
            />
          </div>
        </div>
      </Card>

      {/* KPI Stats Ribbon */}
      {loading ? (
        <StatCardsSkeleton count={6} />
      ) : (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <StatCard label="Total Invoiced" value={formatKsh(totalInvoiced)} icon={Receipt} />
        <StatCard label="Rent Collected" value={formatKsh(totalCollected)} icon={Wallet} tone="brand" />
        <StatCard label="Arrears / Defaulters" value={formatKsh(totalArrears)} icon={AlertTriangle} tone="orange" />
        <StatCard label="Operating Expenses" value={formatKsh(totalExpenses)} icon={Receipt} tone="orange" />
        <StatCard label="Net Operating Income" value={formatKsh(netIncome)} icon={PiggyBank} tone="blue" />
        <StatCard label="Landlord Payouts" value={formatKsh(totalRemittances)} icon={Users} tone="brand" />
      </div>
      )}

      {/* 1. EXECUTIVE OVERVIEW */}
      {activeTab === 'overview' && loading && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <ChartCardSkeleton className="lg:col-span-2" />
            <PanelSkeleton />
          </div>
          <TableCardSkeleton columns={6} rows={6} />
        </div>
      )}
      {activeTab === 'overview' && !loading && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <Card className="lg:col-span-2 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-slate-900">Real Monthly Collections vs Expenses</h3>
                  <p className="text-xs text-slate-500">Aggregated from posted invoices and approved expenses in database</p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1.5 font-medium text-emerald-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Collections
                  </span>
                  <span className="flex items-center gap-1.5 font-medium text-amber-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Expenses
                  </span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} tickFormatter={(v) => `${v / 1000}k`} />
                  <Tooltip formatter={(v) => formatKsh(v)} />
                  <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2.5} fill="url(#revGrad)" name="Collections" />
                  <Area type="monotone" dataKey="expenses" stroke="#f59e0b" strokeWidth={2} fill="url(#expGrad)" name="Expenses" />
                </AreaChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-5 flex flex-col justify-between">
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">Collection Efficiency</h3>
                <p className="text-xs text-slate-500 mb-4">Actual rent recovered vs billed amount</p>

                <div className="p-4 bg-emerald-50/70 rounded-xl border border-emerald-100/80 mb-4">
                  <div className="flex items-center justify-between text-xs text-emerald-800 font-medium mb-1.5">
                    <span>Recovery Rate</span>
                    <span className="font-bold text-sm text-emerald-900">{collectionRate}%</span>
                  </div>
                  <div className="w-full bg-emerald-200/50 rounded-full h-2.5 overflow-hidden">
                    <div className="bg-emerald-500 h-2.5 rounded-full" style={{ width: `${Math.min(100, Number(collectionRate))}%` }}></div>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Total Billed Invoices</span>
                    <span className="font-semibold text-slate-800">{collectionData?.invoice_count || 0} Invoices</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Collected Amount</span>
                    <span className="font-semibold text-emerald-700">{formatKsh(totalCollected)}</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Outstanding Balance</span>
                    <span className="font-semibold text-rose-600">{formatKsh(totalArrears)}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">Data Source:</span>
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Live Backend MariaDB
                </span>
              </div>
            </Card>
          </div>

          <Card padded={false} className="p-5">
            <h3 className="font-semibold text-slate-900 mb-4">Live Payment Entries</h3>
            <DataTable
              columns={[
                { key: 'id', header: 'Reference' },
                { key: 'tenant', header: 'Party / Tenant' },
                { key: 'method', header: 'Channel' },
                { key: 'amount', header: 'Amount', render: (r) => <span className="font-semibold text-slate-900">{formatKsh(r.amount)}</span> },
                { key: 'date', header: 'Posting Date' },
                { key: 'status', header: 'Status', render: (r) => <Badge tone={r.status === 'Reconciled' ? 'brand' : 'slate'}>{r.status}</Badge> },
              ]}
              rows={paymentsData}
              searchKeys={['tenant', 'id']}
              searchPlaceholder="Search real payment entries…"
            />
          </Card>
        </div>
      )}

      {/* 2. RENT COLLECTIONS */}
      {activeTab === 'collections' && loading && (
        <TableCardSkeleton columns={7} rows={8} strip />
      )}
      {activeTab === 'collections' && !loading && (
        <Card padded={false} className="p-5 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="font-semibold text-slate-900">Rent Collection & Invoicing Ledger</h3>
              <p className="text-xs text-slate-500">Real records of invoices and payments generated in Frappe.</p>
            </div>
            <Badge tone="brand">Real-time MariaDB</Badge>
          </div>
          {/* Collection summary strip (works even before monthly invoices exist) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-xs text-slate-500">Invoiced (Sales Invoices)</p>
              <p className="text-lg font-bold text-slate-900">{formatKsh(collectionData?.total_invoiced)}</p>
            </div>
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
              <p className="text-xs text-emerald-700">Collected (Recognised in GL)</p>
              <p className="text-lg font-bold text-emerald-800">{formatKsh(collectionData?.total_collected)}</p>
            </div>
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200">
              <p className="text-xs text-rose-700">Outstanding</p>
              <p className="text-lg font-bold text-rose-800">{formatKsh(collectionData?.total_outstanding)}</p>
            </div>
          </div>
          <DataTable
            columns={[
              { key: 'name', header: 'Invoice ID', render: (r) => r.name },
              { key: 'tenant', header: 'Customer / Tenant' },
              { key: 'posting_date', header: 'Date' },
              { key: 'total_amount', header: 'Invoiced', render: (r) => formatKsh(r.total_amount) },
              { key: 'paid_amount', header: 'Paid', render: (r) => <span className="text-emerald-600 font-semibold">{formatKsh(r.paid_amount)}</span> },
              { key: 'outstanding_amount', header: 'Balance', render: (r) => (
                <span className={r.outstanding_amount > 0 ? 'text-rose-600 font-bold' : 'text-slate-400'}>
                  {formatKsh(r.outstanding_amount)}
                </span>
              )},
              { key: 'status', header: 'Status', render: (r) => <Badge tone={r.status === 'Paid' ? 'brand' : r.status === 'Overdue' ? 'red' : 'slate'}>{r.status}</Badge> },
            ]}
            rows={collectionData?.invoices || []}
            searchKeys={['tenant', 'name']}
            searchPlaceholder="Search live invoices by customer or ID…"
            emptyMessage="No Sales Invoices yet. Collected rent still shows above (recognised in the GL from M-Pesa)."
          />
        </Card>
      )}

      {/* 3. PROFIT & LOSS */}
      {activeTab === 'pnl' && loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <PanelSkeleton className="lg:col-span-2" rows={7} />
          <ChartCardSkeleton />
        </div>
      )}
      {activeTab === 'pnl' && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Card className="lg:col-span-2 p-5">
            <h3 className="font-semibold text-slate-900 mb-1">Profit & Loss Statement (Operating Position)</h3>
            <p className="text-xs text-slate-500 mb-6">Audited from posted general ledger transactions and invoice payments.</p>

            <div className="space-y-6">
              {/* Income */}
              <div>
                <div className="flex items-center justify-between text-sm font-bold text-slate-900 pb-2 border-b-2 border-emerald-500">
                  <span className="flex items-center gap-2"><ArrowUpRight className="w-4 h-4 text-emerald-600" /> OPERATING REVENUE</span>
                  <span className="text-emerald-700">{formatKsh(pnlData?.total_income ?? totalCollected)}</span>
                </div>
                <div className="divide-y divide-slate-100 text-xs text-slate-600">
                  {(pnlData?.income_breakdown || []).length > 0 ? (
                    pnlData.income_breakdown.map((i, idx) => (
                      <div key={idx} className="flex justify-between py-2 pl-4">
                        <span>{i.account_name || i.account}</span>
                        <span className="font-mono">{formatKsh(i.balance)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="flex justify-between py-2 pl-4"><span>Rent Collections (Recognised in GL)</span><span>{formatKsh(totalCollected)}</span></div>
                  )}
                </div>
              </div>

              {/* Expenses */}
              <div>
                <div className="flex items-center justify-between text-sm font-bold text-slate-900 pb-2 border-b-2 border-rose-500">
                  <span className="flex items-center gap-2"><ArrowDownRight className="w-4 h-4 text-rose-600" /> OPERATING EXPENSES</span>
                  <span className="text-rose-700">{formatKsh(totalExpenses)}</span>
                </div>
                <div className="divide-y divide-slate-100 text-xs text-slate-600">
                  {(pnlData?.expense_breakdown || []).length > 0 ? (
                    pnlData.expense_breakdown.map((e, idx) => (
                      <div key={idx} className="flex justify-between py-2 pl-4">
                        <span>{e.account_name || e.account}</span>
                        <span className="font-mono">{formatKsh(e.balance)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="py-3 text-center text-slate-400">No posted operating expenses recorded.</div>
                  )}
                </div>
              </div>

              {/* Net Position */}
              <div className="p-4 bg-slate-900 text-white rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400 font-medium">NET OPERATING INCOME (NOI)</p>
                  <p className="text-xl font-bold text-emerald-400">{formatKsh(netIncome)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">Profit Margin</p>
                  <p className="text-base font-bold text-white">
                    {(pnlData?.total_income ?? totalCollected) > 0 ? `${((netIncome / (pnlData?.total_income ?? totalCollected)) * 100).toFixed(1)}%` : '0%'}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-5 flex flex-col justify-between">
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">Monthly Comparison</h3>
              <p className="text-xs text-slate-500 mb-4">Actual revenue vs expense distribution</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => `${v / 1000}k`} />
                  <Tooltip formatter={(v) => formatKsh(v)} />
                  <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} name="Collections" />
                  <Bar dataKey="expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Expenses" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100">
              <Button className="w-full" icon={Download} onClick={handleExportPdf}>
                Download Signed P&L PDF
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* 4. ARREARS & AGING */}
      {activeTab === 'arrears' && loading && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-4 rounded-xl border border-slate-200 bg-white">
                <Skeleton className="h-3 w-24 mb-2" />
                <Skeleton className="h-5 w-20" />
              </div>
            ))}
          </div>
          <TableCardSkeleton columns={4} rows={8} />
        </div>
      )}
      {activeTab === 'arrears' && !loading && (
        <div className="space-y-5">
          {/* Aging buckets */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            {[
              { key: '0-30', label: 'Current (0-30 days)', tone: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
              { key: '31-60', label: '31-60 days', tone: 'text-amber-700 bg-amber-50 border-amber-200' },
              { key: '61-90', label: '61-90 days', tone: 'text-orange-700 bg-orange-50 border-orange-200' },
              { key: '90+', label: '90+ days', tone: 'text-rose-700 bg-rose-50 border-rose-200' },
            ].map((bucket) => (
              <button
                key={bucket.key}
                onClick={() => setAgeFilter(ageFilter === bucket.key ? 'all' : bucket.key)}
                className={`text-left p-4 rounded-xl border transition-all ${bucket.tone} ${ageFilter === bucket.key ? 'ring-2 ring-offset-1 ring-slate-400' : ''}`}
              >
                <p className="text-xs font-medium opacity-80">{bucket.label}</p>
                <p className="text-lg font-bold mt-1">{formatKsh(agingBuckets?.[bucket.key] || 0)}</p>
              </button>
            ))}
          </div>

          <Card padded={false} className="p-5 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-semibold text-slate-900">Arrears & Aging Schedule</h3>
                <p className="text-xs text-slate-500">
                  Live outstanding balances from submitted Sales Invoices.
                  {ageFilter !== 'all' && <span className="ml-1 font-semibold text-slate-700">Filtered: {ageFilter} days</span>}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Select value={ageFilter} onChange={(e) => setAgeFilter(e.target.value)} className="text-xs py-1.5 pr-8">
                  <option value="all">All Ages</option>
                  <option value="0-30">0-30 days</option>
                  <option value="31-60">31-60 days</option>
                  <option value="61-90">61-90 days</option>
                  <option value="90+">90+ days</option>
                </Select>
                <span className="text-xs font-semibold px-2.5 py-1 bg-rose-50 text-rose-700 rounded-lg border border-rose-200">
                  {arrearsData.length} Accounts
                </span>
              </div>
            </div>
            <DataTable
              columns={[
                { key: 'id', header: 'Invoice ID' },
                { key: 'tenant', header: 'Tenant' },
                { key: 'daysOverdue', header: 'Days Overdue', render: (r) => (
                  <span className={r.daysOverdue > 90 ? 'text-rose-600 font-bold' : r.daysOverdue > 30 ? 'text-amber-600 font-semibold' : 'text-slate-600'}>
                    {r.daysOverdue} days
                  </span>
                )},
                { key: 'amount', header: 'Outstanding Arrears', render: (r) => <span className="font-bold text-rose-600">{formatKsh(r.amount)}</span> },
                { key: 'lastReminder', header: 'Due Date' },
              ]}
              rows={arrearsData.filter((r) => {
                if (ageFilter === 'all') return true
                const d = Number(r.daysOverdue || 0)
                if (ageFilter === '0-30') return d <= 30
                if (ageFilter === '31-60') return d > 30 && d <= 60
                if (ageFilter === '61-90') return d > 60 && d <= 90
                return d > 90
              })}
              searchKeys={['tenant', 'id']}
              searchPlaceholder="Search real arrears accounts…"
              emptyMessage="No overdue invoices. Arrears will populate once monthly rent invoices are generated."
            />
          </Card>
        </div>
      )}

      {/* 5. LANDLORD REMITTANCES */}
      {activeTab === 'remittances' && loading && (
        <TableCardSkeleton columns={7} rows={8} />
      )}
      {activeTab === 'remittances' && !loading && (
        <Card padded={false} className="p-5 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="font-semibold text-slate-900">Landlord Remittances & Payout Statements</h3>
              <p className="text-xs text-slate-500">Gross Rent Collected - Management Commission % - Expenses = Net Payout.</p>
            </div>
            <Button size="sm" icon={Download} onClick={handleExportPdf}>Export Remittances</Button>
          </div>
          <DataTable
            columns={[
              { key: 'property_name', header: 'Property', render: (r) => <span className="font-semibold text-slate-800">{r.property_name}</span> },
              { key: 'landlord', header: 'Landlord' },
              { key: 'gross_collected', header: 'Gross Rent', render: (r) => formatKsh(r.gross_collected) },
              { key: 'management_fee', header: 'Commission', render: (r) => <span className="text-rose-600">- {formatKsh(r.management_fee)}</span> },
              { key: 'property_expenses', header: 'Direct Expenses', render: (r) => <span className="text-amber-600">- {formatKsh(r.property_expenses)}</span> },
              { key: 'net_remittance', header: 'Net Payout to Landlord', render: (r) => <span className="font-bold text-emerald-600">{formatKsh(r.net_remittance)}</span> },
              { key: 'status', header: 'Payout Status', render: (r) => <Badge tone={r.status === 'Settled' ? 'brand' : 'orange'}>{r.status}</Badge> },
            ]}
            rows={remittanceData?.remittances || []}
            searchKeys={['property_name', 'landlord']}
            searchPlaceholder="Search real remittances by landlord or property…"
          />
        </Card>
      )}

      {/* 6. OPERATING EXPENSES */}
      {activeTab === 'expenses' && loading && (
        <TableCardSkeleton columns={4} rows={8} />
      )}
      {activeTab === 'expenses' && !loading && (
        <Card padded={false} className="p-5 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="font-semibold text-slate-900">Operating Expenses Ledger</h3>
              <p className="text-xs text-slate-500">Approved purchase invoices and maintenance disbursements directly from database.</p>
            </div>
            <Badge tone="orange">Live ERPNext Data</Badge>
          </div>
          <DataTable
            columns={[
              { key: 'account', header: 'Account Code' },
              { key: 'account_name', header: 'Expense Account', render: (r) => r.account_name || r.account || 'General' },
              { key: 'account_type', header: 'Type', render: (r) => r.account_type || 'Expense' },
              { key: 'balance', header: 'Total Disbursed', render: (r) => <span className="font-semibold text-rose-600">{formatKsh(r.balance ?? r.amount)}</span> },
            ]}
            rows={expensesData}
            searchKeys={['account_name', 'account']}
            searchPlaceholder="Search posted expense accounts…"
            emptyMessage="No posted operating expenses yet."
          />
        </Card>
      )}

    </div>
  )
}
