// The set of modules an admin can grant/restrict access to, grouped the
// same way the sidebar is. `key` is what gets stored in a role's
// `permissions` map; `label` is what's shown in the UI.
export const PERMISSION_MODULES = [
  {
    section: 'Leasing',
    modules: [
      { key: 'properties', label: 'Properties & Units' },
      { key: 'billing', label: 'Tenants & Billing' },
      { key: 'vacancy', label: 'Vacancy Management' },
      { key: 'propertyOnboarding', label: 'Property Onboarding' },
    ],
  },
  {
    section: 'Finance',
    modules: [
      { key: 'financialReports', label: 'Financial Reports' },
      { key: 'accounting', label: 'Accounting' },
      { key: 'paymentReconciliation', label: 'Payment Reconciliation' },
      { key: 'arrears', label: 'Arrears Tracking' },
      { key: 'salaries', label: 'Salary Management' },
      { key: 'expenses', label: 'Expense Management' },
      { key: 'approvals', label: 'Approvals' },
    ],
  },
  {
    section: 'People',
    modules: [
      { key: 'landlords', label: 'Landlords' },
      { key: 'caretakers', label: 'Caretakers' },
      { key: 'accessManagement', label: 'Access Management' },
    ],
  },
  {
    section: 'Operations',
    modules: [
      { key: 'documents', label: 'Documents' },
      { key: 'construction', label: 'Construction Projects' },
      { key: 'whatsapp', label: 'WhatsApp Communication' },
    ],
  },
  {
    section: 'System',
    modules: [
      { key: 'notifications', label: 'Notifications' },
      { key: 'auditLog', label: 'Audit Log' },
      { key: 'settings', label: 'Organization Settings' },
    ],
  },
]

export const ALL_MODULE_KEYS = PERMISSION_MODULES.flatMap((s) => s.modules.map((m) => m.key))

export function permissionsFor(keys) {
  const perms = {}
  ALL_MODULE_KEYS.forEach((k) => { perms[k] = keys === 'all' || keys.includes(k) })
  return perms
}

export function countGranted(permissions) {
  return Object.values(permissions).filter(Boolean).length
}
