import { useState, useEffect } from 'react'
import { 
  Banknote, Users, FileText, CheckCircle2, Clock, AlertCircle,
  CreditCard, Building2, Calendar, Loader2, Receipt,
  CheckCircle, XCircle, Wallet, ArrowDownCircle, BadgeCheck, Send, Wrench
} from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import StatCard from '../../components/ui/StatCard'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { Select } from '../../components/ui/Field'
import { StatCardsSkeleton, TableSkeleton } from '../../components/ui/Skeleton'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../context/AuthContext'
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

/** Check if user can submit salary slips (Admin, Administrator, Director) */
const canSubmitSlips = (user) => {
  if (!user) return false
  const roles = user.roles || []
  return roles.some(r => 
    ['Administrator', 'System Manager', 'Director', 'Admin'].includes(r)
  ) || user.name === 'Administrator'
}

/** Workflow step component */
function WorkflowStep({ step, title, description, status, isLast, children }) {
  const statusConfig = {
    completed: { icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    current: { icon: ArrowDownCircle, color: 'text-brand-500', bg: 'bg-brand-50', border: 'border-brand-200' },
    pending: { icon: Clock, color: 'text-slate-400', bg: 'bg-slate-50', border: 'border-slate-200' },
    disabled: { icon: XCircle, color: 'text-slate-300', bg: 'bg-slate-50', border: 'border-slate-100' }
  }
  
  const config = statusConfig[status] || statusConfig.pending

  return (
    <div className="relative">
      {/* Step connector line */}
      {!isLast && (
        <div className={`absolute left-5 top-12 w-0.5 h-[calc(100%-3rem)] ${
          status === 'completed' ? 'bg-emerald-300' : 'bg-slate-200'
        }`} />
      )}
      
      <div className={`relative flex gap-4 p-4 rounded-xl border ${config.border} ${config.bg}`}>
        {/* Step indicator */}
        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
          status === 'completed' ? 'bg-emerald-500 text-white' :
          status === 'current' ? 'bg-brand-500 text-white' :
          'bg-slate-200 text-slate-500'
        }`}>
          {status === 'completed' ? <CheckCircle className="w-5 h-5" /> : step}
        </div>
        
        {/* Step content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-slate-800">{title}</h4>
            {status === 'completed' && (
              <Badge tone="green" className="text-xs">Done</Badge>
            )}
          </div>
          <p className="text-sm text-slate-500 mb-3">{description}</p>
          {children}
        </div>
      </div>
    </div>
  )
}

/** Payment modal */
function PaymentModal({ payrollEntry, bankAccounts, onClose, onSuccess }) {
  const { showToast } = useToast()
  const [selectedBank, setSelectedBank] = useState('')
  const [processing, setProcessing] = useState(false)

  const handlePayment = async () => {
    if (!selectedBank) {
      showToast('Please select a bank account', 'error')
      return
    }

    setProcessing(true)
    try {
      const result = await api.processPayrollPayment(payrollEntry.name, selectedBank)
      showToast(result.message || 'Payment processed successfully')
      onSuccess(result)
    } catch (err) {
      showToast(err.message || 'Payment failed', 'error')
    } finally {
      setProcessing(false)
    }
  }

  const selectedAccount = bankAccounts.find(a => a.name === selectedBank)
  const netPay = payrollEntry.totals?.net || 0
  const insufficientFunds = selectedAccount && selectedAccount.balance < netPay

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
        <div className="p-5 border-b border-slate-200 bg-gradient-to-r from-brand-50 to-white rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Process Salary Payment</h2>
              <p className="text-sm text-slate-500">{formatMonth(payrollEntry.start_date)} Payroll</p>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Payment Summary */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">Employees</span>
              <span className="font-medium text-slate-700">{payrollEntry.number_of_employees} staff</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">Gross Pay</span>
              <span className="font-medium text-slate-700">{formatKsh(payrollEntry.totals?.gross || 0)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">Deductions</span>
              <span className="font-medium text-red-600">-{formatKsh(payrollEntry.totals?.deductions || 0)}</span>
            </div>
            <div className="border-t border-slate-200 pt-3 flex justify-between items-center">
              <span className="font-medium text-slate-700">Net Payable</span>
              <span className="text-xl font-bold text-brand-600">{formatKsh(netPay)}</span>
            </div>
          </div>

          {/* Bank Account Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Select Bank Account
            </label>
            <div className="space-y-2">
              {bankAccounts.length === 0 ? (
                <div className="text-center py-4 text-slate-500 text-sm bg-amber-50 rounded-lg border border-amber-200">
                  <AlertCircle className="w-5 h-5 mx-auto mb-1 text-amber-500" />
                  No bank accounts found. Create one in Accounting first.
                </div>
              ) : (
                bankAccounts.map(acc => (
                  <label
                    key={acc.name}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedBank === acc.name 
                        ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500' 
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="bankAccount"
                      value={acc.name}
                      checked={selectedBank === acc.name}
                      onChange={(e) => setSelectedBank(e.target.value)}
                      className="sr-only"
                    />
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      selectedBank === acc.name ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-800">{acc.account_name}</div>
                      <div className="text-sm text-slate-500">Balance: {formatKsh(acc.balance || 0)}</div>
                    </div>
                    {selectedBank === acc.name && (
                      <CheckCircle2 className="w-5 h-5 text-brand-500" />
                    )}
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Low balance warning */}
          {insufficientFunds && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Insufficient balance</p>
                <p className="text-amber-600">Account has {formatKsh(selectedAccount.balance)} but {formatKsh(netPay)} is needed.</p>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-200 flex gap-3 bg-slate-50 rounded-b-xl">
          <Button variant="secondary" className="flex-1" onClick={onClose} disabled={processing}>
            Cancel
          </Button>
          <Button 
            className="flex-1" 
            onClick={handlePayment}
            disabled={!selectedBank || processing || insufficientFunds}
          >
            {processing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4 mr-2" />
                Pay {formatKsh(netPay)}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function PayrollProcessing() {
  const { showToast } = useToast()
  const { user } = useAuth()
  
  // State
  const [loading, setLoading] = useState(true)
  const [availableMonths, setAvailableMonths] = useState([])
  const [selectedMonth, setSelectedMonth] = useState(null)
  const [pendingSlips, setPendingSlips] = useState({ slips: [], draft_slips: [], totals: {}, draft_totals: {} })
  const [payrollEntries, setPayrollEntries] = useState([])
  const [bankAccounts, setBankAccounts] = useState([])
  
  // Modals
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedPayrollEntry, setSelectedPayrollEntry] = useState(null)
  
  // Actions
  const [creating, setCreating] = useState(false)
  const [submitting, setSubmitting] = useState(null)
  const [submittingSlips, setSubmittingSlips] = useState(false)
  const [fixingWords, setFixingWords] = useState(false)

  const userCanSubmit = canSubmitSlips(user)

  // Load initial data
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [months, entries, banks] = await Promise.all([
        api.getAvailablePayrollMonths(),
        api.getPayrollEntries(),
        api.listBankAccountsWithBalance()
      ])
      
      setAvailableMonths(months || [])
      setPayrollEntries(entries || [])
      setBankAccounts(banks || [])
      
      // Auto-select current month if available
      if (months && months.length > 0) {
        setSelectedMonth(months[0])
        loadPendingSlips(months[0].year, months[0].month)
      }
    } catch (err) {
      showToast(err.message || 'Failed to load data', 'error')
    } finally {
      setLoading(false)
    }
  }

  const loadPendingSlips = async (year, month) => {
    try {
      const result = await api.getPendingSalarySlips(month, year)
      setPendingSlips(result || { slips: [], draft_slips: [], totals: {}, draft_totals: {} })
    } catch (err) {
      console.error('Failed to load pending slips:', err)
    }
  }

  const handleMonthChange = (monthKey) => {
    const month = availableMonths.find(m => `${m.year}-${m.month}` === monthKey)
    if (month) {
      setSelectedMonth(month)
      loadPendingSlips(month.year, month.month)
    }
  }

  const handleCreatePayrollEntry = async () => {
    if (!selectedMonth) return
    
    setCreating(true)
    try {
      const result = await api.createPayrollEntry(
        selectedMonth.start_date,
        selectedMonth.end_date
      )
      
      if (result.status === 'exists') {
        showToast(result.message, 'info')
      } else {
        showToast(result.message || 'Payroll Entry created')
      }
      
      // Reload entries
      const entries = await api.getPayrollEntries()
      setPayrollEntries(entries || [])
    } catch (err) {
      showToast(err.message || 'Failed to create payroll entry', 'error')
    } finally {
      setCreating(false)
    }
  }

  const handleSubmitPayrollEntry = async (entryName) => {
    setSubmitting(entryName)
    try {
      const result = await api.submitPayrollEntry(entryName)
      
      if (result.status === 'error') {
        showToast(result.message, 'error')
      } else {
        showToast(result.message || 'Payroll Entry submitted')
        
        // Reload entries
        const entries = await api.getPayrollEntries()
        setPayrollEntries(entries || [])
      }
    } catch (err) {
      showToast(err.message || 'Failed to submit payroll entry', 'error')
    } finally {
      setSubmitting(null)
    }
  }

  const handleSubmitDraftSlips = async () => {
    if (!selectedMonth || !userCanSubmit) return
    
    setSubmittingSlips(true)
    try {
      const result = await api.submitDraftSalarySlips(null, selectedMonth.month, selectedMonth.year)
      showToast(result.message || `Submitted ${result.count} salary slips`)
      
      // Reload slips
      await loadPendingSlips(selectedMonth.year, selectedMonth.month)
      // Reload months to update counts
      const months = await api.getAvailablePayrollMonths()
      setAvailableMonths(months || [])
    } catch (err) {
      showToast(err.message || 'Failed to submit salary slips', 'error')
    } finally {
      setSubmittingSlips(false)
    }
  }

  const handleFixWords = async () => {
    if (!selectedMonth) return
    
    setFixingWords(true)
    try {
      const result = await api.fixSalarySlipWords(null, selectedMonth.month, selectedMonth.year)
      if (result.count > 0) {
        showToast(`Fixed ${result.count} salary slip(s) with mismatched amounts in words`)
      } else {
        showToast('All salary slips have correct amounts in words', 'info')
      }
      
      // Reload slips
      await loadPendingSlips(selectedMonth.year, selectedMonth.month)
    } catch (err) {
      showToast(err.message || 'Failed to fix salary slip words', 'error')
    } finally {
      setFixingWords(false)
    }
  }

  const handleOpenPayment = async (entry) => {
    try {
      const details = await api.getPayrollEntryDetails(entry.name)
      setSelectedPayrollEntry(details)
      setShowPaymentModal(true)
    } catch (err) {
      showToast(err.message || 'Failed to load payroll details', 'error')
    }
  }

  const handlePaymentSuccess = async (result) => {
    setShowPaymentModal(false)
    setSelectedPayrollEntry(null)
    showToast(result.message)
    
    // Reload all data
    await loadData()
    if (selectedMonth) {
      await loadPendingSlips(selectedMonth.year, selectedMonth.month)
    }
  }

  // Find payroll entry for selected month
  const currentMonthEntry = selectedMonth ? payrollEntries.find(e => {
    const entryStart = new Date(e.start_date)
    return entryStart.getFullYear() === selectedMonth.year && 
           entryStart.getMonth() + 1 === selectedMonth.month
  }) : null

  // Counts
  const draftSlipsCount = pendingSlips.draft_slips?.length || 0
  const submittedSlipsCount = pendingSlips.slips?.length || 0
  const totalSlipsCount = draftSlipsCount + submittedSlipsCount
  const paidSlipsCount = pendingSlips.slips?.filter(s => s.status === 'Paid').length || 0
  const allPaid = submittedSlipsCount > 0 && paidSlipsCount === submittedSlipsCount && draftSlipsCount === 0
  const partiallyPaid = paidSlipsCount > 0 && paidSlipsCount < submittedSlipsCount

  // Combined totals (draft + submitted)
  const combinedTotals = {
    gross: (pendingSlips.totals?.gross || 0) + (pendingSlips.draft_totals?.gross || 0),
    deductions: (pendingSlips.totals?.deductions || 0) + (pendingSlips.draft_totals?.deductions || 0),
    net: (pendingSlips.totals?.net || 0) + (pendingSlips.draft_totals?.net || 0)
  }

  // Workflow status
  const getStepStatus = (step) => {
    if (allPaid) return 'completed'
    
    switch(step) {
      case 1: // Submit draft slips
        if (draftSlipsCount === 0 && submittedSlipsCount > 0) return 'completed'
        if (draftSlipsCount > 0) return 'current'
        return 'pending'
      case 2: // Create entry
        if (currentMonthEntry) return 'completed'
        if (submittedSlipsCount > 0 && draftSlipsCount === 0) return 'current'
        return 'pending'
      case 3: // Submit entry
        if (currentMonthEntry?.status === 'Submitted') return 'completed'
        if (currentMonthEntry?.status === 'Draft') return 'current'
        return 'pending'
      case 4: // Process payment
        if (allPaid) return 'completed'
        if (currentMonthEntry?.status === 'Submitted') return 'current'
        return 'pending'
      default:
        return 'pending'
    }
  }

  return (
    <div>
      <PageHeader
        title="Payroll Processing"
        description="Process monthly salaries: submit slips, create entry, submit, and pay."
      />

      {/* Month Selector */}
      <Card className="mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand-100 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <span className="block text-xs text-slate-500">Payroll Period</span>
              <Select
                value={selectedMonth ? `${selectedMonth.year}-${selectedMonth.month}` : ''}
                onChange={(e) => handleMonthChange(e.target.value)}
                className="text-sm font-medium border-0 p-0 bg-transparent focus:ring-0 -ml-1"
              >
                <option value="">Select month...</option>
                {availableMonths.map(m => (
                  <option key={`${m.year}-${m.month}`} value={`${m.year}-${m.month}`}>
                    {m.label} ({m.slip_count} employees)
                  </option>
                ))}
              </Select>
            </div>
          </div>
          
          {selectedMonth && (
            <>
              <div className="hidden sm:block h-8 w-px bg-slate-200" />
              <div className="text-sm text-slate-500">
                {formatDate(selectedMonth.start_date)} – {formatDate(selectedMonth.end_date)}
              </div>
              
              {/* Status badge */}
              <div className="ml-auto flex items-center gap-2">
                {/* Fix Words button */}
                <Button 
                  size="sm" 
                  variant="secondary"
                  onClick={handleFixWords}
                  disabled={fixingWords || totalSlipsCount === 0}
                  title="Fix amount in words for all salary slips"
                >
                  {fixingWords ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Wrench className="w-4 h-4" />
                  )}
                </Button>
                
                {allPaid ? (
                  <Badge tone="green" className="flex items-center gap-1">
                    <BadgeCheck className="w-3.5 h-3.5" />
                    Fully Paid
                  </Badge>
                ) : draftSlipsCount > 0 ? (
                  <Badge tone="orange" className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {draftSlipsCount} Draft
                  </Badge>
                ) : partiallyPaid ? (
                  <Badge tone="orange" className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Partially Paid ({paidSlipsCount}/{submittedSlipsCount})
                  </Badge>
                ) : currentMonthEntry ? (
                  <Badge tone="blue" className="flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" />
                    Entry {currentMonthEntry.status}
                  </Badge>
                ) : (
                  <Badge tone="slate" className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Not Started
                  </Badge>
                )}
              </div>
            </>
          )}
        </div>
      </Card>

      {loading ? (
        <div className="space-y-6">
          <StatCardsSkeleton count={4} />
          <Card><TableSkeleton columns={5} rows={5} /></Card>
        </div>
      ) : !selectedMonth ? (
        <Card className="text-center py-12">
          <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <h3 className="font-semibold text-slate-700 mb-1">Select a Payroll Period</h3>
          <p className="text-sm text-slate-500">Choose a month above to view and process payroll.</p>
        </Card>
      ) : (
        <>
          {/* Stats Overview */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard 
              label="Employees" 
              value={totalSlipsCount} 
              icon={Users}
              subtitle={draftSlipsCount > 0 ? `${draftSlipsCount} draft, ${submittedSlipsCount} submitted` : `${paidSlipsCount} paid`}
            />
            <StatCard 
              label="Gross Pay" 
              value={formatKsh(combinedTotals.gross)} 
              icon={Banknote}
              tone="blue"
            />
            <StatCard 
              label="Deductions" 
              value={formatKsh(combinedTotals.deductions)} 
              icon={Receipt}
              tone="orange"
            />
            <StatCard 
              label="Net Payable" 
              value={formatKsh(combinedTotals.net)} 
              icon={Wallet}
              tone={allPaid ? 'green' : 'brand'}
              subtitle={allPaid ? '✓ All paid' : 'Pending'}
            />
          </div>

          {/* Two Column Layout: Workflow + Details */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Left: Workflow Steps */}
            <div className="xl:col-span-1 space-y-4">
              <h3 className="font-semibold text-slate-800 mb-4">Processing Workflow</h3>
              
              {/* Step 1: Submit Draft Slips */}
              <WorkflowStep
                step={1}
                title="Submit Salary Slips"
                description={draftSlipsCount > 0 
                  ? `${draftSlipsCount} draft slips need to be submitted` 
                  : `${submittedSlipsCount} slips ready`}
                status={getStepStatus(1)}
              >
                {draftSlipsCount > 0 && userCanSubmit && (
                  <Button 
                    size="sm" 
                    onClick={handleSubmitDraftSlips} 
                    disabled={submittingSlips}
                  >
                    {submittingSlips ? (
                      <><Loader2 className="w-4 h-4 animate-spin mr-1" /> Submitting...</>
                    ) : (
                      <><Send className="w-4 h-4 mr-1" /> Submit All Drafts</>
                    )}
                  </Button>
                )}
                {draftSlipsCount > 0 && !userCanSubmit && (
                  <p className="text-xs text-amber-600">Only Admin/Director can submit slips</p>
                )}
                {draftSlipsCount === 0 && submittedSlipsCount > 0 && (
                  <div className="text-sm text-slate-600">
                    Total: <span className="font-semibold">{formatKsh(pendingSlips.totals?.net || 0)}</span>
                  </div>
                )}
              </WorkflowStep>

              {/* Step 2: Create Entry */}
              <WorkflowStep
                step={2}
                title="Create Payroll Entry"
                description="Bundle salary slips into a payroll entry"
                status={getStepStatus(2)}
              >
                {!currentMonthEntry && submittedSlipsCount > 0 && draftSlipsCount === 0 && (
                  <Button 
                    size="sm" 
                    onClick={handleCreatePayrollEntry} 
                    disabled={creating}
                  >
                    {creating ? (
                      <><Loader2 className="w-4 h-4 animate-spin mr-1" /> Creating...</>
                    ) : (
                      'Create Entry'
                    )}
                  </Button>
                )}
                {currentMonthEntry && (
                  <div className="text-sm text-slate-600">
                    Entry: <span className="font-mono text-xs">{currentMonthEntry.name}</span>
                  </div>
                )}
                {draftSlipsCount > 0 && (
                  <p className="text-xs text-slate-400">Submit draft slips first</p>
                )}
              </WorkflowStep>

              {/* Step 3: Submit */}
              <WorkflowStep
                step={3}
                title="Submit for Approval"
                description="Submit entry to create accounting records"
                status={getStepStatus(3)}
              >
                {currentMonthEntry?.status === 'Draft' && (
                  <Button 
                    size="sm"
                    variant="secondary"
                    onClick={() => handleSubmitPayrollEntry(currentMonthEntry.name)}
                    disabled={submitting === currentMonthEntry.name}
                  >
                    {submitting === currentMonthEntry.name ? (
                      <><Loader2 className="w-4 h-4 animate-spin mr-1" /> Submitting...</>
                    ) : (
                      'Submit Entry'
                    )}
                  </Button>
                )}
                {currentMonthEntry?.status === 'Submitted' && (
                  <Badge tone="green">Submitted</Badge>
                )}
              </WorkflowStep>

              {/* Step 4: Pay */}
              <WorkflowStep
                step={4}
                title="Process Payment"
                description="Pay salaries from your bank account"
                status={getStepStatus(4)}
                isLast
              >
                {allPaid ? (
                  <div className="flex items-center gap-2 text-emerald-600">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">Payment Complete</span>
                  </div>
                ) : currentMonthEntry?.status === 'Submitted' ? (
                  <Button 
                    size="sm"
                    onClick={() => handleOpenPayment(currentMonthEntry)}
                  >
                    <CreditCard className="w-4 h-4 mr-1" />
                    Pay Now
                  </Button>
                ) : (
                  <span className="text-xs text-slate-400">Submit entry first</span>
                )}
              </WorkflowStep>
            </div>

            {/* Right: Salary Slips Tables */}
            <div className="xl:col-span-2 space-y-6">
              {/* Draft Slips (if any) */}
              {draftSlipsCount > 0 && (
                <Card padded={false} className="border-amber-200">
                  <div className="p-4 border-b border-amber-200 bg-amber-50 flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-amber-800">
                        Draft Salary Slips
                      </h3>
                      <p className="text-xs text-amber-600">These need to be submitted before processing</p>
                    </div>
                    <Badge tone="orange">{draftSlipsCount} Draft</Badge>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-slate-500 bg-slate-50 border-b border-slate-200">
                          <th className="font-semibold px-5 py-3 w-[40%]">Employee</th>
                          <th className="font-semibold px-5 py-3 w-[20%] text-right">Gross</th>
                          <th className="font-semibold px-5 py-3 w-[20%] text-right">Net Pay</th>
                          <th className="font-semibold px-5 py-3 w-[20%] text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingSlips.draft_slips.map((slip, i) => (
                          <tr key={slip.name || i} className={`${i % 2 === 1 ? 'bg-amber-50/30' : 'bg-white'}`}>
                            <td className="px-5 py-3 border-b border-slate-100">
                              <div className="font-medium text-slate-800">{slip.employee_name}</div>
                              <div className="text-xs text-slate-500">{slip.designation || slip.department || '—'}</div>
                            </td>
                            <td className="px-5 py-3 border-b border-slate-100 text-right tabular-nums text-slate-700">
                              {formatKsh(slip.gross_pay)}
                            </td>
                            <td className="px-5 py-3 border-b border-slate-100 text-right tabular-nums font-semibold text-emerald-600">
                              {formatKsh(slip.net_pay)}
                            </td>
                            <td className="px-5 py-3 border-b border-slate-100 text-center">
                              <Badge tone="orange">Draft</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-amber-50 font-semibold">
                          <td className="px-5 py-3 text-amber-800">Total ({draftSlipsCount} draft)</td>
                          <td className="px-5 py-3 text-right tabular-nums text-amber-800">{formatKsh(pendingSlips.draft_totals?.gross || 0)}</td>
                          <td className="px-5 py-3 text-right tabular-nums text-emerald-600">{formatKsh(pendingSlips.draft_totals?.net || 0)}</td>
                          <td className="px-5 py-3"></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </Card>
              )}

              {/* Submitted Slips */}
              <Card padded={false}>
                <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="font-semibold text-slate-800">
                    {draftSlipsCount > 0 ? 'Submitted Salary Slips' : `Salary Slips – ${selectedMonth.label}`}
                  </h3>
                  <span className="text-sm text-slate-500">{submittedSlipsCount} employees</span>
                </div>
                
                {submittedSlipsCount === 0 ? (
                  <div className="p-8 text-center text-slate-500">
                    <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p>{draftSlipsCount > 0 ? 'No submitted salary slips yet.' : 'No salary slips for this period.'}</p>
                    <p className="text-sm">{draftSlipsCount > 0 ? 'Submit draft slips above.' : 'Generate salary slips in HR module first.'}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-slate-500 bg-slate-50 border-b border-slate-200">
                          <th className="font-semibold px-5 py-3 w-[35%]">Employee</th>
                          <th className="font-semibold px-5 py-3 w-[15%] text-right">Gross</th>
                          <th className="font-semibold px-5 py-3 w-[15%] text-right">Deductions</th>
                          <th className="font-semibold px-5 py-3 w-[18%] text-right">Net Pay</th>
                          <th className="font-semibold px-5 py-3 w-[17%] text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingSlips.slips.map((slip, i) => (
                          <tr key={slip.name || i} className={`${i % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'} hover:bg-slate-100/70`}>
                            <td className="px-5 py-3.5 border-b border-slate-100">
                              <div className="font-medium text-slate-800">{slip.employee_name}</div>
                              <div className="text-xs text-slate-500">{slip.designation || slip.department || '—'}</div>
                            </td>
                            <td className="px-5 py-3.5 border-b border-slate-100 text-right tabular-nums text-slate-700">
                              {formatKsh(slip.gross_pay)}
                            </td>
                            <td className="px-5 py-3.5 border-b border-slate-100 text-right tabular-nums text-red-600">
                              -{formatKsh(slip.total_deduction)}
                            </td>
                            <td className="px-5 py-3.5 border-b border-slate-100 text-right tabular-nums font-semibold text-emerald-600">
                              {formatKsh(slip.net_pay)}
                            </td>
                            <td className="px-5 py-3.5 border-b border-slate-100 text-center">
                              <Badge tone={slip.status === 'Paid' ? 'green' : 'blue'}>
                                {slip.status}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      {/* Totals row */}
                      <tfoot>
                        <tr className="bg-slate-100 font-semibold">
                          <td className="px-5 py-3 text-slate-700">Total ({submittedSlipsCount} employees)</td>
                          <td className="px-5 py-3 text-right tabular-nums text-slate-700">{formatKsh(pendingSlips.totals?.gross || 0)}</td>
                          <td className="px-5 py-3 text-right tabular-nums text-red-600">-{formatKsh(pendingSlips.totals?.deductions || 0)}</td>
                          <td className="px-5 py-3 text-right tabular-nums text-emerald-600">{formatKsh(pendingSlips.totals?.net || 0)}</td>
                          <td className="px-5 py-3 text-center">
                            {allPaid && <Badge tone="green">All Paid</Badge>}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </Card>

              {/* Bank Accounts Quick View */}
              <Card className="mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-800">Bank Accounts</h3>
                  <span className="text-xs text-slate-500">Available for payment</span>
                </div>
                
                {bankAccounts.length === 0 ? (
                  <p className="text-slate-500 text-sm py-4 text-center">
                    No bank accounts. Add one in Accounting → Bank Accounts.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {bankAccounts.map(acc => (
                      <div key={acc.name} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                        <div className="w-10 h-10 rounded-lg bg-brand-100 flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-brand-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-slate-800 truncate">{acc.account_name}</div>
                          <div className="text-lg font-semibold text-slate-900">{formatKsh(acc.balance || 0)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        </>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedPayrollEntry && (
        <PaymentModal
          payrollEntry={selectedPayrollEntry}
          bankAccounts={bankAccounts}
          onClose={() => {
            setShowPaymentModal(false)
            setSelectedPayrollEntry(null)
          }}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  )
}
