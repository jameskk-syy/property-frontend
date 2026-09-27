import { useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { LogOut, ChevronDown } from 'lucide-react'
import { NAV_BY_ROLE } from '../../data/navigation'
import { ROLE_LABELS } from '../../data/roles'
import { useAuth } from '../../context/AuthContext'
import Avatar from '../ui/Avatar'
import NestarLogo from '../ui/NestarLogo'
import LogoutConfirmDialog from '../patterns/LogoutConfirmDialog'

function groupItems(items) {
  const ungrouped = items.filter((i) => !i.group)
  const groups = []
  items.forEach((item) => {
    if (!item.group) return
    let g = groups.find((g) => g.name === item.group)
    if (!g) {
      g = { name: item.group, items: [] }
      groups.push(g)
    }
    g.items.push(item)
  })
  return { ungrouped, groups }
}

function NavItem({ label, to, icon: Icon, end, onClose }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClose}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? 'bg-brand-50 text-brand-700'
            : 'text-black hover:bg-slate-100'
        }`
      }
    >
      <Icon size={17} />
      <span className="truncate">{label}</span>
    </NavLink>
  )
}

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [logoutOpen, setLogoutOpen] = useState(false)
  const rawItems = NAV_BY_ROLE[user.role] || []

  const handleConfirmLogout = async () => {
    setLogoutOpen(false)
    await logout()
    navigate('/login', { replace: true })
  }

  // Check user allowed_modules array
  const allowed = Array.isArray(user?.allowed_modules) ? user.allowed_modules : null

  const items = rawItems.filter((item) => {
    if (user.role !== 'admin') return true
    if (allowed !== null) {
      // Gate on the item's `module` (the access section), falling back to its
      // display `group`. This lets a visual group (e.g. "Construction") live
      // under a different access module (e.g. "Operations").
      const gate = item.module || item.group
      if (gate && allowed.includes(gate)) return true
      if (item.key && allowed.includes(item.key)) return true
      return !item.group // Keep ungrouped like Dashboard
    }
    return true
  })

  const { ungrouped, groups } = groupItems(items)

  // Accordion: only one group open at a time.
  const activeGroup = groups.find((g) => g.items.some((i) => location.pathname.startsWith(i.to)))
  const [openGroup, setOpenGroup] = useState(activeGroup?.name ?? groups[0]?.name ?? null)

  const toggleGroup = (name) => {
    setOpenGroup((current) => (current === name ? null : name))
  }

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={onClose} />
      )}
      {/* Original background: bg-ink-900 */}
      <aside
        className={`fixed lg:sticky top-0 z-40 h-screen w-64 bg-white text-slate-700 flex flex-col shrink-0 transition-transform duration-200 ${
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex items-center gap-2 px-5 h-16 border-b border-slate-200 shrink-0">
          <NestarLogo size="default" showTagline={false} />
        </div>

        <div className="px-4 py-2.5 text-[11px] font-medium text-slate-500 uppercase tracking-wide shrink-0 flex items-center justify-between">
          <span>{ROLE_LABELS[user.role]} workspace</span>
          {user.role === 'admin' && allowed !== null && (
            <span className="text-[10px] bg-brand-500/20 text-brand-400 px-1.5 py-0.5 rounded font-mono">
              {allowed.length} Modules
            </span>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-0.5">
          {ungrouped.map(({ key: _k, ...item }) => (
            <NavItem key={item.to} {...item} onClose={onClose} />
          ))}

          {groups.map((g) => {
            const isOpen = openGroup === g.name
            const hasActiveItem = g.items.some((i) => location.pathname.startsWith(i.to))
            return (
              <div key={g.name} className="pt-2">
                <button
                  onClick={() => toggleGroup(g.name)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[11px] font-semibold uppercase tracking-wide transition-colors ${
                    hasActiveItem ? 'text-brand-400' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {g.name}
                  <ChevronDown
                    size={14}
                    className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                <div
                  className={`grid transition-all duration-200 ease-in-out ${
                    isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="space-y-0.5 pb-1">
                      {g.items.map(({ key: _k, ...item }) => (
                        <NavItem key={item.to} {...item} onClose={onClose} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </nav>

        <div className="border-t border-slate-200 p-3 shrink-0">
          <div className="flex items-center gap-2.5 px-2 py-2">
            <Avatar name={user.name} size={34} />
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{user.name}</p>
              <p className="text-xs text-slate-500 truncate">{user.email || user.org}</p>
            </div>
          </div>
          <button
            onClick={() => setLogoutOpen(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2 mt-1 rounded-lg text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            <LogOut size={16} />
            Switch user
          </button>
        </div>
      </aside>

      <LogoutConfirmDialog
        open={logoutOpen}
        onConfirm={handleConfirmLogout}
        onCancel={() => setLogoutOpen(false)}
      />
    </>
  )
}
