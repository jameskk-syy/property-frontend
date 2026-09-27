import { useEffect, useState } from 'react'
import { X, FileText, CheckCircle } from 'lucide-react'
import Button from '../ui/Button'
import SignaturePad from '../ui/SignaturePad'

const CLAUSES = [
  {
    title: '1. PARTIES AND PREMISES',
    body:
      'Landlord/Property Manager: Dadis Estates Limited. This section records the Tenant’s full name, National ID/Passport number, telephone/contact, property/house name, house/room number, commencement date and monthly rent. A copy of the National ID or Passport is to be provided.'
  },
  {
    title: '2. TENANCY TERM',
    body:
      'a. The tenancy commences on the Commencement Date stated and continues month-to-month unless a fixed term is expressly stated in writing. b. If a fixed term applies, the term runs from the agreed start to the agreed end date. c. Any renewal, change of rent, change of premises or material variation should be recorded in writing and acknowledged by both parties.'
  },
  {
    title: '3. RENT, PAYMENT AND ARREARS',
    body:
      'a. The Tenant shall pay the full monthly rent on or before the 5th day of each month. b. Rent shall be paid only through the authorized payment channels in Clause 18, retaining proof of payment. c. A late-payment charge of Kshs. 500 applies after the 5th day; a further charge of Kshs. 1,000 may apply after the 10th day, where lawful. d. Persistent or material arrears constitute a breach and the Landlord may pursue lawful recovery or termination. e. Payments shall be properly recorded; the Tenant should report any discrepancy.'
  },
  {
    title: '4. SECURITY DEPOSIT',
    body:
      'a. The Tenant shall pay the security deposit before taking possession unless otherwise agreed in writing. b. The deposit is security for obligations and is not rent, and may not be used as last month’s rent without written consent. c. At the end of the tenancy the Landlord may deduct amounts properly due, including unpaid rent/utilities, missing items and repair costs. d. A reasonable statement of deductions shall be provided, with any undisputed balance refunded within a reasonable period after inspection and reconciliation.'
  },
  {
    title: '5. CONDITION, INVENTORY AND HANDOVER',
    body:
      'a. The Tenant confirms the premises were inspected and accepted in their recorded condition, subject to reported defects. b. Any inventory or move-in inspection form forms part of this Agreement. c. The Tenant shall promptly notify management of leaks, electrical faults, broken fittings or defects; repair costs during the tenancy are borne by the Tenant. d. The Tenant shall return the premises, keys, access devices and fixtures in substantially the same condition as received.'
  },
  {
    title: '6. CARE OF PREMISES AND FIXTURES',
    body:
      'a. The Tenant shall take reasonable care of the premises and all fixtures, fittings and equipment provided. b. The Tenant shall not remove, tamper with, bypass, overload, alter or damage electrical, water, security or metering installations. c. Damage caused by the Tenant, occupants or visitors shall be repaired at the Tenant’s reasonable cost, subject to evidence and/or assessment.'
  },
  {
    title: '7. CLEANLINESS, HYGIENE AND WASTE',
    body:
      'a. The Tenant shall keep the premises and shared areas reasonably clean and hygienic. b. The Tenant shall comply with the property’s waste-collection arrangements and pay any agreed garbage/waste fee, or a revised lawful charge communicated in advance. c. Waste shall be placed only in designated collection areas.'
  },
  {
    title: '8. NOISE, NUISANCE AND CONDUCT',
    body:
      'a. The Tenant shall not cause excessive noise, disturbance, harassment, threats or nuisance. b. Loud music, television, radios or speakers shall be kept at a reasonable level, particularly during quiet hours. c. The Tenant shall comply with reasonable security, gate and common-area rules.'
  },
  {
    title: '9. USE, OCCUPANTS AND SUBLETTING',
    body:
      'a. The premises shall be used solely as a private residence unless written permission is given. b. The Tenant shall not use the premises for illegal, hazardous or nuisance-causing activity. c. Only the Tenant and approved occupants may reside there, with material changes reported where required. d. The Tenant shall not assign, sublet or license the premises without the Landlord’s prior written consent, except as permitted by law.'
  },
  {
    title: '10. ALTERATIONS AND INSTALLATIONS',
    body:
      'a. The Tenant shall not drill, construct, repaint, install permanent fixtures, satellite equipment, additional appliances or partitions without prior written approval where required. b. Any approved work shall comply with safety requirements and be carried out at the Tenant’s cost unless otherwise agreed.'
  },
  {
    title: '11. ELECTRICITY, WATER AND OTHER UTILITIES',
    body:
      'a. The Tenant shall pay electricity charges attributable to the premises before the due date. b. The Tenant shall pay any separately metered water or utility charges as communicated. c. The Tenant shall not tamper with meters, wiring, pipes or connections and shall report faults immediately. d. Utility deposits, where applicable, are recorded in the schedule and reconciled per the actual account and law.'
  },
  {
    title: '12. ACCESS, INSPECTION AND REPAIRS',
    body:
      'a. The Landlord, manager, caretaker or authorized contractor may enter at a reasonable time, on reasonable notice where practicable, for inspection, repairs, maintenance, valuation or other legitimate purposes. b. In an emergency, entry may occur without prior notice where reasonably necessary to protect persons or property. c. The Tenant shall provide reasonable access for essential repairs.'
  },
  {
    title: '13. SECURITY AND GATE RULES',
    body:
      'a. The Tenant shall comply with reasonable gate, visitor, parking and access-control procedures. b. The Tenant shall not duplicate or transfer keys, access cards or security devices without authorization. c. The Tenant remains responsible for the conduct of invited visitors.'
  },
  {
    title: '14. REPAIRS AND RESPONSIBILITIES',
    body:
      'a. The Landlord is responsible for major structural repairs and repairs that are the Landlord’s responsibility under law, except where damage results from the Tenant’s negligence, misuse or breach. b. The Tenant is responsible for minor damage, cleaning and replacement caused by misuse or negligence. c. The Tenant shall not engage an external contractor for material repairs at the Landlord’s cost without prior approval, except in urgent cases to prevent immediate serious damage.'
  },
  {
    title: '15. DEFAULT AND REMEDIES',
    body:
      'a. A breach includes non-payment of rent, unauthorized subletting, serious nuisance, unlawful use, deliberate damage, utility tampering or material breach of property rules. b. Where a breach is capable of remedy, management may give written notice requiring the breach to be remedied within a reasonable or legally prescribed period. c. If not remedied, or where serious enough to justify termination, the Landlord may take lawful steps to recover possession, arrears or damages. d. Nothing authorizes either party to act contrary to mandatory Kenyan law.'
  },
  {
    title: '16. TERMINATION AND VACATING',
    body:
      'Either party may terminate a month-to-month tenancy by giving one clear month’s written notice, or as required by law. Notice should state the intended vacating date and be delivered in writing. The Tenant shall pay all rent and lawful charges up to vacant possession and return all keys/access devices, remove personal belongings and leave the premises clean. Any lawful loss from inadequate notice may be recovered from the deposit.'
  },
  {
    title: '17. DISPUTE RESOLUTION AND GOVERNING LAW',
    body:
      'a. The parties shall first attempt in good faith to resolve any dispute through written communication with the property manager. b. If unresolved, either party may refer the matter to the appropriate court, tribunal or lawful dispute-resolution mechanism. c. This Agreement is interpreted subject to the laws of Kenya, including mandatory protections applicable to the tenancy.'
  },
  {
    title: '18. AUTHORIZED PAYMENT DETAILS',
    body:
      'Account Name: DADIS ESTATES LIMITED. Co-operative Bank Account: 01192274991800. Business No.: 400200. Account No./Paybill Reference: 40045557. Bank/Branch: Co-operative Bank of Kenya / Stima Plaza. Tenants should pay only through authorised channels and retain the transaction reference. Management may request the reference and house/room number to reconcile the account.'
  },
  {
    title: '19. TENANCY FINANCIAL SCHEDULE',
    body:
      'Records Monthly Rent, Security/House Deposit, Water Deposit (if applicable), Electricity Deposit (if applicable), Garbage/Waste Fee per month and any Other Agreed Charge, all in Kshs.'
  },
]

export default function LeaseAgreementDialog({
  open,
  onClose,
  onComplete,
  tenant = {},
  caretakerName = '',
  submitting = false,
  title = 'Tenancy Agreement',
}) {
  const today = new Date().toISOString().slice(0, 10)
  const [tenantSig, setTenantSig] = useState('')
  const [caretakerSig, setCaretakerSig] = useState('')
  const [agreed, setAgreed] = useState(false)

  useEffect(() => {
    if (open) {
      setTenantSig('')
      setCaretakerSig('')
      setAgreed(false)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  const canSign = agreed && tenantSig && caretakerSig && !submitting

  const detailRow = (label, value) => (
    <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2 py-1.5 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-500 sm:w-52 shrink-0">{label}</span>
      <span className="text-sm font-medium text-slate-800">{value || '—'}</span>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 bg-slate-100 flex flex-col animate-modal-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 px-5 sm:px-8 py-4 bg-white border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
            <FileText size={18} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">{title} — Annex A</h2>
            <p className="text-xs text-slate-500">Review and sign to complete onboarding for {tenant.name || 'the tenant'}.</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <X size={18} />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-5 sm:px-8 py-6 space-y-6">
          <div className="bg-white rounded-xl2 border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-1">ANNEX A: TENANCY AGREEMENT</h3>
            <p className="text-sm text-slate-500 mb-5">
              This Agreement sets out the terms governing the letting and occupation of the residential
              premises identified below, promoting clear responsibilities, proper property management,
              peaceful occupation and transparent handling of rent, deposits, utilities, repairs and termination.
            </p>

            <div className="rounded-lg bg-slate-50 border border-slate-100 p-4 mb-6">
              <h4 className="text-sm font-semibold text-slate-700 mb-2">Tenant & Premises Details</h4>
              {detailRow('Landlord / Property Manager', 'Dadis Estates Limited')}
              {detailRow('Tenant Full Name', tenant.name)}
              {detailRow('National ID / Passport No.', tenant.idNumber)}
              {detailRow('Telephone / Contact', tenant.phone)}
              {detailRow('Email', tenant.email)}
              {detailRow('Property / House Name', tenant.propertyName || tenant.property)}
              {detailRow('House / Room No.', tenant.unit)}
              {detailRow('Income Range', tenant.incomeRange)}
              {detailRow('Commencement Date', tenant.leaseStart)}
              {detailRow('Monthly Rent (Kshs.)', tenant.rent ? Number(tenant.rent).toLocaleString() : '')}
            </div>

            <div className="space-y-4">
              {CLAUSES.map((c) => (
                <div key={c.title}>
                  <h4 className="text-sm font-semibold text-slate-800 mb-1">{c.title}</h4>
                  <p className="text-sm text-slate-600 leading-relaxed">{c.body}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100">
              <h4 className="text-sm font-semibold text-slate-800 mb-1">20. ACKNOWLEDGEMENT</h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                By signing below, the parties confirm that they have read and understood this Agreement,
                that the information supplied is accurate, and that they agree to comply with its terms
                subject to applicable law. The Tenant acknowledges receipt of a copy of the Agreement.
              </p>
            </div>
          </div>

          {/* Signatures */}
          <div className="bg-white rounded-xl2 border border-slate-200 p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Digital Signatures</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="mb-2">
                  <p className="text-sm font-medium text-slate-700">Tenant</p>
                  <p className="text-sm text-slate-500">{tenant.name || '—'}</p>
                </div>
                <SignaturePad label="Tenant signature" onChange={setTenantSig} />
                <p className="text-xs text-slate-400 mt-1">Date: {today}</p>
              </div>
              <div>
                <div className="mb-2">
                  <p className="text-sm font-medium text-slate-700">Witness / Caretaker</p>
                  <p className="text-sm text-slate-500">{caretakerName || '—'}</p>
                </div>
                <SignaturePad label="Caretaker signature" onChange={setCaretakerSig} />
                <p className="text-xs text-slate-400 mt-1">Date: {today}</p>
              </div>
            </div>

            <label className="flex items-start gap-2.5 mt-5 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-slate-300 text-brand-500 focus:ring-brand-400"
              />
              <span className="text-sm text-slate-600">
                Both parties confirm they have read, understood and agree to the terms of this Tenancy Agreement.
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 px-5 sm:px-8 py-4 bg-white border-t border-slate-200 shrink-0">
        <Button variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
        <Button
          icon={CheckCircle}
          disabled={!canSign}
          onClick={() =>
            onComplete({
              tenantSignature: tenantSig,
              caretakerSignature: caretakerSig,
              signedAt: new Date().toISOString(),
            })
          }
        >
          {submitting ? 'Finalizing…' : 'Sign & Complete Onboarding'}
        </Button>
      </div>
    </div>
  )
}
