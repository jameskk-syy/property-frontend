import { useState, useEffect } from 'react'
import { Camera } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import Card from '../../components/ui/Card'
import Tabs from '../../components/ui/Tabs'
import Button from '../../components/ui/Button'
import Avatar from '../../components/ui/Avatar'
import { Field, TextInput } from '../../components/ui/Field'
import { LoadingState } from '../../components/ui/Spinner'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { ROLE_LABELS } from '../../data/roles'
import { api } from '../../api/client'

export default function AccountSettings() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [tab, setTab] = useState('Profile')

  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ name: '', phone: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let mounted = true
    api.getMyAccount()
      .then((res) => {
        if (!mounted || !res) return
        setProfile(res)
        setForm({ name: res.name || '', phone: res.phone || '' })
      })
      .catch(() => {})
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const updated = await api.updateMyAccount({ fullName: form.name, phone: form.phone })
      if (updated) {
        setProfile(updated)
        setForm({ name: updated.name || '', phone: updated.phone || '' })
      }
      showToast('Profile updated.')
    } catch (err) {
      showToast(err?.message || 'Could not update your profile.')
    } finally {
      setSaving(false)
    }
  }

  const displayName = profile?.name || user?.name || ''
  const displayEmail = profile?.email || user?.email || ''
  const displayOrg = profile?.organization || user?.org || ''

  return (
    <div>
      <PageHeader title="My Profile" description="Manage your personal details and preferences." />

      <Card padded={false} className="p-5">
        <Tabs tabs={['Profile', 'Notifications', 'Security']} active={tab} onChange={setTab} />

        {tab === 'Profile' && (
          loading ? (
            <div className="py-10"><LoadingState label="Loading your profile…" /></div>
          ) : (
            <form className="max-w-lg space-y-5" onSubmit={handleSave}>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar name={displayName} size={64} />
                  <button
                    type="button"
                    className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-brand-600"
                  >
                    <Camera size={12} />
                  </button>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">{displayName}</p>
                  <p className="text-xs text-slate-400">{ROLE_LABELS[user?.role] || ''}{displayOrg ? ` · ${displayOrg}` : ''}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Full name">
                  <TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </Field>
                <Field label="Phone number">
                  <TextInput value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+254 7XX XXX XXX" />
                </Field>
              </div>
              <Field label="Email address">
                <TextInput type="email" value={displayEmail} disabled readOnly />
              </Field>
              {profile?.national_id ? (
                <Field label="National ID / Passport">
                  <TextInput value={profile.national_id} disabled readOnly />
                </Field>
              ) : null}
              <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</Button>
            </form>
          )
        )}

        {tab === 'Notifications' && (
          <div className="max-w-lg space-y-3 text-sm">
            {['Payment confirmations', 'Rent due reminders', 'Maintenance updates', 'WhatsApp messages'].map((label) => (
              <label key={label} className="flex items-center justify-between py-2 border-b border-slate-50">
                <span className="text-slate-700">{label}</span>
                <input type="checkbox" defaultChecked className="w-4 h-4 accent-brand-500" />
              </label>
            ))}
            <p className="text-xs text-slate-400 pt-2">Notification preferences are coming soon.</p>
          </div>
        )}

        {tab === 'Security' && (
          <div className="max-w-lg space-y-4">
            <p className="text-sm text-slate-500">
              Reset your password by email — we'll send a secure link to {displayEmail}.
            </p>
            <Button
              variant="secondary"
              type="button"
              onClick={() => showToast('Password reset link sent.')}
            >
              Send Password Reset Link
            </Button>
          </div>
        )}
      </Card>
    </div>
  )
}
