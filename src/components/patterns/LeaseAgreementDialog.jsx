import { useEffect, useState } from 'react'
import { X, FileText, CheckCircle } from 'lucide-react'
import Button from '../ui/Button'
import SignaturePad from '../ui/SignaturePad'

const CLAUSES = [
  {
    title: '1. PARTIES AND PREMISES',
    body: `Landlord/Property Manager: NEST@R

Note: Copy of National ID or Passport to be provided.`
  },
  {
    title: '2. TENANCY TERM',
    body: `a. The tenancy shall commence on the Commencement Date stated above and shall continue on a month-to-month basis unless a fixed term is expressly stated in writing below.

b. If a fixed term applies, the term shall be as specified in the lease details above.

c. Any renewal, change of rent, change of premises or material variation to this Agreement should be recorded in writing and acknowledged by both parties.`
  },
  {
    title: '3. RENT, PAYMENT AND ARREARS',
    body: `a. The Tenant shall pay the full monthly rent on or before the 5th day of each month.

b. Rent shall be paid only through the authorized payment channels set out in Clause 18. The Tenant should retain proof of payment and, where requested, forward the payment reference/slip to the caretaker or management.

c. A late-payment charge of Kshs. 500 shall apply where rent remains unpaid after the 5th day. Where rent remains unpaid after the 10th day, a further/default charge of Kshs. 1,000 may apply, provided that such charges are lawful and are not applied contrary to applicable law.

d. Persistent or material rent arrears constitute a breach of this Agreement. The Landlord may issue the appropriate demand, notice and/or commence lawful recovery or termination proceedings available under applicable law.

e. Any payment received shall be properly recorded by management. The Tenant should promptly report any discrepancy in the rent statement.`
  },
  {
    title: '4. SECURITY DEPOSIT',
    body: `a. The Tenant shall pay the security deposit stated in the schedule below before taking possession, unless otherwise agreed in writing.

b. The deposit is security for the Tenant's obligations and is not rent. The Tenant may not use the deposit as the last month's rent without the Landlord's written consent.

c. At the end of the tenancy, the Landlord may deduct from the deposit amounts properly due under this Agreement, including unpaid rent/utilities, missing items, paint and any cost of repairs.

d. The Landlord shall provide a reasonable statement of deductions where deductions are made. Any undisputed balance shall be refunded within a reasonable period after vacant possession, inspection and reconciliation of outstanding bills.`
  },
  {
    title: '5. CONDITION, INVENTORY AND HANDOVER',
    body: `a. The Tenant confirms that the premises have been inspected before occupation and are accepted in their recorded condition, subject to defects reported to management in writing.

b. Where an inventory or move-in inspection form is provided, it forms part of this Agreement.

c. The Tenant shall notify management promptly of leaks, electrical faults, broken fittings, structural defects or other matters requiring attention. Costs related to the repairs occurring during the tenancy shall be borne by the tenant.

d. The Tenant shall return the premises, keys, access devices and Landlord's fixtures in substantially the same condition as received.`
  },
  {
    title: '6. CARE OF PREMISES AND FIXTURES',
    body: `a. The Tenant shall take reasonable care of the premises and all fixtures, fittings and equipment provided by the Landlord, including switches, sockets, meter boxes, water heaters, bulb holders, sinks, shelves, doors, locks, windows, sanitary fittings and painted surfaces.

b. The Tenant shall not remove, tamper with, bypass, overload, alter or damage electrical, water, security or metering installations.

c. Damage caused by the Tenant, occupants or visitors shall be repaired at the Tenant's reasonable cost, subject to appropriate evidence and/or assessment.`
  },
  {
    title: '7. CLEANLINESS, HYGIENE AND WASTE',
    body: `a. The Tenant shall keep the premises and shared areas reasonably clean and hygienic and shall use sanitation facilities responsibly.

b. The Tenant shall comply with the property's waste-collection arrangements and pay any agreed garbage/waste fee, or a revised lawful charge communicated in advance.

c. Waste shall be placed only in designated collection areas and shall not be dumped in corridors, drains, stairways or other prohibited areas.`
  },
  {
    title: '8. NOISE, NUISANCE AND CONDUCT',
    body: `a. The Tenant shall not cause excessive noise, disturbance, harassment, threats or nuisance to other occupants, neighbours, staff or visitors.

b. Loud music, television, radios, speakers or other activities shall be kept at a reasonable level, particularly during designated quiet hours.

c. The Tenant shall comply with reasonable security, gate and common-area rules issued by management from time to time.`
  },
  {
    title: '9. USE, OCCUPANTS AND SUBLETTING',
    body: `a. The premises shall be used solely as a private residence unless written permission is given for another lawful use.

b. The Tenant shall not use the premises for an illegal activity, hazardous activity, commercial activity that causes nuisance, or any activity that exposes the property to unreasonable risk.

c. Only the Tenant and approved occupants may reside in the premises. The Tenant shall provide management with material changes in occupancy where reasonably required for security and property records.

d. The Tenant shall not assign, sublet, license or otherwise give possession of the premises to another person without the Landlord's prior written consent, except to the extent permitted by applicable law.`
  },
  {
    title: '10. ALTERATIONS AND INSTALLATIONS',
    body: `a. The Tenant shall not drill, construct, repaint, install permanent fixtures, satellite equipment, additional electrical appliances, partitions or other alterations without prior written approval where approval is reasonably required.

b. Any approved work shall comply with applicable safety requirements and shall be carried out at the Tenant's cost unless otherwise agreed in writing.`
  },
  {
    title: '11. ELECTRICITY, WATER AND OTHER UTILITIES',
    body: `a. The Tenant shall pay electricity charges attributable to the premises promptly and before the applicable due date.

b. The Tenant shall pay any separately metered water or other utility charges attributable to the premises as communicated by management.

c. The Tenant shall not tamper with utility meters, wiring, pipes or connections. Any suspected fault or irregularity shall be reported immediately.

d. Utility deposits, where applicable, shall be recorded in the schedule below and reconciled in accordance with the actual account and applicable law.`
  },
  {
    title: '12. ACCESS, INSPECTION AND REPAIRS',
    body: `a. The Landlord, manager, caretaker or authorized contractor may enter the premises at a reasonable time, upon reasonable notice where practicable, for inspection, repairs, maintenance, valuation or other legitimate property-management purposes.

b. In an emergency, including fire, flooding, serious electrical danger, security risk or suspected major damage, management may enter without prior notice where reasonably necessary to protect persons or property.

c. The Tenant shall provide reasonable access for essential repairs and maintenance.`
  },
  {
    title: '13. SECURITY AND GATE RULES',
    body: `a. The Tenant shall comply with reasonable gate, visitor, parking and access-control procedures communicated by management.

b. The Tenant shall not duplicate or transfer keys, access cards or other security devices without authorization.

c. The Tenant remains responsible for the conduct of invited visitors while on the premises.`
  },
  {
    title: '14. REPAIRS AND RESPONSIBILITIES',
    body: `a. The Landlord shall be responsible for major structural repairs and other repairs that are the Landlord's responsibility under applicable law, except where damage results from the Tenant's negligence, misuse or breach.

b. The Tenant shall be responsible for minor damage, cleaning and replacement caused by the Tenant's misuse, negligence or failure to take reasonable care.

c. The Tenant shall not engage an external contractor for material repairs at the Landlord's cost without prior approval, except where urgent action is reasonably necessary to prevent immediate serious damage and management cannot reasonably be reached.`
  },
  {
    title: '15. DEFAULT AND REMEDIES',
    body: `a. A breach includes non-payment of rent, unauthorized subletting, serious nuisance, unlawful use, deliberate damage, utility tampering or material breach of the property rules.

b. Where a breach is capable of remedy, management may give the Tenant written notice requiring the breach to be remedied within a reasonable or legally prescribed period.

c. If the breach is not remedied, or where the breach is sufficiently serious to justify termination under applicable law, the Landlord may take the lawful steps available to recover possession, arrears, damages or other sums due.

d. Nothing in this Agreement authorizes either party to act contrary to mandatory requirements of Kenyan law.`
  },
  {
    title: '16. TERMINATION AND VACATING',
    body: `Either party may terminate a month-to-month tenancy by giving one clear month's written notice, or such other notice as may be required by applicable law or expressly agreed for the tenancy.

Notice should state the intended termination/vacating date and be delivered through writing.

The Tenant shall pay all rent and other lawful charges up to the date of vacant possession and shall return all keys/access devices.

The Tenant shall remove personal belongings and leave the premises clean and reasonably fit for handover.

Any lawful loss or cost arising from inadequate notice may be recovered from the deposit.`
  },
  {
    title: '17. DISPUTE RESOLUTION AND GOVERNING LAW',
    body: `a. The parties shall first attempt in good faith to resolve any dispute through written communication and discussion with the property manager.

b. If the dispute is not resolved, either party may refer the matter to the appropriate court, tribunal, authority or other lawful dispute-resolution mechanism with jurisdiction.

c. This Agreement shall be interpreted subject to the laws of Kenya, including any mandatory protections applicable to the particular tenancy.`
  },
  {
    title: '18. AUTHORIZED PAYMENT DETAILS',
    body: `Account Name: NEST@R
Co-operative Bank Account: 01192274991800
Business No.: 400200
Account No. / Paybill Reference: 40045557
Bank / Branch: Co-operative Bank of Kenya / Stima Plaza

IMPORTANT: Tenants should make payments only through authorised channels and retain the transaction reference. Management may request the payment reference and house/room number to reconcile the account.`
  },
  {
    title: '19. TENANCY FINANCIAL SCHEDULE',
    body: `Monthly Rent, Security/House Deposit, Water Deposit (if applicable), Electricity Deposit (if applicable), Garbage/Waste Fee per month and any Other Agreed Charge — all amounts in Kshs. as specified in the lease details above.`
  },
]

export default function LeaseAgreementDialog({
  open,
  onClose,
  onComplete,
  tenant = {},
  caretakerName = '',
  submitting = false,
  title = 'Tenant Agreement',
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
              premises identified below. It is intended to promote clear responsibilities, proper property management,
              peaceful occupation and transparent handling of rent, deposits, utilities, repairs and termination.
            </p>

            <div className="rounded-lg bg-slate-50 border border-slate-100 p-4 mb-6">
              <h4 className="text-sm font-semibold text-slate-700 mb-2">Tenant & Premises Details</h4>
              {detailRow('Landlord / Property Manager', 'NEST@R')}
              {detailRow("Tenant's Full Name", tenant.name)}
              {detailRow('National ID / Passport No.', tenant.idNumber)}
              {detailRow('Telephone / Contact', tenant.phone)}
              {detailRow('Email', tenant.email)}
              {detailRow('Property / House Name', tenant.propertyName || tenant.property)}
              {detailRow('House / Room No.', tenant.unit)}
              {detailRow('Commencement Date', tenant.leaseStart)}
              {detailRow('Monthly Rent (Kshs.)', tenant.rent ? Number(tenant.rent).toLocaleString() : '')}
              {detailRow('Security / House Deposit (Kshs.)', tenant.deposit ? Number(tenant.deposit).toLocaleString() : '')}
            </div>

            <div className="space-y-4">
              {CLAUSES.map((c) => (
                <div key={c.title}>
                  <h4 className="text-sm font-semibold text-slate-800 mb-1">{c.title}</h4>
                  <div className="text-sm text-slate-600 leading-relaxed">
                    {c.body.split('\n').map((line, i) => {
                      // Check if line starts with a letter followed by period (a. b. c. etc)
                      const pointMatch = line.match(/^([a-z])\.\s*(.*)$/i)
                      if (pointMatch) {
                        return (
                          <p key={i} className="mb-2">
                            <span className="text-blue-600 font-medium">{pointMatch[1]}.</span>{' '}
                            <span>{pointMatch[2]}</span>
                          </p>
                        )
                      }
                      // Empty line = paragraph break
                      if (!line.trim()) return <div key={i} className="h-2" />
                      // Regular text
                      return <p key={i} className="mb-2">{line}</p>
                    })}
                  </div>
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
                  <p className="text-sm font-medium text-slate-700">Tenant Name & Signature</p>
                  <p className="text-sm text-slate-500">{tenant.name || '—'}</p>
                </div>
                <SignaturePad label="Tenant signature" onChange={setTenantSig} />
                <p className="text-xs text-slate-400 mt-1">Date: {today}</p>
              </div>
              <div>
                <div className="mb-2">
                  <p className="text-sm font-medium text-slate-700">Witness / Caretaker (where applicable)</p>
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
