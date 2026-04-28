import { useEffect } from 'react'
import { Field } from '@/components/ui'
import { formatCurrency } from '@/lib/supabase'

export interface FinancingData {
  lenderName: string
  apr: string
  termMonths: string
  amountFinanced: string
  firstPaymentDate: string
  dealerReserve: string
  approvalNumber: string
  conditions: string
  // Computed
  monthlyPayment: number
  financeCharge: number
  totalOfPayments: number
}

export const EMPTY_FINANCING: FinancingData = {
  lenderName: '', apr: '', termMonths: '60',
  amountFinanced: '', firstPaymentDate: '',
  dealerReserve: '0', approvalNumber: '', conditions: '',
  monthlyPayment: 0, financeCharge: 0, totalOfPayments: 0,
}

interface FinancingSectionProps {
  data: FinancingData
  onChange: (data: FinancingData) => void
}

function calcPayment(principal: number, annualRate: number, months: number) {
  if (!principal || !months) return { monthly: 0, financeCharge: 0, total: 0 }
  if (annualRate === 0) {
    const monthly = principal / months
    return { monthly, financeCharge: 0, total: principal }
  }
  const r = annualRate / 100 / 12
  const monthly = principal * (r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1)
  const total = monthly * months
  return {
    monthly: Math.round(monthly * 100) / 100,
    financeCharge: Math.round((total - principal) * 100) / 100,
    total: Math.round(total * 100) / 100,
  }
}

export default function FinancingSection({ data, onChange }: FinancingSectionProps) {
  const set = (key: keyof FinancingData, val: string | number) =>
    onChange({ ...data, [key]: val })

  // Recalculate payment whenever inputs change
  useEffect(() => {
    const principal = parseFloat(data.amountFinanced) || 0
    const apr       = parseFloat(data.apr) || 0
    const months    = parseInt(data.termMonths) || 0
    const { monthly, financeCharge, total } = calcPayment(principal, apr, months)
    if (monthly !== data.monthlyPayment || financeCharge !== data.financeCharge) {
      onChange({ ...data, monthlyPayment: monthly, financeCharge, totalOfPayments: total })
    }
  }, [data.amountFinanced, data.apr, data.termMonths]) // eslint-disable-line

  // Final payment date calculation
  const finalPaymentDate = (() => {
    if (!data.firstPaymentDate || !data.termMonths) return null
    const d = new Date(data.firstPaymentDate)
    d.setMonth(d.getMonth() + parseInt(data.termMonths) - 1)
    return d.toISOString().split('T')[0]
  })()

  return (
    <div className="space-y-4">
      {/* Lender */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Lender Name" required>
          <input className="input-base" value={data.lenderName} onChange={e => set('lenderName', e.target.value)} placeholder="Wells Fargo Dealer Services" />
        </Field>
        <Field label="Approval Number">
          <input className="input-base font-mono" value={data.approvalNumber} onChange={e => set('approvalNumber', e.target.value)} placeholder="WF-2024-XXXXXX" />
        </Field>
      </div>

      {/* Terms */}
      <div className="grid grid-cols-3 gap-3">
        <Field label="APR (%)" required hint="e.g. 7.99 for 7.99%">
          <input className="input-base font-mono" value={data.apr} onChange={e => set('apr', e.target.value)} placeholder="7.99" type="number" step="0.01" min="0" max="36" />
        </Field>
        <Field label="Term (months)" required>
          <select className="input-base" value={data.termMonths} onChange={e => set('termMonths', e.target.value)}>
            {[24, 36, 48, 60, 72, 84].map(m => <option key={m} value={m}>{m} months ({(m / 12).toFixed(1)} yr)</option>)}
          </select>
        </Field>
        <Field label="Amount Financed ($)" required>
          <input className="input-base font-mono bg-gray-50" value={data.amountFinanced} onChange={e => set('amountFinanced', e.target.value)} placeholder="Auto-filled from BOS" type="number" step="0.01" min="0" />
        </Field>
        <Field label="First Payment Date">
          <input className="input-base" value={data.firstPaymentDate} onChange={e => set('firstPaymentDate', e.target.value)} type="date" />
        </Field>
        <Field label="Dealer Reserve ($)" hint="Back-end profit">
          <input className="input-base font-mono" value={data.dealerReserve} onChange={e => set('dealerReserve', e.target.value)} placeholder="0.00" type="number" step="0.01" min="0" />
        </Field>
      </div>

      {/* Computed payment schedule */}
      {data.monthlyPayment > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-700 mb-3">Payment Schedule — 19A NCAC 03D .0228 Disclosure</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            {[
              { label: 'Amount Financed',   value: formatCurrency(parseFloat(data.amountFinanced) || 0) },
              { label: 'APR',               value: `${parseFloat(data.apr || '0').toFixed(2)}%` },
              { label: 'Monthly Payment',   value: formatCurrency(data.monthlyPayment), bold: true },
              { label: 'Number of Payments', value: `${data.termMonths} payments` },
              { label: 'Finance Charge',    value: formatCurrency(data.financeCharge) },
              { label: 'Total of Payments', value: formatCurrency(data.totalOfPayments), bold: true },
              { label: 'First Payment',     value: data.firstPaymentDate || '—' },
              { label: 'Final Payment',     value: finalPaymentDate || '—' },
            ].map(({ label, value, bold }) => (
              <div key={label} className="flex justify-between text-sm border-b border-blue-100 pb-1.5">
                <span className="text-blue-700 text-xs">{label}</span>
                <span className={`font-mono text-blue-900 text-xs ${bold ? 'font-semibold' : ''}`}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Field label="Approval Conditions / Notes">
        <textarea className="input-base" rows={2} value={data.conditions} onChange={e => set('conditions', e.target.value)} placeholder="Stipulations, conditions, dealer notes..." />
      </Field>
    </div>
  )
}
