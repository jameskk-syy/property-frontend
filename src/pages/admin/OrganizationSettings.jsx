import { useState, useEffect } from 'react'
import { Pencil, ChevronLeft, ChevronRight } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import Card from '../../components/ui/Card'
import Tabs from '../../components/ui/Tabs'
import Button from '../../components/ui/Button'
import FormModal from '../../components/patterns/FormModal'
import { Field, TextInput, Select } from '../../components/ui/Field'
import { TableSkeleton } from '../../components/ui/Skeleton'
import EmptyState from '../../components/ui/EmptyState'
import { useToast } from '../../context/ToastContext'
import { formatKsh } from '../../data/mockData'
import { api } from '../../api/client'

const PAGE_SIZE = 25

export default function OrganizationSettings() {
  const [tab, setTab] = useState('Organization')
  const { showToast } = useToast()

  // --- Org-level defaults ---
  const [billing, setBilling] = useState({
    rent_due_day: 5, late_fee_grace_days: 0, late_fee_amount: 500,
    second_penalty_days: 10, second_penalty_amount: 1000,
    garbage_charge: 0, water_rate_per_unit: 150,
  })
  const [savingBilling, setSavingBilling] = useState(false)

  useEffect(() => {
    api.getBillingSettings().then((res) => {
      if (res) setBilling((b) => ({ ...b, ...res }))
    }).catch(() => {})
  }, [])

  const setB = (k, v) => setBilling((b) => ({ ...b, [k]: v }))

  // Apartment list for the "choose apartment" select in Billing Defaults.
  const [apartments, setApartments] = useState([])
  const [selectedApartment, setSelectedApartment] = useState('')

  useEffect(() => {
    api.getProperties().then((res) => {
      if (Array.isArray(res)) setApartments(res)
    }).catch(() => {})
  }, [])

  // --- M-Pesa / Daraja credentials ---
  const [mpesa, setMpesa] = useState({
    enabled: 1, environment: 'sandbox', shortcode: '', paybill_number: '',
    consumer_key: '', consumer_secret: '', passkey: '', callback_base_url: '',
  })
  const [mpesaSet, setMpesaSet] = useState({ consumer_secret_set: false, passkey_set: false })
  const [savingMpesa, setSavingMpesa] = useState(false)

  useEffect(() => {
    api.getMpesaSettings().then((res) => {
      if (res) {
        setMpesa((m) => ({
          ...m,
          enabled: res.enabled ?? 1,
          environment: res.environment || 'sandbox',
          shortcode: res.shortcode || '',
          paybill_number: res.paybill_number || '',
          consumer_key: res.consumer_key || '',
          callback_base_url: res.callback_base_url || '',
          consumer_secret: '', passkey: '',
        }))
        setMpesaSet({
          consumer_secret_set: !!res.consumer_secret_set,
          passkey_set: !!res.passkey_set,
        })
      }
    }).catch(() => {})
  }, [])

  const setM = (k, v) => setMpesa((m) => ({ ...m, [k]: v }))

  const saveMpesa = async (e) => {
    e.preventDefault()
    setSavingMpesa(true)
    try {
      const payload = {
        enabled: mpesa.enabled ? 1 : 0,
        environment: mpesa.environment,
        shortcode: mpesa.shortcode,
        paybill_number: mpesa.paybill_number,
        consumer_key: mpesa.consumer_key,
        callback_base_url: mpesa.callback_base_url,
      }
      // Only send secrets when the admin typed a new value (blank = keep existing).
      if (mpesa.consumer_secret) payload.consumer_secret = mpesa.consumer_secret
      if (mpesa.passkey) payload.passkey = mpesa.passkey
      const res = await api.setMpesaSettings(payload)
      if (res) {
        setMpesaSet({
          consumer_secret_set: !!res.consumer_secret_set,
          passkey_set: !!res.passkey_set,
        })
        setMpesa((m) => ({ ...m, consumer_secret: '', passkey: '' }))
      }
      showToast('M-Pesa credentials saved.')
    } catch (err) {
      showToast(err?.message || 'Could not save M-Pesa settings.')
    } finally {
      setSavingMpesa(false)
    }
  }

  // --- Messaging (SMS / Email / WhatsApp) credentials ---
  const [msg, setMsg] = useState({
    sms_enabled: 0, sms_provider: "Africa's Talking", sms_sender_id: '', sms_api_key: '', sms_api_secret: '', sms_base_url: '',
    email_enabled: 0, email_from_name: '', email_from_address: '', smtp_host: '', smtp_port: 587, smtp_use_tls: 1, smtp_username: '', smtp_password: '',
    whatsapp_enabled: 0, whatsapp_provider: 'Meta Cloud API', whatsapp_phone_number_id: '', whatsapp_access_token: '', whatsapp_base_url: '',
  })
  const [msgSet, setMsgSet] = useState({ sms_api_secret_set: false, smtp_password_set: false, whatsapp_access_token_set: false })
  const [savingMsg, setSavingMsg] = useState(false)

  useEffect(() => {
    api.getMessagingSettings().then((res) => {
      if (res) {
        setMsg((m) => ({
          ...m,
          sms_enabled: res.sms_enabled ?? 0,
          sms_provider: res.sms_provider || "Africa's Talking",
          sms_sender_id: res.sms_sender_id || '',
          sms_api_key: res.sms_api_key || '',
          sms_base_url: res.sms_base_url || '',
          email_enabled: res.email_enabled ?? 0,
          email_from_name: res.email_from_name || '',
          email_from_address: res.email_from_address || '',
          smtp_host: res.smtp_host || '',
          smtp_port: res.smtp_port ?? 587,
          smtp_use_tls: res.smtp_use_tls ?? 1,
          smtp_username: res.smtp_username || '',
          whatsapp_enabled: res.whatsapp_enabled ?? 0,
          whatsapp_provider: res.whatsapp_provider || 'Meta Cloud API',
          whatsapp_phone_number_id: res.whatsapp_phone_number_id || '',
          whatsapp_base_url: res.whatsapp_base_url || '',
          sms_api_secret: '', smtp_password: '', whatsapp_access_token: '',
        }))
        setMsgSet({
          sms_api_secret_set: !!res.sms_api_secret_set,
          smtp_password_set: !!res.smtp_password_set,
          whatsapp_access_token_set: !!res.whatsapp_access_token_set,
        })
      }
    }).catch(() => {})
  }, [])

  const setMsgField = (k, v) => setMsg((m) => ({ ...m, [k]: v }))

  const saveMessaging = async (e) => {
    e.preventDefault()
    setSavingMsg(true)
    try {
      const payload = {
        sms_enabled: msg.sms_enabled ? 1 : 0,
        sms_provider: msg.sms_provider,
        sms_sender_id: msg.sms_sender_id,
        sms_api_key: msg.sms_api_key,
        sms_base_url: msg.sms_base_url,
        email_enabled: msg.email_enabled ? 1 : 0,
        email_from_name: msg.email_from_name,
        email_from_address: msg.email_from_address,
        smtp_host: msg.smtp_host,
        smtp_port: Number(msg.smtp_port) || 587,
        smtp_use_tls: msg.smtp_use_tls ? 1 : 0,
        smtp_username: msg.smtp_username,
        whatsapp_enabled: msg.whatsapp_enabled ? 1 : 0,
        whatsapp_provider: msg.whatsapp_provider,
        whatsapp_phone_number_id: msg.whatsapp_phone_number_id,
        whatsapp_base_url: msg.whatsapp_base_url,
      }
      // Only send secrets when the admin typed a new value (blank = keep existing).
      if (msg.sms_api_secret) payload.sms_api_secret = msg.sms_api_secret
      if (msg.smtp_password) payload.smtp_password = msg.smtp_password
      if (msg.whatsapp_access_token) payload.whatsapp_access_token = msg.whatsapp_access_token
      const res = await api.setMessagingSettings(payload)
      if (res) {
        setMsgSet({
          sms_api_secret_set: !!res.sms_api_secret_set,
          smtp_password_set: !!res.smtp_password_set,
          whatsapp_access_token_set: !!res.whatsapp_access_token_set,
        })
        setMsg((m) => ({ ...m, sms_api_secret: '', smtp_password: '', whatsapp_access_token: '' }))
      }
      showToast('Messaging credentials saved.')
    } catch (err) {
      showToast(err?.message || 'Could not save messaging settings.')
    } finally {
      setSavingMsg(false)
    }
  }

  const saveBilling = async (e) => {
    e.preventDefault()
    setSavingBilling(true)
    try {
      await api.setBillingSettings({
        rent_due_day: Number(billing.rent_due_day) || 5,
        late_fee_grace_days: Number(billing.late_fee_grace_days) || 0,
        late_fee_amount: Number(billing.late_fee_amount) || 0,
        second_penalty_days: Number(billing.second_penalty_days) || 0,
        second_penalty_amount: Number(billing.second_penalty_amount) || 0,
        garbage_charge: Number(billing.garbage_charge) || 0,
        water_rate_per_unit: Number(billing.water_rate_per_unit) || 0,
      })
      showToast('Organization billing defaults saved.')
    } catch (err) {
      showToast(err?.message || 'Could not save billing settings.')
    } finally {
      setSavingBilling(false)
    }
  }

  // --- Per-apartment charges table (server-side paginated) ---
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loadingRows, setLoadingRows] = useState(false)
  const [editRow, setEditRow] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [savingRow, setSavingRow] = useState(false)

  const loadRows = (opts = {}) => {
    const p = opts.page ?? page
    const s = opts.search ?? search
    setLoadingRows(true)
    api.listPropertyBillingSettings({ page: p, pageSize: PAGE_SIZE, search: s || null })
      .then((res) => {
        setRows(res?.rows || [])
        setTotal(res?.total || 0)
      })
      .catch(() => { setRows([]); setTotal(0) })
      .finally(() => setLoadingRows(false))
  }

  useEffect(() => {
    if (tab === 'Per-Apartment Charges') loadRows({ page: 1 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const goToPage = (p) => {
    const next = Math.min(Math.max(1, p), pageCount)
    setPage(next)
    loadRows({ page: next })
  }

  const runSearch = (e) => {
    e.preventDefault()
    setPage(1)
    loadRows({ page: 1 })
  }

  // Prefill the edit form with the row's effective values (override wins, else
  // the org default that's currently in force), so editing shows the real
  // current numbers instead of blanks.
  const prefillFrom = (row) => {
    const ov = row.overrides || {}
    const ef = row.effective || {}
    // Prefer an explicit override, then the effective value, then any flat
    // value on the row itself (covers the getBillingSettings flat shape).
    const pick = (k) => {
      const v = ov[k] ?? ef[k] ?? row[k]
      return v === null || v === undefined ? '' : v
    }
    return {
      rent_due_day: pick('rent_due_day'),
      garbage_charge: pick('garbage_charge'),
      water_rate_per_unit: pick('water_rate_per_unit'),
      late_fee_amount: pick('late_fee_amount'),
      second_penalty_amount: pick('second_penalty_amount'),
    }
  }

  const openEdit = (row) => {
    setEditForm(prefillFrom(row))
    setEditRow(row)
  }

  // Open the editor for an apartment chosen from the Billing Defaults select.
  const editSelectedApartment = async () => {
    if (!selectedApartment) return
    const apt = apartments.find((a) => a.id === selectedApartment)
    try {
      const res = await api.getBillingSettings({ property: selectedApartment })
      // getBillingSettings returns a flat effective object.
      const row = {
        property: selectedApartment,
        property_name: apt?.name || selectedApartment,
        overrides: {},
        effective: res || {},
        ...res,
      }
      openEdit(row)
    } catch (err) {
      showToast(err?.message || 'Could not load apartment charges.')
    }
  }

  const saveRow = async () => {
    if (!editRow) return
    setSavingRow(true)
    try {
      await api.setPropertyBillingSettings(editRow.property, {
        rent_due_day: editForm.rent_due_day === '' ? '' : Number(editForm.rent_due_day),
        garbage_charge: editForm.garbage_charge === '' ? '' : Number(editForm.garbage_charge),
        water_rate_per_unit: editForm.water_rate_per_unit === '' ? '' : Number(editForm.water_rate_per_unit),
        late_fee_amount: editForm.late_fee_amount === '' ? '' : Number(editForm.late_fee_amount),
        second_penalty_amount: editForm.second_penalty_amount === '' ? '' : Number(editForm.second_penalty_amount),
      })
      showToast(`${editRow.property_name} charges updated.`)
      setEditRow(null)
      loadRows()
    } catch (err) {
      showToast(err?.message || 'Could not update property charges.')
    } finally {
      setSavingRow(false)
    }
  }

  return (
    <div>
      <PageHeader title="Organization & System Settings" description="Configure your workspace, billing, and integrations." />
      <Card padded={false} className="p-5">
        <Tabs
          tabs={['Organization', 'Billing Defaults', 'Per-Apartment Charges', 'M-Pesa', 'Messaging', '', '']}
          active={tab}
          onChange={setTab}
        />

        {tab === 'Organization' && (
          <form className="space-y-4 max-w-lg" onSubmit={(e) => e.preventDefault()}>
            <Field label="Organization name"><TextInput defaultValue="Nest HQ" /></Field>
            <Field label="Support email"><TextInput defaultValue="support@nest.co.ke" /></Field>
            <Field label="Default currency">
              <Select defaultValue="KES">
                <option value="KES">Kenyan Shilling (KSh)</option>
                <option value="USD">US Dollar ($)</option>
              </Select>
            </Field>
            <Field label="Timezone">
              <Select defaultValue="EAT"><option value="EAT">East Africa Time (GMT+3)</option></Select>
            </Field>
            <Button type="submit">Save Changes</Button>
          </form>
        )}

        {tab === 'Billing Defaults' && (
          <form className="max-w-2xl space-y-6" onSubmit={saveBilling}>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-1">Organization-wide Defaults</h3>
              <p className="text-xs text-slate-500 mb-3">Applied to every apartment unless overridden per apartment below.</p>

              {/* Jump straight to a specific apartment's charge overrides. */}
              <div className="flex items-end gap-2 mb-4 p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex-1">
                  <Field label="Choose apartment to override">
                    <Select value={selectedApartment} onChange={(e) => setSelectedApartment(e.target.value)}>
                      <option value="">Select an apartment…</option>
                      {apartments.map((a) => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </Select>
                  </Field>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  icon={Pencil}
                  disabled={!selectedApartment}
                  onClick={editSelectedApartment}
                >
                  Edit charges
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Rent due day of month">
                  <TextInput type="number" min="1" max="28" value={billing.rent_due_day} onChange={(e) => setB('rent_due_day', e.target.value)} />
                </Field>
                <Field label="Late fee after (grace days)">
                  <TextInput type="number" min="0" value={billing.late_fee_grace_days} onChange={(e) => setB('late_fee_grace_days', e.target.value)} />
                </Field>
                <Field label="Late fee amount (KSh)">
                  <TextInput type="number" min="0" value={billing.late_fee_amount} onChange={(e) => setB('late_fee_amount', e.target.value)} />
                </Field>
                <Field label="Second penalty after (days)">
                  <TextInput type="number" min="0" value={billing.second_penalty_days} onChange={(e) => setB('second_penalty_days', e.target.value)} />
                </Field>
                <Field label="Second penalty amount (KSh)">
                  <TextInput type="number" min="0" value={billing.second_penalty_amount} onChange={(e) => setB('second_penalty_amount', e.target.value)} />
                </Field>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-1">Default Standing Charges</h3>
              <p className="text-xs text-slate-500 mb-3">Garbage is a flat monthly fee; water is billed on metered units × rate.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Garbage charge (KSh / month)">
                  <TextInput type="number" min="0" value={billing.garbage_charge} onChange={(e) => setB('garbage_charge', e.target.value)} />
                </Field>
                <Field label="Water rate (KSh / unit)">
                  <TextInput type="number" min="0" value={billing.water_rate_per_unit} onChange={(e) => setB('water_rate_per_unit', e.target.value)} />
                </Field>
              </div>
            </div>
            <Button type="submit" disabled={savingBilling}>{savingBilling ? 'Saving…' : 'Save Defaults'}</Button>
          </form>
        )}

        {tab === 'Per-Apartment Charges' && (
          <div className="mt-4">
            <div className="flex items-center justify-between gap-3 mb-4">
              <form onSubmit={runSearch} className="w-full max-w-xs">
                <TextInput
                  placeholder="Search apartments…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </form>
              <p className="text-xs text-slate-400 shrink-0">{total} apartment{total === 1 ? '' : 's'}</p>
            </div>

            {loadingRows ? (
              <div className="-mx-5"><TableSkeleton columns={6} rows={6} /></div>
            ) : rows.length === 0 ? (
              <EmptyState message="No apartments found" hint="Onboard a property to configure its charges." />
            ) : (
              <>
                <div className="overflow-x-auto -mx-5">
                  <table className="w-full text-sm border-separate border-spacing-0">
                    <thead>
                      <tr className="text-left text-slate-500 bg-slate-50">
                        <th className="font-semibold px-5 py-3 border-y border-slate-200">Apartment</th>
                        <th className="font-semibold px-5 py-3 border-y border-slate-200">Rent Due Day</th>
                        <th className="font-semibold px-5 py-3 border-y border-slate-200">Garbage</th>
                        <th className="font-semibold px-5 py-3 border-y border-slate-200">Water Rate</th>
                        <th className="font-semibold px-5 py-3 border-y border-slate-200">Late Fee</th>
                        <th className="font-semibold px-5 py-3 border-y border-slate-200"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => (
                        <tr key={r.property} className={i % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}>
                          <td className="px-5 py-3.5 border-b border-slate-100 font-medium text-slate-800">{r.property_name}</td>
                          <td className="px-5 py-3.5 border-b border-slate-100">
                            {r.effective.rent_due_day}
                            {r.overrides.rent_due_day ? <span className="ml-1 text-[10px] text-brand-500">(override)</span> : null}
                          </td>
                          <td className="px-5 py-3.5 border-b border-slate-100">{formatKsh(r.effective.garbage_charge)}</td>
                          <td className="px-5 py-3.5 border-b border-slate-100">{formatKsh(r.effective.water_rate_per_unit)}/unit</td>
                          <td className="px-5 py-3.5 border-b border-slate-100">{formatKsh(r.effective.late_fee_amount)}</td>
                          <td className="px-5 py-3.5 border-b border-slate-100 text-right">
                            <Button variant="ghost" size="sm" icon={Pencil} onClick={() => openEdit(r)}>Edit</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {pageCount > 1 && (
                  <div className="flex items-center justify-between pt-4">
                    <p className="text-xs text-slate-500">Page {page} of {pageCount}</p>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => goToPage(page - 1)}
                        disabled={page <= 1}
                        className="h-8 px-2.5 rounded-lg border border-slate-200 flex items-center gap-1 text-sm text-slate-600 disabled:opacity-40 hover:bg-slate-100"
                      >
                        <ChevronLeft size={15} /> Prev
                      </button>
                      <button
                        onClick={() => goToPage(page + 1)}
                        disabled={page >= pageCount}
                        className="h-8 px-2.5 rounded-lg border border-slate-200 flex items-center gap-1 text-sm text-slate-600 disabled:opacity-40 hover:bg-slate-100"
                      >
                        Next <ChevronRight size={15} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {tab === 'M-Pesa' && (
          <form className="max-w-2xl space-y-6" onSubmit={saveMpesa}>
            <div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-semibold text-slate-900">M-Pesa (Daraja) Credentials</h3>
                <label className="flex items-center gap-2 text-xs text-slate-600">
                  <input type="checkbox" checked={!!mpesa.enabled} onChange={(e) => setM('enabled', e.target.checked ? 1 : 0)} className="w-4 h-4 accent-brand-500" />
                  Enabled
                </label>
              </div>
              <p className="text-xs text-slate-500 mb-3">Used for STK push (rent + deposit, monthly rent). Secrets are stored encrypted and never shown again.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Environment">
                  <Select value={mpesa.environment} onChange={(e) => setM('environment', e.target.value)}>
                    <option value="sandbox">Sandbox</option>
                    <option value="production">Production</option>
                  </Select>
                </Field>
                <Field label="STK Shortcode (e.g. 174379)">
                  <TextInput value={mpesa.shortcode} onChange={(e) => setM('shortcode', e.target.value)} placeholder="174379" />
                </Field>
                <Field label="Paybill / Till (display)">
                  <TextInput value={mpesa.paybill_number} onChange={(e) => setM('paybill_number', e.target.value)} placeholder="Paybill number" />
                </Field>
                <Field label="Consumer Key">
                  <TextInput value={mpesa.consumer_key} onChange={(e) => setM('consumer_key', e.target.value)} placeholder="Daraja consumer key" />
                </Field>
                <Field label={`Consumer Secret${mpesaSet.consumer_secret_set ? ' (set — leave blank to keep)' : ''}`}>
                  <TextInput type="password" value={mpesa.consumer_secret} onChange={(e) => setM('consumer_secret', e.target.value)} placeholder={mpesaSet.consumer_secret_set ? '••••••••' : 'Daraja consumer secret'} />
                </Field>
                <Field label={`Lipa Na M-Pesa Passkey${mpesaSet.passkey_set ? ' (set — leave blank to keep)' : ''}`}>
                  <TextInput type="password" value={mpesa.passkey} onChange={(e) => setM('passkey', e.target.value)} placeholder={mpesaSet.passkey_set ? '••••••••' : 'Passkey'} />
                </Field>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-1">Callback URL</h3>
              <p className="text-xs text-slate-500 mb-3">Public HTTPS base URL Safaricom can reach (e.g. your ngrok URL). The callback path is appended automatically.</p>
              <Field label="Callback Base URL">
                <TextInput value={mpesa.callback_base_url} onChange={(e) => setM('callback_base_url', e.target.value)} placeholder="https://xxxx.ngrok-free.app" />
              </Field>
            </div>
            <Button type="submit" disabled={savingMpesa}>{savingMpesa ? 'Saving…' : 'Save M-Pesa Settings'}</Button>
          </form>
        )}

        {tab === 'Messaging' && (
          <form className="w-full space-y-8" onSubmit={saveMessaging}>
            <p className="text-xs text-slate-500 -mb-2">
              Credentials used to send rent reminders and notifications over SMS, WhatsApp and Email.
              Secrets are stored encrypted and never shown again — leave a secret blank to keep the current value.
            </p>

            <div className='grid md:gap-14 grid-cols-1 md:grid-cols-2'>
                {/* SMS */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-semibold text-slate-900">SMS Gateway</h3>
                <label className="flex items-center gap-2 text-xs text-slate-600">
                  <input type="checkbox" checked={!!msg.sms_enabled} onChange={(e) => setMsgField('sms_enabled', e.target.checked ? 1 : 0)} className="w-4 h-4 accent-brand-500" />
                  Enabled
                </label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Provider">
                  <Select value={msg.sms_provider} onChange={(e) => setMsgField('sms_provider', e.target.value)}>
                    <option>Africa's Talking</option>
                    <option>Twilio</option>
                    <option>Generic HTTP</option>
                  </Select>
                </Field>
                <Field label="Sender ID / Shortcode">
                  <TextInput value={msg.sms_sender_id} onChange={(e) => setMsgField('sms_sender_id', e.target.value)} placeholder="e.g. DADIS" />
                </Field>
                <Field label="API Key / Username">
                  <TextInput value={msg.sms_api_key} onChange={(e) => setMsgField('sms_api_key', e.target.value)} placeholder="API key or username" />
                </Field>
                <Field label={`API Secret / Token${msgSet.sms_api_secret_set ? ' (set — leave blank to keep)' : ''}`}>
                  <TextInput type="password" value={msg.sms_api_secret} onChange={(e) => setMsgField('sms_api_secret', e.target.value)} placeholder={msgSet.sms_api_secret_set ? '••••••••' : 'API secret'} />
                </Field>
                <Field label="Base URL (Generic HTTP)">
                  <TextInput value={msg.sms_base_url} onChange={(e) => setMsgField('sms_base_url', e.target.value)} placeholder="https://gateway.example.com" />
                </Field>
              </div>
            </div>

            {/* Email */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-semibold text-slate-900">Email (SMTP)</h3>
                <label className="flex items-center gap-2 text-xs text-slate-600">
                  <input type="checkbox" checked={!!msg.email_enabled} onChange={(e) => setMsgField('email_enabled', e.target.checked ? 1 : 0)} className="w-4 h-4 accent-brand-500" />
                  Enabled
                </label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="From Name">
                  <TextInput value={msg.email_from_name} onChange={(e) => setMsgField('email_from_name', e.target.value)} placeholder="Dadis Estates" />
                </Field>
                <Field label="From Email Address">
                  <TextInput value={msg.email_from_address} onChange={(e) => setMsgField('email_from_address', e.target.value)} placeholder="billing@dadis.co.ke" />
                </Field>
                <Field label="SMTP Host">
                  <TextInput value={msg.smtp_host} onChange={(e) => setMsgField('smtp_host', e.target.value)} placeholder="smtp.gmail.com" />
                </Field>
                <Field label="SMTP Port">
                  <TextInput type="number" value={msg.smtp_port} onChange={(e) => setMsgField('smtp_port', e.target.value)} placeholder="587" />
                </Field>
                <Field label="SMTP Username">
                  <TextInput value={msg.smtp_username} onChange={(e) => setMsgField('smtp_username', e.target.value)} placeholder="username" />
                </Field>
                <Field label={`SMTP Password${msgSet.smtp_password_set ? ' (set — leave blank to keep)' : ''}`}>
                  <TextInput type="password" value={msg.smtp_password} onChange={(e) => setMsgField('smtp_password', e.target.value)} placeholder={msgSet.smtp_password_set ? '••••••••' : 'SMTP password'} />
                </Field>
                <Field label="Use TLS">
                  <label className="flex items-center gap-2 text-sm text-slate-600 h-9">
                    <input type="checkbox" checked={!!msg.smtp_use_tls} onChange={(e) => setMsgField('smtp_use_tls', e.target.checked ? 1 : 0)} className="w-4 h-4 accent-brand-500" />
                    Enabled
                  </label>
                </Field>
              </div>
            </div>

            {/* WhatsApp */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-semibold text-slate-900">WhatsApp</h3>
                <label className="flex items-center gap-2 text-xs text-slate-600">
                  <input type="checkbox" checked={!!msg.whatsapp_enabled} onChange={(e) => setMsgField('whatsapp_enabled', e.target.checked ? 1 : 0)} className="w-4 h-4 accent-brand-500" />
                  Enabled
                </label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Provider">
                  <Select value={msg.whatsapp_provider} onChange={(e) => setMsgField('whatsapp_provider', e.target.value)}>
                    <option>Meta Cloud API</option>
                    <option>Twilio</option>
                    <option>Generic HTTP</option>
                  </Select>
                </Field>
                <Field label="Phone Number ID / From">
                  <TextInput value={msg.whatsapp_phone_number_id} onChange={(e) => setMsgField('whatsapp_phone_number_id', e.target.value)} placeholder="Phone number ID" />
                </Field>
                <Field label={`Access Token${msgSet.whatsapp_access_token_set ? ' (set — leave blank to keep)' : ''}`}>
                  <TextInput type="password" value={msg.whatsapp_access_token} onChange={(e) => setMsgField('whatsapp_access_token', e.target.value)} placeholder={msgSet.whatsapp_access_token_set ? '••••••••' : 'Access token'} />
                </Field>
                <Field label="API Base URL">
                  <TextInput value={msg.whatsapp_base_url} onChange={(e) => setMsgField('whatsapp_base_url', e.target.value)} placeholder="https://graph.facebook.com/v19.0" />
                </Field>
              </div>
            </div>
            </div>

            <Button type="submit" disabled={savingMsg}>{savingMsg ? 'Saving…' : 'Save Messaging Settings'}</Button>
          </form>
        )}
{/* 
        {tab === 'Notifications' && (
          <div className="max-w-lg space-y-3 text-sm">
            {['Rent overdue alerts', 'New payment received', 'New vacancy leads', 'Maintenance requests'].map((label) => (
              <label key={label} className="flex items-center justify-between py-2 border-b border-slate-50">
                <span className="text-slate-700">{label}</span>
                <input type="checkbox" defaultChecked className="w-4 h-4 accent-brand-500" />
              </label>
            ))}
          </div>
        )}

        {tab === 'Integrations' && (
          <div className="max-w-lg space-y-3">
            {['M-Pesa Daraja API', 'WhatsApp Business API', 'Bank Reconciliation Feed'].map((label) => (
              <div key={label} className="flex items-center justify-between py-3 border-b border-slate-50">
                <span className="text-sm font-medium text-slate-700">{label}</span>
                <span className="text-xs font-medium text-emerald-600">Connected</span>
              </div>
            ))}
          </div>
        )} */}
      </Card>

      {/* Edit a single apartment's charges */}
      <FormModal
        open={!!editRow}
        onClose={() => setEditRow(null)}
        title={editRow ? `Charges — ${editRow.property_name}` : 'Charges'}
        description="Prefilled with this apartment's current charges. Clear a field to inherit the organization default."
        onSubmit={saveRow}
        submitLabel={savingRow ? 'Saving…' : 'Save Charges'}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Rent due day">
            <TextInput type="number" min="1" max="28" value={editForm.rent_due_day} onChange={(e) => setEditForm({ ...editForm, rent_due_day: e.target.value })} placeholder="Inherit" />
          </Field>
          <Field label="Garbage charge (KSh/mo)">
            <TextInput type="number" min="0" value={editForm.garbage_charge} onChange={(e) => setEditForm({ ...editForm, garbage_charge: e.target.value })} placeholder="Inherit" />
          </Field>
          <Field label="Water rate (KSh/unit)">
            <TextInput type="number" min="0" value={editForm.water_rate_per_unit} onChange={(e) => setEditForm({ ...editForm, water_rate_per_unit: e.target.value })} placeholder="Inherit" />
          </Field>
          <Field label="Late fee amount (KSh)">
            <TextInput type="number" min="0" value={editForm.late_fee_amount} onChange={(e) => setEditForm({ ...editForm, late_fee_amount: e.target.value })} placeholder="Inherit" />
          </Field>
          <Field label="Second penalty (KSh)">
            <TextInput type="number" min="0" value={editForm.second_penalty_amount} onChange={(e) => setEditForm({ ...editForm, second_penalty_amount: e.target.value })} placeholder="Inherit" />
          </Field>
        </div>
      </FormModal>
    </div>
  )
}
