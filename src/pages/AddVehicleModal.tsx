import { useState } from 'react'
import { Search, CheckCircle, AlertTriangle, Loader2, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useVinDecode } from '@/hooks/useVinDecode'
import { Modal, Field } from '@/components/ui'

interface AddVehicleModalProps {
  open: boolean
  onClose: () => void
  onAdded: () => void
  dealerId: string
}

const CURRENT_YEAR = new Date().getFullYear()

export default function AddVehicleModal({ open, onClose, onAdded, dealerId }: AddVehicleModalProps) {
  const { decode, loading: decoding, error: vinError, result: vinResult, reset: resetVin } = useVinDecode()

  const [vinInput, setVinInput] = useState('')
  const [saving, setSaving] = useState(false)

  // Form fields
  const [form, setForm] = useState({
    year: '', make: '', model: '', trim: '', bodyStyle: '',
    engine: '', transmission: '', drivetrain: '', fuelType: '',
    colorExterior: '', colorInterior: '',
    odometer: '', conditionGrade: 'good',
    costBasis: '', reconCost: '0', listPrice: '',
    acquisitionType: 'auction', acquiredFrom: '', acquiredDate: '',
    titleNumber: '', titleState: 'NC', titleInHand: false,
    damageFlag: false, damageDescription: '',
    floodSalvageFlag: false, priorAccident: false, priorAccidentDesc: '',
    airbagDeployed: false, odometerActual: true,
    notes: '',
  })

  const set = (key: string, val: string | boolean) => setForm(f => ({ ...f, [key]: val }))

  const handleVinDecode = async () => {
    const decoded = await decode(vinInput)
    if (!decoded) return
    setForm(f => ({
      ...f,
      year: decoded.year,
      make: decoded.make,
      model: decoded.model,
      trim: decoded.trim,
      bodyStyle: decoded.bodyStyle,
      engine: decoded.engine,
      transmission: decoded.transmission,
      drivetrain: decoded.drivetrain,
      fuelType: decoded.fuelType,
    }))
  }

  const handleClose = () => {
    setVinInput('')
    resetVin()
    setForm({
      year: '', make: '', model: '', trim: '', bodyStyle: '',
      engine: '', transmission: '', drivetrain: '', fuelType: '',
      colorExterior: '', colorInterior: '',
      odometer: '', conditionGrade: 'good',
      costBasis: '', reconCost: '0', listPrice: '',
      acquisitionType: 'auction', acquiredFrom: '', acquiredDate: '',
      titleNumber: '', titleState: 'NC', titleInHand: false,
      damageFlag: false, damageDescription: '',
      floodSalvageFlag: false, priorAccident: false, priorAccidentDesc: '',
      airbagDeployed: false, odometerActual: true,
      notes: '',
    })
    onClose()
  }

  const handleSave = async () => {
    if (!vinInput || vinInput.trim().length !== 17) {
      toast.error('Enter a valid 17-character VIN')
      return
    }
    if (!form.year || !form.make || !form.model) {
      toast.error('Decode the VIN first or fill Year, Make, Model')
      return
    }
    if (!form.odometer) { toast.error('Odometer reading is required'); return }
    if (!form.costBasis) { toast.error('Cost basis is required'); return }

    setSaving(true)
    const { error } = await supabase.from('vehicles').insert({
      dealer_id: dealerId,
      vin: vinInput.trim().toUpperCase(),
      year: parseInt(form.year),
      make: form.make,
      model: form.model,
      trim: form.trim || null,
      body_style: form.bodyStyle || null,
      engine: form.engine || null,
      transmission: form.transmission || null,
      drivetrain: form.drivetrain || null,
      fuel_type: form.fuelType || null,
      color_exterior: form.colorExterior || null,
      color_interior: form.colorInterior || null,
      odometer_acquisition: parseInt(form.odometer),
      condition_grade: form.conditionGrade as 'excellent' | 'good' | 'fair' | 'poor',
      cost_basis: parseFloat(form.costBasis),
      recon_cost: parseFloat(form.reconCost) || 0,
      list_price: form.listPrice ? parseFloat(form.listPrice) : null,
      acquisition_type: form.acquisitionType as 'auction' | 'trade' | 'purchase' | 'consignment' | 'other',
      acquired_from: form.acquiredFrom || null,
      acquired_date: form.acquiredDate || null,
      title_number: form.titleNumber || null,
      title_state: form.titleState,
      title_in_hand: form.titleInHand,
      damage_flag: form.damageFlag,
      damage_description: form.damageDescription || null,
      flood_salvage_flag: form.floodSalvageFlag,
      prior_accident: form.priorAccident,
      prior_accident_desc: form.priorAccidentDesc || null,
      airbag_deployed: form.airbagDeployed,
      odometer_actual: form.odometerActual,
      status: 'acquired',
      notes: form.notes || null,
    })

    setSaving(false)
    if (error) {
      if (error.code === '23505') toast.error('This VIN already exists in your inventory')
      else toast.error(`Error: ${error.message}`)
      return
    }
    toast.success(`${form.year} ${form.make} ${form.model} added to inventory`)
    onAdded()
    handleClose()
  }

  const grossPotential = form.listPrice && form.costBasis
    ? parseFloat(form.listPrice) - parseFloat(form.costBasis) - (parseFloat(form.reconCost) || 0)
    : null

  return (
    <Modal open={open} onClose={handleClose} title="Add Vehicle to Inventory" subtitle="Decode VIN first, then fill remaining details" width="max-w-3xl">
      {/* VIN Decoder */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Step 1 — VIN Decode (NHTSA)</p>
        <div className="flex gap-2">
          <input
            className="input-base font-mono uppercase tracking-widest text-sm flex-1"
            placeholder="Enter 17-character VIN..."
            maxLength={17}
            value={vinInput}
            onChange={e => { setVinInput(e.target.value.toUpperCase()); resetVin() }}
            onKeyDown={e => e.key === 'Enter' && handleVinDecode()}
          />
          <button
            onClick={handleVinDecode}
            disabled={decoding || vinInput.length !== 17}
            className="btn-primary px-4 gap-2 min-w-[110px]"
          >
            {decoding ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            {decoding ? 'Decoding...' : 'Decode VIN'}
          </button>
        </div>

        {/* VIN length indicator */}
        <div className="flex gap-1 mt-2">
          {Array.from({ length: 17 }).map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i < vinInput.length ? 'bg-brand-400' : 'bg-gray-200'}`} />
          ))}
          <span className="text-xs text-gray-400 ml-1 font-mono">{vinInput.length}/17</span>
        </div>

        {vinError && (
          <div className="mt-3 flex items-start gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-xs">
            <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
            {vinError}
          </div>
        )}

        {vinResult && (
          <div className="mt-3 flex items-start gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2.5 text-xs">
            <CheckCircle size={14} className="flex-shrink-0 mt-0.5" />
            <span>
              <strong>{vinResult.year} {vinResult.make} {vinResult.model} {vinResult.trim}</strong>
              {vinResult.engine && ` · ${vinResult.engine}`}
              {vinResult.bodyStyle && ` · ${vinResult.bodyStyle}`}
            </span>
          </div>
        )}
      </div>

      {/* Vehicle Details */}
      <div className="space-y-5">
        {/* Identity */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Step 2 — Vehicle Details</p>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Year" required>
              <input className="input-base" value={form.year} onChange={e => set('year', e.target.value)}
                placeholder="2022" type="number" min="1980" max={CURRENT_YEAR + 1} />
            </Field>
            <Field label="Make" required>
              <input className="input-base" value={form.make} onChange={e => set('make', e.target.value)} placeholder="Honda" />
            </Field>
            <Field label="Model" required>
              <input className="input-base" value={form.model} onChange={e => set('model', e.target.value)} placeholder="Accord" />
            </Field>
            <Field label="Trim">
              <input className="input-base" value={form.trim} onChange={e => set('trim', e.target.value)} placeholder="EX-L" />
            </Field>
            <Field label="Body Style">
              <input className="input-base" value={form.bodyStyle} onChange={e => set('bodyStyle', e.target.value)} placeholder="Sedan" />
            </Field>
            <Field label="Engine">
              <input className="input-base" value={form.engine} onChange={e => set('engine', e.target.value)} placeholder="2.0L 4-cyl" />
            </Field>
            <Field label="Transmission">
              <input className="input-base" value={form.transmission} onChange={e => set('transmission', e.target.value)} placeholder="Automatic" />
            </Field>
            <Field label="Drivetrain">
              <input className="input-base" value={form.drivetrain} onChange={e => set('drivetrain', e.target.value)} placeholder="FWD" />
            </Field>
            <Field label="Fuel Type">
              <input className="input-base" value={form.fuelType} onChange={e => set('fuelType', e.target.value)} placeholder="Gasoline" />
            </Field>
          </div>
        </div>

        {/* Colors & Mileage */}
        <div className="grid grid-cols-3 gap-3">
          <Field label="Exterior Color">
            <input className="input-base" value={form.colorExterior} onChange={e => set('colorExterior', e.target.value)} placeholder="Lunar Silver" />
          </Field>
          <Field label="Interior Color">
            <input className="input-base" value={form.colorInterior} onChange={e => set('colorInterior', e.target.value)} placeholder="Black" />
          </Field>
          <Field label="Condition">
            <div className="relative">
              <select className="input-base appearance-none pr-8" value={form.conditionGrade} onChange={e => set('conditionGrade', e.target.value)}>
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </Field>
          <Field label="Odometer (miles)" required>
            <input className="input-base font-mono" value={form.odometer} onChange={e => set('odometer', e.target.value)}
              placeholder="48250" type="number" min="0" />
          </Field>
          <Field label="Acquisition Type">
            <div className="relative">
              <select className="input-base appearance-none pr-8" value={form.acquisitionType} onChange={e => set('acquisitionType', e.target.value)}>
                <option value="auction">Auction</option>
                <option value="trade">Trade-In</option>
                <option value="purchase">Direct Purchase</option>
                <option value="consignment">Consignment</option>
                <option value="other">Other</option>
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </Field>
          <Field label="Acquired From">
            <input className="input-base" value={form.acquiredFrom} onChange={e => set('acquiredFrom', e.target.value)} placeholder="Manheim Charlotte" />
          </Field>
        </div>

        {/* Financials */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Pricing & Cost</p>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Cost Basis ($)" required>
              <input className="input-base font-mono" value={form.costBasis} onChange={e => set('costBasis', e.target.value)}
                placeholder="18500.00" type="number" step="0.01" min="0" />
            </Field>
            <Field label="Recon Cost ($)">
              <input className="input-base font-mono" value={form.reconCost} onChange={e => set('reconCost', e.target.value)}
                placeholder="0.00" type="number" step="0.01" min="0" />
            </Field>
            <Field label="List Price ($)">
              <input className="input-base font-mono" value={form.listPrice} onChange={e => set('listPrice', e.target.value)}
                placeholder="22900.00" type="number" step="0.01" min="0" />
            </Field>
          </div>
          {grossPotential !== null && (
            <div className={`mt-2 text-xs font-mono px-3 py-2 rounded-lg border ${grossPotential >= 0 ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
              Gross potential: {grossPotential >= 0 ? '+' : ''}{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(grossPotential)}
            </div>
          )}
        </div>

        {/* Title */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">NC Title Information</p>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Title Number">
              <input className="input-base font-mono" value={form.titleNumber} onChange={e => set('titleNumber', e.target.value)} placeholder="NC title #" />
            </Field>
            <Field label="Title State">
              <input className="input-base uppercase" value={form.titleState} onChange={e => set('titleState', e.target.value.toUpperCase())} maxLength={2} placeholder="NC" />
            </Field>
            <Field label="Title Status">
              <label className="flex items-center gap-2 h-9 cursor-pointer">
                <input type="checkbox" checked={form.titleInHand} onChange={e => set('titleInHand', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-brand-400" />
                <span className="text-sm text-gray-700">Title in hand</span>
              </label>
            </Field>
          </div>
        </div>

        {/* NC Compliance Disclosures */}
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-red-700 mb-3">
            NC Compliance Disclosures — Required for MVR-181 &amp; FTC Guide
          </p>
          <div className="grid grid-cols-2 gap-y-3 gap-x-6">
            {[
              { key: 'damageFlag', label: 'Damage exceeds 25% FMV (triggers MVR-181)' },
              { key: 'floodSalvageFlag', label: 'Flood / Salvage / Branded title' },
              { key: 'priorAccident', label: 'Prior accident on record' },
              { key: 'airbagDeployed', label: 'Airbag previously deployed' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form[key as keyof typeof form] as boolean}
                  onChange={e => set(key, e.target.checked)}
                  className="w-4 h-4 rounded border-red-300" />
                <span className="text-xs text-red-800">{label}</span>
              </label>
            ))}
            <label className="flex items-center gap-2 cursor-pointer col-span-2">
              <input type="checkbox" checked={!form.odometerActual}
                onChange={e => set('odometerActual', !e.target.checked)}
                className="w-4 h-4 rounded border-red-300" />
              <span className="text-xs text-red-800">Odometer reading NOT actual (exceeds mechanical limits or TMU)</span>
            </label>
          </div>
          {(form.damageFlag || form.priorAccident) && (
            <Field label="Damage / Accident Description" hint="Describe damage area, type, and repair status">
              <textarea className="input-base mt-1" rows={2} value={form.damageDescription}
                onChange={e => set('damageDescription', e.target.value)}
                placeholder="Front-end collision, frame repaired at certified shop..." />
            </Field>
          )}
        </div>

        {/* Notes */}
        <Field label="Internal Notes">
          <textarea className="input-base" rows={2} value={form.notes}
            onChange={e => set('notes', e.target.value)} placeholder="Auction notes, recon needed, etc." />
        </Field>
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
        <button onClick={handleClose} className="btn-secondary">Cancel</button>
        <button onClick={handleSave} disabled={saving} className="btn-primary min-w-[130px]">
          {saving ? <><Loader2 size={14} className="animate-spin" />Saving...</> : '+ Add to Inventory'}
        </button>
      </div>
    </Modal>
  )
}
