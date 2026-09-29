import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { ROLES } from '../data/roles'
import { api } from '../api/client'
import { secureStorage } from '../utils/crypto'

const AuthContext = createContext(null)
const ALL_SECTIONS = ['Leasing', 'Finance', 'People', 'Operations', 'System']
const KNOWN_ROLES = [ROLES.ADMIN, ROLES.LANDLORD, ROLES.CARETAKER, ROLES.TENANT]

// Storage keys
const STORAGE_KEYS = {
  USER: 'nest.user.encrypted',
  USER_LEGACY: 'nest.user' // For migration
}

// Map backend role to frontend role constant
function normalizeRole(rawRole) {
  if (!rawRole) return ROLES.ADMIN
  const value = String(rawRole).toLowerCase()
  return KNOWN_ROLES.find((r) => value === r || value.includes(r)) || ROLES.ADMIN
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Load user from encrypted storage on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        // Try encrypted storage first
        let savedUser = await secureStorage.getItem(STORAGE_KEYS.USER)
        
        // Migration: check legacy storage
        if (!savedUser) {
          const legacy = sessionStorage.getItem(STORAGE_KEYS.USER_LEGACY)
          if (legacy) {
            try {
              savedUser = JSON.parse(legacy)
              // Migrate to encrypted storage
              await secureStorage.setItem(STORAGE_KEYS.USER, savedUser)
              sessionStorage.removeItem(STORAGE_KEYS.USER_LEGACY)
            } catch {}
          }
        }

        if (savedUser && api.hasToken()) {
          // Verify token is still valid
          const tokenUser = await api.verifyToken()
          if (tokenUser) {
            setUser(savedUser)
          } else {
            // Token invalid, clear everything
            api.clearTokens()
            await secureStorage.removeItem(STORAGE_KEYS.USER)
          }
        } else if (savedUser) {
          // No token but have user - clear user
          await secureStorage.removeItem(STORAGE_KEYS.USER)
        }
      } catch (error) {
        console.error('Failed to load user:', error)
      } finally {
        setLoading(false)
      }
    }

    loadUser()

    // Set up auth error handler
    api.setAuthErrorHandler((message) => {
      console.warn('[Auth] Session error:', message)
      setUser(null)
      secureStorage.removeItem(STORAGE_KEYS.USER)
    })
  }, [])

  // Save user to encrypted storage when it changes
  useEffect(() => {
    if (user) {
      secureStorage.setItem(STORAGE_KEYS.USER, user)
    }
  }, [user])

  // Re-sync allowed_modules from backend periodically (every 60 seconds)
  // This ensures role permission changes are picked up without requiring logout
  useEffect(() => {
    if (!user || !user.id) return

    const syncPermissions = async () => {
      try {
        const usersList = await api.getUsers()
        const target = String(user.id).toLowerCase()
        const found = usersList.find(
          (u) => (u.id && u.id.toLowerCase() === target) || 
                 (u.email && u.email.toLowerCase() === (user.email || '').toLowerCase())
        )
        if (found && Array.isArray(found.allowed_modules)) {
          setUser((prev) => {
            if (!prev) return null
            // Only update if permissions changed
            const currentModules = JSON.stringify(prev.allowed_modules || [])
            const newModules = JSON.stringify(found.allowed_modules)
            if (currentModules !== newModules) {
              console.log('[Auth] Permissions updated from backend')
              return { ...prev, allowed_modules: found.allowed_modules }
            }
            return prev
          })
        }
      } catch (err) {
        // Silent fail - permissions will sync on next attempt
      }
    }

    // Sync immediately on mount
    syncPermissions()

    // Then sync every 60 seconds
    const interval = setInterval(syncPermissions, 60000)

    return () => clearInterval(interval)
  }, [user?.id])

  /**
   * Login with JWT tokens
   */
  const login = useCallback(async ({ email, password }) => {
    if (!email || !password) {
      throw new Error('Please provide both email and password.')
    }

    try {
      // Call JWT login API
      const result = await api.login({ email, password })

      if (result.status !== 'success' || !result.user) {
        throw new Error(result.message || 'Login failed')
      }

      const { user: authUser } = result

      // Check if user is suspended
      try {
        const usersList = await api.getUsers()
        const found = usersList.find(
          (u) => u.email?.toLowerCase() === authUser.email?.toLowerCase() ||
                 u.id?.toLowerCase() === authUser.id?.toLowerCase()
        )
        if (found && found.status === 'Suspended') {
          await api.logout()
          throw new Error('Your account has been suspended. Please contact your administrator.')
        }
      } catch (err) {
        if (err.message?.includes('suspended')) throw err
      }

      // Normalize role
      const normalizedRole = normalizeRole(authUser.role)
      const isAdmin = normalizedRole === ROLES.ADMIN

      // Get allowed modules
      let allowedModules = ALL_SECTIONS
      if (!isAdmin) {
        try {
          const usersList = await api.getUsers()
          const found = usersList.find(
            (u) => u.email?.toLowerCase() === authUser.email?.toLowerCase()
          )
          if (found?.allowed_modules) {
            allowedModules = found.allowed_modules
          }
        } catch {}
      }

      // Build user object
      const matchedUser = {
        id: authUser.id,
        name: authUser.name,
        email: authUser.email,
        role: normalizedRole,
        allowed_modules: allowedModules,
        avatar: (authUser.name || authUser.email || 'U').slice(0, 2).toUpperCase(),
        org: 'Nest Properties',
      }

      setUser(matchedUser)
      return matchedUser

    } catch (err) {
      // Clear any partial state
      api.clearTokens()
      
      if (err.message?.includes('suspended')) throw err
      if (err.message?.includes('Invalid') || err.message?.includes('failed')) {
        throw new Error('Invalid email address or password.')
      }
      throw err
    }
  }, [])

  /**
   * Login with token (for OTP authentication)
   * Token and user info already obtained from OTP verification
   */
  const loginWithToken = useCallback(async (token, authUser) => {
    if (!token || !authUser) {
      throw new Error('Token and user info required')
    }

    try {
      // Store the token
      const [apiKey, apiSecret] = token.split(':')
      api.setTokens(token, apiKey, apiSecret)

      // Normalize role
      const normalizedRole = normalizeRole(authUser.role)
      const isAdmin = normalizedRole === ROLES.ADMIN

      // Get allowed modules
      let allowedModules = ALL_SECTIONS
      if (!isAdmin) {
        try {
          const usersList = await api.getUsers()
          const found = usersList.find(
            (u) => u.email?.toLowerCase() === (authUser.email || '').toLowerCase() ||
                   u.id?.toLowerCase() === (authUser.id || '').toLowerCase()
          )
          if (found?.allowed_modules) {
            allowedModules = found.allowed_modules
          }
        } catch {}
      }

      // Build user object
      const matchedUser = {
        id: authUser.id,
        name: authUser.name,
        email: authUser.email || authUser.id,
        phone: authUser.phone,
        role: normalizedRole,
        allowed_modules: allowedModules,
        avatar: (authUser.name || authUser.email || 'U').slice(0, 2).toUpperCase(),
        org: 'Nest Properties',
      }

      setUser(matchedUser)
      return matchedUser

    } catch (err) {
      api.clearTokens()
      throw err
    }
  }, [])

  /**
   * Update user permissions
   */
  const setUserPermissions = useCallback((allowed_modules) => {
    setUser(prev => prev ? { ...prev, allowed_modules } : null)
  }, [])

  /**
   * Logout and clear all tokens
   */
  const logout = useCallback(async () => {
    // Clear state immediately
    setUser(null)
    
    // Clear storage
    try {
      await secureStorage.removeItem(STORAGE_KEYS.USER)
      sessionStorage.removeItem(STORAGE_KEYS.USER_LEGACY)
    } catch {}

    // Call backend logout
    try {
      await api.logout()
    } catch {}
  }, [])

  /**
   * Check if user is authenticated
   */
  const isAuthenticated = useCallback(() => {
    return !!user && api.hasToken()
  }, [user])

  /**
   * Get current token (for components that need it)
   */
  const getToken = useCallback(() => {
    return api.getToken()
  }, [])

  // Show loading while checking auth state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-slate-500">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      login,
      loginWithToken,
      logout, 
      setUserPermissions,
      isAuthenticated,
      getToken
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
