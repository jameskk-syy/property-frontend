import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Menu, Bell, Search, UserCircle, LogOut, ChevronDown } from 'lucide-react'
import { notifications } from '../../data/mockData'
import { ROLE_LABELS } from '../../data/roles'
import { useAuth } from '../../context/AuthContext'
import Avatar from '../ui/Avatar'
import LogoutConfirmDialog from '../patterns/LogoutConfirmDialog'

export default function Topbar({ onMenuClick }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const menuRef = useRef(null)

  const handleConfirmLogout = async () => {
    setLogoutOpen(false)
    await logout()
    navigate('/login', { replace: true })
  }
  const notificationsPath = `/${user.role}/notifications`
  const profilePath = `/${user.role}/profile`

  useEffect(() => {
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  return (
    <header className="sticky top-0 z-20 h-16 bg-white border-b border-slate-100 flex items-center justify-between gap-3 px-4 lg:px-6">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <button
          onClick={onMenuClick}
          className="lg:hidden w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100"
        >
          <Menu size={20} />
        </button>
        <div className="relative w-full max-w-sm hidden sm:block">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            placeholder="Search properties, tenants, payments…"
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Link
          to={notificationsPath}
          className="relative w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100"
        >
          <Bell size={19} />
          {notifications.length > 0 && (
            <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-semibold flex items-center justify-center">
              {notifications.length}
            </span>
          )}
        </Link>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg hover:bg-slate-100"
          >
            <Avatar name={user.name} size={32} />
            <ChevronDown size={14} className="text-slate-400 hidden sm:block" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl border border-slate-100 shadow-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-50">
                <p className="text-sm font-medium text-slate-800 truncate">{user.name}</p>
                <p className="text-xs text-slate-400 truncate">{ROLE_LABELS[user.role]} · {user.org}</p>
              </div>
              <Link
                to={profilePath}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
              >
                <UserCircle size={16} /> My Profile
              </Link>
              <button
                onClick={() => {
                  setMenuOpen(false)
                  setLogoutOpen(true)
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
              >
                <LogOut size={16} /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>

      <LogoutConfirmDialog
        open={logoutOpen}
        onConfirm={handleConfirmLogout}
        onCancel={() => setLogoutOpen(false)}
      />
    </header>
  )
}
