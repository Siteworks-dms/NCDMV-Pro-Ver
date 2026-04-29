import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Plus, AlertTriangle, Clock, CheckCircle, XCircle, FileText, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { supabase, formatCurrency, titleDaysRemaining } from '@/lib/supabase'
import type { DealSummary, NCFormType, DealStatus } from '@/types/database'
import { FORM_LABELS, DEAL_STATUS_STYLES, NOTARY_REQUIRED } from '@/types/database'
import { StatCard } from '@/components/ui'

const REQUIRED_FORM_ORDER: NCFormType[] = ['mvr180', 'bill_of_sale', 'ftc_buyers_guide', 'mvr1', 'mvr2']

function FormChecklist({ forms, damageFlag }: {
  forms: { form_type: NCFormType; status: string }[] | null
  damageFlag: boolean
}) {
  const required = damageFlag
    ? [...REQUIRED_FORM_ORDER, 'mvr181' as NCFormType]
    : REQUIRED_FORM_ORDER

  return (
    <div className="mt-3 bg-gray-50 rounded-lg p-3 space-y-1.5">
      <p className="text-[10px] font-mono font-semibold uppercase tracking-wider text-gray-400 mb-2">
        NC Form Checklist
      </p>
      {required.map(type => {
        const form = forms?.find(f => f.form_type === type)
        const status = form?.status
        const done = status === 'signed' || status === 'notarized' || status === 'filed'
        const generated = status === 'generated'
        const needsNotary = NOTARY_REQUIRED.includes(type)

        return (
          <div key={type} className="flex items-center gap-2">
            {done ? (
              <CheckCircle size={13} className="text-green-500 flex-shrink-0" />
            ) : generated ? (
              <Clock size={13} className="text-amber-500 flex-shrink-0" />
            ) : (
              <XCircle size={13} className="text-gray-300 flex-shrink-0" />
            )}
            <span className={`text-xs flex-1 ${done ? 'text-green-700' : generated ? 'text-amber-700' : 'text-gray-500'}`}>
              {FORM_LABELS[type]}
            </span>
            {needsNotary && (
              <span className="text-[9px] font-mono bg-amber-50 text-amber-700 border border-amber-200 px-1 rounded">
                NOTARY
              </span>
            )}
            {!form && (
              <button className="text-[10px] text-blue-600 hover:underline">Generate</button>
            )}
          </div>
        )
      })}
    </div>
  )
}

function DealCard({ deal }: { deal: DealSummary }) {
  const daysLeft = titleDaysRemaining(deal.sale_date)
  const titleUrgent = daysLeft <= 7
  const titleWarning = daysLeft <= 14
  const allFormsComplete = deal.forms?.every(f =>
    ['signed', 'notarized', 'filed'].includes(f.status)
  )

  const statusColors: Record<DealStatus, string> = {
    pencil:    'bg-gray-100 text-gray-600',
    pending:   'bg-amber-50 text-amber-700 border border-amber-200',
    funded:    'bg-green-50 text-green-700 border border-green-200',
    cancelled: 'bg-red-50 text-red-700 border border-red-200',
    unwound:   'bg-red-50 text-red-700 border border-red-200',
  }

  const handleDelete = async () => {
    if (!window.confirm(`Delete deal ${deal.deal_number}? This cannot be undone.`)) return
    const { error } = await import('@/lib/supabase').then(m => m.supabase.from('deals').delete().eq('id', deal.id))
    if (error) { import('sonner').then(m => m.toast.error(error.message)); return }
    import('sonner').then(m => m.toast.success('Deal deleted'))
    window.location.reload()
  }

  return (
    <div className="card hover:shadow-md transition-shadow cursor-pointer">
      {/* Deal header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs text-gray-400">{deal.deal_number}</span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${statusColors[deal.status]}`}>
              {deal.status.toUpperCase()}
            </span>
            {deal.damage_flag && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-50 text-red-600 border border-red-200">MVR-181 REQ</span>
            )}
          </div>
          <p className="font-semibold text-gray-900 mt-1">{deal.year} {deal.make} {deal.model} {deal.trim}</p>
          <p className="text-xs text-gray-400 font-mono">{deal.vin}</p>
        </div>
        <div className="text-right ml-3 flex-shrink-0">
          <p className="text-lg font-semibold font-mono text-gray-900">{formatCurrency(deal.sale_price)}</p>
          <p className="text-xs text-gray-400">{deal.payment_type.replace('_', ' ')}</p>
        </div>
      </div>

      {/* Buyer */}
      <div className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-100">
        <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
          <span className="text-brand-800 text-xs font-semibold">
            {deal.buyer_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-800 truncate">{deal.buyer_name}</p>
          <p className="text-xs text-gray-400 truncate">{deal.buyer_email ?? deal.buyer_phone ?? '—'}</p>
        </div>
        <div className="ml-auto text-right flex-shrink-0">
          <p className="text-xs text-gray-500">Sale date</p>
          <p className="text-xs font-medium text-gray-800">{deal.sale_date}</p>
        </div>
      </div>

      {/* Key financials */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="text-center bg-gray-50 rounded-lg p-2">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider">HUT</p>
          <p className={`text-sm font-mono font-semibold ${deal.hut_capped ? 'text-red-600' : 'text-gray-800'}`}>
            {formatCurrency(deal.hut_amount)}
            {deal.hut_capped && <span className="text-[9px] ml-1 text-red-500">CAP</span>}
          </p>
        </div>
        <div className="text-center bg-gray-50 rounded-lg p-2">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider">Down</p>
          <p className="text-sm font-mono font-semibold text-gray-800">{formatCurrency(deal.cash_down)}</p>
        </div>
        <div className="text-center bg-gray-50 rounded-lg p-2">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider">Financed</p>
          <p className="text-sm font-mono font-semibold text-gray-800">
            {deal.amount_financed ? formatCurrency(deal.amount_financed) : '—'}
          </p>
        </div>
      </div>

      {/* Title deadline */}
      <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg mb-3 ${
        titleUrgent ? 'bg-red-50 text-red-700 border border-red-200' :
        titleWarning ? 'bg-amber-50 text-amber-700 border border-amber-200' :
        'bg-gray-50 text-gray-600'
      }`}>
        {titleUrgent ? <AlertTriangle size={13} /> : <Clock size={13} />}
        <span className="font-mono">
          Title due: {deal.title_filing_due}
          {deal.title_filed_at
            ? ' · Filed ✓'
            : ` · ${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining`
          }
        </span>
        {!deal.temp_tag_valid && (
          <span className="ml-auto text-red-600 font-semibold">TEMP TAG EXPIRED</span>
        )}
      </div>

      {/* Form checklist */}
      <FormChecklist forms={deal.forms} damageFlag={deal.damage_flag} />

      {/* Actions */}
      <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
        <button className="btn-secondary flex-1 text-xs py-1.5 gap-1.5">
          <FileText size={13} /> Generate Forms
        </button>
        <button className="btn-primary flex-1 text-xs py-1.5">
          Open Deal →
        </button>
        {(deal.status === 'pending' || deal.status === 'pencil') && (
          <button onClick={e => { e.stopPropagation(); handleDelete() }}
            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors border border-gray-200"
            title="Delete deal">
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [deals, setDeals] = useState<DealSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'funded'>('all')

  const fetchDeals = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('v_deal_summary')
      .select('*')
      .order('sale_date', { ascending: false })
      .limit(50)
    setLoading(false)
    if (error) { toast.error('Failed to load deals'); return }
    setDeals((data ?? []) as DealSummary[])
  }, [])

  useEffect(() => { fetchDeals() }, [fetchDeals])

  const visible = deals.filter(d => {
    if (filter === 'pending') return d.status === 'pending' || d.status === 'pencil'
    if (filter === 'funded')  return d.status === 'funded'
    return true
  })

  // Stats
  const today = new Date().toISOString().split('T')[0]
  const todayDeals   = deals.filter(d => d.sale_date === today)
  const pendingDeals = deals.filter(d => d.status === 'pending' || d.status === 'pencil')
  const titlesDue    = deals.filter(d => !d.title_filed_at && titleDaysRemaining(d.sale_date) <= 7)
  const totalGross   = deals.filter(d => d.status === 'funded').reduce((s, d) => s + (d.sale_price ?? 0), 0)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Quick-Close Center</h2>
          <p className="text-xs text-gray-400 mt-0.5">NC DMV form status · Title deadlines · Deal pipeline</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchDeals} className="btn-secondary text-xs py-1.5 px-3 gap-1.5">
            <RefreshCw size={13} /> Refresh
          </button>
          <button className="btn-primary text-sm">
            <Plus size={15} /> New Deal
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Today's Sales" value={todayDeals.length} sub={`${formatCurrency(todayDeals.reduce((s, d) => s + d.sale_price, 0))}`} color="green" />
        <StatCard label="Deals Pending" value={pendingDeals.length} sub="Awaiting funding" color="amber" />
        <StatCard label="Title Alerts" value={titlesDue.length} sub="Due within 7 days" color={titlesDue.length > 0 ? 'red' : 'gray'} />
        <StatCard label="Month Gross" value={formatCurrency(totalGross)} sub="Funded deals" color="blue" />
      </div>

      {/* Filter tabs */}
      <div className="flex bg-gray-100 rounded-lg p-1 gap-0.5 w-fit">
        {(['all', 'pending', 'funded'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all capitalize ${filter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {f === 'all' ? `All Deals (${deals.length})` : f === 'pending' ? `Pending (${pendingDeals.length})` : `Funded`}
          </button>
        ))}
      </div>

      {/* Deal cards */}
      {loading ? (
        <div className="flex items-center justify-center py-20 gap-2 text-gray-400">
          <RefreshCw size={16} className="animate-spin" />
          <span className="text-sm">Loading deals...</span>
        </div>
      ) : visible.length === 0 ? (
        <div className="card text-center py-16">
          <FileText size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-600">No deals yet</p>
          <p className="text-xs text-gray-400 mt-1">Create your first deal to see it here</p>
          <button className="btn-primary mt-4 mx-auto"><Plus size={14} /> New Deal</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {visible.map(deal => <DealCard key={deal.id} deal={deal} />)}
        </div>
      )}
    </div>
  )
}
