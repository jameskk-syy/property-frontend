import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { ArrowRight, ArrowLeft, RefreshCw, ShieldCheck, Clock } from 'lucide-react'
import NestarLogo from '../../components/ui/NestarLogo'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../api/client'

const OTP_EXPIRY_SECONDS = 10 * 60 // 10 minutes

export default function OTPVerify() {
  const navigate = useNavigate()
  const location = useLocation()
  const { loginWithToken } = useAuth()
  
  // Get state passed from Login or OTPLogin
  const { 
    phone, 
    phoneMasked, 
    devOtp, 
    devMode,
    pendingToken,
    pendingUser
  } = location.state || {}
  
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(60) // 60 seconds before can resend
  const [expiryTime, setExpiryTime] = useState(OTP_EXPIRY_SECONDS)
  const [currentDevOtp, setCurrentDevOtp] = useState(devOtp)
  const [isExpired, setIsExpired] = useState(false)
  
  const inputRefs = useRef([])

  // Redirect if no phone
  useEffect(() => {
    if (!phone) {
      navigate('/login')
    }
  }, [phone, navigate])

  // Expiry timer - counts down from 10 minutes
  useEffect(() => {
    if (expiryTime > 0 && !isExpired) {
      const timer = setTimeout(() => setExpiryTime(expiryTime - 1), 1000)
      return () => clearTimeout(timer)
    } else if (expiryTime === 0) {
      setIsExpired(true)
      setError('OTP has expired. Please request a new one.')
    }
  }, [expiryTime, isExpired])

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  // Auto-focus first input
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus()
    }
  }, [])

  const handleChange = (index, value) => {
    if (value && !/^\d$/.test(value)) return
    
    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)
    setError('')
    
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
    
    if (value && index === 5 && newOtp.every(d => d)) {
      handleSubmit(null, newOtp.join(''))
    }
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pastedData.length === 6) {
      const newOtp = pastedData.split('')
      setOtp(newOtp)
      inputRefs.current[5]?.focus()
      handleSubmit(null, pastedData)
    }
  }

  const handleSubmit = async (e, otpCode = null) => {
    if (e) e.preventDefault()
    
    if (isExpired) {
      setError('OTP has expired. Please request a new one.')
      return
    }
    
    const code = otpCode || otp.join('')
    if (code.length !== 6) {
      setError('Please enter the complete 6-digit code')
      return
    }
    
    setLoading(true)
    setError('')
    
    try {
      const result = await api.verifyOTP(phone, code)
      
      if (result.status === 'success') {
        const finalToken = pendingToken || result.token
        const finalUser = pendingUser || result.user
        
        await loginWithToken(finalToken, finalUser)
        navigate(`/${finalUser.role}`)
      } else {
        setError(result.message || 'Invalid OTP. Please try again.')
        setOtp(['', '', '', '', '', ''])
        inputRefs.current[0]?.focus()
      }
    } catch (err) {
      setError(err.message || 'Verification failed. Please try again.')
      setOtp(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setResending(true)
    setError('')
    
    try {
      const result = await api.resendOTP(phone)
      
      if (result.status === 'success') {
        // Reset timers
        setResendCooldown(60)
        setExpiryTime(OTP_EXPIRY_SECONDS)
        setIsExpired(false)
        setOtp(['', '', '', '', '', ''])
        inputRefs.current[0]?.focus()
        
        // Update dev OTP if in dev mode
        if (result.dev_mode && result.dev_otp) {
          setCurrentDevOtp(result.dev_otp)
        }
      } else {
        setError(result.message || 'Could not resend OTP')
      }
    } catch (err) {
      setError(err.message || 'Failed to resend OTP')
    } finally {
      setResending(false)
    }
  }

  // Format time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (!phone) return null

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Left panel */}
      <div className="hidden lg:flex w-1/2 bg-navy-900 text-white flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute -right-24 -top-24 w-96 h-96 rounded-full bg-brand-500/10" />
        <div className="absolute -left-16 bottom-0 w-72 h-72 rounded-full bg-brand-500/10" />
        
        <div className="relative">
          <NestarLogo size="large" variant="light" />
        </div>
        
        <div className="relative">
          <h1 className="text-4xl font-bold leading-tight mb-4">
            Property Management<br />
            <span className="text-brand-400">Made Simple</span>
          </h1>
          <p className="text-slate-400 max-w-md text-lg">
            Streamline your rental operations with our all-in-one platform for landlords, caretakers, and tenants.
          </p>
        </div>
        
        <p className="text-xs text-slate-500 relative">© 2026 NEST@R. All rights reserved.</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center justify-center mb-8">
            <NestarLogo size="large" />
          </div>

          <div className="flex items-center justify-center mb-4">
            <span className="w-12 h-12 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center">
              <ShieldCheck size={24} />
            </span>
          </div>

          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-1">Verification Code</h2>
            <p className="text-sm text-slate-500">
              We sent a 6-digit code to your WhatsApp<br />
              <span className="font-medium text-slate-700">{phoneMasked || phone}</span>
            </p>
          </div>

          {/* Expiry Timer */}
          <div className={`flex items-center justify-center gap-2 mb-4 py-2 px-3 rounded-lg ${
            isExpired ? 'bg-red-50 text-red-600' : expiryTime < 60 ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-600'
          }`}>
            <Clock size={16} />
            <span className="text-sm font-medium">
              {isExpired ? 'Code expired' : `Expires in ${formatTime(expiryTime)}`}
            </span>
          </div>

          {/* Dev Mode OTP Display */}
          {devMode && currentDevOtp && (
            <div className="mb-5 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs font-medium text-amber-700 mb-1">🔧 Development Mode</p>
              <p className="text-2xl font-bold text-amber-900 tracking-widest text-center">
                {currentDevOtp}
              </p>
              <p className="text-xs text-amber-600 mt-1 text-center">This OTP is shown for testing only</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* OTP Input Boxes */}
            <div className="flex justify-center gap-2">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={index === 0 ? handlePaste : undefined}
                  className={`
                    w-11 h-12 text-center text-lg font-semibold rounded-lg border-2 
                    focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500
                    transition-colors
                    ${digit ? 'border-brand-500 bg-brand-50' : 'border-slate-200 bg-white'}
                    ${error ? 'border-red-300 bg-red-50' : ''}
                  `}
                />
              ))}
            </div>

            {error && (
              <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-100 text-center">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || otp.join('').length !== 6 || isExpired}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <span>{loading ? 'Verifying...' : isExpired ? 'OTP Expired' : 'Verify'}</span>
              <ArrowRight size={16} />
            </button>
          </form>

          {/* Resend OTP */}
          <div className="mt-5 text-center">
            {isExpired ? (
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="text-sm font-medium text-brand-600 hover:text-brand-700 inline-flex items-center gap-1.5"
              >
                <RefreshCw size={14} className={resending ? 'animate-spin' : ''} />
                {resending ? 'Sending...' : 'Request New OTP'}
              </button>
            ) : (
              <>
                <p className="text-sm text-slate-500 mb-2">Didn't receive the code?</p>
                {resendCooldown > 0 ? (
                  <p className="text-sm text-slate-400">Resend available in {resendCooldown}s</p>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resending}
                    className="text-sm font-medium text-brand-600 hover:text-brand-700 inline-flex items-center gap-1.5"
                  >
                    <RefreshCw size={14} className={resending ? 'animate-spin' : ''} />
                    {resending ? 'Sending...' : 'Resend OTP'}
                  </button>
                )}
              </>
            )}
          </div>

          {/* Back to login */}
          <div className="mt-5 pt-5 border-t border-slate-200">
            <Link to="/login">
              <button
                type="button"
                className="w-full flex items-center justify-between px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors"
              >
                <span>Back to Login</span>
                <ArrowLeft size={16} />
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
