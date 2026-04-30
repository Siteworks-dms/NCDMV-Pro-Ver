import { useState, useEffect, useRef } from 'react'
import {
  Save, Upload, X, Loader2, Building2, Phone, Mail,
  Globe, DollarSign, FileText, AlertTriangle, CheckCircle,
  Image, RefreshCw
} from 'lucide-react'
import { toast } from 'sonner'
import { supabase, formatCurrency } from '@/lib/supabase'
import { Field } from '@/components/ui'

const DEALER_ID = import.meta.env.VITE_DEALER_ID ?? ''

type TabId = 'business' | 'fees' | 'compliance' | 'documents'

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'business',   label: 'Business Info',    icon: Building2 },
  { id: 'fees',       label: 'Fee Defaults',      icon: DollarSign },
  { id: 'compliance', label: 'NC Compliance',     icon: FileText },
  { id: 'documents',  label: 'Document Text',     icon: FileText },
]

interface DealerSettings {
  id: string
  legal_name: string
  trade_name: string
  nc_dealer_license: string
  address_line1: string
  address_line2: string
  city: string
  state: string
  zip: string
  phone: string
  email: string
  website: string
  fax: string
  logo_url: string
  logo_path: string
  doc_fee_amount: number
  title_fee_amount: number
  registration_fee: number
  conveyance_fee: number
  hut_rate: number
  hut_cap: number
  finance_disclosure: string
  as_is_disclosure: string
  elt_participant: boolean
  dmv_county_code: string
  dealer_pack_amount: number
}

const DEFAULTS: DealerSettings = {
  id: '', legal_name: '', trade_name: '', nc_dealer_license: '',
  address_line1: '', address_line2: '', city: '', state: 'NC', zip: '',
  phone: '', email: '', website: '', fax: '',
  logo_url: '', logo_path: '',
  doc_fee_amount: 599, title_fee_amount: 58, registration_fee: 0,
  conveyance_fee: 0, hut_rate: 0.03, hut_cap: 2000,
  finance_disclosure: '', as_is_disclosure: '',
  elt_participant: false, dmv_county_code: '', dealer_pack_amount: 0,
}

// ── Logo Upload ───────────────────────────────────────────────────────────────
function LogoUpload({ currentUrl, onUploaded }: {
  currentUrl: string; onUploaded: (url: string, path: string) => void
}) {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (file: File) => {
    setUploading(true)
    const ext  = file.name.split('.').pop()
    const path = `${DEALER_ID}/logo.${ext}`
    const { error } = await supabase.storage
      .from('dealer-logos')
      .upload(path, file, { upsert: true, contentType: file.type })
    setUploading(false)
    if (error) { toast.error('Upload failed: ' + error.message); return }
    const { data } = supabase.storage.from('dealer-logos').getPublicUrl(path)
    onUploaded(data.publicUrl, path)
    toast.success('Logo uploaded')
  }

  const handleRemove = () => onUploaded('', '')

  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-2">Dealership Logo</label>
      {currentUrl ? (
        <div className="flex items-start gap-4">
          <div className="relative">
            <img src={currentUrl} alt="Dealer logo" className="h-20 max-w-48 object-contain rounded-xl border border-gray-200 bg-gray-50 p-2" />
            <button onClick={handleRemove}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600">
              <X size={10} />
            </button>
          </div>
          <div>
            <button onClick={() => inputRef.current?.click()}
              className="btn-secondary text-xs py-1.5 px-3 gap-1.5">
              <Upload size={13} /> Replace Logo
            </button>
            <p className="text-xs text-gray-400 mt-2">Recommended: PNG with transparent background · Max 5MB</p>
          </div>
        </div>
      ) : (
        <div onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-gray-200 hover:border-brand-400 rounded-xl p-6 text-center cursor-pointer transition-colors group w-64">
          {uploading ? (
            <div className="flex items-center justify-center gap-2 text-brand-600">
              <Loader2 size={16} className="animate-spin" /><span className="text-sm">Uploading...</span>
            </div>
          ) : (
            <>
              <Image size={24} className="mx-auto text-gray-300 group-hover:text-brand-400 mb-2 transition-colors" />
              <p className="text-sm text-gray-500">Upload dealership logo</p>
              <p className="text-xs text-gray-400 mt-1">PNG, JPG, WebP, SVG · Max 5MB</p>
            </>
          )}
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} />
    </div>
  )
}

// ── Main Settings Page ────────────────────────────────────────────────────────
export default function Settings() {
  const [tab, setTab]         = useState<TabId>('business')
  const [form, setForm]       = useState<DealerSettings>(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase.from('dealers').select('*').eq('id', DEALER_ID).single()
      setLoading(false)
      if (error || !data) { toast.error('Failed to load settings'); return }
      setForm({
        id:                data.id,
        legal_name:        data.legal_name ?? '',
        trade_name:        data.trade_name ?? '',
        nc_dealer_license: data.nc_dealer_license ?? '',
        address_line1:     data.address_line1 ?? '',
        address_line2:     data.address_line2 ?? '',
        city:              data.city ?? '',
        state:             data.state ?? 'NC',
        zip:               data.zip ?? '',
        phone:             data.phone ?? '',
        email:             data.email ?? '',
        website:           (data as any).website ?? '',
        fax:               (data as any).fax ?? '',
        logo_url:          (data as any).logo_url ?? '',
        logo_path:         (data as any).logo_path ?? '',
        doc_fee_amount:    data.doc_fee_amount ?? 599,
        title_fee_amount:  (data as any).title_fee_amount ?? 58,
        registration_fee:  (data as any).registration_fee ?? 0,
        conveyance_fee:    (data as any).conveyance_fee ?? 0,
        hut_rate:          (data as any).hut_rate ?? 0.03,
        hut_cap:           (data as any).hut_cap ?? 2000,
        finance_disclosure: (data as any).finance_disclosure ?? '',
        as_is_disclosure:   (data as any).as_is_disclosure ?? '',
        elt_participant:    data.elt_participant ?? false,
        dmv_county_code:    data.dmv_county_code ?? '',
        dealer_pack_amount: data.dealer_pack_amount ?? 0,
      })
    }
    load()
  }, [])

  const set = (k: keyof DealerSettings, v: string | boolean | number) =>
    setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    setSaving(true)
    const { error } = await supabase.from('dealers').update({
      legal_name:        form.legal_name,
      trade_name:        form.trade_name || null,
      nc_dealer_license: form.nc_dealer_license,
      address_line1:     form.address_line1,
      address_line2:     form.address_line2 || null,
      city:              form.city,
      state:             form.state,
      zip:               form.zip,
      phone:             form.phone || null,
      email:             form.email || null,
      website:           form.website || null,
      fax:               form.fax || null,
      logo_url:          form.logo_url || null,
      logo_path:         form.logo_path || null,
      doc_fee_amount:    Math.min(form.doc_fee_amount, 599),
      title_fee_amount:  form.title_fee_amount,
      registration_fee:  form.registration_fee,
      conveyance_fee:    form.conveyance_fee,
      hut_rate:          form.hut_rate,
      hut_cap:           form.hut_cap,
      finance_disclosure: form.finance_disclosure || null,
      as_is_disclosure:   form.as_is_disclosure || null,
      elt_participant:    form.elt_participant,
      dmv_county_code:    form.dmv_county_code || null,
      dealer_pack_amount: form.dealer_pack_amount,
    }).eq('id', DEALER_ID)
    setSaving(false)
    if (error) { toast.error(error.message); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    toast.success('Settings saved')
  }

  const hutPreview = Math.min((25000 - 0) * form.hut_rate, form.hut_cap)

  if (loading) return (
    <div className="flex items-center justify-center py-20 gap-2 text-gray-400">
      <RefreshCw size={18} className="animate-spin" /><span>Loading settings...</span>
    </div>
  )

  return (
    <div className="max-w-3xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Business Profile</h2>
          <p className="text-xs text-gray-400 mt-0.5">Dealership info · Fees · NC compliance settings</p>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="btn-primary gap-2 min-w-[120px]">
          {saving ? <Loader2 size={15} className="animate-spin" /> : saved ? <CheckCircle size={15} /> : <Save size={15} />}
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Settings'}
        </button>
      </div>

      {/* Logo preview banner */}
      {form.logo_url && (
        <div className="flex items-center gap-4 bg-gray-50 border border-gray-200 rounded-xl px-5 py-3">
          <img src={form.logo_url} alt="Logo" className="h-10 object-contain" />
          <div>
            <p className="text-sm font-semibold text-gray-800">{form.trade_name || form.legal_name}</p>
            <p className="text-xs text-gray-400 font-mono">NC Dealer #{form.nc_dealer_license}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-100 overflow-x-auto">
        {TABS.map(t => {
          const Icon = t.icon
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-all whitespace-nowrap ${tab === t.id ? 'border-brand-400 text-brand-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              <Icon size={13} />{t.label}
            </button>
          )
        })}
      </div>

      {/* ── TAB: BUSINESS INFO ── */}
      {tab === 'business' && (
        <div className="card space-y-5">
          <LogoUpload
            currentUrl={form.logo_url}
            onUploaded={(url, path) => { set('logo_url', url); set('logo_path', path) }}
          />

          <hr className="border-gray-100" />

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Legal Identity</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Legal Business Name" required>
                <input className="input-base" value={form.legal_name}
                  onChange={e => set('legal_name', e.target.value)} placeholder="Triangle Motors LLC" />
              </Field>
              <Field label="Trade / DBA Name">
                <input className="input-base" value={form.trade_name}
                  onChange={e => set('trade_name', e.target.value)} placeholder="Triangle Motors" />
              </Field>
              <Field label="NC Dealer License #" required>
                <input className="input-base font-mono" value={form.nc_dealer_license}
                  onChange={e => set('nc_dealer_license', e.target.value)} placeholder="NC-12345" />
              </Field>
              <Field label="DMV County Code">
                <input className="input-base font-mono" value={form.dmv_county_code}
                  onChange={e => set('dmv_county_code', e.target.value)} placeholder="Wake, Mecklenburg..." />
              </Field>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Location</p>
            <Field label="Street Address">
              <input className="input-base" value={form.address_line1}
                onChange={e => set('address_line1', e.target.value)} placeholder="4001 Capital Blvd" />
            </Field>
            <div className="grid grid-cols-3 gap-3 mt-2">
              <Field label="City">
                <input className="input-base" value={form.city}
                  onChange={e => set('city', e.target.value)} placeholder="Raleigh" />
              </Field>
              <Field label="State">
                <input className="input-base uppercase" value={form.state}
                  onChange={e => set('state', e.target.value.toUpperCase())} maxLength={2} />
              </Field>
              <Field label="ZIP">
                <input className="input-base font-mono" value={form.zip}
                  onChange={e => set('zip', e.target.value)} placeholder="27604" />
              </Field>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Contact</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Phone">
                <div className="relative">
                  <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input className="input-base pl-8" value={form.phone}
                    onChange={e => set('phone', e.target.value)} placeholder="(919) 555-0100" />
                </div>
              </Field>
              <Field label="Fax">
                <input className="input-base" value={form.fax}
                  onChange={e => set('fax', e.target.value)} placeholder="(919) 555-0101" />
              </Field>
              <Field label="Email">
                <div className="relative">
                  <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input className="input-base pl-8" value={form.email} type="email"
                    onChange={e => set('email', e.target.value)} placeholder="sales@dealership.com" />
                </div>
              </Field>
              <Field label="Website">
                <div className="relative">
                  <Globe size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input className="input-base pl-8" value={form.website}
                    onChange={e => set('website', e.target.value)} placeholder="https://dealership.com" />
                </div>
              </Field>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.elt_participant}
                onChange={e => set('elt_participant', e.target.checked)} className="w-4 h-4" />
              <span className="text-sm text-gray-700">ELT Participant</span>
            </label>
            <span className="text-xs text-gray-400">(Electronic Lien &amp; Title — NCDMV)</span>
          </div>
        </div>
      )}

      {/* ── TAB: FEE DEFAULTS ── */}
      {tab === 'fees' && (
        <div className="space-y-4">
          {/* Info banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-700">
            These defaults auto-populate every new deal. They can be overridden per deal.
            Doc fee is capped at $599 by NC law.
          </div>

          <div className="card">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">Dealer Fees</p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Doc Prep Fee ($)" hint="NC cap: $599 — auto-enforced" required>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input className="input-base pl-7 font-mono"
                    value={form.doc_fee_amount}
                    onChange={e => {
                      const v = Math.min(parseFloat(e.target.value) || 0, 599)
                      set('doc_fee_amount', v)
                    }}
                    type="number" step="0.01" min="0" max="599" />
                </div>
                {form.doc_fee_amount > 599 && (
                  <p className="text-xs text-red-500 mt-1">Exceeds NC $599 cap — will be capped automatically</p>
                )}
              </Field>

              <Field label="Dealer Conveyance Fee ($)">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input className="input-base pl-7 font-mono" value={form.conveyance_fee}
                    onChange={e => set('conveyance_fee', parseFloat(e.target.value) || 0)}
                    type="number" step="0.01" min="0" />
                </div>
              </Field>

              <Field label="Dealer Pack ($)" hint="Gross profit buffer per vehicle">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input className="input-base pl-7 font-mono" value={form.dealer_pack_amount}
                    onChange={e => set('dealer_pack_amount', parseFloat(e.target.value) || 0)}
                    type="number" step="0.01" min="0" />
                </div>
              </Field>
            </div>
          </div>

          <div className="card">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">NC Title &amp; Registration Fees</p>
            <p className="text-xs text-gray-400 mb-4">These are added to every deal's Bill of Sale automatically.</p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="NC Title Fee ($)" hint="Standard NC title: $58.00">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input className="input-base pl-7 font-mono" value={form.title_fee_amount}
                    onChange={e => set('title_fee_amount', parseFloat(e.target.value) || 0)}
                    type="number" step="0.01" min="0" />
                </div>
              </Field>
              <Field label="Registration Fee ($)" hint="Varies by vehicle weight / county">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input className="input-base pl-7 font-mono" value={form.registration_fee}
                    onChange={e => set('registration_fee', parseFloat(e.target.value) || 0)}
                    type="number" step="0.01" min="0" />
                </div>
              </Field>
            </div>

            {/* Live fee preview */}
            <div className="mt-4 bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider">Live Bill of Sale Preview — $25,000 Cash Deal</p>
              {[
                { label: 'Sale Price',         value: formatCurrency(25000) },
                { label: 'Doc Prep Fee',       value: formatCurrency(form.doc_fee_amount) },
                { label: 'NC Title Fee',       value: formatCurrency(form.title_fee_amount) },
                { label: 'Registration Fee',   value: formatCurrency(form.registration_fee) },
                { label: 'Conveyance Fee',     value: formatCurrency(form.conveyance_fee) },
                { label: 'NC HUT (3%)',        value: formatCurrency(hutPreview), highlight: true },
              ].map(({ label, value, highlight }) => (
                <div key={label} className="flex justify-between text-xs py-1.5 border-b border-gray-100">
                  <span className="text-gray-500">{label}</span>
                  <span className={`font-mono font-medium ${highlight ? 'text-red-600' : 'text-gray-800'}`}>{value}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm font-semibold py-2 mt-1">
                <span>Total Due</span>
                <span className="font-mono text-brand-600">
                  {formatCurrency(25000 + form.doc_fee_amount + form.title_fee_amount + form.registration_fee + form.conveyance_fee + hutPreview)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: NC COMPLIANCE ── */}
      {tab === 'compliance' && (
        <div className="space-y-4">
          <div className="card">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">NC Highway-Use Tax (HUT)</p>
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-700 mb-4">
              ⚠ NC HUT rate is set by N.C.G.S. §105-187.3 at 3% with a $2,000 cap. Only update these
              if NC law changes. The current statutory values are pre-filled.
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="HUT Rate (%)" hint="Statutory: 3.00% — do not change unless law changes">
                <div className="relative">
                  <input className="input-base font-mono pr-6" value={(form.hut_rate * 100).toFixed(2)}
                    onChange={e => set('hut_rate', (parseFloat(e.target.value) || 0) / 100)}
                    type="number" step="0.01" min="0" max="10" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                </div>
              </Field>
              <Field label="HUT Cap ($)" hint="Statutory cap: $2,000.00">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input className="input-base pl-7 font-mono" value={form.hut_cap}
                    onChange={e => set('hut_cap', parseFloat(e.target.value) || 0)}
                    type="number" step="0.01" min="0" />
                </div>
              </Field>
            </div>

            {/* HUT calc table */}
            <div className="mt-4 bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-3">HUT Examples at current rate</p>
              {[10000, 25000, 50000, 66667, 80000].map(price => {
                const hut = Math.min(price * form.hut_rate, form.hut_cap)
                const capped = price * form.hut_rate > form.hut_cap
                return (
                  <div key={price} className="flex justify-between text-xs py-1.5 border-b border-gray-100">
                    <span className="text-gray-500">Sale price: {formatCurrency(price)}</span>
                    <span className={`font-mono ${capped ? 'text-red-600 font-semibold' : 'text-gray-700'}`}>
                      {formatCurrency(hut)} {capped && '← CAPPED'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="card">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Title Filing</p>
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700">
              NC GS §20-75: Title must be filed with NCDMV within <strong>28 days</strong> of sale.
              The system automatically calculates the deadline for every deal and sends alerts at 14 days and 7 days.
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: DOCUMENT TEXT ── */}
      {tab === 'documents' && (
        <div className="space-y-4">
          <div className="card">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Finance Disclosure Text</p>
            <p className="text-xs text-gray-400 mb-3">
              Printed at the bottom of the Bill of Sale for financed deals. Leave blank to use the default disclosure.
            </p>
            <textarea
              className="input-base text-xs leading-relaxed"
              rows={5}
              value={form.finance_disclosure}
              onChange={e => set('finance_disclosure', e.target.value)}
              placeholder={`NOTICE TO BUYER: Do not sign this contract before you read it. You are entitled to a copy of this contract at the time you sign. Keep this contract to protect your legal rights. The Annual Percentage Rate may be negotiable with the dealer.`}
            />
          </div>

          <div className="card">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">AS IS — No Warranty Disclosure</p>
            <p className="text-xs text-gray-400 mb-3">
              Printed on FTC Buyer's Guide and Bill of Sale for as-is deals.
            </p>
            <textarea
              className="input-base text-xs leading-relaxed"
              rows={5}
              value={form.as_is_disclosure}
              onChange={e => set('as_is_disclosure', e.target.value)}
              placeholder={`AS IS — NO WARRANTY: This vehicle is being sold "as is" and with all faults. The dealer makes no warranty, express or implied. The purchaser is responsible for all costs of any repair. NC GS §25-2-316.`}
            />
          </div>

          <div className="card">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">FTC Buyer's Guide — Implied Warranty State</p>
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-700">
              North Carolina law gives buyers some rights to recover damages if a vehicle turns out to be defective.
              Contact the NC Department of Justice (919-716-6000) for information about your legal rights under
              NC implied warranty statutes. This language is required on the FTC Buyer's Guide.
            </div>
          </div>
        </div>
      )}

      {/* Save button — bottom sticky */}
      <div className="flex justify-end pt-2">
        <button onClick={handleSave} disabled={saving}
          className="btn-primary gap-2 min-w-[140px]">
          {saving ? <Loader2 size={15} className="animate-spin" /> : saved ? <CheckCircle size={15} /> : <Save size={15} />}
          {saving ? 'Saving...' : saved ? 'Settings Saved!' : 'Save All Settings'}
        </button>
      </div>
    </div>
  )
}
