import { useState } from 'react'
import { Search, CheckCircle, Loader2, AlertTriangle } from 'lucide-react'
import { Field } from '@/components/ui'
import { useVinDecode } from '@/hooks/useVinDecode'

export interface TradeInData {
  vin: string
  year: string
  make: string
  model: string
  trim: string
  color: string
  odometer: string
  odometerActual: boolean
  titleNumber: string
  titleState: string
  lienHolder: string
  acv: string
  allowance: string
  payoffAmount: string
  payoffLender: string
  conditionGrade: string
  damageNotes: string
}

export const EMPTY_TRADE_IN: TradeInData = {
  vin: '', year: '', make: '', model: '', trim: '', color: '',
  odometer: '', odometerActual: true,
  titleNumber: '', titleState: 'NC',
  lienHolder: '', acv: '', allowance: '', payoffAmount: '0', payoffLender: '',
  conditionGrade: 'good', damageNotes: '',
}

interface TradeInSectionProps {
  data: TradeInData
  onChange: (data: TradeInData) => void
}

export default function TradeInSection({ data, onChange }: TradeInSectionProps) {
  const { decode, loading: decoding, error: vinError, result: vinResult } = useVinDecode()
  const [vinInput, setVinInput] = useState(data.vin)

  const set = (key: keyof TradeInData, val: string | boolean) =>
    onChange({ ...data, [key]: val })

  const handleDecode = async () => {
    const decoded = await decode(vinInput)
    if (!decoded) return
    onChange({
      ...data,
      vin: vinInput.trim().toUpperCase(),
      year: decoded.year,
      make: decoded.make,
      model: decoded.model,
      trim: decoded.trim,
    })
  }

  const netTrade = (parseFloat(data.allowance) || 0) - (parseFloat(data.payoffAmount) || 0)

  return (
    <div className="space-y-4">
      {/* VIN decode */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 mb-2">
          Trade-In VIN — Required for MVR-180 &amp; HUT Calculation
        </p>
        <div className="flex gap-2">
          <input
            className="input-base font-mono uppercase tracking-widest text-sm flex-1"
            placeholder="Trade-in VIN (17 characters)..."
            maxLength={17}
            value={vinInput}
            onChange={e => setVinInput(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && handleDecode()}
          />
          <button
            onClick={handleDecode}
            disabled={decoding || vinInput.length !== 17}
            className="btn-secondary px-4 gap-2 min-w-[110px] text-sm"
          >
            {decoding ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            {decoding ? 'Decoding...' : 'Decode VIN'}
          </button>
        </div>
        {vinError && (
          <div className="mt-2 flex items-center gap-2 text-red-600 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <AlertTriangle size={13} /> {vinError}
          </div>
        )}
        {vinResult && (
          <div className="mt-2 flex items-center gap-2 text-green-700 text-xs bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            <CheckCircle size={13} />
            <span><strong>{vinResult.year} {vinResult.make} {vinResult.model}</strong>{vinResult.trim && ` ${vinResult.trim}`}</span>
          </div>
        )}
      </div>

      {/* Vehicle details */}
      <div className="grid grid-cols-3 gap-3">
        <Field label="Year"><input className="input-base" value={data.year} onChange={e => set('year', e.target.value)} placeholder="2019" /></Field>
        <Field label="Make"><input className="input-base" value={data.make} onChange={e => set('make', e.target.value)} placeholder="Toyota" /></Field>
        <Field label="Model"><input className="input-base" value={data.model} onChange={e => set('model', e.target.value)} placeholder="Camry" /></Field>
        <Field label="Trim"><input className="input-base" value={data.trim} onChange={e => set('trim', e.target.value)} placeholder="LE" /></Field>
        <Field label="Color"><input className="input-base" value={data.color} onChange={e => set('color', e.target.value)} placeholder="Silver" /></Field>
        <Field label="Condition">
          <select className="input-base" value={data.conditionGrade} onChange={e => set('conditionGrade', e.target.value)}>
            <option value="excellent">Excellent</option>
            <option value="good">Good</option>
            <option value="fair">Fair</option>
            <option value="poor">Poor</option>
          </select>
        </Field>
        <Field label="Odometer" required>
          <input className="input-base font-mono" value={data.odometer} onChange={e => set('odometer', e.target.value)} placeholder="62000" type="number" min="0" />
        </Field>
        <Field label="Odometer Status">
          <label className="flex items-center gap-2 h-9 cursor-pointer">
            <input type="checkbox" checked={!data.odometerActual} onChange={e => set('odometerActual', !e.target.checked)} className="w-4 h-4" />
            <span className="text-sm text-gray-700">Not actual (TMU)</span>
          </label>
        </Field>
        <Field label="Title State">
          <input className="input-base uppercase" value={data.titleState} onChange={e => set('titleState', e.target.value.toUpperCase())} maxLength={2} placeholder="NC" />
        </Field>
      </div>

      {/* Valuation */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Valuation &amp; Payoff</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="ACV (Actual Cash Value $)" hint="Your appraised value">
            <input className="input-base font-mono" value={data.acv} onChange={e => set('acv', e.target.value)} placeholder="14500.00" type="number" step="0.01" min="0" />
          </Field>
          <Field label="Trade Allowance ($)" required hint="Amount credited to buyer — used in HUT calc">
            <input className="input-base font-mono border-amber-300 focus:ring-amber-400" value={data.allowance} onChange={e => set('allowance', e.target.value)} placeholder="15000.00" type="number" step="0.01" min="0" />
          </Field>
          <Field label="Payoff Amount ($)">
            <input className="input-base font-mono" value={data.payoffAmount} onChange={e => set('payoffAmount', e.target.value)} placeholder="0.00" type="number" step="0.01" min="0" />
          </Field>
          <Field label="Payoff Lender">
            <input className="input-base" value={data.payoffLender} onChange={e => set('payoffLender', e.target.value)} placeholder="Wells Fargo Auto" />
          </Field>
        </div>

        {/* Net trade summary */}
        <div className={`mt-3 flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-mono ${netTrade >= 0 ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-700'}`}>
          <span className="font-medium">Net Trade Value</span>
          <span className="text-base font-semibold">
            {netTrade >= 0 ? '+' : ''}
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(netTrade)}
          </span>
        </div>
      </div>

      <Field label="Damage / Condition Notes">
        <textarea className="input-base" rows={2} value={data.damageNotes} onChange={e => set('damageNotes', e.target.value)} placeholder="Any damage, condition issues, or notes..." />
      </Field>
    </div>
  )
}
