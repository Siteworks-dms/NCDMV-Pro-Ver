import { useState, useEffect, useCallback } from 'react'
import { ChevronDown, Loader2, AlertTriangle, DollarSign, Car, User, CreditCard, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { supabase, calculateHUT, formatCurrency } from '@/lib/supabase'
import type { NCForm, Vehicle, Customer, WarrantyType } from '@/types/database'
import { Field, Modal } from '@/components/ui'
import TradeInSection, { type TradeInData, EMPTY_TRADE_IN } from './TradeInSection'
import FinancingSection, { type FinancingData, EMPTY_FINANCING } from './FinancingSection'
import NCFormsPanel from './NCFormsPanel'

const DEALER_ID = import.meta.env.VITE_DEALER_ID ?? ''

type TabId = 'vehicle' | 'buyer' | 'financials' | 'tradein' | 'financing' | 'forms'

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'vehicle',    label: 'Vehicle',    icon: Car },
  { id: 'buyer',      label: 'Buyer',      icon: User },
  { id: 'financials', label: 'Bill of Sale', icon: DollarSign },
  { id: 'tradein',    label: 'Trade-In',   icon: Car },
  { id: 'financing',  label: 'Financing',  icon: CreditCard },
  { id: 'forms',      label: 'NC Forms',   icon: FileText },
]

interface DealFormProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  editDealId?: string
}

export default function DealForm({ open, onClose, onSaved, editDealId }: DealFormProps) {
  const [tab, setTab] = useState<TabId>('vehicle')
  const [saving, setSaving] = useState(false)
  const [dealId, setDealId] = useState<string | null>(editDealId ?? null)
  const [forms, setForms] = useState<NCForm[]>([])

  // Vehicle & Buyer lookup
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [vehicleSearch, setVehicleSearch] = useState('')
  const [customerSearch, setCustomerSearch] = useState('')

  // Core deal fields
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [selectedBuyer, setSelectedBuyer]     = useState<Customer | null>(null)
  const [saleType, setSaleType]       = useState<'retail' | 'wholesale' | 'buy_here_pay_here'>('retail')
  const [saleDate, setSaleDate]       = useState(new Date().toISOString().split('T')[0])
  const [paymentType, setPaymentType] = useState<'cash' | 'finance' | 'buy_here_pay_here'>('cash')
  const [warrantyType, setWarrantyType] = useState<WarrantyType>('as_is')

  // Pricing fields
  const [salePrice, setSalePrice]       = useState('')
  const [docFee, setDocFee]             = useState('599')
  const [conveyanceFee, setConveyanceFee] = useState('0')
  const [inspectionFee, setInspectionFee] = useState('0')
  const [registrationFee, setRegFee]    = useState('0')
  const [titleFee, setTitleFee]         = useState('58')

  // F&I products
  const [extWarranty, setExtWarranty]   = useState('0')
  const [gapInsurance, setGapInsurance] = useState('0')
  const [creditLife, setCreditLife]     = useState('0')
  const [tireWheel, setTireWheel]       = useState('0')

  // Trade-in
  const [hasTradeIn, setHasTradeIn]   = useState(false)
  const [tradeIn, setTradeIn]         = useState<TradeInData>(EMPTY_TRADE_IN)

  // Financing
  const [financing, setFinancing]     = useState<FinancingData>(EMPTY_FINANCING)
  const [cashDown, setCashDown]       = useState('0')
  const [rebates, setRebates]         = useState('0')

  // ── Load vehicles & customers ────────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    supabase.from('vehicles').select('*').eq('status', 'frontline').order('year', { ascending: false })
      .then(({ data }) => setVehicles((data ?? []) as Vehicle[]))
    supabase.from('customers').select('*').order('last_name')
      .then(({ data }) => setCustomers((data ?? []) as Customer[]))
  }, [open])

  // ── Load forms if editing existing deal ─────────────────────────────────
  const loadForms = useCallback(async (id: string) => {
    const { data } = await supabase.from('nc_forms').select('*').eq('deal_id', id)
    setForms((data ?? []) as NCForm[])
  }, [])

  useEffect(() => {
    if (dealId) loadForms(dealId)
  }, [dealId, loadForms])

  // ── Auto-set list price as sale price when vehicle selected ─────────────
  useEffect(() => {
    if (selectedVehicle?.list_price && !salePrice) {
      setSalePrice(String(selectedVehicle.list_price))
    }
  }, [selectedVehicle]) // eslint-disable-line

  // ── Live HUT calculation ─────────────────────────────────────────────────
  const tradeAllowance = hasTradeIn ? (parseFloat(tradeIn.allowance) || 0) : 0
  const hut = calculateHUT(parseFloat(salePrice) || 0, tradeAllowance)

  // ── Bill of Sale totals ──────────────────────────────────────────────────
  const numSalePrice   = parseFloat(salePrice) || 0
  const numDocFee      = Math.min(parseFloat(docFee) || 0, 599)
  const numConveyance  = parseFloat(conveyanceFee) || 0
  const numInspection  = parseFloat(inspectionFee) || 0
  const numRegFee      = parseFloat(registrationFee) || 0
  const numTitleFee    = parseFloat(titleFee) || 0
  const numExtWarranty = parseFloat(extWarranty) || 0
  const numGap         = parseFloat(gapInsurance) || 0
  const numCreditLife  = parseFloat(creditLife) || 0
  const numTireWheel   = parseFloat(tireWheel) || 0
  const tradePayoff    = hasTradeIn ? (parseFloat(tradeIn.payoffAmount) || 0) : 0
  const numCashDown    = parseFloat(cashDown) || 0
  const numRebates     = parseFloat(rebates) || 0

  const adjustedSellingPrice = Math.max(numSalePrice - tradeAllowance, 0)
  const totalFees = numDocFee + numConveyance + numInspection + numRegFee + numTitleFee + hut.amount
  const totalFiProducts = numExtWarranty + numGap + numCreditLife + numTireWheel
  const totalAmountDue = adjustedSellingPrice + totalFees + totalFiProducts + tradePayoff
  const amountFinanced = Math.max(totalAmountDue - numCashDown - numRebates, 0)

  // Keep financing amount synced
  useEffect(() => {
    if (paymentType === 'finance') {
      setFinancing(f => ({ ...f, amountFinanced: amountFinanced.toFixed(2) }))
    }
  }, [amountFinanced, paymentType])

  // ── Save / Update deal ───────────────────────────────────────────────────
  const handleSave = async (asDraft = false) => {
    if (!selectedVehicle) { toast.error('Select a vehicle'); setTab('vehicle'); return }
    if (!selectedBuyer)   { toast.error('Select a buyer');   setTab('buyer');   return }
    if (!salePrice)       { toast.error('Enter sale price'); setTab('financials'); return }

    setSaving(true)
    try {
      const dealPayload = {
        dealer_id:             DEALER_ID,
        vehicle_id:            selectedVehicle.id,
        buyer_id:              selectedBuyer.id,
        sale_type:             saleType,
        sale_date:             saleDate,
        payment_type:          paymentType,
        warranty_type:         warrantyType,
        sale_price:            numSalePrice,
        doc_fee:               numDocFee,
        dealer_conveyance_fee: numConveyance,
        inspection_fee:        numInspection,
        registration_fee:      numRegFee,
        title_fee:             numTitleFee,
        extended_warranty_amount: numExtWarranty,
        gap_insurance_amount:  numGap,
        credit_life_amount:    numCreditLife,
        tire_wheel_amount:     numTireWheel,
        has_trade_in:          hasTradeIn,
        trade_allowance:       tradeAllowance,
        trade_payoff:          tradePayoff,
        cash_down:             numCashDown,
        rebates:               numRebates,
        amount_financed:       paymentType === 'finance' ? amountFinanced : null,
        total_fees:            totalFees,
        total_amount_due:      totalAmountDue,
        status:                asDraft ? 'pencil' : 'pending',
      }

      let savedDealId = dealId

      if (dealId) {
        const { error } = await supabase.from('deals').update(dealPayload).eq('id', dealId)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('deals').insert(dealPayload).select('id').single()
        if (error) throw error
        savedDealId = data.id
        setDealId(data.id)
      }

      // Save trade-in
      if (hasTradeIn && savedDealId) {
        await supabase.from('trade_ins').upsert({
          deal_id:        savedDealId,
          dealer_id:      DEALER_ID,
          vin:            tradeIn.vin || '00000000000000000',
          year:           parseInt(tradeIn.year) || null,
          make:           tradeIn.make || null,
          model:          tradeIn.model || null,
          trim:           tradeIn.trim || null,
          color:          tradeIn.color || null,
          odometer_in:    parseInt(tradeIn.odometer) || 0,
          odometer_actual: tradeIn.odometerActual,
          title_state:    tradeIn.titleState,
          title_number:   tradeIn.titleNumber || null,
          lien_holder:    tradeIn.lienHolder || null,
          acv:            parseFloat(tradeIn.acv) || null,
          allowance:      parseFloat(tradeIn.allowance) || 0,
          payoff_amount:  parseFloat(tradeIn.payoffAmount) || 0,
          payoff_lender:  tradeIn.payoffLender || null,
          condition_grade: tradeIn.conditionGrade,
          damage_notes:   tradeIn.damageNotes || null,
        }, { onConflict: 'deal_id' })
      }

      // Save financing
      if (paymentType === 'finance' && savedDealId && financing.lenderName) {
        await supabase.from('financing').upsert({
          deal_id:           savedDealId,
          dealer_id:         DEALER_ID,
          lender_name:       financing.lenderName,
          apr:               parseFloat(financing.apr) / 100 || 0,
          term_months:       parseInt(financing.termMonths) || 60,
          amount_financed:   amountFinanced,
          monthly_payment:   financing.monthlyPayment,
          first_payment_date: financing.firstPaymentDate || null,
          dealer_reserve:    parseFloat(financing.dealerReserve) || 0,
          finance_charge:    financing.financeCharge,
          total_of_payments: financing.totalOfPayments,
          approval_number:   financing.approvalNumber || null,
          conditions:        financing.conditions || null,
          status:            'pending',
        }, { onConflict: 'deal_id' })
      }

      // Mark vehicle as sold/pending
      await supabase.from('vehicles').update({ status: 'pending_title' }).eq('id', selectedVehicle.id)

      toast.success(dealId ? 'Deal updated' : 'Deal created — generate NC forms now')
      if (savedDealId) loadForms(savedDealId)
      if (!asDraft) setTab('forms')
      onSaved()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────
  const filteredVehicles = vehicles.filter(v =>
    !vehicleSearch || `${v.year} ${v.make} ${v.model} ${v.vin}`.toLowerCase().includes(vehicleSearch.toLowerCase())
  )
  const filteredCustomers = customers.filter(c =>
    !customerSearch || `${c.first_name} ${c.last_name} ${c.phone_primary ?? ''}`.toLowerCase().includes(customerSearch.toLowerCase())
  )

  return (
    <Modal open={open} onClose={onClose} title={dealId ? 'Edit Deal' : 'New Deal — Buyer\'s Order'} subtitle="NC DMV compliant · 19A NCAC 03D .0228" width="max-w-4xl">
      {/* Tabs */}
      <div className="flex gap-1 mb-5 -mx-6 px-6 border-b border-gray-100 overflow-x-auto">
        {TABS.map(t => {
          const Icon = t.icon
          const isActive = tab === t.id
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-all whitespace-nowrap ${isActive ? 'border-brand-400 text-brand-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              <Icon size={13} />
              {t.label}
              {t.id === 'forms' && dealId && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 ml-0.5" />
              )}
            </button>
          )
        })}
      </div>

      {/* ── TAB: VEHICLE ── */}
      {tab === 'vehicle' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <input className="input-base text-sm" placeholder="Search VIN, year, make, model..." value={vehicleSearch} onChange={e => setVehicleSearch(e.target.value)} />
          </div>
          {filteredVehicles.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No frontline vehicles. Mark vehicles ready in Inventory first.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {filteredVehicles.map(v => (
                <div key={v.id} onClick={() => setSelectedVehicle(v)}
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${selectedVehicle?.id === v.id ? 'bg-brand-50 border-brand-400' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
                  <div>
                    <p className="text-sm font-medium">{v.year} {v.make} {v.model} {v.trim}</p>
                    <p className="text-xs text-gray-400 font-mono">{v.vin} · {v.odometer_acquisition?.toLocaleString()} mi · {v.color_exterior}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono font-semibold text-brand-600">{formatCurrency(v.list_price)}</p>
                    {v.damage_flag && <span className="badge-red text-[10px]">DMG</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
          {selectedVehicle && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-700">
              ✓ Selected: <strong>{selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}</strong> · {selectedVehicle.vin}
              {selectedVehicle.damage_flag && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1"><AlertTriangle size={12} /> Damage flag set — MVR-181 will be required</p>
              )}
            </div>
          )}
          <div className="grid grid-cols-3 gap-3 pt-2">
            <Field label="Sale Type">
              <select className="input-base" value={saleType} onChange={e => setSaleType(e.target.value as typeof saleType)}>
                <option value="retail">Retail</option>
                <option value="wholesale">Wholesale</option>
                <option value="buy_here_pay_here">Buy Here Pay Here</option>
              </select>
            </Field>
            <Field label="Sale Date" required>
              <input className="input-base" type="date" value={saleDate} onChange={e => setSaleDate(e.target.value)} />
            </Field>
            <Field label="Warranty Type" hint="Drives FTC Buyer's Guide">
              <select className="input-base" value={warrantyType} onChange={e => setWarrantyType(e.target.value as WarrantyType)}>
                <option value="as_is">As-Is — No Warranty</option>
                <option value="limited_warranty">Limited Warranty</option>
                <option value="full_warranty">Full Warranty</option>
              </select>
            </Field>
          </div>
          <button onClick={() => setTab('buyer')} className="btn-primary w-full mt-2">Next: Buyer Info →</button>
        </div>
      )}

      {/* ── TAB: BUYER ── */}
      {tab === 'buyer' && (
        <div className="space-y-4">
          <input className="input-base text-sm" placeholder="Search by name or phone..." value={customerSearch} onChange={e => setCustomerSearch(e.target.value)} />
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {filteredCustomers.map(c => (
              <div key={c.id} onClick={() => setSelectedBuyer(c)}
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${selectedBuyer?.id === c.id ? 'bg-brand-50 border-brand-400' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
                <div>
                  <p className="text-sm font-medium">{c.first_name} {c.last_name}</p>
                  <p className="text-xs text-gray-400">{c.address_line1}, {c.city}, {c.state} {c.zip}</p>
                </div>
                <div className="text-right text-xs text-gray-400">
                  <p>{c.phone_primary}</p>
                  <p>{c.email}</p>
                </div>
              </div>
            ))}
            {filteredCustomers.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-6">No customers found. Add customer in Customers section first.</p>
            )}
          </div>
          {selectedBuyer && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-700">
              ✓ Selected: <strong>{selectedBuyer.first_name} {selectedBuyer.last_name}</strong> · {selectedBuyer.address_line1}, {selectedBuyer.city}
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={() => setTab('vehicle')} className="btn-secondary flex-1">← Back</button>
            <button onClick={() => setTab('financials')} className="btn-primary flex-1">Next: Bill of Sale →</button>
          </div>
        </div>
      )}

      {/* ── TAB: BILL OF SALE / FINANCIALS ── */}
      {tab === 'financials' && (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-3">
            <Field label="Sale Price ($)" required>
              <input className="input-base font-mono text-base" value={salePrice} onChange={e => setSalePrice(e.target.value)} placeholder="24500.00" type="number" step="0.01" min="0" />
            </Field>
            <Field label="Payment Method">
              <select className="input-base" value={paymentType} onChange={e => setPaymentType(e.target.value as typeof paymentType)}>
                <option value="cash">Cash</option>
                <option value="finance">Finance</option>
                <option value="buy_here_pay_here">Buy Here Pay Here</option>
              </select>
            </Field>
            <Field label="Cash Down ($)">
              <input className="input-base font-mono" value={cashDown} onChange={e => setCashDown(e.target.value)} placeholder="0.00" type="number" step="0.01" min="0" />
            </Field>
          </div>

          {/* Fees section */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Itemized Fees — 19A NCAC 03D .0228</p>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Doc Prep Fee ($)" hint="Max $599 enforced">
                <input className="input-base font-mono" value={docFee} onChange={e => setDocFee(e.target.value)} max={599} type="number" step="0.01" min="0" />
              </Field>
              <Field label="Dealer Conveyance ($)">
                <input className="input-base font-mono" value={conveyanceFee} onChange={e => setConveyanceFee(e.target.value)} placeholder="0.00" type="number" step="0.01" min="0" />
              </Field>
              <Field label="Inspection Fee ($)">
                <input className="input-base font-mono" value={inspectionFee} onChange={e => setInspectionFee(e.target.value)} placeholder="0.00" type="number" step="0.01" min="0" />
              </Field>
              <Field label="Title Fee ($)">
                <input className="input-base font-mono" value={titleFee} onChange={e => setTitleFee(e.target.value)} placeholder="58.00" type="number" step="0.01" min="0" />
              </Field>
              <Field label="Registration Fee ($)">
                <input className="input-base font-mono" value={registrationFee} onChange={e => setRegFee(e.target.value)} placeholder="0.00" type="number" step="0.01" min="0" />
              </Field>
              <Field label="Rebates / Incentives ($)">
                <input className="input-base font-mono" value={rebates} onChange={e => setRebates(e.target.value)} placeholder="0.00" type="number" step="0.01" min="0" />
              </Field>
            </div>
          </div>

          {/* F&I Products */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">F&amp;I Products</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Extended Warranty / VSC ($)', val: extWarranty, set: setExtWarranty },
                { label: 'GAP Insurance ($)',           val: gapInsurance, set: setGapInsurance },
                { label: 'Credit Life ($)',             val: creditLife, set: setCreditLife },
                { label: 'Tire &amp; Wheel ($)',        val: tireWheel, set: setTireWheel },
              ].map(({ label, val, set: s }) => (
                <Field key={label} label={label}>
                  <input className="input-base font-mono" value={val} onChange={e => s(e.target.value)} placeholder="0.00" type="number" step="0.01" min="0" />
                </Field>
              ))}
            </div>
          </div>

          {/* HUT + Totals — the core of the Bill of Sale */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-100">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Bill of Sale Summary — Buyer's Order</p>
            </div>
            <div className="p-4 space-y-0">
              {[
                { label: '1. Vehicle Sale Price',         val: numSalePrice,           mono: true },
                { label: '2. Less: Trade-In Allowance',   val: -tradeAllowance,        mono: true, hide: !hasTradeIn },
                { label: '3. Adjusted Selling Price',     val: adjustedSellingPrice,   mono: true, bold: true, sep: true },
                { label: '4. NC Highway-Use Tax (3.0%)', val: hut.amount,              mono: true, hut: true },
                { label: '5. Title Fee',                  val: numTitleFee,            mono: true },
                { label: '6. Registration Fee',           val: numRegFee,              mono: true },
                { label: '7. Doc Prep Fee',               val: numDocFee,              mono: true },
                { label: '8. Dealer Conveyance Fee',      val: numConveyance,          mono: true, hide: numConveyance === 0 },
                { label: '9. Inspection Fee',             val: numInspection,          mono: true, hide: numInspection === 0 },
                { label: '10. Extended Warranty',         val: numExtWarranty,         mono: true, hide: numExtWarranty === 0 },
                { label: '11. GAP Insurance',             val: numGap,                 mono: true, hide: numGap === 0 },
                { label: '12. Credit Life / Disability',  val: numCreditLife,          mono: true, hide: numCreditLife === 0 },
                { label: '13. Tire & Wheel Protection',   val: numTireWheel,           mono: true, hide: numTireWheel === 0 },
                { label: '14. Trade Payoff',              val: tradePayoff,            mono: true, hide: !hasTradeIn || tradePayoff === 0 },
                { label: '15. TOTAL AMOUNT DUE',          val: totalAmountDue,         mono: true, bold: true, big: true, sep: true },
                { label: '16. Less: Cash Down',           val: -numCashDown,           mono: true, hide: numCashDown === 0 },
                { label: '17. Less: Rebates',             val: -numRebates,            mono: true, hide: numRebates === 0 },
                { label: '18. Amount Financed',           val: amountFinanced,         mono: true, bold: true, hide: paymentType !== 'finance' },
              ].filter(r => !r.hide).map(({ label, val, mono, bold, big, sep, hut: isHut }) => (
                <div key={label}>
                  {sep && <div className="border-t border-gray-200 my-1.5" />}
                  <div className={`flex justify-between items-baseline py-1.5 ${bold ? '' : ''}`}>
                    <span className={`text-xs ${bold ? 'font-semibold text-gray-800' : 'text-gray-500'}`}>{label}</span>
                    <span className={`font-mono ${big ? 'text-base font-bold text-brand-600' : bold ? 'text-sm font-semibold' : 'text-sm'} ${isHut ? 'text-red-600' : ''} ${val < 0 ? 'text-red-600' : ''}`}>
                      {val < 0 ? `(${formatCurrency(Math.abs(val))})` : formatCurrency(val)}
                      {isHut && hut.capped && <span className="text-[10px] ml-1 text-red-400">CAP</span>}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {/* HUT note */}
            <div className="px-4 py-3 bg-red-50 border-t border-red-200">
              <p className="text-xs text-red-700 font-mono">
                ⚠ NC HUT: 3% × {formatCurrency(hut.basis)} = {formatCurrency(hut.amount)}
                {hut.capped && ' (capped at $2,000.00)'}
                {' '}— N.C.G.S. §105-187.3
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={() => setTab('buyer')} className="btn-secondary flex-1">← Back</button>
            <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 text-sm text-gray-700">
              <input type="checkbox" checked={hasTradeIn} onChange={e => setHasTradeIn(e.target.checked)} className="w-4 h-4" />
              Has Trade-In
            </label>
            <button onClick={() => setTab(hasTradeIn ? 'tradein' : 'financing')} className="btn-primary flex-1">Next →</button>
          </div>
        </div>
      )}

      {/* ── TAB: TRADE-IN ── */}
      {tab === 'tradein' && (
        <div>
          {!hasTradeIn ? (
            <div className="text-center py-12">
              <p className="text-sm text-gray-500 mb-3">No trade-in on this deal.</p>
              <button onClick={() => { setHasTradeIn(true) }} className="btn-secondary text-sm">+ Add Trade-In</button>
            </div>
          ) : (
            <TradeInSection data={tradeIn} onChange={setTradeIn} />
          )}
          <div className="flex gap-2 mt-5">
            <button onClick={() => setTab('financials')} className="btn-secondary flex-1">← Back</button>
            <button onClick={() => setTab('financing')} className="btn-primary flex-1">Next: Financing →</button>
          </div>
        </div>
      )}

      {/* ── TAB: FINANCING ── */}
      {tab === 'financing' && (
        <div>
          {paymentType !== 'finance' ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-sm">Payment type is <strong>{paymentType.replace('_', ' ')}</strong> — no lender financing.</p>
              <p className="text-xs mt-1 text-gray-400">Change payment type in Bill of Sale tab to enable financing.</p>
            </div>
          ) : (
            <FinancingSection data={financing} onChange={setFinancing} />
          )}
          <div className="flex gap-2 mt-5">
            <button onClick={() => setTab('tradein')} className="btn-secondary flex-1">← Back</button>
            <button onClick={() => handleSave(false)} disabled={saving} className="btn-primary flex-1 gap-2">
              {saving ? <Loader2 size={15} className="animate-spin" /> : null}
              {saving ? 'Saving...' : dealId ? 'Update Deal' : 'Save Deal & Generate Forms →'}
            </button>
          </div>
        </div>
      )}

      {/* ── TAB: NC FORMS ── */}
      {tab === 'forms' && (
        <div>
          {!dealId ? (
            <div className="text-center py-12">
              <p className="text-sm text-gray-500 mb-3">Save the deal first to generate NC forms.</p>
              <button onClick={() => handleSave(false)} disabled={saving} className="btn-primary gap-2">
                {saving && <Loader2 size={14} className="animate-spin" />}
                Save Deal First
              </button>
            </div>
          ) : (
            <NCFormsPanel
              dealId={dealId}
              dealerId={DEALER_ID}
              forms={forms}
              damageFlag={selectedVehicle?.damage_flag ?? false}
              warrantyType={warrantyType}
              onRefresh={() => loadForms(dealId)}
            />
          )}
        </div>
      )}

      {/* Sticky bottom save */}
      {tab !== 'financing' && tab !== 'forms' && (
        <div className="flex gap-2 pt-4 mt-2 border-t border-gray-100">
          <button onClick={() => handleSave(true)} disabled={saving} className="btn-secondary flex-1 text-sm">
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            Save as Draft
          </button>
          <button onClick={() => handleSave(false)} disabled={saving} className="btn-primary flex-1 text-sm">
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            {dealId ? 'Update Deal' : 'Save Deal'}
          </button>
        </div>
      )}
    </Modal>
  )
}
