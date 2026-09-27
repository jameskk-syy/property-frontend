import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowRight, User, Phone, ChevronDown, Eye, EyeOff } from 'lucide-react'
import DadisLogo from '../../components/ui/DadisLogo'
import { api } from '../../api/client'

// Common country codes for Kenya region
const COUNTRY_CODES = [
  { code: '+254', country: 'KE', flag: '🇰🇪', name: 'Kenya' },
  { code: '+255', country: 'TZ', flag: '🇹🇿', name: 'Tanzania' },
  { code: '+256', country: 'UG', flag: '🇺🇬', name: 'Uganda' },
  { code: '+250', country: 'RW', flag: '🇷🇼', name: 'Rwanda' },
  { code: '+251', country: 'ET', flag: '🇪🇹', name: 'Ethiopia' },
  { code: '+27', country: 'ZA', flag: '🇿🇦', name: 'South Africa' },
]

export default function Login() {
  const navigate = useNavigate()
  const [loginMethod, setLoginMethod] = useState('username') // 'username' | 'phone'
  const [username, setUsername] = useState('')
  const [phone, setPhone] = useState('')
  const [countryCode, setCountryCode] = useState(COUNTRY_CODES[0])
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showCountryDropdown, setShowCountryDropdown] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Validate inputs
    if (loginMethod === 'username' && !username) {
      setError('Please enter your username')
      return
    }
    if (loginMethod === 'phone' && !phone) {
      setError('Please enter your phone number')
      return
    }
    if (!password) {
      setError('Please enter your password')
      return
    }

    setLoading(true)

    try {
      // Build the identifier
      const identifier = loginMethod === 'username' 
        ? username 
        : `${countryCode.code.replace('+', '')}${phone.replace(/^0+/, '')}`

      // First verify password with backend
      const loginResult = await api.login({ email: identifier, password })

      if (loginResult.status !== 'success') {
        setError(loginResult.message || 'Invalid credentials')
        setLoading(false)
        return
      }

      // Password verified - now request OTP
      // Use phone from login response, or the phone input if logging in via phone
      const phoneForOtp = loginResult.user?.phone 
        || (loginMethod === 'phone' ? `${countryCode.code}${phone.replace(/^0+/, '')}` : null)

      if (!phoneForOtp) {
        setError('No phone number associated with this account. Please contact administrator.')
        setLoading(false)
        return
      }

      const otpResult = await api.requestOTP(phoneForOtp)

      if (otpResult.status === 'success') {
        // Navigate to OTP verification
        navigate('/otp-verify', {
          state: {
            phone: phoneForOtp,
            phoneMasked: otpResult.phone_masked,
            devOtp: otpResult.dev_otp,
            devMode: otpResult.dev_mode,
            // Pass login token for final auth after OTP
            pendingToken: loginResult.token,
            pendingUser: loginResult.user
          }
        })
      } else {
        setError(otpResult.message || 'Could not send OTP. Please try again.')
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Left panel */}
      <div className="hidden lg:flex w-1/2 bg-navy-900 text-white flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute -right-24 -top-24 w-96 h-96 rounded-full bg-brand-500/10" />
        <div className="absolute -left-16 bottom-0 w-72 h-72 rounded-full bg-brand-500/10" />
        
        <div className="relative">
          <DadisLogo size="large" variant="light" />
        </div>
        
        <div className="relative">
          <h1 className="text-4xl font-bold leading-tight mb-4">
            Property Management<br />
            <span className="text-brand-400">Made Simple</span>
          </h1>
          <p className="text-slate-400 max-w-md text-lg">
            Streamline your rental operations with our all-in-one platform for landlords, caretakers, and tenants.
          </p>
          
          <div className="mt-8 flex items-center gap-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-brand-400">500+</p>
              <p className="text-sm text-slate-500">Properties</p>
            </div>
            <div className="w-px h-12 bg-slate-700" />
            <div className="text-center">
              <p className="text-3xl font-bold text-brand-400">2,000+</p>
              <p className="text-sm text-slate-500">Tenants</p>
            </div>
            <div className="w-px h-12 bg-slate-700" />
            <div className="text-center">
              <p className="text-3xl font-bold text-brand-400">98%</p>
              <p className="text-sm text-slate-500">Collection Rate</p>
            </div>
          </div>
        </div>
        
        <p className="text-xs text-slate-500 relative">© 2026 DADIS Estates. All rights reserved.</p>
      </div>

      {/* Right panel - Login form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center mb-8">
            <DadisLogo size="large" />
          </div>

          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-1">Welcome back</h2>
            <p className="text-slate-500 text-sm">Sign in to continue to your dashboard</p>
          </div>

          {/* Login method toggle - underline style */}
          <div className="flex border-b border-slate-200 mb-6">
            <button
              type="button"
              onClick={() => { setLoginMethod('username'); setError('') }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-all border-b-2 -mb-px ${
                loginMethod === 'username'
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <User size={16} />
              Username
            </button>
            <button
              type="button"
              onClick={() => { setLoginMethod('phone'); setError('') }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-all border-b-2 -mb-px ${
                loginMethod === 'phone'
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Phone size={16} />
              Phone
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username input */}
            {loginMethod === 'username' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Username
                </label>
                <input
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
                />
              </div>
            )}

            {/* Phone input with country code */}
            {loginMethod === 'phone' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Phone number
                </label>
                <div className="flex gap-2">
                  {/* Country code selector */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                      className="flex items-center gap-1 h-full px-2.5 py-2.5 bg-white border border-slate-200 rounded-lg hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-sm"
                    >
                      <span>{countryCode.flag}</span>
                      <span className="text-slate-700">{countryCode.code}</span>
                      <ChevronDown size={14} className="text-slate-400" />
                    </button>
                    
                    {showCountryDropdown && (
                      <>
                        <div 
                          className="fixed inset-0 z-10" 
                          onClick={() => setShowCountryDropdown(false)} 
                        />
                        <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1 max-h-56 overflow-y-auto">
                          {COUNTRY_CODES.map((country) => (
                            <button
                              key={country.code}
                              type="button"
                              onClick={() => {
                                setCountryCode(country)
                                setShowCountryDropdown(false)
                              }}
                              className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                                country.code === countryCode.code ? 'bg-brand-50 text-brand-700' : ''
                              }`}
                            >
                              <span>{country.flag}</span>
                              <span className="text-slate-900">{country.name}</span>
                              <span className="text-slate-400 ml-auto">{country.code}</span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  
                  {/* Phone number input */}
                  <input
                    type="tel"
                    placeholder="712 345 678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    autoComplete="tel"
                    className="flex-1 px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
                  />
                </div>
              </div>
            )}

            {/* Password input */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full px-3 py-2.5 pr-10 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="p-2.5 bg-red-50 border border-red-100 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Forgot password link */}
            <div className="flex justify-end">
              <Link
                to="/reset-password"
                className="text-sm text-brand-600 hover:text-brand-700"
              >
                Forgot password?
              </Link>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <span>{loading ? 'Signing in...' : 'Continue'}</span>
              <ArrowRight size={16} />
            </button>
          </form>

          {/* Footer */}
          <p className="mt-6 text-center text-xs text-slate-500">
            By signing in, you agree to our{' '}
            <a href="#" className="text-brand-600 hover:underline">Terms</a>
            {' '}and{' '}
            <a href="#" className="text-brand-600 hover:underline">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  )
}
