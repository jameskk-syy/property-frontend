const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) || '/api'

// Token storage keys
const TOKEN_KEYS = {
  TOKEN: 'nest.token',
  API_KEY: 'nest.api_key',
  API_SECRET: 'nest.api_secret'
}

class ApiClient {
  constructor() {
    this.baseUrl = API_BASE
    this._onAuthError = null // Callback for auth errors (set by AuthContext)
  }

  /**
   * Set callback for authentication errors (logout user)
   */
  setAuthErrorHandler(handler) {
    this._onAuthError = handler
  }

  /**
   * Get stored token (api_key:api_secret)
   */
  getToken() {
    return sessionStorage.getItem(TOKEN_KEYS.TOKEN)
  }

  /**
   * Get stored API key
   */
  getApiKey() {
    return sessionStorage.getItem(TOKEN_KEYS.API_KEY)
  }

  /**
   * Store tokens
   */
  setTokens(token, apiKey, apiSecret) {
    if (token) sessionStorage.setItem(TOKEN_KEYS.TOKEN, token)
    if (apiKey) sessionStorage.setItem(TOKEN_KEYS.API_KEY, apiKey)
    if (apiSecret) sessionStorage.setItem(TOKEN_KEYS.API_SECRET, apiSecret)
  }

  /**
   * Clear all tokens
   */
  clearTokens() {
    sessionStorage.removeItem(TOKEN_KEYS.TOKEN)
    sessionStorage.removeItem(TOKEN_KEYS.API_KEY)
    sessionStorage.removeItem(TOKEN_KEYS.API_SECRET)
  }

  /**
   * Check if we have a token
   */
  hasToken() {
    return !!this.getToken()
  }

  /**
   * Make an authenticated request
   */
  async request(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`
    
    // Build headers
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(options.headers || {}),
    }

    // Add Authorization header if we have a token (except for login endpoint)
    const isLoginEndpoint = endpoint.includes('auth.login')
    const token = this.getToken()
    
    if (token && !isLoginEndpoint) {
      headers['Authorization'] = `token ${token}`
    }

    try {
      const res = await fetch(url, {
        ...options,
        headers,
        credentials: 'include'
      })

      // Handle 401/403 - authentication error
      if ((res.status === 401 || res.status === 403) && !isLoginEndpoint) {
        console.warn('[API] Authentication error, clearing tokens')
        this.clearTokens()
        if (this._onAuthError) {
          this._onAuthError('Session expired. Please login again.')
        }
        throw new Error('Session expired. Please login again.')
      }

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        throw new Error(this._friendlyError(errBody, res.status))
      }
      
      return await res.json()
    } catch (err) {
      console.warn(`[API] ${endpoint} failed:`, err.message)
      throw err
    }
  }

  /**
   * Turn a Frappe error body into a clean, user-facing sentence.
   * Frappe returns `_server_messages` as a JSON string of JSON strings, each
   * like {message, title, indicator, raise_exception}. We surface the most
   * relevant human message (the actual error, preferring red/raise_exception),
   * strip any HTML, and never leak tracebacks or raw JSON.
   */
  _friendlyError(errBody = {}, status = 0) {
    const clean = (s) =>
      String(s || '')
        .replace(/<[^>]*>/g, ' ') // strip HTML tags
        .replace(/\s+/g, ' ')
        .trim()

    // 1. _server_messages holds the most specific validation messages.
    if (errBody._server_messages) {
      try {
        const list = JSON.parse(errBody._server_messages)
        const parsed = list
          .map((item) => {
            try {
              return typeof item === 'string' ? JSON.parse(item) : item
            } catch {
              return { message: item }
            }
          })
          .filter(Boolean)

        if (parsed.length) {
          // Prefer the actual error (raised exception / red), else the last one.
          const primary =
            parsed.find((p) => p.raise_exception || p.indicator === 'red') ||
            parsed[parsed.length - 1]
          const msg = clean(primary.message || primary.title)
          if (msg) return msg
        }
      } catch {
        /* fall through */
      }
    }

    // 2. Plain message field (skip developer-y exception strings).
    if (errBody.message && typeof errBody.message === 'string') {
      const m = clean(errBody.message)
      if (m && !m.includes('Traceback') && !m.startsWith('{')) return m
    }

    // 3. Fall back to a generic, friendly message by status.
    if (status === 403) return 'You do not have permission to perform this action.'
    if (status === 404) return 'The requested item could not be found.'
    if (status >= 500) return 'Something went wrong on the server. Please try again.'
    return 'The request could not be completed. Please try again.'
  }

  // --- AUTH ---
  /**
   * Login with Frappe token authentication
   * @param {object|string} usr - Username/email or object with usr/pwd
   * @param {string} pwd - Password (if usr is string)
   * @returns {object} - { token, api_key, api_secret, user, ... }
   */
  async login(usr, pwd) {
    let email = usr
    let password = pwd
    if (typeof usr === 'object' && usr !== null) {
      email = usr.usr || usr.email || usr.username
      password = usr.pwd || usr.password
    }

    // Call token login endpoint
    const res = await this.request('/method/property_management.api.auth.login', {
      method: 'POST',
      body: JSON.stringify({ 
        email: String(email || ''), 
        password: String(password || '') 
      }),
    })

    const result = res.message || res

    if (result.status === 'success' && result.token) {
      // Store tokens
      this.setTokens(result.token, result.api_key, result.api_secret)
      return result
    } else {
      throw new Error(result.message || 'Login failed')
    }
  }

  /**
   * Logout and clear tokens
   */
  async logout() {
    try {
      const token = this.getToken()
      if (token) {
        await this.request('/method/property_management.api.auth.logout', { 
          method: 'POST' 
        }).catch(() => {})
      }
    } finally {
      this.clearTokens()
    }
  }

  // --- OTP AUTHENTICATION ---
  /**
   * Request OTP for a phone number
   * @param {string} phone - Phone number with country code (e.g., +254712345678)
   * @returns {object} - { status, phone_masked, dev_otp?, dev_mode? }
   */
  async requestOTP(phone) {
    const res = await this.request('/method/property_management.api.auth.request_otp', {
      method: 'POST',
      body: JSON.stringify({ phone: String(phone || '') }),
    })
    return res.message || res
  }

  /**
   * Verify OTP code
   * @param {string} phone - Phone number used for OTP request
   * @param {string} otp - 6-digit OTP code
   * @returns {object} - { status, token?, user?, message? }
   */
  async verifyOTP(phone, otp) {
    const res = await this.request('/method/property_management.api.auth.verify_otp', {
      method: 'POST',
      body: JSON.stringify({ phone: String(phone || ''), otp: String(otp || '') }),
    })
    const result = res.message || res
    
    // If OTP verified and token received, store it
    if (result.status === 'success' && result.token) {
      this.setTokens(result.token, result.api_key, result.api_secret)
    }
    return result
  }

  /**
   * Resend OTP to phone number
   * @param {string} phone - Phone number to resend OTP to
   * @returns {object} - { status, dev_otp?, dev_mode? }
   */
  async resendOTP(phone) {
    const res = await this.request('/method/property_management.api.auth.resend_otp', {
      method: 'POST',
      body: JSON.stringify({ phone: String(phone || '') }),
    })
    return res.message || res
  }

  /**
   * Verify current token and get user info
   */
  async verifyToken() {
    const token = this.getToken()
    if (!token) return null

    try {
      const res = await this.request('/method/property_management.api.auth.verify', {
        method: 'POST',
        body: JSON.stringify({ token })
      })
      const result = res.message || res
      return result.valid ? result.user : null
    } catch {
      return null
    }
  }

  async getCurrentUser() {
    // First try token verification
    const tokenUser = await this.verifyToken()
    if (tokenUser) return tokenUser.id || tokenUser.email

    // Fallback to Frappe session
    const res = await this.request('/method/frappe.auth.get_logged_user')
    return res && res.message ? res.message : res
  }

  async getLoggedUser() {
    return await this.getCurrentUser()
  }

  // --- PROPERTIES ---
  async getProperties() {
    try {
      const res = await this.request('/method/property_management.api.reports.get_properties_summary')
      if (res && res.message) {
        return res.message.map(p => ({
          id: p.name,
          name: p.property_name || p.name,
          code: p.property_code,
          location: p.address || 'Nairobi, Kenya',
          units: p.total_units || 0,
          occupied: p.occupied_units || 0,
          vacant: p.vacant_units || 0,
          landlord: p.landlord || 'Unassigned',
          caretaker: p.caretaker || 'Unassigned',
          type: p.property_type || 'Residential',
          status: p.status || 'Active'
        }))
      }
    } catch {}

    try {
      const res = await this.request('/resource/Property?fields=["name","property_code","property_name","property_type","address","landlord","caretaker","status"]&limit_page_length=0')
      if (res && res.data) {
        return res.data.map(p => ({
          id: p.name,
          name: p.property_name || p.name,
          code: p.property_code,
          location: p.address || 'Nairobi, Kenya',
          units: 0,
          occupied: 0,
          vacant: 0,
          landlord: p.landlord || 'Unassigned',
          caretaker: p.caretaker || 'Unassigned',
          type: p.property_type || 'Residential',
          status: p.status || 'Active'
        }))
      }
    } catch (err) {
      console.warn('Property list error:', err.message)
    }
    return []
  }

  /** Properties assigned to the logged-in caretaker (admins get all). */
  async getMyProperties() {
    const data = await this.pmApi('directory.my_properties')
    return Array.isArray(data)
      ? data.map((p) => ({
          id: p.name,
          name: p.property_name || p.name,
          code: p.property_code,
          location: p.address || '',
          units: p.total_units || 0,
          occupied: p.occupied_units || 0,
          vacant: p.vacant_units || 0,
          landlord: p.landlord || 'Unassigned',
          caretaker: p.caretaker || 'Unassigned',
          type: p.property_type || 'Residential',
          status: p.status || 'Active',
        }))
      : []
  }

  /** Arrears for tenants on the logged-in caretaker's properties (admins get all). */
  async getMyArrears() {
    const data = await this.pmApi('directory.my_arrears')
    return Array.isArray(data)
      ? data.map((a) => ({
          id: a.id,
          tenant: a.tenant,
          property: a.property,
          unit: a.unit,
          amount: a.amount || 0,
          daysOverdue: a.daysOverdue || 0,
          lastReminder: a.lastReminder || null,
        }))
      : []
  }

  async getProperty(id) {
    // Server-side detail endpoint: real fields, computed unit counts, images.
    const p = await this.pmApi(`directory.get_property?property=${encodeURIComponent(id)}`)
    if (!p) return null
    const images = Array.isArray(p.images)
      ? p.images.map((img) => (typeof img === 'string' ? img : img.url)).filter(Boolean)
      : []
    return {
      id: p.name,
      name: p.property_name || p.name,
      code: p.property_code,
      location: p.location || '',
      county: p.county || '',
      subCounty: p.sub_county || '',
      yearBuilt: p.year_built || '',
      floors: p.floors || '',
      description: p.description || '',
      amenities: p.amenities || '',
      units: p.total_units || 0,
      occupied: p.occupied_units || 0,
      vacant: p.vacant_units || 0,
      landlord: p.landlord_name || p.landlord || 'Unassigned',
      caretaker: p.caretaker_name || p.caretaker || 'Unassigned',
      type: p.property_type || 'Residential',
      status: p.status || 'Active',
      coverImage: p.cover_image || (images[0] || null),
      images,
    }
  }

  async createProperty(payload) {
    // Images arrive from the gallery as { name, url } objects (or data URLs);
    // send just the URL/data-URL strings. The backend endpoint saves them into
    // the Property Image child table and auto-resolves organization.
    const images = Array.isArray(payload.images)
      ? payload.images.map((img) => (typeof img === 'string' ? img : img.url)).filter(Boolean)
      : []

    // Units are created in the SAME call so organization is applied server-side
    // (Property Unit requires organization, which the frontend doesn't know).
    const units = Array.isArray(payload.units)
      ? payload.units.map((u) => ({
          unit_number: u.unit_number || u.number || u.name,
          floor: u.floor || 'Ground Floor',
          unit_type: u.unit_type || u.type || '1 Bedroom',
          base_rent: Number(u.base_rent || u.rent || 0),
          security_deposit: Number(u.security_deposit || u.deposit || 0),
          status: u.status || 'Vacant',
        }))
      : []

    return await this.pmApi('directory.create_property', {
      property_id: payload.property_id || payload.property_code || null,
      property_name: payload.property_name || payload.name,
      property_type: payload.property_type || payload.type || 'Residential',
      location: payload.location || payload.address || null,
      county: payload.county || null,
      sub_county: payload.sub_county || payload.subCounty || null,
      year_built: payload.year_built || payload.yearBuilt || null,
      total_units: payload.total_units || units.length || null,
      floors: payload.floors || payload.number_of_floors || null,
      description: payload.description || null,
      amenities: payload.amenities || null,
      images: images,
      units: units,
      landlord: payload.landlord || null,
      caretaker: payload.caretaker || null,
    })
  }

  /**
   * Bulk-create properties from an imported list via the backend endpoint,
   * which auto-resolves organization and reports created/failed.
   */
  async bulkCreateProperties(list = []) {
    const normalized = (list || []).map((p) => ({
      property_id: p.property_id || p.property_code || null,
      property_name: p.property_name || p.name,
      property_type: p.property_type || p.type || 'Apartment',
      location: p.location || p.address || null,
      county: p.county || null,
      sub_county: p.sub_county || p.subCounty || null,
      year_built: p.year_built || p.yearBuilt || null,
      total_units: p.total_units || null,
      floors: p.floors || null,
      description: p.description || null,
      amenities: p.amenities || null,
      landlord: p.landlord || null,
    }))
    const res = await this.pmApi('directory.bulk_create_properties', { properties: normalized })
    return res || { created: [], failed: [], total: normalized.length }
  }

  // --- UNITS (API v2, server-side; avoids /resource 403) ---
  async getUnits(propertyId, { page = 1, pageSize = 8, search = '' } = {}) {
    const qs = new URLSearchParams()
    if (propertyId) qs.append('property', propertyId)
    qs.append('page', String(page))
    qs.append('page_size', String(pageSize))
    if (search) qs.append('search', search)
    
    const result = await this.pmApi(`directory.list_units?${qs.toString()}`)
    
    // Handle new paginated response format
    if (result && result.data && result.pagination) {
      const data = result.data.map((u) => ({
        id: u.name,
        number: u.unit_number || u.name,
        type: u.unit_type || '1 Bedroom',
        rent: u.base_rent || 0,
        deposit: u.security_deposit || 0,
        floor: u.floor || 'Ground',
        status: u.status || 'Vacant',
        tenant: u.status === 'Occupied' ? 'Active Tenant' : '—',
        property: u.property,
      }))
      return {
        data,
        pagination: {
          page: result.pagination.page,
          pageSize: result.pagination.page_size,
          total: result.pagination.total,
          totalPages: result.pagination.total_pages,
          hasNext: result.pagination.has_next,
          hasPrev: result.pagination.has_prev,
        }
      }
    }
    
    // Backward compatibility with old array response
    if (Array.isArray(result)) {
      return {
        data: result.map((u) => ({
          id: u.name,
          number: u.unit_number || u.name,
          type: u.unit_type || '1 Bedroom',
          rent: u.base_rent || 0,
          deposit: u.security_deposit || 0,
          floor: u.floor || 'Ground',
          status: u.status || 'Vacant',
          tenant: u.status === 'Occupied' ? 'Active Tenant' : '—',
          property: u.property,
        })),
        pagination: null
      }
    }
    
    return { data: [], pagination: null }
  }

  async createUnit(payload) {
    return await this.pmApi('directory.create_unit', {
      property: payload.property,
      unit_number: payload.unit_number || payload.number || payload.name,
      unit_type: payload.unit_type || payload.type || '1 Bedroom',
      floor: payload.floor || 'Ground Floor',
      base_rent: Number(payload.base_rent || payload.rent || 0),
      security_deposit: Number(payload.security_deposit || payload.deposit || 0),
      status: payload.status || 'Vacant',
    })
  }

  /**
   * Bulk-create units under a property via the backend endpoint, which inherits
   * organization from the property and keeps its total_units in sync.
   */
  async bulkCreateUnits(propertyName, unitsList) {
    const units = (unitsList || []).map((u) => ({
      unit_number: u.unit_number || u.number || u.name,
      unit_type: u.unit_type || u.type || '1 Bedroom',
      floor: u.floor || 'Ground Floor',
      base_rent: Number(u.base_rent || u.rent || 0),
      security_deposit: Number(u.security_deposit || u.deposit || 0),
      status: u.status || 'Vacant',
    }))
    const res = await this.pmApi('directory.bulk_create_units', { property: propertyName, units })
    return res || { created: [], failed: [], total: units.length }
  }

  // --- TENANTS ---
  async getTenants({ page = 1, pageSize = 8, search = '', property = null } = {}) {
    const result = await this.pmApi('directory.list_tenants', { page, page_size: pageSize, search, property })
    
    // Handle new paginated response format
    if (result && result.data && result.pagination) {
      const data = result.data.map((t) => ({
        id: t.id,
        name: t.name,
        unit: t.unit || 'Unassigned',
        phone: t.phone || '—',
        email: t.email || '',
        national_id: t.national_id || '',
        rent: Number(t.rent) || 0,
        balance: Number(t.balance) || 0,
        status: t.status || 'Active',
      }))
      return {
        data,
        pagination: {
          page: result.pagination.page,
          pageSize: result.pagination.page_size,
          total: result.pagination.total,
          totalPages: result.pagination.total_pages,
          hasNext: result.pagination.has_next,
          hasPrev: result.pagination.has_prev,
        }
      }
    }
    
    // Backward compatibility with old array response
    if (Array.isArray(result)) {
      return {
        data: result.map((t) => ({
          id: t.id,
          name: t.name,
          unit: t.unit || 'Unassigned',
          phone: t.phone || '—',
          email: t.email || '',
          national_id: t.national_id || '',
          rent: Number(t.rent) || 0,
          balance: Number(t.balance) || 0,
          status: t.status || 'Active',
        })),
        pagination: null
      }
    }
    
    return { data: [], pagination: null }
  }

  async getTenant(id) {
    try {
      const res = await this.request(`/resource/Property Tenant/${id}`)
      if (res && res.data) {
        const t = res.data
        return {
          id: t.name,
          name: t.tenant_name || t.name,
          unit: 'Assigned',
          phone: t.phone || '—',
          email: t.email,
          national_id: t.national_id,
          rent: 0,
          balance: 0,
          status: t.status || 'Active'
        }
      }
    } catch {}
    return null
  }

  async createTenant(payload) {
    return await this.pmApi('directory.create_tenant', {
      tenant_name: payload.tenant_name || payload.name,
      phone: payload.phone || payload.phone_number,
      national_id: payload.national_id || payload.idNumber,
      email: payload.email,
      income_range: payload.income_range || payload.incomeRange || null,
      status: 'Active',
    })
  }

  /**
   * Onboard a tenant and (when property+unit given) create a signed Lease
   * Agreement in one call. Used by the tenant onboarding + lease signature flow.
   */
  async onboardTenant(payload) {
    return await this.pmApi('directory.onboard_tenant', {
      tenant_name: payload.tenant_name || payload.name,
      phone: payload.phone || payload.phone_number,
      email: payload.email,
      national_id: payload.national_id || payload.idNumber,
      income_range: payload.income_range || payload.incomeRange || null,
      property: payload.property || null,
      unit: payload.unit || null,
      rent: payload.rent || null,
      deposit: payload.deposit || null,
      lease_start: payload.lease_start || payload.leaseStart || null,
      lease_end: payload.lease_end || payload.leaseEnd || null,
      tenant_signature: payload.tenant_signature || null,
      caretaker_signature: payload.caretaker_signature || null,
      signed_at: payload.lease_signed_at || payload.signed_at || null,
      national_id_front: payload.national_id_front || null,
      national_id_back: payload.national_id_back || null,
    })
  }

  /**
   * Bulk-import tenants (no unit/lease yet). rows: [{ name/tenant_name, phone,
   * email, national_id, income_range }]. Returns { created, updated, failed, total }.
   */
  async bulkCreateTenants(rows = []) {
    const tenants = (rows || []).map((r) => ({
      tenant_name: r.tenant_name || r.name || '',
      phone_number: r.phone_number || r.phone || '',
      email_address: r.email_address || r.email || '',
      national_id: r.national_id || r.idNumber || '',
      income_range: r.income_range || r.incomeRange || null,
      property: r.property || '',
      unit: r.unit || '',
      rent: r.rent || 0,
      deposit: r.deposit || 0,
      already_paid: r.already_paid || false,
    }))
    return await this.pmApi('directory.bulk_create_tenants', { tenants })
  }

  /** Full tenant detail for the caretaker edit surface (images as base64). */
  async getTenantDetail(tenant) {
    return await this.pmApi(`directory.get_tenant_detail?tenant=${encodeURIComponent(tenant)}`)
  }

  /** Update an existing tenant's details + ID images + extra documents (base64). */
  async updateTenant(tenant, payload = {}) {
    return await this.pmApi('directory.update_tenant', {
      tenant,
      tenant_name: payload.tenant_name ?? payload.name ?? undefined,
      phone: payload.phone ?? undefined,
      email: payload.email ?? undefined,
      national_id: payload.national_id ?? undefined,
      income_range: payload.income_range ?? undefined,
      emergency_contact: payload.emergency_contact ?? undefined,
      status: payload.status ?? undefined,
      national_id_front: payload.national_id_front ?? payload.idFront ?? null,
      national_id_back: payload.national_id_back ?? payload.idBack ?? null,
      documents: payload.documents || [],
    })
  }

  /**
   * Assign a unit to an existing tenant and sign the lease. Pass `lease` to
   * re-sign an existing lease. Returns { lease_agreement, unit, unit_status }.
   */
  async signLease(payload = {}) {
    return await this.pmApi('directory.sign_lease', {
      tenant: payload.tenant || null,
      unit: payload.unit || null,
      property: payload.property || null,
      rent: payload.rent ?? null,
      deposit: payload.deposit ?? null,
      lease_start: payload.lease_start || payload.leaseStart || null,
      lease_end: payload.lease_end || payload.leaseEnd || null,
      tenant_signature: payload.tenant_signature || null,
      caretaker_signature: payload.caretaker_signature || null,
      signed_at: payload.lease_signed_at || payload.signed_at || null,
      lease: payload.lease || null,
    })
  }

  // --- LANDLORDS & CARETAKERS ---
  async getLandlords({ page = 1, pageSize = 8, search = '' } = {}) {
    const result = await this.pmApi('directory.list_landlords', { page, page_size: pageSize, search })
    
    // Handle new paginated response format
    if (result && result.data && result.pagination) {
      const data = result.data.map((l) => ({
        id: l.id,
        name: l.name,
        phone: l.phone || '—',
        email: l.email || '',
        properties: l.properties || 0,
        units: l.units || 0,
        payoutMethod: l.payout_method || 'Bank',
        status: l.status || 'Active',
      }))
      return {
        data,
        pagination: {
          page: result.pagination.page,
          pageSize: result.pagination.page_size,
          total: result.pagination.total,
          totalPages: result.pagination.total_pages,
          hasNext: result.pagination.has_next,
          hasPrev: result.pagination.has_prev,
        }
      }
    }
    
    // Backward compatibility with old array response
    if (Array.isArray(result)) {
      return {
        data: result.map((l) => ({
          id: l.id,
          name: l.name,
          phone: l.phone || '—',
          email: l.email || '',
          properties: l.properties || 0,
          units: l.units || 0,
          payoutMethod: l.payout_method || 'Bank',
          status: l.status || 'Active',
        })),
        pagination: null
      }
    }
    
    return { data: [], pagination: null }
  }

  async createLandlord(payload) {
    return await this.pmApi('directory.create_landlord', {
      landlord_name: payload.landlord_name || payload.name,
      phone: payload.phone || payload.phone_number,
      email: payload.email || payload.email_address,
    })
  }

  /** Bulk-create landlords via the backend endpoint (auto-resolves organization). */
  async bulkCreateLandlords(list = []) {
    const landlords = (list || []).map((l) => ({
      landlord_id: l.landlord_id || null,
      landlord_name: l.landlord_name || l.name,
      phone_number: l.phone_number || l.phone,
      email_address: l.email_address || l.email,
    }))
    const res = await this.pmApi('directory.bulk_create_landlords', { landlords })
    return res || { created: [], updated: [], failed: [], total: landlords.length }
  }

  /** Set the landlord on a property (Property.landlord link field). */
  async assignLandlordToProperty(propertyId, landlordId) {
    const res = await this.request(`/resource/Property/${encodeURIComponent(propertyId)}`, {
      method: 'PUT',
      body: JSON.stringify({ landlord: landlordId })
    })
    return res.data
  }

  /** Set the caretaker on a property (Property.caretaker link field). */
  async assignCaretakerToProperty(propertyId, caretakerId) {
    const res = await this.request(`/resource/Property/${encodeURIComponent(propertyId)}`, {
      method: 'PUT',
      body: JSON.stringify({ caretaker: caretakerId })
    })
    return res.data
  }

  async getCaretakers({ page = 1, pageSize = 8, search = '' } = {}) {
    const result = await this.pmApi('directory.list_caretakers', { page, page_size: pageSize, search })
    
    // Handle new paginated response format
    if (result && result.data && result.pagination) {
      const data = result.data.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone || '—',
        email: c.email || '',
        properties: c.properties || 0,
        units: c.units || 0,
        status: c.status || 'Active',
      }))
      return {
        data,
        pagination: {
          page: result.pagination.page,
          pageSize: result.pagination.page_size,
          total: result.pagination.total,
          totalPages: result.pagination.total_pages,
          hasNext: result.pagination.has_next,
          hasPrev: result.pagination.has_prev,
        }
      }
    }
    
    // Backward compatibility with old array response
    if (Array.isArray(result)) {
      return {
        data: result.map((c) => ({
          id: c.id,
          name: c.name,
          phone: c.phone || '—',
          email: c.email || '',
          properties: c.properties || 0,
          units: c.units || 0,
          status: c.status || 'Active',
        })),
        pagination: null
      }
    }
    
    return { data: [], pagination: null }
  }

  async createCaretaker(payload) {
    return await this.pmApi('directory.create_caretaker', {
      caretaker_name: payload.caretaker_name || payload.name,
      phone: payload.phone || payload.phone_number,
      email: payload.email || payload.email_address,
    })
  }

  /** Bulk-create caretakers via the backend endpoint (auto-resolves organization). */
  async bulkCreateCaretakers(list = []) {
    const caretakers = (list || []).map((c) => ({
      caretaker_id: c.caretaker_id || null,
      caretaker_name: c.caretaker_name || c.name,
      phone_number: c.phone_number || c.phone,
      email_address: c.email_address || c.email,
    }))
    const res = await this.pmApi('directory.bulk_create_caretakers', { caretakers })
    return res || { created: [], updated: [], failed: [], total: caretakers.length }
  }

  // --- ARREARS & METER READINGS ---
  async getArrears(property) {
    try {
      const param = property ? `?property=${encodeURIComponent(property)}` : ''
      const res = await this.request(`/method/property_management.api.reports.rent_arrears_report${param}`)
      if (res && res.message && res.message.arrears) {
        return res.message.arrears.map((a, idx) => ({
          id: a.name || `AR-${idx + 1}`,
          tenant: a.tenant,
          unit: a.unit || '—',
          property: a.property || '—',
          daysOverdue: a.days_overdue ?? 0,
          amount: a.outstanding_amount,
          lastReminder: a.due_date,
        }))
      }
    } catch {}
    return []
  }

  /**
   * Send an arrears/rent reminder to a tenant over one or more channels.
   * channels: array of any of 'sms' | 'email' | 'whatsapp'.
   * Returns { sent: [...channels], failed: [{channel, error}] } so the UI
   * can report exactly what went through.
   */
  async sendReminder({ tenant, phone, email, message, channels = [] } = {}) {
    const sent = []
    const failed = []
    const payload = { tenant, phone, email, message }

    const endpoints = {
      sms: 'property_management.api.messaging.send_sms',
      email: 'property_management.api.messaging.send_email',
      whatsapp: 'property_management.api.messaging.send_whatsapp',
    }

    for (const channel of channels) {
      const method = endpoints[channel]
      if (!method) continue
      try {
        await this.request(`/method/${method}`, {
          method: 'POST',
          body: JSON.stringify({ ...payload, channel }),
        })
        sent.push(channel)
      } catch (err) {
        failed.push({ channel, error: err.message })
      }
    }
    return { sent, failed }
  }

  // --- PAYMENTS & M-PESA ---
  async getPayments() {
    // Real money received = submitted Payment Entries + paid M-Pesa Transactions
    // (rent/deposit collected at onboarding are posted via M-Pesa, so a plain
    // Payment Entry query misses them). The backend merges both sources.
    try {
      const res = await this.request('/method/property_management.api.reports.recent_payments')
      const rows = res?.message
      if (Array.isArray(rows)) return rows
    } catch {}
    return []
  }

  /** List incoming bank/M-Pesa transactions not yet reconciled. */
  async listUnreconciled({ bankAccount = null, limit = 100, property = null } = {}) {
    const qs = new URLSearchParams()
    if (bankAccount) qs.append('bank_account', bankAccount)
    if (property) qs.append('property', property)
    if (limit) qs.append('limit', String(limit))
    const data = await this.pmApi(`reconciliation.list_unreconciled?${qs.toString()}`)
    return Array.isArray(data) ? data : []
  }

  /**
   * Reconcile a bank transaction against a tenant/invoice. Records a native
   * Payment Entry and flags the transaction reconciled.
   */
  async reconcilePayment({ bankTransaction, property, amount, tenant = null, salesInvoice = null, paymentMethod = 'Bank', referenceNo = null } = {}) {
    return await this.pmApi('reconciliation.reconcile', {
      bank_transaction: bankTransaction,
      property,
      amount: Number(amount || 0),
      tenant,
      sales_invoice: salesInvoice,
      payment_method: paymentMethod,
      reference_no: referenceNo,
    })
  }

  // --- METER READINGS (caretaker submits water/electricity units per unit) ---
  async captureMeterReading({ unitId, utilityType = 'Water', currentReading, ratePerUnit = 150, readingDate = null, photoUrl = null, previousReading = null } = {}) {
    const res = await this.request('/method/property_management.api.meter_reading.capture_meter_reading', {
      method: 'POST',
      body: JSON.stringify({
        unit_id: unitId,
        utility_type: utilityType,
        current_reading: Number(currentReading),
        rate_per_unit: Number(ratePerUnit),
        reading_date: readingDate,
        photo_url: photoUrl,
        previous_reading: (previousReading === null || previousReading === '') ? null : Number(previousReading),
      }),
    })
    return res && res.message ? res.message : res
  }

  async getMeterReadings({ property = null, unit = null, capturedBy = null, limit = 100 } = {}) {
    const qs = new URLSearchParams()
    if (property) qs.append('property', property)
    if (unit) qs.append('unit', unit)
    if (capturedBy) qs.append('captured_by', capturedBy)
    if (limit) qs.append('limit', String(limit))
    const res = await this.request(`/method/property_management.api.meter_reading.list_meter_readings?${qs.toString()}`)
    const data = res && res.message ? res.message : res
    return Array.isArray(data)
      ? data.map((m) => ({
          id: m.name,
          property: m.property,
          unit: m.unit,
          utilityType: m.utility_type,
          date: m.reading_date,
          previous: m.previous_reading || 0,
          current: m.current_reading || 0,
          consumption: m.consumption || 0,
          rate: m.rate_per_unit || 0,
          amount: m.billing_amount || 0,
        }))
      : []
  }

  // --- BILLING SETTINGS ---
  async getBillingSettings({ property = null } = {}) {
    const qs = new URLSearchParams()
    if (property) qs.append('property', property)
    return await this.pmApi(`settings.get_billing_settings?${qs.toString()}`)
  }

  async setBillingSettings(settings = {}) {
    return await this.pmApi('settings.set_billing_settings', settings)
  }

  /** Paginated list of effective per-property billing settings. */
  async listPropertyBillingSettings({ page = 1, pageSize = 10, search = null } = {}) {
    const qs = new URLSearchParams()
    qs.append('page', String(page))
    qs.append('page_size', String(pageSize))
    if (search) qs.append('search', search)
    return await this.pmApi(`settings.list_property_billing_settings?${qs.toString()}`)
  }

  /** Update a single property's billing/charge overrides. */
  async setPropertyBillingSettings(property, settings = {}) {
    return await this.pmApi('settings.set_property_billing_settings', { property, ...settings })
  }

  // --- M-PESA / DARAJA CREDENTIALS (per organization) ---
  async getMpesaSettings(organization = null) {
    const qs = organization ? `?organization=${encodeURIComponent(organization)}` : ''
    return await this.pmApi(`settings.get_mpesa_settings${qs}`)
  }

  /** Save Daraja credentials. Leave secret fields blank to keep existing values. */
  async setMpesaSettings(settings = {}) {
    return await this.pmApi('settings.set_mpesa_settings', settings)
  }

  /** Per-org SMS/Email/WhatsApp settings. Secrets return only a '<field>_set' flag. */
  async getMessagingSettings(organization = null) {
    const qs = organization ? `?organization=${encodeURIComponent(organization)}` : ''
    return await this.pmApi(`settings.get_messaging_settings${qs}`)
  }

  /** Save messaging credentials. Leave secret fields blank to keep existing values. */
  async setMessagingSettings(settings = {}) {
    return await this.pmApi('settings.set_messaging_settings', settings)
  }

  // --- WHATSAPP MESSAGING ---

  /**
   * Send a WhatsApp message with optional Pay Now button.
   * If invoice is provided, includes an interactive Pay button that triggers M-Pesa STK.
   */
  async sendWhatsAppMessage({ phone, message, invoice = null } = {}) {
    const endpoint = invoice
      ? 'property_management.api.messaging.send_whatsapp_with_pay_button'
      : 'property_management.api.whatsapp.send_message'
    const res = await this.request(`/method/${endpoint}`, {
      method: 'POST',
      body: JSON.stringify({ phone, message, invoice }),
    })
    return res && res.message ? res.message : res
  }

  /**
   * Send rent reminder via WhatsApp with Pay Now button.
   * Uses the backend's high-level function that composes the message.
   */
  async sendWhatsAppRentReminder({ tenant, invoice } = {}) {
    const res = await this.request('/method/property_management.api.messaging.send_rent_reminder_message', {
      method: 'POST',
      body: JSON.stringify({ tenant, invoice }),
    })
    return res && res.message ? res.message : res
  }

  /**
   * Send overdue reminder via WhatsApp with Pay Now button.
   */
  async sendWhatsAppOverdueReminder({ tenant, invoice } = {}) {
    const res = await this.request('/method/property_management.api.messaging.send_overdue_reminder_message', {
      method: 'POST',
      body: JSON.stringify({ tenant, invoice }),
    })
    return res && res.message ? res.message : res
  }

  /**
   * Get WhatsApp message history with optional filters.
   * Returns messages logged in WhatsApp Message Log doctype.
   */
  async getWhatsAppMessages({ phone = null, direction = null, status = null, limit = 50 } = {}) {
    const qs = new URLSearchParams()
    if (phone) qs.append('phone', phone)
    if (direction) qs.append('direction', direction)
    if (status) qs.append('status', status)
    if (limit) qs.append('limit', String(limit))
    const res = await this.request(`/method/property_management.api.whatsapp.get_messages?${qs.toString()}`)
    const data = res && res.message ? res.message : res
    return Array.isArray(data) ? data : []
  }

  /** Admin: delete all tenants that have no unit/lease. Returns {deleted, count}. */
  async deleteUnassignedTenants() {
    return await this.pmApi('directory.delete_unassigned_tenants', {})
  }

  /** Admin: delete a single unassigned tenant (refuses if they hold a lease). */
  async deleteTenant(tenant) {
    return await this.pmApi('directory.delete_tenant', { tenant })
  }

  /** Caretaker: all tenants they onboarded or who lease their properties. */
  async getMyTenants() {
    const data = await this.pmApi('directory.my_tenants')
    return Array.isArray(data) ? data : []
  }

  /**
   * Caretaker move-out: terminate a lease (frees the unit -> Vacant) and record
   * held tenant items. heldItems: [{ item_name, description, quantity,
   * estimated_value, photo (base64) }].
   */
  async vacateUnit(lease, reason = null, heldItems = []) {
    return await this.pmApi('directory.vacate_unit', {
      lease,
      reason,
      held_items: heldItems || [],
    })
  }

  /** Admin/caretaker: list held tenant items with pagination (photos come back as base64). */
  async getHeldItems({ tenant = null, property = null, page = 1, pageSize = 8, search = '' } = {}) {
    const qs = new URLSearchParams()
    if (tenant) qs.append('tenant', tenant)
    if (property) qs.append('property', property)
    qs.append('page', String(page))
    qs.append('page_size', String(pageSize))
    if (search) qs.append('search', search)
    
    const result = await this.pmApi(`directory.list_held_items?${qs.toString()}`)
    
    // Handle new paginated response format
    if (result && result.data && result.pagination) {
      return {
        data: result.data,
        pagination: {
          page: result.pagination.page,
          pageSize: result.pagination.page_size,
          total: result.pagination.total,
          totalPages: result.pagination.total_pages,
          hasNext: result.pagination.has_next,
          hasPrev: result.pagination.has_prev,
        }
      }
    }
    
    // Backward compatibility with old array response
    return { data: Array.isArray(result) ? result : [], pagination: null }
  }

  /** Caretaker: leases with tenant + initial payment status (own properties). */
  async getLeases({ caretakerScope = true, property = null } = {}) {
    const qs = new URLSearchParams()
    if (caretakerScope) qs.append('caretaker_scope', '1')
    if (property) qs.append('property', property)
    const data = await this.pmApi(`directory.list_leases?${qs.toString()}`)
    return Array.isArray(data) ? data : []
  }

  /** Caretaker triggers the initial rent+deposit STK push for a lease. */
  async initiateOnboardingPayment(lease, phone = null) {
    const res = await this.request('/method/property_management.api.mpesa.initiate_onboarding_payment', {
      method: 'POST',
      body: JSON.stringify({ lease, phone }),
    })
    return res && res.message ? res.message : res
  }

  /** Tenant portal: pay an invoice via STK push (outstanding, or a given amount). */
  async payInvoiceMpesa(invoice, { phone = null, amount = null } = {}) {
    const res = await this.request('/method/property_management.api.mpesa.initiate_invoice_payment', {
      method: 'POST',
      body: JSON.stringify({ invoice, phone, amount }),
    })
    return res && res.message ? res.message : res
  }

  /** Poll the status of an STK payment (Pending / Paid / Failed) with details. */
  async getPaymentStatus({ checkoutRequestId = null, lease = null, invoice = null } = {}) {
    const qs = new URLSearchParams()
    if (checkoutRequestId) qs.append('checkout_request_id', checkoutRequestId)
    if (lease) qs.append('lease', lease)
    if (invoice) qs.append('invoice', invoice)
    const res = await this.request(`/method/property_management.api.mpesa.payment_status?${qs.toString()}`)
    return res && res.message ? res.message : res
  }

  /** Generate the combined monthly invoices (rent + garbage + metered utilities). */
  async generateMonthlyInvoices({ period = null, organization = null, property = null } = {}) {
    return await this.v2('finance.generate_monthly_invoices', { period, organization, property })
  }

  async triggerMpesaStk({ phone, amount, reference, description }) {
    return await this.request('/method/property_management.api.mpesa.stk_push', {
      method: 'POST',
      body: JSON.stringify({
        phone_number: phone,
        amount: amount,
        account_reference: reference || 'RENT',
        transaction_desc: description || 'Rent Payment'
      })
    })
  }

  // --- FINANCIAL & ACCOUNTING REPORTS (100% REAL ERPNEXT/FRAPPE DATA) ---
  async getProfitAndLoss(property, company, from_date, to_date) {
    // Native ERPNext GL-backed report. Uses the reports.profit_and_loss endpoint,
    // which reads the General Ledger directly and works portfolio-wide (no company
    // required), returning income/expense breakdowns as lists of
    // {account, account_name, balance}. The v2 endpoint requires a company and
    // returns dict-shaped breakdowns, so it's unsuitable for "All Properties".
    try {
      const params = new URLSearchParams()
      if (property) params.append('property', property)
      if (from_date) params.append('from_date', from_date)
      if (to_date) params.append('to_date', to_date)
      const res = await this.request(`/method/property_management.api.reports.profit_and_loss?${params.toString()}`)
      const data = res && res.message
      if (!data) return null
      return {
        property: data.property,
        total_income: data.total_income,
        total_collected: data.total_income,
        total_expenses: data.total_expenses,
        net_profit: data.net_profit,
        income_breakdown: data.income_breakdown || [],
        expense_breakdown: data.expense_breakdown || [],
      }
    } catch {
      return null
    }
  }

  async getRentCollectionReport(property, from_date, to_date) {
    try {
      const params = new URLSearchParams()
      if (property) params.append('property', property)
      if (from_date) params.append('from_date', from_date)
      if (to_date) params.append('to_date', to_date)
      const res = await this.request(`/method/property_management.api.reports.rent_collection_report?${params.toString()}`)
      if (res && res.message) return res.message
    } catch {}
    return null
  }

  /**
   * Monthly rent collected broken down per property (for the admin dashboard
   * grouped bar chart). Returns { months, properties:[{key,id,name}], series }.
   */
  async getRentCollectionByProperty(months = 6) {
    try {
      const res = await this.request(`/method/property_management.api.reports.rent_collection_by_property?months=${encodeURIComponent(months)}`)
      const data = res && res.message
      if (data && Array.isArray(data.series)) return data
    } catch {}
    return { months: [], properties: [], series: [] }
  }

  async getRevenueAndExpenseTrend(property, months = 6) {
    try {
      const params = new URLSearchParams()
      if (property) params.append('property', property)
      if (months) params.append('months', months)
      const res = await this.request(`/method/property_management.api.reports.revenue_and_expense_trend?${params.toString()}`)
      if (res && res.message) return res.message
    } catch {}
    return []
  }

  async getLandlordRemittances(property, company, from_date, to_date) {
    // GL-backed report endpoint returns per-property remittances + totals and
    // works portfolio-wide (no company required, unlike the v2 aggregate).
    try {
      const params = new URLSearchParams()
      if (property) params.append('property', property)
      if (from_date) params.append('from_date', from_date)
      if (to_date) params.append('to_date', to_date)
      const res = await this.request(`/method/property_management.api.reports.landlord_remittance_report?${params.toString()}`)
      if (res && res.message) return res.message
    } catch {}
    return null
  }

  /** Branding for report headers: company name, logo URL, and property name. */
  async getReportBranding(property = null) {
    try {
      const param = property ? `?property=${encodeURIComponent(property)}` : ''
      const res = await this.request(`/method/property_management.api.reports.report_branding${param}`)
      if (res && res.message) return res.message
    } catch {}
    return { company_name: 'NEST@R', logo: null, property_name: null }
  }

  async getExpenseReport(property, from_date, to_date) {
    try {
      const params = new URLSearchParams()
      if (property) params.append('property', property)
      if (from_date) params.append('from_date', from_date)
      if (to_date) params.append('to_date', to_date)
      const res = await this.request(`/method/property_management.api.reports.expense_report?${params.toString()}`)
      if (res && res.message) return res.message
    } catch {}
    return null
  }

  /**
   * Structured financial statement built server-side from REAL records.
   * kind: income_statement | balance_sheet | cashflow_statement |
   *       cost_tracking | loan_schedule | project_pipeline
   * Returns { id, title, columns:[{key,header,kind,emphasise?}], rows:[{kind,label,values?,...}] }
   * so the frontend renders exactly what the backend sends (no hardcoded lines).
   */
  async getFinancialStatement(kind, { property = null, year = null, months = 12 } = {}) {
    const params = new URLSearchParams({ kind })
    if (property) params.append('property', property)
    if (year) params.append('year', String(year))
    if (months) params.append('months', String(months))
    const res = await this.request(`/method/property_management.api.reports.financial_statement?${params.toString()}`)
    const data = res && res.message ? res.message : null
    return data && data.rows ? data : null
  }

  // --- ACCOUNTING (native, GL-backed) ---
  async getBalanceSheet({ company = null, property = null, from_date = null, to_date = null } = {}) {
    const qs = new URLSearchParams()
    if (company) qs.append('company', company)
    if (property) qs.append('property', property)
    if (from_date) qs.append('from_date', from_date)
    if (to_date) qs.append('to_date', to_date)
    return await this.v2(`reports.balance_sheet?${qs.toString()}`)
  }

  async listJournalEntries({ company = null, property = null, from_date = null, to_date = null, page = 1, pageSize = 8 } = {}) {
    const qs = new URLSearchParams()
    if (company) qs.append('company', company)
    if (property) qs.append('property', property)
    if (from_date) qs.append('from_date', from_date)
    if (to_date) qs.append('to_date', to_date)
    qs.append('page', String(page))
    qs.append('page_size', String(pageSize))
    const result = await this.v2(`accounting.list_journal_entries?${qs.toString()}`)
    
    // Handle new paginated response
    if (result && result.data && result.pagination) {
      return {
        data: result.data,
        pagination: {
          page: result.pagination.page,
          pageSize: result.pagination.page_size,
          total: result.pagination.total,
          totalPages: result.pagination.total_pages,
          hasNext: result.pagination.has_next,
          hasPrev: result.pagination.has_prev,
        }
      }
    }
    
    // Backward compatibility
    return { data: Array.isArray(result) ? result : [], pagination: null }
  }

  async createJournalEntry({ lines, company = null, property = null, postingDate = null, remark = null } = {}) {
    return await this.v2('accounting.create_journal_entry', {
      lines: JSON.stringify(lines || []),
      company, property, posting_date: postingDate, remark,
    })
  }

  async createOpeningBalance({ balances, company = null, property = null, postingDate = null } = {}) {
    return await this.v2('accounting.create_opening_balance', {
      balances: JSON.stringify(balances || []),
      company, property, posting_date: postingDate,
    })
  }

  /** Full list of GL accounts for JE / opening-balance pickers. */
  async listAccounts({ company = null, property = null, rootType = null } = {}) {
    // Use the non-authenticated accounting API that returns all accounts
    const qs = new URLSearchParams()
    if (rootType) qs.append('root_type', rootType)
    const res = await this.request(`/method/property_management.api.accounting.list_accounts?${qs.toString()}`)
    const data = res && res.message ? res.message : []
    return Array.isArray(data)
      ? data.filter(a => !a.is_group).map((a) => ({ 
          id: a.name, 
          name: a.account_name || a.name, 
          rootType: a.root_type, 
          type: a.account_type 
        }))
      : []
  }

  // --- BANK RECONCILIATION (reuses reconciliation.py) ---
  async listUnreconciled({ bankAccount = null, limit = 100 } = {}) {
    const qs = new URLSearchParams()
    if (bankAccount) qs.append('bank_account', bankAccount)
    if (limit) qs.append('limit', String(limit))
    const data = await this.pmApi(`reconciliation.list_unreconciled?${qs.toString()}`)
    return Array.isArray(data) ? data : []
  }

  async reconcileTransaction({ bankTransaction, property, amount, tenant = null, salesInvoice = null, paymentMethod = 'Bank', referenceNo = null } = {}) {
    return await this.pmApi('reconciliation.reconcile', {
      bank_transaction: bankTransaction, property, amount, tenant,
      sales_invoice: salesInvoice, payment_method: paymentMethod, reference_no: referenceNo,
    })
  }

  async getTrialBalance(property, company, from_date, to_date) {
    // Native v2 GL-backed trial balance. Returns [{account, debit, credit, balance}].
    const qs = new URLSearchParams()
    if (property) qs.append('property', property)
    if (company) qs.append('company', company)
    if (from_date) qs.append('from_date', from_date)
    if (to_date) qs.append('to_date', to_date)
    const data = await this.v2(`reports.trial_balance?${qs.toString()}`)
    if (!Array.isArray(data)) return []
    // Backend already enriches with account_name + account_type (root type).
    return data.map((r) => ({
      account: r.account,
      account_name: r.account_name || r.account,
      account_type: r.account_type || '',
      debit: r.debit || 0,
      credit: r.credit || 0,
      balance: r.balance || 0,
    }))
  }

  async getReportPdf({ reportType, reportName, property, from_date, to_date, filters = {} }) {
    const params = new URLSearchParams({
      report_name: reportName || reportType || 'profit_and_loss',
      format: 'pdf',
      ...(property ? { property } : {}),
      ...(from_date ? { from_date } : {}),
      ...(to_date ? { to_date } : {}),
      ...filters
    })
    return `${this.baseUrl}/method/property_management.api.reports.generate_report_pdf?${params.toString()}`
  }

  // --- DOCUMENTS (signed leases + tenant docs) ---
  /** One row per lease: tenant details + signed lease PDF availability. */
  async getTenantDocuments({ tenant = null, property = null } = {}) {
    try {
      const qs = new URLSearchParams()
      if (tenant) qs.append('tenant', tenant)
      if (property) qs.append('property', property)
      const res = await this.request(`/method/property_management.api.documents.list_tenant_documents?${qs.toString()}`)
      if (res && Array.isArray(res.message)) return res.message
    } catch {}
    return []
  }

  /** Absolute URL to view a lease's signed PDF (session cookie authenticates). */
  leaseDownloadUrl(lease) {
    return `${this.baseUrl}/method/property_management.api.documents.download_lease?lease=${encodeURIComponent(lease)}`
  }

  /**
   * Download a lease's signed PDF as a file. Fetches through the authenticated API
   * (private files need the session cookie) and saves a blob so it works reliably.
   */
  async downloadLease(lease) {
    const url = this.leaseDownloadUrl(lease)
    const res = await fetch(url, { credentials: 'include' })
    if (!res.ok) throw new Error('Could not download the signed lease.')
    const blob = await res.blob()
    const blobUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = blobUrl
    link.download = `Lease-${lease}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(blobUrl)
  }

  /** Open a lease's signed PDF in a new tab for viewing. */
  async viewLease(lease) {
    const url = this.leaseDownloadUrl(lease)
    const res = await fetch(url, { credentials: 'include' })
    if (!res.ok) throw new Error('Could not open the signed lease.')
    const blob = await res.blob()
    const blobUrl = URL.createObjectURL(blob)
    window.open(blobUrl, '_blank')
    // Revoke after a delay so the new tab has time to load it.
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60000)
  }

  // --- MY ACCOUNT (shared profile, any role) ---
  async getMyAccount() {
    const res = await this.request('/method/property_management.api.account.get_my_account')
    return res?.message || null
  }

  async updateMyAccount({ fullName = null, phone = null } = {}) {
    const res = await this.request('/method/property_management.api.account.update_my_account', {
      method: 'POST',
      body: JSON.stringify({ full_name: fullName, phone }),
    })
    return res?.message || null
  }

  // --- TENANT SELF-SERVICE (scoped to the logged-in tenant) ---
  async getMyProfile() {
    const res = await this.request('/method/property_management.api.tenant.my_profile')
    return res?.message || null
  }

  async getMyLease() {
    const res = await this.request('/method/property_management.api.tenant.my_lease')
    return res?.message || null
  }

  async getMyInvoices() {
    const res = await this.request('/method/property_management.api.tenant.my_invoices')
    return res?.message || { invoices: [], total_billed: 0, total_outstanding: 0, count: 0 }
  }

  async getMyPayments() {
    const res = await this.request('/method/property_management.api.tenant.my_payments')
    return Array.isArray(res?.message) ? res.message : []
  }

  async getMyDashboard() {
    const res = await this.request('/method/property_management.api.tenant.my_dashboard')
    return res?.message || null
  }

  async getMyDocuments() {
    const res = await this.request('/method/property_management.api.tenant.my_documents')
    return Array.isArray(res?.message) ? res.message : []
  }

  /** The logged-in tenant's national ID images (front/back) as base64. */
  async getMyIdDocuments() {
    const res = await this.request('/method/property_management.api.tenant.my_id_documents')
    return res?.message || null
  }

  // --- TENANT FEEDBACK (self-service) ---
  /** The logged-in tenant's own feedback. */
  async getMyFeedback() {
    const res = await this.request('/method/property_management.api.tenant.my_complaints')
    return Array.isArray(res?.message) ? res.message : []
  }

  /** Alias for backward compatibility */
  async getMyComplaints() {
    return this.getMyFeedback()
  }

  /** Raise feedback as the logged-in tenant. */
  async raiseFeedback({ feedback, category = 'General', priority = 'Medium', photo = null } = {}) {
    const res = await this.request('/method/property_management.api.tenant.raise_complaint', {
      method: 'POST',
      body: JSON.stringify({ feedback, category, priority, photo }),
    })
    return res?.message || null
  }

  /** Alias for backward compatibility */
  async raiseComplaint({ subject, description, category = 'General', priority = 'Medium', photo = null } = {}) {
    // Convert old format to new
    const feedback = description ? `${subject}\n\n${description}` : subject
    return this.raiseFeedback({ feedback, category, priority, photo })
  }

  // --- FEEDBACK (admin/caretaker view) — API v2, envelope ---
  async getFeedback({ property = null, tenant = null, caretaker = null, raisedBy = null, status = null, category = null, search = null, page = 1, pageSize = 8 } = {}) {
    const qs = new URLSearchParams()
    if (property) qs.append('property', property)
    if (tenant) qs.append('tenant', tenant)
    if (caretaker) qs.append('caretaker', caretaker)
    if (raisedBy) qs.append('raised_by', raisedBy)
    if (status) qs.append('status', status)
    if (category) qs.append('category', category)
    if (search) qs.append('search', search)
    qs.append('page', String(page))
    qs.append('page_size', String(pageSize))
    
    const result = await this.v2(`feedback.list_feedback?${qs.toString()}`)
    
    if (result && result.data && result.pagination) {
      return {
        data: result.data,
        pagination: {
          page: result.pagination.page,
          pageSize: result.pagination.page_size,
          total: result.pagination.total,
          totalPages: result.pagination.total_pages,
          hasNext: result.pagination.has_next,
          hasPrev: result.pagination.has_prev,
        }
      }
    }
    
    return { data: Array.isArray(result) ? result : [], pagination: null }
  }

  /** Alias for backward compatibility */
  async getComplaints(params = {}) {
    return this.getFeedback(params)
  }

  async getFeedbackStats({ property = null, tenant = null, caretaker = null, raisedBy = null } = {}) {
    const qs = new URLSearchParams()
    if (property) qs.append('property', property)
    if (tenant) qs.append('tenant', tenant)
    if (caretaker) qs.append('caretaker', caretaker)
    if (raisedBy) qs.append('raised_by', raisedBy)
    return await this.v2(`feedback.feedback_stats?${qs.toString()}`)
  }

  /** Alias for backward compatibility */
  async getComplaintStats(params = {}) {
    return this.getFeedbackStats(params)
  }

  /** Tenants for the admin feedback filter (optionally scoped to a property). */
  async getFeedbackTenants({ property = null } = {}) {
    const qs = new URLSearchParams()
    if (property) qs.append('property', property)
    const data = await this.v2(`feedback.tenant_options?${qs.toString()}`)
    return Array.isArray(data) ? data : []
  }

  /** Alias for backward compatibility */
  async getComplaintTenants(params = {}) {
    return this.getFeedbackTenants(params)
  }

  /** Caretakers for the admin feedback filter (optionally scoped to a property). */
  async getFeedbackCaretakers({ property = null } = {}) {
    const qs = new URLSearchParams()
    if (property) qs.append('property', property)
    const data = await this.v2(`feedback.caretaker_options?${qs.toString()}`)
    return Array.isArray(data) ? data : []
  }

  /** Admin/caretaker: respond to and/or update the status of feedback. */
  async respondFeedback(name, { response = null, status = null } = {}) {
    return await this.v2('feedback.respond_feedback', { name, response, status })
  }

  /** Alias for backward compatibility */
  async respondComplaint(name, params = {}) {
    return this.respondFeedback(name, params)
  }

  /** Caretaker raises feedback. */
  async caretakerRaiseFeedback({ feedback, property = null, unit = null, tenant = null, category = 'General', priority = 'Medium', photo = null } = {}) {
    return await this.v2('feedback.raise_feedback', { feedback, property, unit, tenant, category, priority, photo })
  }

  /** Get feedback visible to the logged-in caretaker (their own + tenant feedback on their properties). */
  async getCaretakerFeedback() {
    const data = await this.v2('feedback.my_feedback')
    return Array.isArray(data) ? data : []
  }

  /** Download the tenant's own lease PDF (server verifies ownership). */
  async downloadMyLease(lease) {
    const url = `${this.baseUrl}/method/property_management.api.tenant.download_my_lease?lease=${encodeURIComponent(lease)}`
    const res = await fetch(url, { credentials: 'include' })
    if (!res.ok) throw new Error('Could not download your lease.')
    const blob = await res.blob()
    const blobUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = blobUrl
    link.download = `Lease-${lease}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(blobUrl)
  }

  /** Open the tenant's own lease PDF in a new tab (server verifies ownership). */
  async viewMyLease(lease) {
    const url = `${this.baseUrl}/method/property_management.api.tenant.download_my_lease?lease=${encodeURIComponent(lease)}`
    const res = await fetch(url, { credentials: 'include' })
    if (!res.ok) throw new Error('Could not open your lease.')
    const blob = await res.blob()
    const blobUrl = URL.createObjectURL(blob)
    window.open(blobUrl, '_blank')
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60000)
  }

  // --- LANDLORD SELF-SERVICE (scoped to the logged-in landlord) ---
  async getLandlordProperties() {
    const res = await this.request('/method/property_management.api.landlord.my_properties')
    return Array.isArray(res?.message) ? res.message : []
  }

  /** Landlord-scoped single-property detail (fields, unit counts, images, units). */
  async getLandlordProperty(id) {
    const res = await this.request(`/method/property_management.api.landlord.my_property_detail?property=${encodeURIComponent(id)}`)
    return res?.message || null
  }

  /** Lightweight [{id,name}] list for the report property-filter dropdown. */
  async getLandlordPropertyOptions() {
    const res = await this.request('/method/property_management.api.landlord.my_property_options')
    return Array.isArray(res?.message) ? res.message : []
  }

  async getLandlordBilling(property = null) {
    const qs = property ? `?property=${encodeURIComponent(property)}` : ''
    const res = await this.request(`/method/property_management.api.landlord.my_billing${qs}`)
    return res?.message || { tenants: [], tenant_count: 0, monthly_rent_roll: 0, total_outstanding: 0 }
  }

  async getLandlordDashboard(property = null) {
    const qs = property ? `?property=${encodeURIComponent(property)}` : ''
    const res = await this.request(`/method/property_management.api.landlord.my_dashboard${qs}`)
    return res?.message || null
  }

  async getLandlordFinancials(property = null, months = 6) {
    const qs = new URLSearchParams()
    if (property) qs.append('property', property)
    if (months) qs.append('months', String(months))
    const res = await this.request(`/method/property_management.api.landlord.my_financials?${qs.toString()}`)
    return res?.message || null
  }

  async getLandlordDocuments(property = null) {
    const qs = property ? `?property=${encodeURIComponent(property)}` : ''
    const res = await this.request(`/method/property_management.api.landlord.my_documents${qs}`)
    return Array.isArray(res?.message) ? res.message : []
  }

  async downloadLandlordLease(lease) {
    const url = `${this.baseUrl}/method/property_management.api.landlord.download_lease?lease=${encodeURIComponent(lease)}`
    const res = await fetch(url, { credentials: 'include' })
    if (!res.ok) throw new Error('Could not download the lease.')
    const blob = await res.blob()
    const blobUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = blobUrl
    link.download = `Lease-${lease}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(blobUrl)
  }

  async viewLandlordLease(lease) {
    const url = `${this.baseUrl}/method/property_management.api.landlord.download_lease?lease=${encodeURIComponent(lease)}`
    const res = await fetch(url, { credentials: 'include' })
    if (!res.ok) throw new Error('Could not open the lease.')
    const blob = await res.blob()
    const blobUrl = URL.createObjectURL(blob)
    window.open(blobUrl, '_blank')
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60000)
  }

  // --- EXPENSES (API v2, server-side; avoids /resource 403) ---
  // Pass mine=true to only get expenses raised by the current user (caretaker view).
  async getExpenses({ property = null, organization = null, status = null, mine = false, page = 1, pageSize = 8, search = '' } = {}) {
    const qs = new URLSearchParams()
    if (property) qs.append('property', property)
    if (organization) qs.append('organization', organization)
    if (status) qs.append('status', status)
    if (mine) qs.append('mine', '1')
    if (search) qs.append('search', search)
    qs.append('page', String(page))
    qs.append('page_size', String(pageSize))
    
    const result = await this.v2(`finance.list_expenses?${qs.toString()}`)
    
    // Handle new paginated response format
    if (result && result.data && result.pagination) {
      const data = result.data.map((e) => ({
        id: e.name,
        vendor: e.vendor_name || 'Vendor',
        category: e.expense_category || '',
        amount: e.amount || 0,
        description: e.work_description || '',
        date: e.approved_at || e.creation || '',
        status: e.status || 'Draft',
        scope: e.expense_scope || 'Property',
        unit: e.unit || null,
        deductFromDeposit: !!e.deduct_from_deposit,
        depositDeducted: e.deposit_deducted || 0,
        depositShortfall: e.deposit_shortfall || 0,
      }))
      return {
        data,
        pagination: {
          page: result.pagination.page,
          pageSize: result.pagination.page_size,
          total: result.pagination.total,
          totalPages: result.pagination.total_pages,
          hasNext: result.pagination.has_next,
          hasPrev: result.pagination.has_prev,
        }
      }
    }
    
    // Backward compatibility with old array response
    if (Array.isArray(result)) {
      return {
        data: result.map((e) => ({
          id: e.name,
          vendor: e.vendor_name || 'Vendor',
          category: e.expense_category || '',
          amount: e.amount || 0,
          description: e.work_description || '',
          date: e.approved_at || e.creation || '',
          status: e.status || 'Draft',
        })),
        pagination: null
      }
    }
    
    return { data: [], pagination: null }
  }

  // --- EMPLOYEES / SALARIES (API v2, server-side; correct custom field names) ---
  async getEmployees({ organization = null, property = null, page = 1, pageSize = 8, search = '' } = {}) {
    const qs = new URLSearchParams()
    if (organization) qs.append('organization', organization)
    if (property) qs.append('property', property)
    if (search) qs.append('search', search)
    qs.append('page', String(page))
    qs.append('page_size', String(pageSize))
    
    const result = await this.v2(`payroll.list_employees?${qs.toString()}`)
    
    // Handle new paginated response format
    if (result && result.data && result.pagination) {
      const data = result.data.map((e) => ({
        id: e.name,
        name: e.employee_name || e.name,
        role: e.designation || 'Staff',
        property: e.property || '',
        salary: e.gross_salary || 0,
        phone: e.phone || '',
        email: e.email || '',
        nationalId: e.national_id || '',
        bonusDeposit: e.bonus_deposit || 0,
        status: e.status || 'Active',
      }))
      return {
        data,
        pagination: {
          page: result.pagination.page,
          pageSize: result.pagination.page_size,
          total: result.pagination.total,
          totalPages: result.pagination.total_pages,
          hasNext: result.pagination.has_next,
          hasPrev: result.pagination.has_prev,
        }
      }
    }
    
    // Backward compatibility with old array response
    if (Array.isArray(result)) {
      return {
        data: result.map((e) => ({
          id: e.name,
          name: e.employee_name || e.name,
          role: e.designation || 'Staff',
          property: e.property || '',
          salary: e.gross_salary || 0,
          phone: e.phone || '',
          email: e.email || '',
          nationalId: e.national_id || '',
          bonusDeposit: e.bonus_deposit || 0,
          status: e.status || 'Active',
        })),
        pagination: null
      }
    }
    
    return { data: [], pagination: null }
  }

  async getSalaries(params = {}) {
    return await this.getEmployees(params)
  }

  /**
   * Create an employee. Prefers the HRMS-backed v2 path (Employee + payroll
   * enrollment). This replaces the old /resource/Employee write that used
   * non-existent field names (property/phone/email) and failed validation.
   */
  async createEmployee(payload) {
    return await this.createEmployeeWithPayroll(payload)
  }

  // --- HRMS PAYROLL (API v2) ---
  // Envelope helper for v2 endpoints: { status, data, message }
  async v2(method, body = null) {
    const opts = body
      ? { method: 'POST', body: JSON.stringify(body) }
      : { method: 'GET' }
    const res = await this.request(`/method/property_management.api.v2.${method}`, opts)
    const env = res && res.message ? res.message : res
    if (env && env.status === 'error') {
      throw new Error(env.message || 'Request failed')
    }
    return env && 'data' in env ? env.data : env
  }

  /**
   * Envelope helper for the property_management.api.<module>.<fn> endpoints
   * (directory, messaging, settings, reconciliation). These return the same
   * { status, data, message } envelope as v2 but live under a different path.
   */
  async pmApi(method, body = null) {
    const opts = body
      ? { method: 'POST', body: JSON.stringify(body) }
      : { method: 'GET' }
    const res = await this.request(`/method/property_management.api.${method}`, opts)
    const env = res && res.message ? res.message : res
    if (env && env.status === 'error') {
      throw new Error(env.message || 'Request failed')
    }
    return env && 'data' in env ? env.data : env
  }

  /**
   * Add a staff member so they exist BOTH as an HR Employee and are enrolled
   * on payroll (Salary Structure Assignment via HRMS). Falls back to the plain
   * Employee resource if the HRMS v2 endpoint is unavailable, so staff are
   * never lost.
   */
  async createEmployeeWithPayroll(payload) {
    const body = {
      employee_name: payload.name || payload.employee_name,
      gross_salary: Number(payload.salary || payload.gross_salary || 0),
      designation: payload.role || payload.designation || 'Office Staff',
      property: payload.property || null,
      organization: payload.organization || null,
      mpesa_phone: payload.mpesa_phone || payload.phone || null,
      // Per-staff toggle: when false, payroll deducts nothing (net = gross).
      // Defaults to true so existing callers keep applying statutory deductions.
      apply_deductions: payload.apply_deductions !== undefined ? payload.apply_deductions : true,
    }
    // HRMS-backed: creates Employee + Salary Structure Assignment (payroll enrolled).
    // This is the only supported write path; the old /resource/Employee write used
    // invalid field names and is gone.
    const data = await this.v2('payroll.create_employee', body)
    return { ...data, payroll_enrolled: true }
  }

  /**
   * Bulk-create staff from an imported list. Each row: { name/employee_name,
   * designation, salary/gross_salary, national_id, bonus_deposit, phone }.
   * Returns { created, failed, total }.
   */
  async bulkCreateEmployees(rows = []) {
    const employees = (rows || []).map((r) => ({
      employee_name: r.name || r.employee_name || '',
      designation: r.designation || r.role || 'Office Staff',
      gross_salary: Number(r.salary || r.gross_salary || 0),
      national_id: r.national_id || r.nationalId || null,
      bonus_deposit: r.bonus_deposit ?? r.bonusDeposit ?? null,
      mpesa_phone: r.phone || r.mpesa_phone || null,
      property: r.property || null,
      // Default to applying deductions unless the row explicitly opts out.
      apply_deductions: r.apply_deductions ?? r.applyDeductions ?? true,
    }))
    return await this.v2('payroll.bulk_create_employees', { employees })
  }

  /** Run monthly payroll for a company/organization (optionally scoped to a property). */
  async runPayroll({ company, organization, period, property } = {}) {
    return await this.v2('payroll.run', { company, organization, period, property })
  }

  /** Preview Kenyan statutory deductions (PAYE, NSSF, SHIF, Housing Levy) for a gross. */
  async previewStatutory(gross) {
    return await this.v2('payroll.preview_statutory', { gross: Number(gross || 0) })
  }


  // --- AUDIT LOGS ---
  async getAuditLogs({ page = 1, pageSize = 8, search = '' } = {}) {
    try {
      const offset = (page - 1) * pageSize
      
      // Build filters for search
      let filters = ''
      if (search) {
        filters = `&filters=[["user","like","%${search}%"]]`
      }
      
      // Get total count first
      const countRes = await this.request(`/resource/Audit Log?limit_page_length=0&fields=["name"]${filters}`)
      const total = countRes?.data?.length || 0
      
      // Get paginated data
      const res = await this.request(`/resource/Audit Log?fields=["name","user","action","timestamp","doctype_name","document_name"]&order_by=creation desc&limit_start=${offset}&limit_page_length=${pageSize}${filters}`)
      
      if (res && res.data) {
        const data = res.data.map(l => ({
          id: l.name,
          actor: l.user || 'System',
          action: l.action || '',
          doctype: l.doctype_name || '',
          document: l.document_name || '',
          time: l.timestamp || l.creation || ''
        }))
        
        const totalPages = Math.ceil(total / pageSize) || 1
        
        return {
          data,
          pagination: {
            page,
            pageSize,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1
          }
        }
      }
    } catch {}
    return { data: [], pagination: null }
  }

  // --- CONSTRUCTION PROJECTS ---
  async getConstructionProjects() {
    try {
      const res = await this.request('/resource/Construction Project?fields=["name","project_name","property","status","start_date","expected_end_date","total_budget","total_actual_spend","budget_variance"]&order_by=creation desc&limit_page_length=0')
      if (res && res.data) {
        return res.data.map(p => ({
          id: p.name,
          name: p.project_name || p.name,
          property: p.property || '',
          status: p.status || 'Planning',
          startDate: p.start_date || '',
          endDate: p.expected_end_date || '',
          budget: p.total_budget || 0,
          spent: p.total_actual_spend || 0,
          variance: p.budget_variance || 0
        }))
      }
    } catch {}
    return []
  }

  /** True cost of a construction project (materials + labour + other) from ERPNext, via v2. */
  async getConstructionCost(constructionProject) {
    const qs = new URLSearchParams({ construction_project: constructionProject })
    return await this.v2(`reports.construction_cost?${qs.toString()}`)
  }

  async createConstructionProject(payload) {
    const res = await this.request('/resource/Construction Project', {
      method: 'POST',
      body: JSON.stringify({
        project_name: payload.name || payload.project_name,
        property: payload.property || null,
        status: payload.status || 'Planning',
        start_date: payload.startDate || payload.start_date || null,
        expected_end_date: payload.endDate || payload.expected_end_date || null,
        total_budget: payload.budget || payload.total_budget || 0
      })
    })
    return res.data
  }

  // --- CONSTRUCTION PROJECTS (API v2, org-scoped) ---
  /** Projects scoped to the caller's organization with pagination. Projects are tied to an org, not a property. */
  async getConstructionProjectsV2({ organization = null, page = 1, pageSize = 8, search = '' } = {}) {
    const qs = new URLSearchParams()
    if (organization) qs.append('organization', organization)
    if (search) qs.append('search', search)
    qs.append('page', String(page))
    qs.append('page_size', String(pageSize))
    
    const result = await this.v2(`construction.list_projects?${qs.toString()}`)
    
    // Handle new paginated response format
    if (result && result.data && result.pagination) {
      return {
        data: result.data,
        pagination: {
          page: result.pagination.page,
          pageSize: result.pagination.page_size,
          total: result.pagination.total,
          totalPages: result.pagination.total_pages,
          hasNext: result.pagination.has_next,
          hasPrev: result.pagination.has_prev,
        }
      }
    }
    
    // Backward compatibility with old array response
    return { data: Array.isArray(result) ? result : [], pagination: null }
  }

  /** Create a construction project (a new build). Tied to the organization; property is optional. */
  async createConstructionProjectV2(payload) {
    return await this.v2('construction.create_project', {
      project_name: payload.name || payload.project_name,
      property: payload.property || null,
      total_budget: Number(payload.budget || payload.total_budget || 0),
      start_date: payload.startDate || payload.start_date || null,
      expected_end_date: payload.endDate || payload.expected_end_date || null,
      status: payload.status || 'Planning',
    })
  }

  /** Allowed purchase categories (dropdown). Labour / Wages = how worker wages are recorded. */
  async getConstructionCategories() {
    const data = await this.v2('construction.categories')
    return Array.isArray(data) ? data : []
  }

  /** Bank/Cash accounts a project budget can be funded FROM. */
  async getFundingSources({ organization = null } = {}) {
    const qs = new URLSearchParams()
    if (organization) qs.append('organization', organization)
    const data = await this.v2(`construction.funding_sources?${qs.toString()}`)
    return Array.isArray(data) ? data : []
  }

  /** Transfer cash into a project's budget wallet from a Bank/Cash account. */
  async fundConstructionProject({ project, sourceAccount, amount, remark = null } = {}) {
    return await this.v2('construction.fund_project', {
      project,
      source_account: sourceAccount,
      amount: Number(amount || 0),
      remark,
    })
  }

  /** Funded / spent / available snapshot for a project's budget wallet. */
  async getConstructionBudget(project) {
    return await this.v2(`construction.budget_summary?project=${encodeURIComponent(project)}`)
  }

  // --- CONSTRUCTION PURCHASES (materials) — API v2, envelope ---
  /** Material purchase records for a project (or all) with pagination. */
  async getConstructionPurchases({ project = null, status = null, page = 1, pageSize = 8, search = '' } = {}) {
    const qs = new URLSearchParams()
    if (project) qs.append('project', project)
    if (status) qs.append('status', status)
    if (search) qs.append('search', search)
    qs.append('page', String(page))
    qs.append('page_size', String(pageSize))
    
    const result = await this.v2(`construction.list_purchases?${qs.toString()}`)
    
    // Handle new paginated response format
    if (result && result.data && result.pagination) {
      return {
        data: result.data,
        pagination: {
          page: result.pagination.page,
          pageSize: result.pagination.page_size,
          total: result.pagination.total,
          totalPages: result.pagination.total_pages,
          hasNext: result.pagination.has_next,
          hasPrev: result.pagination.has_prev,
        }
      }
    }
    
    // Backward compatibility with old array response
    return { data: Array.isArray(result) ? result : [], pagination: null }
  }

  /** Record a material purchase (starts in Pending Approval for Director review). */
  async createConstructionPurchase(payload) {
    return await this.v2('construction.create_purchase', {
      project: payload.project,
      amount: Number(payload.amount || 0),
      item_description: payload.description || payload.item_description || '',
      vendor: payload.vendor || null,
      category: payload.category || null,
      property: payload.property || null,
      receipt_image: payload.receiptImage || payload.receipt_image || null,
    })
  }

  /** Director-only: approve a construction purchase (posts a Purchase Invoice). */
  async approveConstructionPurchase(name, comment = null) {
    return await this.v2('construction.approve_purchase', { name, comment })
  }

  /** Director-only: reject a construction purchase. */
  async rejectConstructionPurchase(name, comment = null) {
    return await this.v2('construction.reject_purchase', { name, comment })
  }

  // --- SUPPLIERS / VENDORS (Expense Vendor) — API v2, envelope ---
  async getVendors({ organization = null, page = 1, pageSize = 8, search = '' } = {}) {
    const qs = new URLSearchParams()
    if (organization) qs.append('organization', organization)
    if (search) qs.append('search', search)
    qs.append('page', String(page))
    qs.append('page_size', String(pageSize))
    
    const result = await this.v2(`construction.list_vendors?${qs.toString()}`)
    
    // Handle new paginated response format
    if (result && result.data && result.pagination) {
      return {
        data: result.data,
        pagination: {
          page: result.pagination.page,
          pageSize: result.pagination.page_size,
          total: result.pagination.total,
          totalPages: result.pagination.total_pages,
          hasNext: result.pagination.has_next,
          hasPrev: result.pagination.has_prev,
        }
      }
    }
    
    // Backward compatibility with old array response
    return { data: Array.isArray(result) ? result : [], pagination: null }
  }

  async createVendor(payload) {
    return await this.v2('construction.create_vendor', {
      vendor_name: payload.name || payload.vendor_name,
      category: payload.category || 'General',
      phone_number: payload.phone || payload.phone_number || null,
      notes: payload.notes || null,
    })
  }

  // --- FINANCE (API v2, native ERPNext-backed) ---

  /** Create + submit a native Sales Invoice for a tenant. */
  async createInvoice({ property, tenant, items, invoiceType = 'Rent', dueDate = null } = {}) {
    return await this.v2('finance.create_invoice', {
      property,
      tenant,
      items: Array.isArray(items) ? JSON.stringify(items) : items,
      invoice_type: invoiceType,
      due_date: dueDate,
    })
  }

  /** Record a tenant payment as a native Payment Entry allocated to an invoice. */
  async recordPayment({ property, amount, salesInvoice = null, tenant = null, paymentMethod = 'M-Pesa', referenceNo = null } = {}) {
    return await this.v2('finance.record_payment', {
      property,
      amount: Number(amount || 0),
      sales_invoice: salesInvoice,
      tenant,
      payment_method: paymentMethod,
      reference_no: referenceNo,
    })
  }

  /** List Sales Invoices from ERPNext, optionally filtered. */
  async listInvoices({ company = null, property = null, status = null, limit = 50 } = {}) {
    const qs = new URLSearchParams()
    if (company) qs.append('company', company)
    if (property) qs.append('property', property)
    if (status) qs.append('status', status)
    if (limit) qs.append('limit', String(limit))
    const data = await this.v2(`finance.list_invoices?${qs.toString()}`)
    return Array.isArray(data) ? data : []
  }

  /** Unified invoice register (Sales + Purchase) with pagination for the admin Invoices page. */
  async getAllInvoices({ kind = null, status = null, search = null, page = 1, pageSize = 8, property = null } = {}) {
    const qs = new URLSearchParams()
    if (kind) qs.append('kind', kind)
    if (status) qs.append('status', status)
    if (search) qs.append('search', search)
    if (property) qs.append('property', property)
    qs.append('page', String(page))
    qs.append('page_size', String(pageSize))
    
    const result = await this.v2(`finance.list_all_invoices?${qs.toString()}`)
    
    // Handle new paginated response format
    if (result && result.data && result.pagination) {
      return {
        data: result.data,
        pagination: {
          page: result.pagination.page,
          pageSize: result.pagination.page_size,
          total: result.pagination.total,
          totalPages: result.pagination.total_pages,
          hasNext: result.pagination.has_next,
          hasPrev: result.pagination.has_prev,
        }
      }
    }
    
    // Backward compatibility with old array response
    return { data: Array.isArray(result) ? result : [], pagination: null }
  }

  // --- EXPENSE CATEGORIES (accounting heads) ---
  async getExpenseCategories() {
    const data = await this.v2('finance.list_expense_categories?active_only=1')
    return Array.isArray(data)
      ? data.map((c) => ({ id: c.name, name: c.category_name || c.name, account: c.account_name || '' }))
      : []
  }

  /** Create a new indirect expense category (admin/director). Provisions the account across companies. */
  async createExpenseCategory({ name, accountName = null, description = null } = {}) {
    return await this.v2('admin.create_expense_category', {
      category_name: name,
      account_name: accountName,
      description,
      provision: true,
    })
  }

  /** List indirect expense account heads from the ERPNext chart of accounts. */
  async getExpenseAccounts({ company = null, organization = null, property = null } = {}) {
    const qs = new URLSearchParams()
    if (company) qs.append('company', company)
    if (organization) qs.append('organization', organization)
    if (property) qs.append('property', property)
    const data = await this.v2(`admin.list_expense_accounts?${qs.toString()}`)
    const accounts = (data && data.accounts) || []
    return accounts.map((a) => ({
      id: a.name,
      name: a.account_name || a.name,
      number: a.account_number || '',
      parent: a.parent_account || '',
      indirect: !!a.is_indirect,
    }))
  }

  // --- APPROVALS (maker-checker inbox) ---
  // These endpoints return { status, ... } directly in `message` (not the v2 envelope).
  async getPendingApprovals({ property = null } = {}) {
    const qs = new URLSearchParams()
    if (property) qs.append('property', property)
    const suffix = qs.toString() ? `?${qs.toString()}` : ''
    const res = await this.request(`/method/property_management.api.approvals.get_pending_approvals${suffix}`)
    const list = res && res.message ? res.message : res
    return Array.isArray(list)
      ? list.map((r) => ({
          id: r.name,
          type: r.request_type,
          doctype: r.reference_doctype,
          reference: r.reference_name,
          requestedBy: r.requested_by,
          organization: r.organization || '',
          property: r.property || '',
          propertyName: r.property_name || '',
          comment: r.comment || '',
          date: r.creation || '',
        }))
      : []
  }

  /** Approve a pending request. For expenses this triggers the Purchase Invoice posting. */
  async approveRequest(approvalId, comment = null) {
    const res = await this.request('/method/property_management.api.approvals.approve_request', {
      method: 'POST',
      body: JSON.stringify({ approval_id: approvalId, comment }),
    })
    return res && res.message ? res.message : res
  }

  async rejectRequest(approvalId, comment = null) {
    const res = await this.request('/method/property_management.api.approvals.reject_request', {
      method: 'POST',
      body: JSON.stringify({ approval_id: approvalId, comment }),
    })
    return res && res.message ? res.message : res
  }

  // --- EXPENSE CREATE (Path A: raise for approval, posts to ledger on approval) ---
  // Creates a Property Expense in 'Pending Approval' + an Approval Request. The
  // expense hits the accounts only when a Director/Admin approves it (maker-checker:
  // the creator cannot approve their own request).
  async createExpense(payload) {
    return await this.v2('finance.raise_expense', {
      property: payload.property || null,
      expense_category: payload.category || payload.expense_category || null,
      vendor_name: payload.vendor || payload.vendor_name || '',
      vendor_phone: payload.vendor_phone || payload.vendorPhone || null,
      amount: Number(payload.amount || 0),
      work_description: payload.description || payload.work_description || '',
      // Scope: 'Property' (whole property) or 'Unit / Tenant'. When Unit/Tenant,
      // `unit` attaches the expense to a unit and `deduct_from_deposit` funds the
      // repair from that unit tenant's deposit on approval.
      expense_scope: payload.expense_scope || (payload.unit ? 'Unit / Tenant' : 'Property'),
      unit: payload.unit || null,
      deduct_from_deposit: payload.deduct_from_deposit ? 1 : 0,
    })
  }

  // --- INVOICES FOR TENANT ---
  async getTenantInvoices(tenantId) {
    try {
      const res = await this.request(`/resource/Property Invoice?filters=[["tenant","=","${tenantId}"]]&fields=["name","posting_date","total_amount","paid_amount","outstanding_amount","status"]&order_by=posting_date desc&limit_page_length=0`)
      if (res && res.data) {
        return res.data.map(inv => ({
          id: inv.name,
          date: inv.posting_date,
          amount: inv.total_amount || 0,
          paid: inv.paid_amount || 0,
          outstanding: inv.outstanding_amount || 0,
          status: inv.status || 'Unpaid'
        }))
      }
    } catch {}
    return []
  }

  // --- DASHBOARD SUMMARY ---
  async getDashboardSummary() {
    try {
      const res = await this.request('/method/property_management.api.reports.get_dashboard_summary')
      if (res && res.message) return res.message
    } catch {}
    return null
  }
  // --- ACCESS & USER MANAGEMENT ---
  async getUsers() {
    try {
      const res = await this.request('/method/property_management.api.roles.get_users_list')
      if (res && res.message) return res.message
    } catch {}
    return []
  }

  async createUser(payload) {
    const res = await this.request('/method/property_management.api.roles.create_or_update_user', {
      method: 'POST',
      body: JSON.stringify({
        email: payload.email,
        name: payload.name,
        role: payload.roleId || payload.role || 'admin',
        status: payload.status || 'Active',
        password: payload.password || null,
        allowed_modules: payload.allowed_modules || payload.permissions || ['Leasing', 'Finance', 'People', 'Operations', 'System']
      })
    })
    return res.message
  }

  async toggleUserStatus(email, status) {
    const res = await this.request('/method/property_management.api.roles.toggle_user_status', {
      method: 'POST',
      body: JSON.stringify({ email, status })
    })
    return res.message
  }

  async getRoles() {
    try {
      const res = await this.request('/method/property_management.api.roles.get_roles_and_permissions')
      if (res && res.message) return res.message
    } catch {}
    return []
  }

  /** The authoritative access-module catalog (sections -> [{key,label}]). */
  async getModuleCatalog() {
    try {
      const res = await this.request('/method/property_management.api.roles.get_module_catalog')
      if (res && res.message) return res.message
    } catch {}
    return []
  }

  /** Create/update a role with its granular {key: bool} permission map. */
  async saveRole({ roleName, permissions = {}, description = null } = {}) {
    const res = await this.request('/method/property_management.api.roles.create_or_update_role', {
      method: 'POST',
      body: JSON.stringify({
        role_name: roleName,
        permissions: JSON.stringify(permissions),
        description,
      }),
    })
    return res && res.message ? res.message : res
  }

  // --- SALARY SLIPS / PAYROLL ---
  /** List salary slips with filters */
  async getSalarySlips({ company, property, employee, employeeName, startDate, endDate, status, limit = 50, offset = 0 } = {}) {
    const params = new URLSearchParams()
    if (company) params.append('company', company)
    if (property) params.append('property', property)
    if (employee) params.append('employee', employee)
    if (employeeName) params.append('employee_name', employeeName)
    if (startDate) params.append('start_date', startDate)
    if (endDate) params.append('end_date', endDate)
    if (status) params.append('status', status)
    params.append('limit', limit)
    params.append('offset', offset)
    // Use request directly to preserve pagination metadata (total, limit, offset)
    const res = await this.request(`/method/property_management.api.payroll.list_salary_slips?${params.toString()}`)
    return res?.message || { data: [], total: 0 }
  }

  /** Get detailed salary slip for viewing/printing */
  async getSalarySlip(name) {
    return await this.pmApi(`payroll.get_salary_slip?name=${encodeURIComponent(name)}`)
  }

  /** Get filter options for salary slip listing */
  async getSalarySlipFilters() {
    return await this.pmApi('payroll.get_salary_slip_filters')
  }

  /** Get payroll summary statistics */
  async getPayrollSummary({ company, startDate, endDate } = {}) {
    const params = new URLSearchParams()
    if (company) params.append('company', company)
    if (startDate) params.append('start_date', startDate)
    if (endDate) params.append('end_date', endDate)
    return await this.pmApi(`payroll.get_payroll_summary?${params.toString()}`)
  }

  // --- PAYROLL PROCESSING ---
  /** Get available months with salary slips */
  async getAvailablePayrollMonths() {
    return await this.pmApi('payroll.get_available_months')
  }

  /** Get pending salary slips for a month */
  async getPendingSalarySlips(month, year) {
    const params = new URLSearchParams()
    if (month) params.append('month', month)
    if (year) params.append('year', year)
    return await this.pmApi(`payroll.get_pending_salary_slips?${params.toString()}`)
  }

  /** Get payroll entries */
  async getPayrollEntries(status = null, limit = 20) {
    const params = new URLSearchParams()
    if (status) params.append('status', status)
    params.append('limit', limit)
    return await this.pmApi(`payroll.get_payroll_entries?${params.toString()}`)
  }

  /** Create a new payroll entry */
  async createPayrollEntry(startDate, endDate, postingDate = null) {
    return await this.pmApi('payroll.create_payroll_entry', {
      start_date: startDate,
      end_date: endDate,
      posting_date: postingDate
    })
  }

  /** Get payroll entry details */
  async getPayrollEntryDetails(name) {
    return await this.pmApi(`payroll.get_payroll_entry_details?name=${encodeURIComponent(name)}`)
  }

  /** Submit a payroll entry (creates journal entry) */
  async submitPayrollEntry(name) {
    return await this.pmApi('payroll.submit_payroll_entry', { name })
  }

  /** Process payroll payment from bank account */
  async processPayrollPayment(payrollEntry, bankAccount, paymentDate = null) {
    return await this.pmApi('payroll.process_payroll_payment', {
      payroll_entry: payrollEntry,
      bank_account: bankAccount,
      payment_date: paymentDate
    })
  }

  /** Get payroll accounting entries */
  async getPayrollAccountingEntries(payrollEntry) {
    return await this.pmApi(`payroll.get_payroll_accounting_entries?payroll_entry=${encodeURIComponent(payrollEntry)}`)
  }

  /** Submit draft salary slips (Admin/Administrator/Director only) */
  async submitDraftSalarySlips(names = null, month = null, year = null) {
    return await this.pmApi('payroll.submit_draft_salary_slips', {
      names: names ? JSON.stringify(names) : null,
      month,
      year
    })
  }

  /** Fix total_in_words for salary slips where it doesn't match net_pay */
  async fixSalarySlipWords(name = null, month = null, year = null) {
    return await this.pmApi('payroll.fix_salary_slip_words', {
      name,
      month,
      year
    })
  }

  // --- ACCOUNTING / CHART OF ACCOUNTS ---
  /** Get company info */
  async getCompany() {
    return await this.pmApi('accounting.get_company')
  }

  /** List accounts from Chart of Accounts */
  async listAccounts({ rootType, accountType, isGroup } = {}) {
    const params = new URLSearchParams()
    if (rootType) params.append('root_type', rootType)
    if (accountType) params.append('account_type', accountType)
    if (isGroup !== undefined) params.append('is_group', isGroup ? '1' : '0')
    return await this.pmApi(`accounting.list_accounts?${params.toString()}`)
  }

  /** Get account balance */
  async getAccountBalance(account) {
    return await this.pmApi(`accounting.get_account_balance?account=${encodeURIComponent(account)}`)
  }

  /** List bank accounts with balances */
  async listBankAccountsWithBalance() {
    return await this.pmApi('accounting.list_bank_accounts_with_balance')
  }

  /** Create a new account (Directors/Admins only) */
  async createAccount({ accountName, rootType, parentAccount, accountType, isGroup = false }) {
    return await this.pmApi('accounting.create_account', {
      account_name: accountName,
      root_type: rootType,
      parent_account: parentAccount,
      account_type: accountType,
      is_group: isGroup ? 1 : 0
    })
  }

  /** Get account types for dropdown */
  async getAccountTypes() {
    return await this.pmApi('accounting.get_account_types')
  }

  /** Get root types for dropdown */
  async getRootTypes() {
    return await this.pmApi('accounting.get_root_types')
  }

  /** Get parent accounts for dropdown */
  async getParentAccounts(rootType = null) {
    const params = new URLSearchParams()
    if (rootType) params.append('root_type', rootType)
    return await this.pmApi(`accounting.get_parent_accounts?${params.toString()}`)
  }

  /** Get chart of accounts in tree structure */
  async getChartOfAccountsTree() {
    return await this.pmApi('accounting.get_chart_of_accounts_tree')
  }

  // --------------------------------------------------------------------------
  // OTP Authentication
  // --------------------------------------------------------------------------

  /**
   * Request OTP for phone-based login
   * @param {string} phone - Phone number
   * @returns {object} - { status, message, phone_masked, dev_otp?, dev_mode? }
   */
  async requestOTP(phone) {
    const res = await this.request('/method/property_management.api.auth.request_otp', {
      method: 'POST',
      body: JSON.stringify({ phone })
    })
    return res.message || res
  }

  /**
   * Verify OTP and login
   * @param {string} phone - Phone number used to request OTP
   * @param {string} otp - The 6-digit OTP code
   * @returns {object} - { status, token, user } on success
   */
  async verifyOTP(phone, otp) {
    const res = await this.request('/method/property_management.api.auth.verify_otp', {
      method: 'POST',
      body: JSON.stringify({ phone, otp })
    })
    return res.message || res
  }

  /**
   * Resend OTP to phone number
   * @param {string} phone - Phone number
   * @returns {object} - Same as requestOTP
   */
  async resendOTP(phone) {
    const res = await this.request('/method/property_management.api.auth.resend_otp', {
      method: 'POST',
      body: JSON.stringify({ phone })
    })
    return res.message || res
  }
}


export const api = new ApiClient()
export default api
