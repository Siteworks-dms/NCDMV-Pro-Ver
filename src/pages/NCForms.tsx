import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, FileText, CheckCircle, AlertTriangle, Clock, Download, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { downloadPDF, type PDFFormType } from '@/lib/pdfForms'
import type { DealSummary, NCForm, NCFormType, NCFormStatus } from '@/types/database'
import { FORM_LABELS, NOTARY_REQUIRED } from '@/types/database'
import { StatCard } from '@/components/ui'
import { titleDaysRemaining, formatCurrency } from '@/lib/supabase'

const FORM_ORDER: NCFormType[] = ['bill_of_sale', 'mvr180', 'ftc_buyers_guide', 'mvr1', 'mvr2', 'mvr181']

const STATUS_CONFIG: Record<NCFormStatus, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  draft:     { icon: Clock,         color: 'text-gray-400',   bg: 'bg-gray-50',   label: 'Pending' },
  generated: { icon: FileText,      color: 'text-blue-500',   bg: 'bg-blue-50',   label: 'Generated' },
  signed:    { icon: CheckCircle,   color: 'text-green-500',  bg: 'bg-green-50',  label: 'Signed' },
  notarized: { icon: CheckCircle,   color: 'text-green-600',  bg: 'bg-green-50',  label: 'Notarized' },
  filed:     { icon: CheckCircle,   color: 'text-green-700',  bg: 'bg-green-50',  label: 'Filed' },
  void:      { icon: AlertTriangle, color: 'text-red-500',    bg: 'bg-red-50',    label: 'Void' },
}

interface DealWithForms extends DealSummary {
  nc_forms_detail?: NCForm[]
}

export default function NCForms() {
  const [deals, setDeals]         = useState<DealWithForms[]>([])
  const [loading, setLoading]     = useState(true)
  const [downloading, setDownloading] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<'all' | 'incomplete' | 'complete'>('incomplete')

  const fetchData = useCallback(async () => {
    setLoading(true)
    // Fetch deals with their forms
    const { data: dealData, error } = await supabase
      .from('v_deal_summary').select('*')
      .in('status', ['pending', 'funded', 'pencil'])
      .order('sale_date', { ascending: false })

    if (error) { toast.error('Failed to load'); setLoading(false); return }

    // Fetch all nc_forms for these deals
    const dealIds = (dealData ?? []).map((d: DealSummary) => d.id)
    const { data: formsData } = dealIds.length > 0
      ? await supabase.from('nc_forms').select('*').in('deal_id', dealIds)
      : { data: [] }

    const formsMap: Record<string, NCForm[]> = {}
    ;(formsData ?? []).forEach((f: NCForm) => {
      if (!formsMap[f.deal_id]) formsMap[f.deal_id] = []
      formsMap[f.deal_id].push(f)
    })

    const combined = (dealData ?? []).map((d: DealSummary) => ({
      ...d,
      nc_forms_detail: formsMap[d.id] ?? [],
    }))

    setDeals(combined)
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleDownload = async (deal: DealSummary, formType: NCFormType) => {
    const key = `${deal.id}-${formType}`
    setDownloading(key)
    try {
      await downloadPDF(formType as PDFFormType, deal)
      toast.success(`${FORM_LABELS[formType]} downloaded`)
    } catch {
      toast.error('PDF generation failed')
    } finally {
      setDownloading(null)
    }
  }

  const handleGenerateAndDownload = async (deal: DealSummary, formType: NCFormType, dealerId: string) => {
    const key = `${deal.id}-${formType}`
    setDownloading(key)
    try {
      // Upsert form record
      await supabase.from('nc_forms').upsert({
        deal_id: deal.id, dealer_id: dealerId,
        form_type: formType, status: 'generated',
        generated_at: new Date().toISOString(),
        requires_notary: NOTARY_REQUIRED.includes(formType),
        data_snapshot: { generated_at: new Date().toISOString(), deal_id: deal.id },
      }, { onConflict: 'deal_id,form_type' })

      await downloadPDF(formType as PDFFormType, deal)
      toast.success(`${FORM_LABELS[formType]} generated & downloaded`)
      fetchData()
    } catch {
      toast.error('Failed to generate PDF')
    } finally {
      setDownloading(null)
    }
  }

  // Stats
  const totalForms    = deals.reduce((s, d) => s + (d.nc_forms_detail?.length ?? 0), 0)
  const signedForms   = deals.reduce((s, d) => s + (d.nc_forms_detail?.filter(f => ['signed','notarized','filed'].includes(f.status)).length ?? 0), 0)
  const titleAlerts   = deals.filter(d => !d.title_filed_at && titleDaysRemaining(d.sale_date) <= 7).length
  const notaryPending = deals.reduce((s, d) => s + (d.nc_forms_detail?.filter(f => f.requires_notary && f.status === 'generated').length ?? 0), 0)

  const visibleDeals = deals.filter(d => {
    if (filterStatus === 'all') return true
    const forms = d.nc_forms_detail ?? []
    const allDone = FORM_ORDER
      .filter(t => t !== 'mvr181' || d.damage_flag)
      .every(t => {
        const f = forms.find(f => f.form_type === t)
        return f && ['signed','notarized','filed'].includes(f.status)
      })
    return filterStatus === 'incomplete' ? !allDone : allDone
  })

  const DEALER_ID = import.meta.env.VITE_DEALER_ID ?? ''

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">NC DMV Forms Center</h2>
          <p className="text-xs text-gray-400 mt-0.5">Generate, track, and manage all NC compliance documents</p>
        </div>
        <button onClick={fetchData} className="btn-secondary text-xs py-1.5 px-3 gap-1.5">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Active Deals"    value={deals.length}    sub="With open forms" color="blue" />
        <StatCard label="Forms Completed" value={`${signedForms}/${totalForms}`} sub="Signed or filed" color="green" />
        <StatCard label="Title Alerts"    value={titleAlerts}     sub="Due within 7 days" color={titleAlerts > 0 ? 'red' : 'gray'} />
        <StatCard label="Awaiting Notary" value={notaryPending}   sub="MVR-1 pending notarization" color={notaryPending > 0 ? 'amber' : 'gray'} />
      </div>

      {/* Filter */}
      <div className="flex bg-gray-100 rounded-lg p-1 gap-0.5 w-fit">
        {(['all', 'incomplete', 'complete'] as const).map(f => (
          <button key={f} onClick={() => setFilterStatus(f)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all capitalize ${filterStatus === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {f === 'incomplete' ? `Needs Attention (${deals.filter(d => {
              const forms = d.nc_forms_detail ?? []
              return !FORM_ORDER.filter(t => t !== 'mvr181' || d.damage_flag).every(t => {
                const f = forms.find(f => f.form_type === t)
                return f && ['signed','notarized','filed'].includes(f.status)
              })
            }).length})` : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Deal cards */}
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
          <RefreshCw size={16} className="animate-spin" /><span className="text-sm">Loading forms...</span>
        </div>
      ) : visibleDeals.length === 0 ? (
        <div className="card text-center py-12">
          <CheckCircle size={32} className="mx-auto text-green-400 mb-3" />
          <p className="text-sm font-medium text-gray-700">All caught up!</p>
          <p className="text-xs text-gray-400 mt-1">No forms need attention right now.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {visibleDeals.map(deal => {
            const forms = deal.nc_forms_detail ?? []
            const daysLeft = titleDaysRemaining(deal.sale_date)
            const titleUrgent = !deal.title_filed_at && daysLeft <= 7
            const requiredTypes = FORM_ORDER.filter(t => t !== 'mvr181' || deal.damage_flag)
            const completedCount = requiredTypes.filter(t => {
              const f = forms.find(f => f.form_type === t)
              return f && ['signed','notarized','filed'].includes(f.status)
            }).length
            const pct = Math.round((completedCount / requiredTypes.length) * 100)

            return (
              <div key={deal.id} className="card">
                {/* Deal header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-gray-400">{deal.deal_number}</span>
                      <span className={`badge text-[10px] ${deal.status === 'funded' ? 'badge-green' : deal.status === 'pending' ? 'badge-amber' : 'badge-gray'}`}>
                        {deal.status.toUpperCase()}
                      </span>
                      {deal.damage_flag && <span className="badge-red text-[10px]">DAMAGE — MVR-181 REQ</span>}
                    </div>
                    <p className="text-base font-semibold text-gray-900">{deal.year} {deal.make} {deal.model}</p>
                    <p className="text-xs text-gray-400 font-mono">{deal.vin}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{deal.buyer_name} · {formatCurrency(deal.sale_price)} · {deal.sale_date}</p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <p className={`text-xs font-mono font-semibold ${pct === 100 ? 'text-green-600' : 'text-amber-600'}`}>
                      {completedCount}/{requiredTypes.length} forms done
                    </p>
                    <div className="h-1.5 w-28 bg-gray-100 rounded-full mt-1 overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-green-500' : 'bg-amber-400'}`} style={{ width: `${pct}%` }} />
                    </div>
                    <div className={`flex items-center gap-1 justify-end mt-2 text-xs ${titleUrgent ? 'text-red-600 font-semibold' : 'text-gray-400'}`}>
                      {titleUrgent && <AlertTriangle size={12} />}
                      <span className="font-mono">Title due: {deal.title_filing_due}</span>
                    </div>
                  </div>
                </div>

                {/* Forms grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {requiredTypes.map(formType => {
                    const form     = forms.find(f => f.form_type === formType)
                    const status   = (form?.status ?? 'draft') as NCFormStatus
                    const cfg      = STATUS_CONFIG[status]
                    const Icon     = cfg.icon
                    const dlKey    = `${deal.id}-${formType}`
                    const isDownloading = downloading === dlKey
                    const needsNotary = NOTARY_REQUIRED.includes(formType)
                    const isPDFable = ['bill_of_sale','mvr180','mvr181','ftc_buyers_guide','mvr1','mvr2'].includes(formType)

                    return (
                      <div key={formType} className={`rounded-xl border p-3 ${cfg.bg} border-opacity-60 ${
                        status === 'draft' ? 'border-gray-200' :
                        ['signed','notarized','filed'].includes(status) ? 'border-green-200' :
                        status === 'generated' ? 'border-blue-200' : 'border-red-200'
                      }`}>
                        <div className="flex items-start gap-2 mb-2">
                          <Icon size={14} className={`${cfg.color} flex-shrink-0 mt-0.5`} />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-gray-800 truncate">{FORM_LABELS[formType]}</p>
                            <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                              <span className={`text-[10px] font-mono ${cfg.color}`}>{cfg.label}</span>
                              {needsNotary && <span className="text-[9px] font-mono bg-amber-100 text-amber-700 px-1 rounded">NOTARY</span>}
                              {form?.signed_at && <span className="text-[9px] text-gray-400">{new Date(form.signed_at).toLocaleDateString()}</span>}
                            </div>
                          </div>
                        </div>

                        {/* Action button */}
                        {isPDFable && (
                          <button
                            onClick={() => status === 'draft'
                              ? handleGenerateAndDownload(deal, formType, DEALER_ID)
                              : handleDownload(deal, formType)
                            }
                            disabled={isDownloading}
                            className={`w-full flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-lg border transition-all ${
                              status === 'draft'
                                ? 'bg-white border-gray-300 text-gray-600 hover:border-brand-400 hover:text-brand-600'
                                : 'bg-white border-green-200 text-green-700 hover:bg-green-50'
                            }`}
                          >
                            {isDownloading
                              ? <><RefreshCw size={11} className="animate-spin" /> Generating...</>
                              : status === 'draft'
                              ? <><FileText size={11} /> Generate & Download</>
                              : <><Download size={11} /> Download PDF</>
                            }
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
