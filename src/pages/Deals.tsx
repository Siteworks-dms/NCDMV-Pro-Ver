import { useState, useEffect, useCallback } from 'react'
import { Plus, RefreshCw, FileText, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { supabase, formatCurrency, titleDaysRemaining } from '@/lib/supabase'
import type { DealSummary, DealStatus } from '@/types/database'
import { DEAL_STATUS_STYLES } from '@/types/database'
import { StatCard, EmptyState } from '@/components/ui'
import DealForm from '@/components/deals/DealForm'

const STATUS_LABEL: Record<DealStatus, string> = {
  pencil:    'Draft',
  pending:   'Pending',
  funded:    'Funded',
  cancelled: 'Cancelled',
  unwound:   'Unwound',
}

export default function Deals() {
  const [deals, setDeals]         = useState<DealSummary[]>([])
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [editDealId, setEditDealId] = useState<string | undefined>()
  const [statusFilter, setStatusFilter] = useState<DealStatus | 'all'>('all')

  const fetchDeals = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('v_deal_summary').select('*')
      .order('sale_date', { ascending: false })
    setLoading(false)
    if (error) { toast.error('Failed to load deals'); return }
    setDeals((data ?? []) as DealSummary[])
  }, [])

  useEffect(() => { fetchDeals() }, [fetchDeals])

  const openNew = () => { setEditDealId(undefined); setShowForm(true) }
  const openEdit = (id: string) => { setEditDealId(id); setShowForm(true) }

  const visible = deals.filter(d => statusFilter === 'all' || d.status === statusFilter)

  const pendingCount  = deals.filter(d => d.status === 'pending').length
  const fundedCount   = deals.filter(d => d.status === 'funded').length
  const titleAlerts   = deals.filter(d => !d.title_filed_at && titleDaysRemaining(d.sale_date) <= 7).length
  const monthRevenue  = deals.filter(d => d.status === 'funded').reduce((s, d) => s + d.sale_price, 0)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Deal Desk</h2>
          <p className="text-xs text-gray-400 mt-0.5">{deals.length} total deals · NC DMV compliant</p>
        </div>
        <button onClick={openNew} className="btn-primary"><Plus size={15} /> New Deal</button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Pending Funding" value={pendingCount}               sub="Awaiting lender" color="amber" />
        <StatCard label="Funded This Month" value={fundedCount}              sub="Completed"       color="green" />
        <StatCard label="Title Alerts"    value={titleAlerts}                sub="Due in 7 days"   color={titleAlerts > 0 ? 'red' : 'gray'} />
        <StatCard label="Month Revenue"   value={formatCurrency(monthRevenue)} sub="Funded deals"  color="blue" />
      </div>

      {/* Status filter */}
      <div className="flex bg-gray-100 rounded-lg p-1 gap-0.5 w-fit">
        {(['all', 'pencil', 'pending', 'funded', 'cancelled'] as const).map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all capitalize ${statusFilter === s ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {s === 'all' ? `All (${deals.length})` : STATUS_LABEL[s as DealStatus]}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
            <RefreshCw size={16} className="animate-spin" /><span className="text-sm">Loading deals...</span>
          </div>
        ) : visible.length === 0 ? (
          <EmptyState icon={FileText} title="No deals yet" description="Create your first deal to get started"
            action={<button onClick={openNew} className="btn-primary text-sm"><Plus size={14} /> New Deal</button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Deal #</th>
                  <th>Vehicle</th>
                  <th>Buyer</th>
                  <th>Sale Date</th>
                  <th className="text-right">Sale Price</th>
                  <th className="text-right">HUT</th>
                  <th>Payment</th>
                  <th>Forms</th>
                  <th>Title Due</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {visible.map(d => {
                  const days = titleDaysRemaining(d.sale_date)
                  const titleUrgent = !d.title_filed_at && days <= 7
                  const formsDone = d.forms?.filter(f => ['signed','notarized','filed'].includes(f.status)).length ?? 0
                  const formsTotal = d.forms?.length ?? 0

                  return (
                    <tr key={d.id} onClick={() => openEdit(d.id)}>
                      <td><span className="font-mono text-xs text-gray-500">{d.deal_number}</span></td>
                      <td>
                        <div className="text-sm font-medium">{d.year} {d.make} {d.model}</div>
                        <div className="text-xs text-gray-400 font-mono">{d.vin}</div>
                      </td>
                      <td>
                        <div className="text-sm">{d.buyer_name}</div>
                        <div className="text-xs text-gray-400">{d.buyer_phone ?? d.buyer_email ?? '—'}</div>
                      </td>
                      <td className="text-xs text-gray-600">{d.sale_date}</td>
                      <td className="text-right font-mono font-medium text-sm">{formatCurrency(d.sale_price)}</td>
                      <td className="text-right">
                        <span className={`font-mono text-sm ${d.hut_capped ? 'text-red-600' : 'text-gray-700'}`}>
                          {formatCurrency(d.hut_amount)}
                        </span>
                        {d.hut_capped && <div className="text-[9px] text-red-500 font-mono">CAPPED</div>}
                      </td>
                      <td><span className="badge-gray capitalize text-xs">{d.payment_type.replace('_',' ')}</span></td>
                      <td>
                        <span className={`text-xs font-mono ${formsDone === formsTotal && formsTotal > 0 ? 'text-green-600' : 'text-amber-600'}`}>
                          {formsDone}/{formsTotal}
                        </span>
                      </td>
                      <td>
                        <div className={`flex items-center gap-1 text-xs ${titleUrgent ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                          {titleUrgent && <AlertTriangle size={12} />}
                          {d.title_filed_at ? <span className="text-green-600">Filed ✓</span> : `${days}d`}
                        </div>
                      </td>
                      <td>
                        <span className={DEAL_STATUS_STYLES[d.status]}>
                          {STATUS_LABEL[d.status]}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <DealForm open={showForm} onClose={() => setShowForm(false)} onSaved={fetchDeals} editDealId={editDealId} />
    </div>
  )
}
