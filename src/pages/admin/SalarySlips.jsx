import { useState, useEffect, useRef } from 'react'
import { FileText, Download, Search, Filter, Printer, X, Building2, User, Calendar, Banknote } from 'lucide-react'
import ListPageTemplate from '../../components/patterns/ListPageTemplate'
import FilterDrawer, { FilterItem } from '../../components/patterns/FilterDrawer'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { Field, Select, TextInput } from '../../components/ui/Field'
import { useToast } from '../../context/ToastContext'
import { formatKsh } from '../../data/mockData'
import { api } from '../../api/client'

/** Format date as "Sep 2026" */
const formatMonth = (date) => {
  if (!date) return '—'
  const d = new Date(date)
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

/** Format date as "01 Sep 2026" */
const formatDate = (date) => {
  if (!date) return '—'
  const d = new Date(date)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

/** Salary Slip Detail Modal for viewing and printing */
function SalarySlipModal({ slip, onClose }) {
  const printRef = useRef()

  if (!slip) return null

  const handlePrint = () => {
    const content = printRef.current
    if (!content) return

    const printWindow = window.open('', '_blank')
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Salary Slip - ${slip.employee_name}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
          .header h1 { margin: 0 0 5px 0; font-size: 24px; }
          .header p { margin: 5px 0; color: #666; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
          .info-section { padding: 15px; background: #f9f9f9; border-radius: 5px; }
          .info-section h3 { margin: 0 0 10px 0; font-size: 14px; color: #666; text-transform: uppercase; }
          .info-row { display: flex; justify-content: space-between; margin: 5px 0; }
          .info-row span:first-child { color: #666; }
          .info-row span:last-child { font-weight: 500; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background: #f5f5f5; font-weight: 600; }
          td:last-child, th:last-child { text-align: right; }
          .totals { margin-top: 30px; padding: 20px; background: #f5f5f5; border-radius: 5px; }
          .total-row { display: flex; justify-content: space-between; padding: 8px 0; }
          .total-row.net { font-size: 18px; font-weight: bold; border-top: 2px solid #333; padding-top: 15px; margin-top: 10px; }
          .footer { margin-top: 50px; text-align: center; color: #999; font-size: 12px; }
          @media print { body { margin: 20px; } }
        </style>
      </head>
      <body>
        ${content.innerHTML}
        <div class="footer">Generated on ${new Date().toLocaleString()}</div>
      </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-slate-800">Salary Slip Details</h2>
          <div className="flex items-center gap-2">
            <Button variant="secondary" icon={Printer} onClick={handlePrint}>Print</Button>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Modal Body - Printable Content */}
        <div className="flex-1 overflow-auto p-6">
          <div ref={printRef}>
            {/* Header */}
            <div className="header text-center mb-6 pb-4 border-b-2 border-slate-800">
              <h1 className="text-2xl font-bold text-slate-800 m-0">{slip.company}</h1>
              <p className="text-slate-600 mt-1">SALARY SLIP</p>
              <p className="text-slate-500 text-sm">
                Period: {formatDate(slip.start_date)} - {formatDate(slip.end_date)}
              </p>
            </div>

            {/* Employee Info Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-slate-50 rounded-lg">
                <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Employee Details</h3>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Name</span>
                    <span className="font-medium">{slip.employee_name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Employee ID</span>
                    <span className="font-medium">{slip.employee}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Department</span>
                    <span className="font-medium">{slip.department || '—'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Designation</span>
                    <span className="font-medium">{slip.designation || '—'}</span>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Payment Details</h3>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Pay Period</span>
                    <span className="font-medium">{formatMonth(slip.start_date)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Working Days</span>
                    <span className="font-medium">{slip.total_working_days || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Payment Days</span>
                    <span className="font-medium">{slip.payment_days || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">LWP Days</span>
                    <span className="font-medium">{slip.leave_without_pay || 0}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Earnings & Deductions */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {/* Earnings */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-2 pb-2 border-b">Earnings</h3>
                <table className="w-full text-sm">
                  <tbody>
                    {(slip.earnings || []).map((e, i) => (
                      <tr key={i} className="border-b border-slate-100">
                        <td className="py-2 text-slate-600">{e.salary_component}</td>
                        <td className="py-2 text-right font-medium">{formatKsh(e.amount)}</td>
                      </tr>
                    ))}
                    <tr className="font-semibold bg-green-50">
                      <td className="py-2 text-green-800">Gross Pay</td>
                      <td className="py-2 text-right text-green-800">{formatKsh(slip.gross_pay)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Deductions */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-2 pb-2 border-b">Deductions</h3>
                <table className="w-full text-sm">
                  <tbody>
                    {(slip.deductions || []).map((d, i) => (
                      <tr key={i} className="border-b border-slate-100">
                        <td className="py-2 text-slate-600">{d.salary_component}</td>
                        <td className="py-2 text-right font-medium">{formatKsh(d.amount)}</td>
                      </tr>
                    ))}
                    <tr className="font-semibold bg-red-50">
                      <td className="py-2 text-red-800">Total Deductions</td>
                      <td className="py-2 text-right text-red-800">{formatKsh(slip.total_deduction)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Net Pay */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-blue-900">Net Pay</span>
                <span className="text-2xl font-bold text-blue-900">{formatKsh(slip.net_pay)}</span>
              </div>
              {slip.total_in_words && (
                <p className="text-sm text-blue-700 mt-1 italic">{slip.total_in_words}</p>
              )}
            </div>

            {/* Bank Details if available */}
            {(slip.bank_name || slip.bank_account_no) && (
              <div className="mt-4 p-3 bg-slate-50 rounded-lg text-sm">
                <span className="text-slate-500">Bank: </span>
                <span className="font-medium">{slip.bank_name || '—'}</span>
                <span className="text-slate-500 ml-4">Account: </span>
                <span className="font-medium">{slip.bank_account_no || '—'}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SalarySlips() {
  const { showToast } = useToast()
  const [slips, setSlips] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({})
  const [filterOptions, setFilterOptions] = useState({
    companies: [],
    properties: [],
    employees: [],
    months: [],
    statuses: []
  })

  // Filter state
  const [company, setCompany] = useState('')
  const [property, setProperty] = useState('')
  const [employee, setEmployee] = useState('')
  const [searchName, setSearchName] = useState('')
  const [month, setMonth] = useState('')
  const [status, setStatus] = useState('')

  // Selected slip for modal
  const [selectedSlip, setSelectedSlip] = useState(null)
  const [loadingSlip, setLoadingSlip] = useState(false)

  // Pagination
  const [page, setPage] = useState(1)
  const pageSize = 20

  // Summary stats
  const [summary, setSummary] = useState(null)

  // Load filter options on mount
  useEffect(() => {
    api.getSalarySlipFilters()
      .then(res => {
        if (res) setFilterOptions(res)
      })
      .catch(() => {})
  }, [])

  // Load slips when filters change
  useEffect(() => {
    setLoading(true)
    const selectedMonth = filterOptions.months?.find(m => m.month_key === month)

    api.getSalarySlips({
      company: company || undefined,
      property: property || undefined,
      employee: employee || undefined,
      employeeName: searchName || undefined,
      startDate: selectedMonth?.start_date || undefined,
      endDate: selectedMonth?.end_date || undefined,
      status: status || undefined,
      limit: pageSize,
      offset: (page - 1) * pageSize
    })
      .then(res => {
        if (res) {
          setSlips(res.data || [])
          setTotal(res.total || 0)
        }
      })
      .catch(err => {
        showToast(err.message || 'Failed to load salary slips')
      })
      .finally(() => setLoading(false))
  }, [company, property, employee, searchName, month, status, page])

  // Load summary
  useEffect(() => {
    const selectedMonth = filterOptions.months?.find(m => m.month_key === month)
    api.getPayrollSummary({
      company: company || undefined,
      startDate: selectedMonth?.start_date || undefined,
      endDate: selectedMonth?.end_date || undefined
    })
      .then(res => {
        if (res) setSummary(res)
      })
      .catch(() => {})
  }, [company, month, filterOptions.months])

  // View slip details
  const handleViewSlip = async (slip) => {
    setLoadingSlip(true)
    try {
      const detail = await api.getSalarySlip(slip.name)
      setSelectedSlip(detail)
    } catch (err) {
      showToast(err.message || 'Failed to load salary slip')
    } finally {
      setLoadingSlip(false)
    }
  }

  const statusBadge = (s) => {
    const colors = {
      Draft: 'gray',
      Submitted: 'blue',
      Paid: 'green',
      Cancelled: 'red'
    }
    return <Badge color={colors[s] || 'gray'}>{s}</Badge>
  }

  return (
    <>
      <ListPageTemplate
        title="Salary Slips"
        description="View and print employee salary slips. Filter by property, employee, or period."
        loading={loading}
        stats={summary ? [
          { label: 'Total Slips', value: summary.total_slips || 0, icon: FileText },
          { label: 'Total Gross', value: formatKsh(summary.totals?.total_gross || 0), icon: Banknote, tone: 'blue' },
          { label: 'Total Net', value: formatKsh(summary.totals?.total_net || 0), icon: Banknote, tone: 'green' },
        ] : []}
        actions={
          <FilterDrawer 
            activeCount={[company, property, employee, month, status, searchName].filter(Boolean).length}
            onClear={() => {
              setCompany('')
              setProperty('')
              setEmployee('')
              setMonth('')
              setStatus('')
              setSearchName('')
              setPage(1)
            }}
          >
            {/* Company Filter */}
            {filterOptions.companies?.length > 1 && (
              <FilterItem label="Company">
                <Select value={company} onChange={e => { setCompany(e.target.value); setPage(1) }} className="w-full lg:w-40 text-sm">
                  <option value="">All Companies</option>
                  {filterOptions.companies.map(c => <option key={c} value={c}>{c}</option>)}
                </Select>
              </FilterItem>
            )}

            {/* Property Filter */}
            <FilterItem label="Property">
              <Select value={property} onChange={e => { setProperty(e.target.value); setPage(1) }} className="w-full lg:w-40 text-sm">
                <option value="">All Properties</option>
                {filterOptions.properties?.map(p => <option key={p.name} value={p.name}>{p.property_name}</option>)}
              </Select>
            </FilterItem>

            {/* Employee Filter */}
            <FilterItem label="Staff Member">
              <Select value={employee} onChange={e => { setEmployee(e.target.value); setPage(1) }} className="w-full lg:w-40 text-sm">
                <option value="">All Staff</option>
                {filterOptions.employees?.map(e => <option key={e.name} value={e.name}>{e.employee_name}</option>)}
              </Select>
            </FilterItem>

            {/* Month Filter */}
            <FilterItem label="Pay Period">
              <Select value={month} onChange={e => { setMonth(e.target.value); setPage(1) }} className="w-full lg:w-36 text-sm">
                <option value="">All Periods</option>
                {filterOptions.months?.map(m => (
                  <option key={m.month_key} value={m.month_key}>{formatMonth(m.start_date)}</option>
                ))}
              </Select>
            </FilterItem>

            {/* Status Filter */}
            <FilterItem label="Status">
              <Select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }} className="w-full lg:w-32 text-sm">
                <option value="">All Status</option>
                {filterOptions.statuses?.map(s => <option key={s} value={s}>{s}</option>)}
              </Select>
            </FilterItem>

            {/* Search by name */}
            <FilterItem label="Search">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <TextInput
                  value={searchName}
                  onChange={e => { setSearchName(e.target.value); setPage(1) }}
                  placeholder="Search name..."
                  className="pl-8 w-full lg:w-36 text-sm"
                />
              </div>
            </FilterItem>
          </FilterDrawer>
        }
        columns={[
          { 
            key: 'employee_name', 
            header: 'Employee',
            render: r => (
              <div>
                <div className="font-medium text-slate-800">{r.employee_name}</div>
                <div className="text-xs text-slate-500">{r.designation || r.department || '—'}</div>
              </div>
            )
          },
          { 
            key: 'period', 
            header: 'Period',
            render: r => formatMonth(r.start_date)
          },
          { 
            key: 'gross_pay', 
            header: 'Gross',
            render: r => <span className="text-slate-700">{formatKsh(r.gross_pay)}</span>
          },
          { 
            key: 'total_deduction', 
            header: 'Deductions',
            render: r => <span className="text-red-600">{formatKsh(r.total_deduction)}</span>
          },
          { 
            key: 'net_pay', 
            header: 'Net Pay',
            render: r => <span className="font-semibold text-green-700">{formatKsh(r.net_pay)}</span>
          },
          { 
            key: 'status', 
            header: 'Status',
            render: r => statusBadge(r.status)
          },
          {
            key: 'actions',
            header: '',
            render: r => (
              <Button 
                variant="ghost" 
                size="sm" 
                icon={FileText}
                onClick={() => handleViewSlip(r)}
                disabled={loadingSlip}
              >
                View
              </Button>
            )
          }
        ]}
        rows={slips}
        searchKeys={['employee_name', 'designation', 'department']}
        searchPlaceholder="Filter results..."
        pagination={{
          page,
          pageSize,
          total,
          onPageChange: setPage
        }}
      />

      {/* Salary Slip Detail Modal */}
      {selectedSlip && (
        <SalarySlipModal 
          slip={selectedSlip} 
          onClose={() => setSelectedSlip(null)} 
        />
      )}
    </>
  )
}
