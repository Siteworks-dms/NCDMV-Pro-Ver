import { useState } from 'react'
import { FileText, CheckCircle, Clock, XCircle, AlertTriangle, Download, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import type { NCForm, NCFormType, NCFormStatus } from '@/types/database'
import { FORM_LABELS, NOTARY_REQUIRED } from '@/types/database'

const FORM_DESCRIPTIONS: Record<NCFormType, string> = {
  mvr1:             'Title Application — notarization required. File with NCDMV within 28 days.',
  mvr180:           'Federal odometer disclosure. Required for vehicles under 10 model years / under 16,000 lbs.',
  mvr181:           'Damage disclosure. Required when damage exceeds 25% of FMV (NC GS §20-71.4).',
  mvr2:             "Dealer's reassignment of title. Required for all licensed NC dealer sales.",
  ftc_buyers_guide: 'FTC Used Car Rule (16 CFR Part 455). Post on vehicle window AND give copy to buyer.',
  bill_of_sale:     'Itemized Buyer\'s Order per 19A NCAC 03D .0228. Execute before any financing contract.',
  buyer_order:      'Alternative buyer order format.',
}

const STATUS_CONFIG: Record<NCFormStatus, { icon: React.ElementType; color: string; label: string }> = {
  draft:     { icon: XCircle,       color: 'text-gray-400',  label: 'Not generated' },
  generated: { icon: FileText,      color: 'text-blue-500',  label: 'Generated — needs signing' },
  signed:    { icon: CheckCircle,   color: 'text-green-500', label: 'Signed' },
  notarized: { icon: CheckCircle,   color: 'text-green-600', label: 'Notarized' },
  filed:     { icon: CheckCircle,   color: 'text-green-700', label: 'Filed with NCDMV' },
  void:      { icon: AlertTriangle, color: 'text-red-500',   label: 'Void' },
}

interface NCFormsPanelProps {
  dealId: string
  dealerId: string
  forms: NCForm[]
  damageFlag: boolean
  warrantyType: 'as_is' | 'full_warranty' | 'limited_warranty'
  onRefresh: () => void
}

export default function NCFormsPanel({ dealId, dealerId, forms, damageFlag, warrantyType, onRefresh }: NCFormsPanelProps) {
  const [generating, setGenerating] = useState<NCFormType | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const requiredForms: NCFormType[] = [
    'bill_of_sale',
    'mvr180',
    'ftc_buyers_guide',
    'mvr1',
    'mvr2',
    ...(damageFlag ? ['mvr181' as NCFormType] : []),
  ]

  const getFormStatus = (type: NCFormType): NCFormStatus => {
    return forms.find(f => f.form_type === type)?.status ?? 'draft'
  }

  const getForm = (type: NCFormType) => forms.find(f => f.form_type === type)

  const generateForm = async (type: NCFormType) => {
    setGenerating(type)
    try {
      // Check if form already exists
      const existing = getForm(type)
      if (existing && existing.status !== 'draft' && existing.status !== 'void') {
        toast.info(`${FORM_LABELS[type]} already generated`)
        return
      }

      const { error } = await supabase.from('nc_forms').upsert({
        deal_id: dealId,
        dealer_id: dealerId,
        form_type: type,
        status: 'generated',
        generated_at: new Date().toISOString(),
        requires_notary: NOTARY_REQUIRED.includes(type),
        data_snapshot: {
          generated_at: new Date().toISOString(),
          form_type: type,
          deal_id: dealId,
          // Full data snapshot would be populated server-side via Edge Function in production
        },
      }, { onConflict: 'deal_id,form_type' })

      if (error) throw error
      toast.success(`${FORM_LABELS[type]} generated`)
      onRefresh()
    } catch (err: any) {
      const msg = err?.message ?? String(err)
      toast.error(`Form error: ${msg}`)
      console.error('Generate error:', err)
    } finally {
      setGenerating(null)
    }
  }

  const updateFormStatus = async (form: NCForm, newStatus: NCFormStatus) => {
    setUpdatingId(form.id)
    const updates: Partial<NCForm> = { status: newStatus }

    if (newStatus === 'signed') {
      updates.signed_at = new Date().toISOString()
      updates.signed_by_buyer = true
      updates.signed_by_seller = true
    } else if (newStatus === 'notarized') {
      updates.notarized_at = new Date().toISOString()
    } else if (newStatus === 'filed') {
      updates.submitted_to_dmv = true
      updates.dmv_submitted_at = new Date().toISOString().split('T')[0]
    }

    const { error } = await supabase
      .from('nc_forms')
      .update(updates)
      .eq('id', form.id)

    setUpdatingId(null)
    if (error) { toast.error('Update failed'); return }
    toast.success(`Status updated to ${newStatus}`)
    onRefresh()
  }

  const generateAll = async () => {
    for (const type of requiredForms) {
      const status = getFormStatus(type)
      if (status === 'draft') {
        await generateForm(type)
        await new Promise(r => setTimeout(r, 300))
      }
    }
  }

  const completedCount = requiredForms.filter(t => {
    const s = getFormStatus(t)
    return s === 'signed' || s === 'notarized' || s === 'filed'
  }).length

  const progressPct = Math.round((completedCount / requiredForms.length) * 100)

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-sm font-medium text-gray-800">{completedCount} of {requiredForms.length} forms complete</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {completedCount === requiredForms.length
              ? '✓ All NC compliance forms complete — ready to fund'
              : 'Complete all forms before deal funding'}
          </p>
        </div>
        <span className={`text-sm font-mono font-semibold ${progressPct === 100 ? 'text-green-600' : 'text-amber-600'}`}>
          {progressPct}%
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${progressPct === 100 ? 'bg-green-500' : 'bg-amber-400'}`}
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Generate all button */}
      {completedCount < requiredForms.length && (
        <button onClick={generateAll} className="btn-primary w-full gap-2 text-sm">
          <FileText size={15} />
          Generate All Required Forms
        </button>
      )}

      {/* Form rows */}
      <div className="space-y-2">
        {requiredForms.map(type => {
          const status   = getFormStatus(type)
          const form     = getForm(type)
          const cfg      = STATUS_CONFIG[status]
          const Icon     = cfg.icon
          const isGen    = generating === type
          const isUpd    = form ? updatingId === form.id : false
          const needsNotary = NOTARY_REQUIRED.includes(type)
          const isDamageForm = type === 'mvr181'

          const nextStatusOptions: { status: NCFormStatus; label: string }[] = (() => {
            if (status === 'generated') {
              const opts: { status: NCFormStatus; label: string }[] = [{ status: 'signed', label: 'Mark Signed' }]
              if (needsNotary) opts.push({ status: 'notarized', label: 'Mark Notarized' })
              return opts
            }
            if (status === 'signed' || status === 'notarized') {
              return [{ status: 'filed', label: 'Mark Filed with NCDMV' }]
            }
            return []
          })()

          return (
            <div
              key={type}
              className={`border rounded-xl p-4 transition-colors ${
                status === 'filed'     ? 'bg-green-50 border-green-200' :
                status === 'notarized' ? 'bg-green-50 border-green-200' :
                status === 'signed'    ? 'bg-blue-50 border-blue-200' :
                status === 'generated' ? 'bg-amber-50 border-amber-200' :
                isDamageForm           ? 'bg-red-50 border-red-200' :
                'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <Icon size={18} className={`${cfg.color} flex-shrink-0 mt-0.5`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-900">{FORM_LABELS[type]}</span>
                    {needsNotary && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-300">
                        ⚠ NOTARY REQ
                      </span>
                    )}
                    {damageFlag && type === 'mvr181' && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-100 text-red-700 border border-red-300">
                        DAMAGE TRIGGERED
                      </span>
                    )}
                    <span className={`text-[10px] font-mono ${cfg.color}`}>{cfg.label}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{FORM_DESCRIPTIONS[type]}</p>

                  {/* Action buttons */}
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {status === 'draft' && (
                      <button
                        onClick={() => generateForm(type)}
                        disabled={isGen}
                        className="btn-primary py-1 px-3 text-xs gap-1.5"
                      >
                        {isGen ? <RefreshCw size={12} className="animate-spin" /> : <FileText size={12} />}
                        {isGen ? 'Generating...' : 'Generate'}
                      </button>
                    )}
                    {nextStatusOptions.map(opt => (
                      <button
                        key={opt.status}
                        onClick={() => form && updateFormStatus(form, opt.status)}
                        disabled={isUpd}
                        className="btn-secondary py-1 px-3 text-xs gap-1.5"
                      >
                        {isUpd ? <RefreshCw size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                        {opt.label}
                      </button>
                    ))}
                    {status !== 'draft' && (
                      <button className="btn-ghost py-1 px-3 text-xs gap-1.5 text-gray-500">
                        <Download size={12} /> Download PDF
                      </button>
                    )}
                    {status === 'generated' && (
                      <button
                        onClick={() => form && updateFormStatus(form, 'void')}
                        className="btn-ghost py-1 px-3 text-xs text-red-500 hover:bg-red-50"
                      >
                        Void
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* FTC Buyer's Guide toggle */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">FTC Buyer's Guide — Warranty Designation</p>
        <div className="flex gap-3">
          {(['as_is', 'limited_warranty', 'full_warranty'] as const).map(wt => (
            <label key={wt} className={`flex-1 flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${warrantyType === wt ? 'bg-white border-brand-400 shadow-sm' : 'border-gray-200 hover:border-gray-300'}`}>
              <input type="radio" name="warrantyType" value={wt} checked={warrantyType === wt} readOnly className="text-brand-400" />
              <span className="text-xs font-medium capitalize text-gray-700">{wt.replace('_', ' ')}</span>
            </label>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2">
          {warrantyType === 'as_is'
            ? '"AS IS — NO WARRANTY": Dealer makes no warranty, express or implied. Buyer accepts full responsibility.'
            : 'Warranty details must be specified in the FTC Buyer\'s Guide and deal record.'}
        </p>
      </div>
    </div>
  )
}
