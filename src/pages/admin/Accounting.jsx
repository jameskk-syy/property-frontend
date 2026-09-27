import { useState, useEffect, useCallback } from 'react'
import { Scale, BookOpen, PlusCircle, Landmark, FileText, RefreshCw, Trash2, Plus, ChevronRight, ChevronDown, ChevronLeft, CreditCard, Building2 } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import Card from '../../components/ui/Card'
import Tabs from '../../components/ui/Tabs'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { Field, TextInput, Select } from '../../components/ui/Field'
import { TableSkeleton, CardSkeleton } from '../../components/ui/Skeleton'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../api/client'
import { formatKsh } from '../../data/mockData'

const TABS = ['Balance Sheet', 'Trial Balance', 'Journal Entries', 'Chart of Accounts', 'Bank Accounts', 'Opening Balance', 'Bank Reconciliation']
const ksh = (n) => `KSh ${Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/** Check if user can create accounts (Director or Administrator) */
const canCreateAccounts = (user) => {
  if (!user) return false
  const role = (user.role || '').toLowerCase()
  // 'admin' is the normalized role for Administrator/Director/System Manager
  return role === 'admin'
}

/** Create Journal Entry Modal - for transfers and manual entries */
function CreateJournalEntryModal({ onClose, onSuccess, accounts }) {
  const { showToast } = useToast()
  const [form, setForm] = useState({
    remark: '',
    postingDate: new Date().toISOString().split('T')[0]
  })
  const [lines, setLines] = useState([
    { account: '', debit: '', credit: '' },
    { account: '', debit: '', credit: '' }
  ])
  const [saving, setSaving] = useState(false)

  const addLine = () => setLines([...lines, { account: '', debit: '', credit: '' }])
  const removeLine = (i) => setLines(lines.filter((_, idx) => idx !== i))
  const setLine = (i, field, value) => {
    setLines(lines.map((line, idx) => {
      if (idx !== i) return line
      // If setting debit, clear credit and vice versa
      if (field === 'debit' && value) {
        return { ...line, debit: value, credit: '' }
      }
      if (field === 'credit' && value) {
        return { ...line, credit: value, debit: '' }
      }
      return { ...line, [field]: value }
    }))
  }

  const totalDebit = lines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0)
  const totalCredit = lines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0)
  const isBalanced = totalDebit > 0 && totalDebit === totalCredit

  const handleSubmit = async () => {
    if (!isBalanced) {
      showToast('Total debits must equal total credits', 'error')
      return
    }

    const validLines = lines.filter(l => l.account && (Number(l.debit) > 0 || Number(l.credit) > 0))
    if (validLines.length < 2) {
      showToast('At least 2 lines are required', 'error')
      return
    }

    setSaving(true)
    try {
      const result = await api.createJournalEntry({
        lines: validLines.map(l => ({
          account: l.account,
          debit: Number(l.debit) || 0,
          credit: Number(l.credit) || 0
        })),
        postingDate: form.postingDate,
        remark: form.remark
      })
      showToast(`Journal Entry ${result.name || result.journal_entry} created`)
      onSuccess(result)
    } catch (err) {
      showToast(err.message || 'Failed to create journal entry', 'error')
    } finally {
      setSaving(false)
    }
  }

  // Filter to non-group accounts (all accounts from listAccounts are non-group)
  const leafAccounts = accounts

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-5 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">Create Journal Entry</h2>
          <p className="text-sm text-slate-500 mt-1">Transfer between accounts or record manual adjustments</p>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Posting Date">
              <TextInput
                type="date"
                value={form.postingDate}
                onChange={(e) => setForm({ ...form, postingDate: e.target.value })}
              />
            </Field>
            <Field label="Remark / Description">
              <TextInput
                value={form.remark}
                onChange={(e) => setForm({ ...form, remark: e.target.value })}
                placeholder="e.g., Transfer to petty cash"
              />
            </Field>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Entry Lines</label>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-600">
                    <th className="px-3 py-2 text-left font-medium">Account</th>
                    <th className="px-3 py-2 text-right font-medium w-32">Debit</th>
                    <th className="px-3 py-2 text-right font-medium w-32">Credit</th>
                    <th className="px-3 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="px-2 py-2">
                        <Select
                          value={line.account}
                          onChange={(e) => setLine(i, 'account', e.target.value)}
                          className="text-sm"
                        >
                          <option value="">Select account...</option>
                          {leafAccounts.map(a => (
                            <option key={a.id} value={a.id}>
                              {a.name}{a.rootType ? ` (${a.rootType})` : ''}
                            </option>
                          ))}
                        </Select>
                      </td>
                      <td className="px-2 py-2">
                        <TextInput
                          type="number"
                          value={line.debit}
                          onChange={(e) => setLine(i, 'debit', e.target.value)}
                          placeholder="0.00"
                          className="text-right"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <TextInput
                          type="number"
                          value={line.credit}
                          onChange={(e) => setLine(i, 'credit', e.target.value)}
                          placeholder="0.00"
                          className="text-right"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={Trash2}
                          onClick={() => removeLine(i)}
                          disabled={lines.length <= 2}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold">
                    <td className="px-3 py-2">Total</td>
                    <td className="px-3 py-2 text-right">{ksh(totalDebit)}</td>
                    <td className="px-3 py-2 text-right">{ksh(totalCredit)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <Button variant="secondary" size="sm" icon={Plus} onClick={addLine} className="mt-2">
              Add Line
            </Button>
          </div>

          {/* Balance indicator */}
          <div className={`p-3 rounded-lg text-sm ${isBalanced ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
            {isBalanced ? (
              <span>✓ Entry is balanced</span>
            ) : (
              <span>⚠ Difference: {ksh(Math.abs(totalDebit - totalCredit))} — Debits must equal credits</span>
            )}
          </div>

          {/* Quick transfer helper */}
          <div className="p-4 bg-slate-50 rounded-lg">
            <p className="text-xs text-slate-600 mb-2 font-medium">Quick Guide: Bank Transfer</p>
            <p className="text-xs text-slate-500">
              To transfer KES 50,000 from Cooperative Bank to Petty Cash:<br/>
              • Line 1: Petty Cash → Debit 50,000<br/>
              • Line 2: Cooperative Bank → Credit 50,000
            </p>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 flex gap-3 bg-slate-50">
          <Button variant="secondary" className="flex-1" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={handleSubmit} disabled={saving || !isBalanced}>
            {saving ? 'Creating...' : 'Create Entry'}
          </Button>
        </div>
      </div>
    </div>
  )
}

/** Create Account Modal */
function CreateAccountModal({ onClose, onSuccess, parentAccounts, accountTypes, rootTypes }) {
  const { showToast } = useToast()
  const [form, setForm] = useState({
    accountName: '',
    rootType: '',
    accountType: '',
    parentAccount: '',
    isGroup: false
  })
  const [saving, setSaving] = useState(false)
  const [filteredParents, setFilteredParents] = useState([])

  // Filter parent accounts when root type changes
  useEffect(() => {
    if (form.rootType) {
      const filtered = parentAccounts.filter(p => p.root_type === form.rootType)
      setFilteredParents(filtered)
    } else {
      setFilteredParents(parentAccounts)
    }
  }, [form.rootType, parentAccounts])

  const handleSubmit = async () => {
    if (!form.accountName.trim()) {
      showToast('Please enter an account name', 'error')
      return
    }
    if (!form.rootType) {
      showToast('Please select a root type', 'error')
      return
    }

    setSaving(true)
    try {
      const result = await api.createAccount({
        accountName: form.accountName,
        rootType: form.rootType,
        accountType: form.accountType || null,
        parentAccount: form.parentAccount || null,
        isGroup: form.isGroup
      })

      if (result.status === 'exists') {
        showToast(result.message, 'info')
      } else {
        showToast(result.message || 'Account created successfully')
        onSuccess(result)
      }
    } catch (err) {
      showToast(err.message || 'Failed to create account', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="p-5 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">Create Account</h2>
          <p className="text-sm text-slate-500 mt-1">Add a new account to the Chart of Accounts</p>
        </div>

        <div className="p-5 space-y-4">
          <Field label="Account Name" required>
            <TextInput
              value={form.accountName}
              onChange={(e) => setForm({ ...form, accountName: e.target.value })}
              placeholder="e.g., Cooperative Bank, Office Rent"
            />
          </Field>

          <Field label="Root Type" required>
            <Select
              value={form.rootType}
              onChange={(e) => setForm({ ...form, rootType: e.target.value, parentAccount: '' })}
            >
              <option value="">Select root type...</option>
              {rootTypes.map(rt => (
                <option key={rt.value} value={rt.value}>{rt.label}</option>
              ))}
            </Select>
          </Field>

          <Field label="Account Type">
            <Select
              value={form.accountType}
              onChange={(e) => setForm({ ...form, accountType: e.target.value })}
            >
              <option value="">None (General)</option>
              {accountTypes.map(at => (
                <option key={at.value} value={at.value}>{at.label}</option>
              ))}
            </Select>
            <p className="text-xs text-slate-500 mt-1">
              Select "Bank" for bank accounts, "Receivable" for customer accounts, etc.
            </p>
          </Field>

          <Field label="Parent Account">
            <Select
              value={form.parentAccount}
              onChange={(e) => setForm({ ...form, parentAccount: e.target.value })}
            >
              <option value="">Auto-select based on type</option>
              {filteredParents.map(p => (
                <option key={p.name} value={p.name}>{p.account_name}</option>
              ))}
            </Select>
          </Field>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isGroup}
              onChange={(e) => setForm({ ...form, isGroup: e.target.checked })}
              className="rounded border-slate-300"
            />
            <span className="text-slate-700">This is a group account (contains sub-accounts)</span>
          </label>
        </div>

        <div className="p-4 border-t border-slate-200 flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Creating...' : 'Create Account'}
          </Button>
        </div>
      </div>
    </div>
  )
}

/** Account tree node component */
function AccountNode({ account, level = 0, onSelect }) {
  const [expanded, setExpanded] = useState(level < 2)
  const hasChildren = account.children && account.children.length > 0

  return (
    <div>
      <div 
        className={`
          flex items-center gap-2 py-1.5 px-2 hover:bg-slate-50 rounded cursor-pointer
          ${level === 0 ? 'font-semibold' : ''}
        `}
        style={{ paddingLeft: `${level * 20 + 8}px` }}
        onClick={() => hasChildren ? setExpanded(!expanded) : onSelect?.(account)}
      >
        {hasChildren ? (
          expanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />
        ) : (
          <span className="w-4" />
        )}
        <span className={`flex-1 ${account.is_group ? 'text-slate-700' : 'text-slate-600'}`}>
          {account.account_name}
        </span>
        {account.account_type && (
          <Badge tone="slate" className="text-xs">{account.account_type}</Badge>
        )}
      </div>
      {expanded && hasChildren && (
        <div>
          {account.children.map(child => (
            <AccountNode key={child.name} account={child} level={level + 1} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function Accounting() {
  const { showToast } = useToast()
  const { user } = useAuth()
  const [tab, setTab] = useState('Balance Sheet')
  const [properties, setProperties] = useState([])
  const [propertyFilter, setPropertyFilter] = useState('')
  const [loading, setLoading] = useState(false)

  const [balanceSheet, setBalanceSheet] = useState(null)
  const [trialBalance, setTrialBalance] = useState([])
  const [journals, setJournals] = useState([])
  const [journalPagination, setJournalPagination] = useState(null)
  const [journalPage, setJournalPage] = useState(1)
  const [accounts, setAccounts] = useState([])
  const [unrec, setUnrec] = useState([])

  // New state for Chart of Accounts and Bank Accounts
  const [chartOfAccounts, setChartOfAccounts] = useState({})
  const [bankAccounts, setBankAccounts] = useState([])
  const [parentAccounts, setParentAccounts] = useState([])
  const [accountTypes, setAccountTypes] = useState([])
  const [rootTypes, setRootTypes] = useState([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showJournalModal, setShowJournalModal] = useState(false)

  useEffect(() => {
    api.getProperties().then((res) => Array.isArray(res) && setProperties(res)).catch(() => {})
    api.listAccounts().then(setAccounts).catch(() => {})
    // Load dropdown options for create modal
    api.getAccountTypes().then(setAccountTypes).catch(() => {})
    api.getRootTypes().then(setRootTypes).catch(() => {})
    api.getParentAccounts().then(setParentAccounts).catch(() => {})
  }, [])

  const load = useCallback(() => {
    const prop = propertyFilter || null
    setLoading(true)
    const jobs = {
      'Balance Sheet': () => api.getBalanceSheet({ property: prop }).then(setBalanceSheet),
      'Trial Balance': () => api.getTrialBalance(prop).then((r) => setTrialBalance(Array.isArray(r) ? r : [])),
      'Journal Entries': () => api.listJournalEntries({ property: prop, page: journalPage, pageSize: 8 }).then((res) => {
        setJournals(res.data || [])
        setJournalPagination(res.pagination)
      }),
      'Chart of Accounts': () => api.getChartOfAccountsTree().then(setChartOfAccounts),
      'Bank Accounts': () => api.listBankAccountsWithBalance().then(setBankAccounts),
      'Opening Balance': () => Promise.resolve(),
      'Bank Reconciliation': () => api.listUnreconciled().then(setUnrec),
    }
    ;(jobs[tab] || (() => Promise.resolve()))()
      .catch((e) => showToast(e?.message || 'Could not load.'))
      .finally(() => setLoading(false))
  }, [tab, propertyFilter, journalPage, showToast])

  useEffect(() => { load() }, [load])

  // --- Opening balance form ---
  const [obRows, setObRows] = useState([{ account: '', side: 'debit', amount: '' }])
  const [savingOb, setSavingOb] = useState(false)
  const addObRow = () => setObRows((r) => [...r, { account: '', side: 'debit', amount: '' }])
  const removeObRow = (i) => setObRows((r) => r.filter((_, idx) => idx !== i))
  const setObRow = (i, k, v) => setObRows((r) => r.map((row, idx) => (idx === i ? { ...row, [k]: v } : row)))

  const submitOpening = async () => {
    const balances = obRows
      .filter((r) => r.account && Number(r.amount) > 0)
      .map((r) => ({ account: r.account, debit: r.side === 'debit' ? Number(r.amount) : 0, credit: r.side === 'credit' ? Number(r.amount) : 0 }))
    if (balances.length === 0) { showToast('Add at least one account with an amount.'); return }
    setSavingOb(true)
    try {
      const res = await api.createOpeningBalance({ balances, property: propertyFilter || null })
      showToast(`Opening balances posted (JE ${res.journal_entry}).`)
      setObRows([{ account: '', side: 'debit', amount: '' }])
      if (tab === 'Balance Sheet' || tab === 'Trial Balance') load()
    } catch (e) {
      showToast(e?.message || 'Could not post opening balances.')
    } finally {
      setSavingOb(false)
    }
  }

  return (
    <div>
      <PageHeader title="Accounting" description="Balances, journal entries, opening balances and bank reconciliation — posted to the general ledger." />

      <Card padded={false} className="p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <Tabs tabs={TABS} active={tab} onChange={setTab} />
          <div className="flex items-center gap-2">
            <Select value={propertyFilter} onChange={(e) => setPropertyFilter(e.target.value)} className="text-xs py-1.5">
              <option value="">Whole company</option>
              {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
            <Button variant="ghost" size="sm" icon={RefreshCw} onClick={load} />
          </div>
        </div>

        {loading && (
          <div className="mt-5">
            {tab === 'Balance Sheet' ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <CardSkeleton lines={6} />
                <CardSkeleton lines={6} />
                <CardSkeleton lines={6} />
              </div>
            ) : (
              <TableSkeleton columns={4} rows={7} />
            )}
          </div>
        )}

        {/* BALANCE SHEET */}
        {!loading && tab === 'Balance Sheet' && balanceSheet && (
          <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-5">
            <Section title="Assets" rows={balanceSheet.assets} total={balanceSheet.total_assets} tone="brand" />
            <Section title="Liabilities" rows={balanceSheet.liabilities} total={balanceSheet.total_liabilities} tone="orange" />
            <div>
              <Section title="Equity" rows={balanceSheet.equity} total={balanceSheet.total_equity - (balanceSheet.net_profit || 0)} tone="blue" />
              <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-100 text-sm flex justify-between">
                <span className="text-slate-500">{(balanceSheet.net_profit || 0) < 0 ? 'Net Loss (period)' : 'Net Profit (period)'}</span>
                <span className={`font-semibold ${(balanceSheet.net_profit || 0) < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {ksh(Math.abs(balanceSheet.net_profit || 0))}
                </span>
              </div>
              <div className="mt-2 p-3 rounded-lg bg-slate-900 text-white text-sm flex justify-between">
                <span>Total Equity</span><span className="font-bold">{ksh(balanceSheet.total_equity)}</span>
              </div>
              <p className={`mt-3 text-xs font-medium ${balanceSheet.balanced ? 'text-emerald-600' : 'text-rose-600'}`}>
                {balanceSheet.balanced ? '✓ Balanced (Assets = Liabilities + Equity)' : '⚠ Not balanced — check postings'}
              </p>
            </div>
          </div>
        )}

        {/* TRIAL BALANCE */}
        {!loading && tab === 'Trial Balance' && (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-slate-500 border-b border-slate-200">
                <th className="py-2">Account</th><th className="py-2 text-right">Debit</th><th className="py-2 text-right">Credit</th><th className="py-2 text-right">Balance</th>
              </tr></thead>
              <tbody>
                {trialBalance.map((r) => (
                  <tr key={r.account} className="border-b border-slate-50">
                    <td className="py-2">{r.account_name || r.account}</td>
                    <td className="py-2 text-right">{ksh(r.debit)}</td>
                    <td className="py-2 text-right">{ksh(r.credit)}</td>
                    <td className="py-2 text-right font-medium">{ksh(r.balance)}</td>
                  </tr>
                ))}
                {trialBalance.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-slate-400">No entries.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* JOURNAL ENTRIES */}
        {!loading && tab === 'Journal Entries' && (
          <div className="mt-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-slate-500">
                View and create journal entries for transfers and adjustments.
              </p>
              {canCreateAccounts(user) && (
                <Button size="sm" icon={Plus} onClick={() => setShowJournalModal(true)}>
                  Create Journal Entry
                </Button>
              )}
            </div>
            <div className="space-y-3">
            {journals.length === 0 && <p className="py-6 text-center text-slate-400">No journal entries.</p>}
            {journals.map((j) => (
              <div key={j.name} className="p-4 rounded-lg border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-800">{j.name}</span>
                    {j.is_opening === 'Yes' && <Badge tone="blue">Opening</Badge>}
                    <Badge tone={j.status === 'Submitted' ? 'green' : 'slate'}>{j.status}</Badge>
                  </div>
                  <span className="text-xs text-slate-400">{j.posting_date}</span>
                </div>
                {j.user_remark && <p className="text-xs text-slate-500 mb-2">{j.user_remark}</p>}
                <div className="text-xs text-slate-600 space-y-1">
                  {(j.accounts || []).map((a, i) => (
                    <div key={i} className="flex justify-between">
                      <span>{a.account}</span>
                      <span>{Number(a.debit) > 0 ? `Dr ${ksh(a.debit)}` : `Cr ${ksh(a.credit)}`}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            </div>

            {/* Pagination Controls */}
            {journalPagination && journalPagination.totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-200">
                <p className="text-xs text-slate-500">
                  Showing <span className="font-medium text-slate-700">{((journalPagination.page - 1) * journalPagination.pageSize) + 1}</span>–
                  <span className="font-medium text-slate-700">{Math.min(journalPagination.page * journalPagination.pageSize, journalPagination.total)}</span> of{' '}
                  <span className="font-medium text-slate-700">{journalPagination.total}</span>
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={ChevronLeft}
                    onClick={() => setJournalPage(p => Math.max(1, p - 1))}
                    disabled={!journalPagination.hasPrev}
                  >
                    Prev
                  </Button>
                  <span className="text-sm text-slate-600 px-2">
                    Page {journalPagination.page} of {journalPagination.totalPages}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setJournalPage(p => p + 1)}
                    disabled={!journalPagination.hasNext}
                  >
                    Next <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* OPENING BALANCE */}
        {tab === 'Opening Balance' && (
          <div className="mt-5 max-w-2xl">
            <p className="text-xs text-slate-500 mb-4">
              Enter each account's opening balance on its natural side (Assets → Debit, Liabilities/Equity/Income → Credit).
              The balancing entry posts to <b>Opening Balance Equity</b>. Dated at the fiscal-year start.
            </p>
            <div className="space-y-2">
              {obRows.map((row, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="flex-1">
                    <Select value={row.account} onChange={(e) => setObRow(i, 'account', e.target.value)}>
                      <option value="">Select account…</option>
                      {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}{a.rootType ? ` (${a.rootType})` : ''}</option>)}
                    </Select>
                  </div>
                  <div className="w-28">
                    <Select value={row.side} onChange={(e) => setObRow(i, 'side', e.target.value)}>
                      <option value="debit">Debit</option>
                      <option value="credit">Credit</option>
                    </Select>
                  </div>
                  <div className="w-36">
                    <TextInput type="number" placeholder="0.00" value={row.amount} onChange={(e) => setObRow(i, 'amount', e.target.value)} />
                  </div>
                  <Button variant="ghost" size="sm" icon={Trash2} onClick={() => removeObRow(i)} disabled={obRows.length === 1} />
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-3">
              <Button variant="secondary" size="sm" icon={Plus} onClick={addObRow}>Add account</Button>
              <Button size="sm" icon={PlusCircle} onClick={submitOpening} disabled={savingOb}>
                {savingOb ? 'Posting…' : 'Post Opening Balances'}
              </Button>
            </div>
          </div>
        )}

        {/* BANK RECONCILIATION */}
        {!loading && tab === 'Bank Reconciliation' && (
          <div className="mt-5">
            <p className="text-xs text-slate-500 mb-3">Incoming bank transactions not yet matched to a tenant payment.</p>
            <table className="w-full text-sm">
              <thead><tr className="text-left text-slate-500 border-b border-slate-200">
                <th className="py-2">Date</th><th className="py-2">Reference</th><th className="py-2 text-right">Amount</th><th className="py-2"></th>
              </tr></thead>
              <tbody>
                {unrec.map((t) => (
                  <tr key={t.name} className="border-b border-slate-50">
                    <td className="py-2">{t.date || t.transaction_date || '—'}</td>
                    <td className="py-2">{t.reference || t.description || t.name}</td>
                    <td className="py-2 text-right">{ksh(t.amount)}</td>
                    <td className="py-2 text-right"><Badge tone="orange">Unmatched</Badge></td>
                  </tr>
                ))}
                {unrec.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-slate-400">No unreconciled transactions.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* CHART OF ACCOUNTS */}
        {!loading && tab === 'Chart of Accounts' && (
          <div className="mt-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-slate-500">
                View and manage your company's chart of accounts.
              </p>
              {canCreateAccounts(user) && (
                <Button size="sm" icon={Plus} onClick={() => setShowCreateModal(true)}>
                  Create Account
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {['Asset', 'Liability', 'Equity', 'Income', 'Expense'].map(rootType => (
                <div key={rootType} className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className={`
                    px-4 py-2 font-semibold text-sm
                    ${rootType === 'Asset' ? 'bg-emerald-50 text-emerald-700 border-b border-emerald-200' :
                      rootType === 'Liability' ? 'bg-amber-50 text-amber-700 border-b border-amber-200' :
                      rootType === 'Equity' ? 'bg-blue-50 text-blue-700 border-b border-blue-200' :
                      rootType === 'Income' ? 'bg-green-50 text-green-700 border-b border-green-200' :
                      'bg-red-50 text-red-700 border-b border-red-200'}
                  `}>
                    {rootType}
                  </div>
                  <div className="p-2 max-h-80 overflow-y-auto">
                    {(chartOfAccounts[rootType] || []).map(acc => (
                      <AccountNode key={acc.name} account={acc} level={0} />
                    ))}
                    {(!chartOfAccounts[rootType] || chartOfAccounts[rootType].length === 0) && (
                      <p className="text-xs text-slate-400 py-4 text-center">No accounts</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* BANK ACCOUNTS */}
        {!loading && tab === 'Bank Accounts' && (
          <div className="mt-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-slate-500">
                Manage bank accounts and view balances.
              </p>
              {canCreateAccounts(user) && (
                <Button 
                  size="sm" 
                  icon={Plus} 
                  onClick={() => {
                    // Pre-fill for bank account
                    setShowCreateModal(true)
                  }}
                >
                  Add Bank Account
                </Button>
              )}
            </div>

            {bankAccounts.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Building2 className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>No bank accounts configured.</p>
                {canCreateAccounts(user) && (
                  <p className="text-sm mt-1">Click "Add Bank Account" to create one.</p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {bankAccounts.map(acc => (
                  <div key={acc.name} className="p-5 bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-brand-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800">{acc.account_name}</h3>
                        <p className="text-xs text-slate-500">{acc.account_currency}</p>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-slate-900 mb-1">
                      {formatKsh(acc.balance || 0)}
                    </div>
                    <p className="text-xs text-slate-500">Current Balance</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Create Account Modal */}
      {showCreateModal && (
        <CreateAccountModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={(result) => {
            setShowCreateModal(false)
            load()
            // Refresh accounts list for Journal Entry and Opening Balance
            api.listAccounts().then(setAccounts).catch(() => {})
            // Refresh parent accounts list
            api.getParentAccounts().then(setParentAccounts).catch(() => {})
          }}
          parentAccounts={parentAccounts}
          accountTypes={accountTypes}
          rootTypes={rootTypes}
        />
      )}

      {/* Create Journal Entry Modal */}
      {showJournalModal && (
        <CreateJournalEntryModal
          onClose={() => setShowJournalModal(false)}
          onSuccess={(result) => {
            setShowJournalModal(false)
            load()
          }}
          accounts={accounts}
        />
      )}
    </div>
  )
}

function Section({ title, rows = [], total, tone }) {
  const ksh2 = (n) => `KSh ${Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const border = tone === 'brand' ? 'border-emerald-500' : tone === 'orange' ? 'border-amber-500' : 'border-blue-500'
  return (
    <div>
      <div className={`text-sm font-bold text-slate-900 pb-2 border-b-2 ${border} mb-2`}>{title}</div>
      <div className="divide-y divide-slate-100 text-sm">
        {rows.map((r) => (
          <div key={r.account} className="flex justify-between py-1.5">
            <span className="text-slate-600">{r.account_name || r.account}</span>
            <span className="font-mono">{ksh2(r.balance)}</span>
          </div>
        ))}
        {rows.length === 0 && <div className="py-2 text-xs text-slate-400">No balances.</div>}
      </div>
      <div className="flex justify-between pt-2 mt-1 border-t border-slate-200 text-sm font-semibold">
        <span>Total {title}</span><span>{ksh2(total)}</span>
      </div>
    </div>
  )
}
