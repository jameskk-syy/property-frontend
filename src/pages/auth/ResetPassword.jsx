import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ArrowLeft, KeyRound, Mail } from 'lucide-react'
import NestarLogo from '../../components/ui/NestarLogo'

export default function ResetPassword() {
  const [step, setStep] = useState('request') // 'request' | 'sent'
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!email) {
      setError('Please enter your email or username')
      return
    }

    setLoading(true)

    // Simulate API call - in production, call actual password reset endpoint
    setTimeout(() => {
      setLoading(false)
      setStep('sent')
    }, 1000)
  }

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
              {step === 'request' ? <KeyRound size={24} /> : <Mail size={24} />}
            </span>
          </div>

          {step === 'request' ? (
            <>
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-slate-900 mb-1">Reset Password</h2>
                <p className="text-sm text-slate-500">
                  Enter your email address and we'll send you a link to reset your password
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Email or Username
                  </label>
                  <input
                    type="text"
                    placeholder="Enter your email or username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
                  />
                </div>

                {error && (
                  <div className="p-2.5 bg-red-50 border border-red-100 rounded-lg">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <span>{loading ? 'Sending...' : 'Reset'}</span>
                  <ArrowRight size={16} />
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-slate-900 mb-1">Check Your Email</h2>
                <p className="text-sm text-slate-500">
                  We've sent a password reset link to<br />
                  <span className="font-medium text-slate-700">{email}</span>
                </p>
              </div>

              <div className="p-3 bg-green-50 border border-green-200 rounded-lg mb-4">
                <p className="text-sm text-green-700 text-center">
                  If an account exists with this email, you'll receive reset instructions shortly.
                </p>
              </div>

              <button
                type="button"
                onClick={() => { setStep('request'); setEmail('') }}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors"
              >
                <span>Try Different Email</span>
                <ArrowRight size={16} />
              </button>
            </>
          )}

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
