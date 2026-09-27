import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowRight, Phone, ArrowLeft } from 'lucide-react'
import { TextInput, Field } from '../../components/ui/Field'
import Button from '../../components/ui/Button'
import NestarLogo from '../../components/ui/NestarLogo'
import { api } from '../../api/client'

export default function OTPLogin() {
  const navigate = useNavigate()
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    if (!phone || phone.length < 9) {
      setError('Please enter a valid phone number')
      return
    }
    
    setLoading(true)
    try {
      const result = await api.requestOTP(phone)
      
      if (result.status === 'success') {
        // Navigate to OTP verification page with phone and dev OTP if available
        navigate('/otp-verify', { 
          state: { 
            phone, 
            phoneMasked: result.phone_masked,
            devOtp: result.dev_otp,
            devMode: result.dev_mode
          } 
        })
      } else {
        setError(result.message || 'Could not send OTP. Please try again.')
      }
    } catch (err) {
      setError(err.message || 'Failed to send OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Left panel - same as login */}
      <div className="hidden lg:flex w-1/2 bg-navy-900 text-white flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute -right-24 -top-24 w-96 h-96 rounded-full bg-brand-500/10" />
        <div className="absolute -left-16 bottom-0 w-72 h-72 rounded-full bg-brand-500/10" />
        <div className="flex items-center gap-2 relative">
          <NestarLogo size="large" variant="light" />
        </div>
        <div className="relative">
          <h1 className="text-3xl font-semibold leading-tight mb-3">
            Simplify rental operations in Kenya
          </h1>
          <p className="text-slate-400 max-w-sm">
            One platform for property managers, landlords, caretakers, and tenants —
            billing, maintenance, and communication in one place.
          </p>
        </div>
        <p className="text-xs text-slate-500 relative">© 2026 NEST@R. All rights reserved.</p>
      </div>

      {/* Right panel - OTP form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center justify-center mb-8">
            <NestarLogo size="large" />
          </div>

          <h2 className="text-2xl font-semibold text-slate-900 mb-1">Login with Phone</h2>
          <p className="text-sm text-slate-500 mb-6">Enter your phone number to receive a login code via WhatsApp.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Phone Number">
              <div className="relative">
                <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <TextInput
                  type="tel"
                  placeholder="0712 345 678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-10"
                />
              </div>
            </Field>
            
            {error && (
              <p className="text-xs font-medium text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-100">
                {error}
              </p>
            )}
            
            <Button type="submit" className="w-full" icon={ArrowRight} disabled={loading}>
              {loading ? 'Sending OTP…' : 'Send OTP'}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-200">
            <p className="text-sm text-slate-500 text-center mb-3">Or sign in with email</p>
            <Link to="/login">
              <Button variant="secondary" className="w-full" icon={ArrowLeft}>
                Back to Email Login
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
