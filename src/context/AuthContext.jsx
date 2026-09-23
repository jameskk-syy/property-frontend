import React, { createContext, useContext, useEffect, useState } from 'react'
import { ROLES } from '../data/roles'
import { api } from '../api/client'

const AuthContext = createContext(null)
const ALL_SECTIONS = ['Leasing', 'Finance', 'People', 'Operations', 'System']
const KNOWN_ROLES = [ROLES.ADMIN, ROLES.LANDLORD, ROLES.CARETAKER, ROLES.TENANT]

// Map whatever the backend reports (e.g. "Caretaker", "caretaker", a role id)
// to one of the canonical ROLES values used for routing. Defaults to admin.
function normalizeRole(rawRole) {
  if (!rawRole) return ROLES.ADMIN
  const value = String(rawRole).toLowerCase()
  return KNOWN_ROLES.find((r) => value === r || value.includes(r)) || ROLES.ADMIN
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = window.sessionStorage.getItem('nest.user')
      if (!saved) return null
      const parsed = JSON.parse(saved)
      if (parsed && typeof parsed.name === 'object') {
        parsed.name = parsed.name.message || parsed.name.name || 'Administrator'
      }
      if (parsed && parsed.allowed_modules === undefined && parsed.role === ROLES.ADMIN) {
        parsed.allowed_modules = ALL_SECTIONS
      }
      return parsed
    } catch {
      return null
    }
  })

  useEffect(() => {
    if (user) {
      window.sessionStorage.setItem('nest.user', JSON.stringify(user))
    } else {
      window.sessionStorage.removeItem('nest.user')
    }
  }, [user])

  // Re-sync the current user's allowed_modules from the backend. Match ONLY on
  // exact id/email of the already-authenticated user so we never rebind identity
  // (or role) to a different account. Administrator keeps full access.
  useEffect(() => {
    if (!user || !user.id) return
    if (user.role === ROLES.ADMIN) return
    api.getUsers().then((usersList) => {
      const target = String(user.id).toLowerCase()
      const found = usersList.find(
        (u) => (u.id && u.id.toLowerCase() === target) || (u.email && u.email.toLowerCase() === (user.email || '').toLowerCase())
      )
      if (found && Array.isArray(found.allowed_modules)) {
        setUser((prev) => (prev ? { ...prev, allowed_modules: found.allowed_modules } : null))
      }
    }).catch(() => {})
  }, [user?.id])

  const login = async ({ email, password }) => {
    if (!email || !password) {
      throw new Error('Please provide both email and password.')
    }

    // Check if account is suspended in system
    try {
      const usersList = await api.getUsers()
      const found = usersList.find(
        (u) => u.email.toLowerCase() === email.toLowerCase() || u.id.toLowerCase() === email.toLowerCase()
      )
      if (found && found.status === 'Suspended') {
        throw new Error('Your account has been suspended. Please contact your administrator.')
      }
    } catch (err) {
      if (err.message && err.message.includes('suspended')) {
        throw err
      }
    }

    // Real Frappe API login
    try {
      const res = await api.login({ email, password })
      // Frappe returns "Logged In" for desk users and "No App" for portal-only
      // users (Landlord/Tenant have no desk). BOTH mean the session was
      // authenticated successfully — only a genuine auth failure throws (caught
      // below as an HTTP error), so accept any successful response here.
      const msg = res && res.message
      if (msg && !['Logged In', 'No App'].includes(msg)) {
        // Some Frappe versions return the home page path or a dict; still a success
        // if the session resolves. We verify via get_logged_user next.
      }

      // Identity is the SERVER session user, never the typed email. This is the
      // single source of truth: frappe.auth.get_logged_user returns the real id
      // (e.g. "Administrator" or the user's email) that was authenticated.
      const loggedId = await api.getLoggedUser()
      const sessionUser = typeof loggedId === 'string' ? loggedId : String(loggedId || '')
      // Guest / empty => authentication did not actually succeed.
      if (!sessionUser || sessionUser === 'Guest') {
        throw new Error('Invalid email address or password.')
      }

      const isAdministrator = sessionUser === 'Administrator'

      // Resolve the account record for the SESSION user by exact id/email match.
      let account = null
      try {
        const usersList = await api.getUsers()
        const target = sessionUser.toLowerCase()
        account = usersList.find(
          (u) => (u.id && u.id.toLowerCase() === target) || (u.email && u.email.toLowerCase() === target)
        ) || null
      } catch {}

      if (account && account.status === 'Suspended' && !isAdministrator) {
        await api.logout().catch(() => {})
        throw new Error('Your account has been suspended. Please contact your administrator.')
      }

      // Administrator is always admin. Otherwise use the server-reported role;
      // no admin fallback for unknown accounts.
      const resolvedRole = isAdministrator
        ? ROLES.ADMIN
        : (account ? normalizeRole(account.role) : ROLES.CARETAKER)

      const allowedMods = isAdministrator
        ? ALL_SECTIONS
        : (Array.isArray(account?.allowed_modules) ? account.allowed_modules : [])

      const displayEmail = account?.email || (sessionUser.includes('@') ? sessionUser : `${sessionUser}@nest.co.ke`)
      const displayName = account?.name || sessionUser

      const matchedUser = {
        id: account?.id || sessionUser,
        name: displayName,
        email: displayEmail,
        role: resolvedRole,
        allowed_modules: allowedMods,
        avatar: displayName.slice(0, 2).toUpperCase(),
        org: 'Nest Properties',
      }
      setUser(matchedUser)
      return matchedUser
    } catch (err) {
      if (err.message && (err.message.includes('suspended') || err.message.includes('logged-in user'))) {
        throw err
      }
      throw new Error('Invalid email address or password.')
    }
  }

  const setUserPermissions = (allowed_modules) => {
    setUser(prev => prev ? { ...prev, allowed_modules } : null)
  }

  const logout = async () => {
    // Clear local session first so the UI leaves the workspace immediately,
    // then tell the server. Purge storage explicitly so a stale cached identity
    // can never be restored on the next mount.
    setUser(null)
    try {
      window.sessionStorage.removeItem('nest.user')
    } catch {}
    try {
      await api.logout()
    } catch {}
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, setUserPermissions }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
