import {
  LayoutDashboard, Building2, Receipt, BarChart3, Wallet, AlertTriangle,
  UserPlus, Home, Users, Store, UserCog, ShieldCheck, FileText, HardHat,
  Banknote, MessageCircle, Bell, ClipboardList, Settings, KeyRound, UserCircle, Lock, ClipboardCheck, Gauge, Scale,
  MessageSquareWarning, Package,
} from 'lucide-react'
import { ROLES } from './roles'

export const NAV_BY_ROLE = {
  [ROLES.ADMIN]: [
    { label: 'Dashboard', to: '/admin', icon: LayoutDashboard, end: true },

    { label: 'Properties & Units', to: '/admin/properties', icon: Building2, group: 'Leasing', key: 'properties' },
    { label: 'Tenants & Billing', to: '/admin/billing', icon: Receipt, group: 'Leasing', key: 'billing' },
    { label: 'Vacancy Management', to: '/admin/vacancy', icon: Store, group: 'Leasing', key: 'vacancy' },
    { label: 'Property Onboarding', to: '/admin/property-onboarding', icon: Home, group: 'Leasing', key: 'propertyOnboarding' },

    { label: 'Financial Reports', to: '/admin/financial-reports', icon: BarChart3, group: 'Finance', key: 'financialReports' },
    { label: 'Invoices', to: '/admin/invoices', icon: FileText, group: 'Finance', key: 'invoices' },
    { label: 'Accounting', to: '/admin/accounting', icon: Scale, group: 'Finance', key: 'accounting' },
    { label: 'Payment Reconciliation', to: '/admin/payment-reconciliation', icon: Wallet, group: 'Finance', key: 'paymentReconciliation' },
    { label: 'Arrears Tracking', to: '/admin/arrears', icon: AlertTriangle, group: 'Finance', key: 'arrears' },
    { label: 'Salary Management', to: '/admin/salaries', icon: Banknote, group: 'Finance', key: 'salaries' },
    { label: 'Salary Slips', to: '/admin/salary-slips', icon: FileText, group: 'Finance', key: 'salarySlips' },
    { label: 'Payroll Processing', to: '/admin/payroll', icon: Wallet, group: 'Finance', key: 'payroll' },
    // { label: 'Salary Slips', to: '/admin/salary-slips', icon: FileText, group: 'Finance', key: 'salarySlips' },
    { label: 'Expense Management', to: '/admin/expenses', icon: Wallet, group: 'Finance', key: 'expenses' },
    { label: 'Approvals', to: '/admin/approvals', icon: ClipboardCheck, group: 'Finance', key: 'approvals' },

    { label: 'Landlords', to: '/admin/landlords', icon: UserCog, group: 'People', key: 'landlords' },
    { label: 'Caretakers', to: '/admin/caretakers', icon: ShieldCheck, group: 'People', key: 'caretakers' },
    { label: 'Access Management', to: '/admin/access-management', icon: Lock, group: 'People', key: 'accessManagement' },

    { label: 'Documents', to: '/admin/documents', icon: FileText, group: 'Operations', key: 'documents' },
    { label: 'Complaints', to: '/admin/complaints', icon: MessageSquareWarning, group: 'Operations', key: 'complaints' },
    { label: 'Held Items', to: '/admin/held-items', icon: Package, group: 'Operations', key: 'heldItems' },
    { label: 'WhatsApp Communication', to: '/admin/whatsapp', icon: MessageCircle, group: 'Operations', key: 'whatsapp' },

    { label: 'Projects', to: '/admin/construction', icon: HardHat, group: 'Construction', module: 'Operations', key: 'construction', end: true },
    { label: 'Material Purchases', to: '/admin/construction/purchases', icon: ClipboardList, group: 'Construction', module: 'Operations', key: 'construction' },
    { label: 'Suppliers', to: '/admin/construction/suppliers', icon: Store, group: 'Construction', module: 'Operations', key: 'construction' },

    // { label: 'Notifications', to: '/admin/notifications', icon: Bell, group: 'System', key: 'notifications' },
    { label: 'Audit Log', to: '/admin/audit-log', icon: ClipboardList, group: 'System', key: 'auditLog' },
    { label: 'Organization Settings', to: '/admin/settings', icon: Settings, group: 'System', key: 'settings' },
  ],
  [ROLES.LANDLORD]: [
    { label: 'Dashboard', to: '/landlord', icon: LayoutDashboard, end: true },
    { label: 'My Properties', to: '/landlord/properties', icon: Building2, group: 'Portfolio' },
    { label: 'Tenants & Billing', to: '/landlord/billing', icon: Receipt, group: 'Portfolio' },
    { label: 'Financial Reports', to: '/landlord/financial-reports', icon: BarChart3, group: 'Portfolio' },
    { label: 'Documents', to: '/landlord/documents', icon: FileText, group: 'Portfolio' },
    // { label: 'Notifications', to: '/landlord/notifications', icon: Bell, group: 'Account' },
    { label: 'My Profile', to: '/landlord/profile', icon: UserCircle, group: 'Account' },
  ],
  [ROLES.CARETAKER]: [
    { label: 'Dashboard', to: '/caretaker', icon: LayoutDashboard, end: true },
    { label: 'Properties & Units', to: '/caretaker/properties', icon: Building2, group: 'Operations' },
    { label: 'My Tenants', to: '/caretaker/tenants', icon: Users, group: 'Operations' },
    { label: 'Tenant Onboarding', to: '/caretaker/tenant-onboarding', icon: UserPlus, group: 'Operations' },
    { label: 'Expense Management', to: '/caretaker/expenses', icon: Wallet, group: 'Operations' },
    { label: 'Meter Readings', to: '/caretaker/meter-readings', icon: Gauge, group: 'Operations' },
    // { label: 'Maintenance', to: '/caretaker/maintenance', icon: HardHat, group: 'Operations' },
    { label: 'WhatsApp Communication', to: '/caretaker/whatsapp', icon: MessageCircle, group: 'Operations' },
    // { label: 'Notifications', to: '/caretaker/notifications', icon: Bell, group: 'Account' },
    { label: 'My Profile', to: '/caretaker/profile', icon: UserCircle, group: 'Account' },
  ],
  [ROLES.TENANT]: [
    { label: 'Dashboard', to: '/tenant', icon: LayoutDashboard, end: true },
    { label: 'My Lease & Unit', to: '/tenant/lease', icon: Home, group: 'My Rental' },
    { label: 'Payments & Billing', to: '/tenant/payments', icon: Receipt, group: 'My Rental' },
    { label: 'Invoices', to: '/tenant/invoices', icon: FileText, group: 'My Rental' },
    { label: 'Documents', to: '/tenant/documents', icon: FileText, group: 'My Rental' },
    { label: 'Complaints', to: '/tenant/complaints', icon: MessageSquareWarning, group: 'My Rental' },
    { label: 'Contact Caretaker', to: '/tenant/support', icon: MessageCircle, group: 'My Rental' },

    // { label: 'Notifications', to: '/tenant/notifications', icon: Bell, group: 'Account' },
    { label: 'My Profile', to: '/tenant/profile', icon: UserCircle, group: 'Account' },
  ],
}

export const SETTINGS_LINK = { label: 'Reset Password', to: '/reset-password', icon: KeyRound }
