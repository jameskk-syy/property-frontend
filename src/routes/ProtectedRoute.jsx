import { Navigate, useLocation, Link } from 'react-router-dom'
import { ShieldAlert, ArrowLeft } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { NAV_BY_ROLE } from '../data/navigation'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'

export default function ProtectedRoute({ roles, children }) {
  const { user } = useAuth()
  const location = useLocation()

  if (!user) return <Navigate to="/login" replace />

  // 1. Role level check
  if (roles && !roles.includes(user.role)) {
    return <Navigate to={`/${user.role}`} replace />
  }

  // 2. Module level check for Admin workspace
  if (user.role === 'admin' && location.pathname !== '/admin' && location.pathname !== '/admin/') {
    const rawItems = NAV_BY_ROLE['admin'] || []
    const navItem = rawItems.find(
      (i) => i.to === location.pathname || (i.to !== '/admin' && location.pathname.startsWith(i.to))
    )

    if (navItem && (navItem.group || navItem.key)) {
      const allowed = Array.isArray(user.allowed_modules) ? user.allowed_modules : null

      if (allowed !== null) {
        let isAllowed = false
        // Gate on the item's access `module` (falling back to its display
        // `group`), matching the sidebar filter — so a visual group like
        // "Construction" can be authorized under the "Operations" module.
        const gate = navItem.module || navItem.group
        if (gate && allowed.includes(gate)) isAllowed = true
        if (navItem.key && allowed.includes(navItem.key)) isAllowed = true

        if (!isAllowed) {
          return (
            <div className="min-h-[70vh] flex items-center justify-center p-6">
              <Card className="max-w-md w-full text-center p-8 border border-red-100 bg-gradient-to-b from-red-50/30 to-white shadow-lg">
                <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4 ring-8 ring-red-50">
                  <ShieldAlert size={30} />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">Access Restricted</h2>
                <p className="text-sm text-slate-600 mb-6">
                  You do not have permission to access the <span className="font-semibold text-slate-800">&quot;{navItem.label}&quot;</span> module under your current account permissions.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <Link to="/admin">
                    <Button icon={ArrowLeft}>Return to Dashboard</Button>
                  </Link>
                </div>
              </Card>
            </div>
          )
        }
      }
    }
  }

  return children
}
