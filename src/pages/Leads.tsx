import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Search, RefreshCw, Phone, Mail, MessageSquare,
  Calendar, TrendingUp, Users, ChevronRight, Clock,
  CheckCircle, XCircle, AlertCircle, Loader2, ChevronDown
} from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import type { Lead, LeadStage, LeadSource, Customer } from '@/types/database'
import { EmptyState, Modal, Field } from '@/components/ui'

const DEALER_ID = import.meta.env.VITE_DEALER_ID ?? ''

// ── Stage config ────────────────────────────────────────────────────────────
const STAGES: { id: LeadStage; label: string; color: string; bg: string; border: string }[] = [
  { id: 'new',         label: 'New',         color: 'text-blue-700',  bg: 'bg-blue-50',   border: 'border-blue-200' },
  { id: 'contacted',   label: 'Contacted',   color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  { id: 'appointment', label: 'Appt Set',    color: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-200' },
  { id: 'demo',        label: 'Demo Done',   color: 'text-amber-700', bg: 'bg-amber-50',  border: 'border-amber-200' },
  { id: 'offer',       label: 'Offer Made',  color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
  { id: 'negotiation', label: 'Negotiating', color: 'text-rose-700',  bg: 'bg-rose-50',   border: 'border-rose-200' },
  { id: 'won',         label: 'Won ✓',       color: 'text-green-700', bg: 'bg-green-50',  border: 'border-green-200' },
  { id: 'lost',        label: 'Lost',        color: 'text-gray-600',  bg: 'bg-gray-100',  border: 'border-gray-200' },
]

const SOURCES: LeadSource[] = ['web','walk_in','phone','referral','repeat','autotrader','cars_com','facebook','other']

const STAGE_NEXT: Partial<Record<LeadStage, LeadStage>> = {
  new: 'contacted', contacted: 'appointment', appointment: 'demo',
  demo: 'offer', offer: 'negotiation', negotiation: 'won',
}

interface LeadWithCustomer extends Lead {
  customers?: Pick<Customer, 'first_name' | 'last_name' | 'phone_primary' | 'email'> | null
}

// ── Add Lead Modal ──────────────────────────────────────────────────────────
function AddLeadModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [form, setForm] = useState({
    customerId: '', newFirstName: '', newLastName: '', newPhone: '', newEmail: '',
    source: 'walk_in' as LeadSource,
    vehicleInterest: '', budgetMin: '', budgetMax: '',
    priority: 'medium', notes: '',
    createNewCustomer: false,
  })

  useEffect(() => {
    if (open) {
      supabase.from('customers').select('id, first_name, last_name, phone_primary, email')
        .order('last_name').then(({ data }) => setCustomers((data ?? []) as Customer[]))
    }
  }, [open])

  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    setSaving(true)
    try {
      let customerId = form.customerId

      if (form.createNewCustomer) {
        if (!form.newFirstName || !form.newLastName) { toast.error('Name required'); return }
        const { data, error } = await supabase.from('customers').insert({
          dealer_id: DEALER_ID,
          first_name: form.newFirstName, last_name: form.newLastName,
          phone_primary: form.newPhone || null, email: form.newEmail || null,
          source: form.source,
        }).select('id').single()
        if (error) throw error
        customerId = data.id
      }

      const { error } = await supabase.from('leads').insert({
        dealer_id: DEALER_ID,
        customer_id: customerId || null,
        source: form.source,
        vehicle_interest_text: form.vehicleInterest || null,
        budget_min: form.budgetMin ? parseFloat(form.budgetMin) : null,
        budget_max: form.budgetMax ? parseFloat(form.budgetMax) : null,
        priority: form.priority,
        stage: 'new',
        notes: form.notes || null,
        next_followup_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      if (error) throw error
      toast.success('Lead added to pipeline')
      onSaved(); onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Lead" subtitle="Add to CRM pipeline">
      <div className="space-y-4">
        {/* Customer toggle */}
        <div className="flex gap-2">
          <button onClick={() => set('createNewCustomer', false)}
            className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${!form.createNewCustomer ? 'bg-brand-50 border-brand-400 text-brand-700' : 'border-gray-200 text-gray-500'}`}>
            Existing Customer
          </button>
          <button onClick={() => set('createNewCustomer', true)}
            className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${form.createNewCustomer ? 'bg-brand-50 border-brand-400 text-brand-700' : 'border-gray-200 text-gray-500'}`}>
            New Customer
          </button>
        </div>

        {form.createNewCustomer ? (
          <div className="grid grid-cols-2 gap-3">
            <Field label="First Name" required><input className="input-base" value={form.newFirstName} onChange={e => set('newFirstName', e.target.value)} placeholder="Jane" /></Field>
            <Field label="Last Name" required><input className="input-base" value={form.newLastName} onChange={e => set('newLastName', e.target.value)} placeholder="Doe" /></Field>
            <Field label="Phone"><input className="input-base" value={form.newPhone} onChange={e => set('newPhone', e.target.value)} placeholder="(704) 555-0100" /></Field>
            <Field label="Email"><input className="input-base" value={form.newEmail} onChange={e => set('newEmail', e.target.value)} placeholder="jane@email.com" /></Field>
          </div>
        ) : (
          <Field label="Select Customer">
            <div className="relative">
              <select className="input-base appearance-none pr-8" value={form.customerId} onChange={e => set('customerId', e.target.value)}>
                <option value="">— Select customer —</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.first_name} {c.last_name} {c.phone_primary ? `· ${c.phone_primary}` : ''}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </Field>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Lead Source">
            <div className="relative">
              <select className="input-base appearance-none pr-8" value={form.source} onChange={e => set('source', e.target.value as LeadSource)}>
                {SOURCES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </Field>
          <Field label="Priority">
            <div className="relative">
              <select className="input-base appearance-none pr-8" value={form.priority} onChange={e => set('priority', e.target.value)}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </Field>
        </div>

        <Field label="Vehicle of Interest">
          <input className="input-base" value={form.vehicleInterest} onChange={e => set('vehicleInterest', e.target.value)} placeholder="2020-2022 Honda Accord EX-L, under 50k miles..." />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Budget Min ($)"><input className="input-base font-mono" value={form.budgetMin} onChange={e => set('budgetMin', e.target.value)} placeholder="15000" type="number" /></Field>
          <Field label="Budget Max ($)"><input className="input-base font-mono" value={form.budgetMax} onChange={e => set('budgetMax', e.target.value)} placeholder="25000" type="number" /></Field>
        </div>

        <Field label="Notes"><textarea className="input-base" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="How they heard about us, specific requests..." /></Field>
      </div>

      <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
        <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
        <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 gap-2">
          {saving && <Loader2 size={14} className="animate-spin" />}
          {saving ? 'Saving...' : 'Add to Pipeline'}
        </button>
      </div>
    </Modal>
  )
}

// ── Lead card ───────────────────────────────────────────────────────────────
function LeadCard({ lead, onAdvance, onLog }: {
  lead: LeadWithCustomer
  onAdvance: (id: string, stage: LeadStage) => void
  onLog: (lead: LeadWithCustomer) => void
}) {
  const customer = lead.customers
  const nextStage = STAGE_NEXT[lead.stage]
  const isOverdue = lead.next_followup_at && new Date(lead.next_followup_at) < new Date()
  const priorityColor = lead.priority === 'high' ? 'bg-red-400' : lead.priority === 'medium' ? 'bg-amber-400' : 'bg-gray-300'

  const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 hover:shadow-sm transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${priorityColor}`} title={`${lead.priority} priority`} />
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {customer ? `${customer.first_name} ${customer.last_name}` : 'Unknown Customer'}
            </p>
            <p className="text-xs text-gray-400 capitalize">{lead.source.replace('_', ' ')}</p>
          </div>
        </div>
        <span className="text-[10px] font-mono text-gray-400 flex-shrink-0 ml-1">
          #{lead.id.slice(-4)}
        </span>
      </div>

      {/* Vehicle interest */}
      {lead.vehicle_interest_text && (
        <p className="text-xs text-gray-600 bg-gray-50 rounded-lg px-2.5 py-1.5 mb-2 truncate">
          🚗 {lead.vehicle_interest_text}
        </p>
      )}

      {/* Budget */}
      {(lead.budget_min || lead.budget_max) && (
        <p className="text-xs text-gray-500 mb-2">
          Budget: {lead.budget_min ? fmt.format(lead.budget_min) : '—'} – {lead.budget_max ? fmt.format(lead.budget_max) : '—'}
        </p>
      )}

      {/* Follow-up */}
      {lead.next_followup_at && (
        <div className={`flex items-center gap-1.5 text-xs rounded-lg px-2.5 py-1.5 mb-2 ${isOverdue ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-blue-50 text-blue-600'}`}>
          {isOverdue ? <AlertCircle size={11} /> : <Clock size={11} />}
          <span className="font-mono">
            {isOverdue ? 'OVERDUE: ' : 'Follow-up: '}
            {new Date(lead.next_followup_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      )}

      {/* Contact buttons */}
      {customer && (
        <div className="flex gap-1.5 mb-2">
          {customer.phone_primary && (
            <a href={`tel:${customer.phone_primary}`} onClick={e => e.stopPropagation()}
              className="flex items-center gap-1 text-xs bg-gray-50 hover:bg-gray-100 border border-gray-200 px-2 py-1 rounded-lg transition-colors text-gray-600">
              <Phone size={11} /> Call
            </a>
          )}
          {customer.email && (
            <a href={`mailto:${customer.email}`} onClick={e => e.stopPropagation()}
              className="flex items-center gap-1 text-xs bg-gray-50 hover:bg-gray-100 border border-gray-200 px-2 py-1 rounded-lg transition-colors text-gray-600">
              <Mail size={11} /> Email
            </a>
          )}
          <button onClick={() => onLog(lead)}
            className="flex items-center gap-1 text-xs bg-gray-50 hover:bg-gray-100 border border-gray-200 px-2 py-1 rounded-lg transition-colors text-gray-600">
            <MessageSquare size={11} /> Log
          </button>
        </div>
      )}

      {/* Advance stage */}
      {nextStage && lead.stage !== 'won' && lead.stage !== 'lost' && (
        <button onClick={() => onAdvance(lead.id, nextStage)}
          className="w-full flex items-center justify-center gap-1 text-xs bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 px-2 py-1.5 rounded-lg transition-colors font-medium">
          Move to {STAGES.find(s => s.id === nextStage)?.label} <ChevronRight size={11} />
        </button>
      )}
      {lead.stage === 'negotiation' && (
        <div className="flex gap-1.5 mt-1">
          <button onClick={() => onAdvance(lead.id, 'won')}
            className="flex-1 flex items-center justify-center gap-1 text-xs bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 px-2 py-1.5 rounded-lg font-medium">
            <CheckCircle size={11} /> Won
          </button>
          <button onClick={() => onAdvance(lead.id, 'lost')}
            className="flex-1 flex items-center justify-center gap-1 text-xs bg-gray-50 hover:bg-gray-100 text-gray-500 border border-gray-200 px-2 py-1.5 rounded-lg">
            <XCircle size={11} /> Lost
          </button>
        </div>
      )}
    </div>
  )
}

// ── Activity log modal ──────────────────────────────────────────────────────
function LogActivityModal({ open, onClose, lead }: {
  open: boolean; onClose: () => void; lead: LeadWithCustomer | null
}) {
  const [saving, setSaving] = useState(false)
  const [actType, setActType] = useState<'call' | 'email' | 'sms' | 'note'>('call')
  const [outcome, setOutcome] = useState('')
  const [body, setBody] = useState('')
  const [nextFollowup, setNextFollowup] = useState('')

  const handleSave = async () => {
    if (!lead) return
    setSaving(true)
    const { error } = await supabase.from('lead_activities').insert({
      lead_id: lead.id, dealer_id: DEALER_ID,
      activity_type: actType, outcome, body: body || null,
      logged_at: new Date().toISOString(),
    })
    if (!error && nextFollowup) {
      await supabase.from('leads').update({
        next_followup_at: new Date(nextFollowup).toISOString(),
        last_contact_at: new Date().toISOString(),
        follow_up_count: (lead.follow_up_count ?? 0) + 1,
      }).eq('id', lead.id)
    }
    setSaving(false)
    if (error) { toast.error('Failed to log'); return }
    toast.success('Activity logged')
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Log Activity" subtitle={lead ? `${lead.customers?.first_name} ${lead.customers?.last_name}` : ''}>
      <div className="space-y-4">
        <div className="flex gap-2">
          {(['call', 'email', 'sms', 'note'] as const).map(t => (
            <button key={t} onClick={() => setActType(t)}
              className={`flex-1 py-2 rounded-lg border text-xs font-medium capitalize transition-all ${actType === t ? 'bg-brand-50 border-brand-400 text-brand-700' : 'border-gray-200 text-gray-500'}`}>
              {t}
            </button>
          ))}
        </div>
        <Field label="Outcome / Subject"><input className="input-base" value={outcome} onChange={e => setOutcome(e.target.value)} placeholder="Left voicemail, sent pricing, scheduled appt..." /></Field>
        <Field label="Notes"><textarea className="input-base" rows={3} value={body} onChange={e => setBody(e.target.value)} placeholder="Details of the interaction..." /></Field>
        <Field label="Schedule Next Follow-Up" hint="Leave blank to skip">
          <input className="input-base" type="datetime-local" value={nextFollowup} onChange={e => setNextFollowup(e.target.value)} />
        </Field>
      </div>
      <div className="flex gap-3 mt-5 pt-4 border-t border-gray-100">
        <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
        <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 gap-2">
          {saving && <Loader2 size={14} className="animate-spin" />}
          Log Activity
        </button>
      </div>
    </Modal>
  )
}

// ── Main page ───────────────────────────────────────────────────────────────
export default function Leads() {
  const [leads, setLeads]         = useState<LeadWithCustomer[]>([])
  const [loading, setLoading]     = useState(true)
  const [view, setView]           = useState<'kanban' | 'list'>('kanban')
  const [search, setSearch]       = useState('')
  const [showAdd, setShowAdd]     = useState(false)
  const [logLead, setLogLead]     = useState<LeadWithCustomer | null>(null)

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('leads')
      .select('*, customers(first_name, last_name, phone_primary, email)')
      .not('stage', 'in', '("dead")')
      .order('next_followup_at', { ascending: true, nullsFirst: false })
    setLoading(false)
    if (error) { toast.error('Failed to load leads'); return }
    setLeads((data ?? []) as LeadWithCustomer[])
  }, [])

  useEffect(() => { fetchLeads() }, [fetchLeads])

  const advanceStage = async (id: string, stage: LeadStage) => {
    const { error } = await supabase.from('leads').update({ stage }).eq('id', id)
    if (error) { toast.error('Update failed'); return }
    toast.success(`Lead moved to ${STAGES.find(s => s.id === stage)?.label}`)
    fetchLeads()
  }

  const filtered = leads.filter(l => {
    if (!search) return true
    const c = l.customers
    const q = search.toLowerCase()
    return `${c?.first_name ?? ''} ${c?.last_name ?? ''} ${l.vehicle_interest_text ?? ''}`.toLowerCase().includes(q)
  })

  // Stats
  const overdueCount = leads.filter(l => l.next_followup_at && new Date(l.next_followup_at) < new Date() && l.stage !== 'won' && l.stage !== 'lost').length
  const wonCount     = leads.filter(l => l.stage === 'won').length
  const activeCount  = leads.filter(l => !['won','lost','dead'].includes(l.stage)).length
  const highPriority = leads.filter(l => l.priority === 'high' && !['won','lost'].includes(l.stage)).length

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">CRM Pipeline</h2>
          <p className="text-xs text-gray-400 mt-0.5">{activeCount} active leads · {overdueCount > 0 ? `${overdueCount} follow-ups overdue` : 'all follow-ups current'}</p>
        </div>
        <div className="flex gap-2">
          <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
            <button onClick={() => setView('kanban')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${view === 'kanban' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>Kanban</button>
            <button onClick={() => setView('list')}   className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${view === 'list'   ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>List</button>
          </div>
          <button onClick={fetchLeads} className="btn-secondary text-xs py-1.5 px-3 gap-1.5"><RefreshCw size={13} />Refresh</button>
          <button onClick={() => setShowAdd(true)} className="btn-primary text-sm"><Plus size={15} /> Add Lead</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs uppercase tracking-wider text-gray-400 font-medium">Active Leads</p>
          <p className="text-2xl font-semibold font-mono mt-1">{activeCount}</p>
        </div>
        <div className={`rounded-xl p-4 ${overdueCount > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
          <p className={`text-xs uppercase tracking-wider font-medium ${overdueCount > 0 ? 'text-red-500' : 'text-gray-400'}`}>Overdue Follow-Ups</p>
          <p className={`text-2xl font-semibold font-mono mt-1 ${overdueCount > 0 ? 'text-red-700' : ''}`}>{overdueCount}</p>
        </div>
        <div className={`rounded-xl p-4 ${highPriority > 0 ? 'bg-amber-50' : 'bg-gray-50'}`}>
          <p className="text-xs uppercase tracking-wider text-gray-400 font-medium">High Priority</p>
          <p className={`text-2xl font-semibold font-mono mt-1 ${highPriority > 0 ? 'text-amber-700' : ''}`}>{highPriority}</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4">
          <p className="text-xs uppercase tracking-wider text-gray-400 font-medium">Won This Month</p>
          <p className="text-2xl font-semibold font-mono mt-1 text-green-700">{wonCount}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input className="input-base pl-8 py-1.5 text-xs" placeholder="Search leads..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 gap-2 text-gray-400"><RefreshCw size={16} className="animate-spin" /><span className="text-sm">Loading pipeline...</span></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={TrendingUp} title="No leads in pipeline" description="Add your first lead to start tracking the sales funnel"
          action={<button onClick={() => setShowAdd(true)} className="btn-primary text-sm"><Plus size={14} /> Add Lead</button>} />
      ) : view === 'kanban' ? (
        /* ── KANBAN VIEW ── */
        <div className="flex gap-3 overflow-x-auto pb-4">
          {STAGES.filter(s => s.id !== 'dead').map(stage => {
            const stageLeads = filtered.filter(l => l.stage === stage.id)
            return (
              <div key={stage.id} className="flex-shrink-0 w-56">
                <div className={`flex items-center justify-between px-3 py-2 rounded-lg mb-2 ${stage.bg} border ${stage.border}`}>
                  <span className={`text-xs font-semibold ${stage.color}`}>{stage.label}</span>
                  <span className={`text-xs font-mono font-bold ${stage.color}`}>{stageLeads.length}</span>
                </div>
                <div className="space-y-2">
                  {stageLeads.length === 0 ? (
                    <div className="border-2 border-dashed border-gray-200 rounded-xl h-16 flex items-center justify-center">
                      <span className="text-xs text-gray-300">Empty</span>
                    </div>
                  ) : (
                    stageLeads.map(lead => (
                      <LeadCard key={lead.id} lead={lead} onAdvance={advanceStage} onLog={setLogLead} />
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* ── LIST VIEW ── */
        <div className="card p-0 overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Interest</th>
                <th>Source</th>
                <th>Stage</th>
                <th>Priority</th>
                <th>Follow-Up</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(l => {
                const c = l.customers
                const isOverdue = l.next_followup_at && new Date(l.next_followup_at) < new Date()
                const stageCfg = STAGES.find(s => s.id === l.stage)!
                return (
                  <tr key={l.id}>
                    <td>
                      <p className="text-sm font-medium">{c ? `${c.first_name} ${c.last_name}` : '—'}</p>
                      <p className="text-xs text-gray-400">{c?.phone_primary ?? c?.email ?? '—'}</p>
                    </td>
                    <td className="text-xs text-gray-600 max-w-xs truncate">{l.vehicle_interest_text ?? '—'}</td>
                    <td className="text-xs capitalize text-gray-500">{l.source.replace('_',' ')}</td>
                    <td><span className={`badge text-[10px] ${stageCfg.bg} ${stageCfg.color} border ${stageCfg.border}`}>{stageCfg.label}</span></td>
                    <td>
                      <span className={`badge text-[10px] ${l.priority === 'high' ? 'bg-red-50 text-red-700 border-red-200' : l.priority === 'medium' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'badge-gray'}`}>
                        {l.priority}
                      </span>
                    </td>
                    <td>
                      {l.next_followup_at ? (
                        <span className={`text-xs font-mono ${isOverdue ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                          {isOverdue ? '⚠ ' : ''}{new Date(l.next_followup_at).toLocaleDateString()}
                        </span>
                      ) : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td>
                      <div className="flex gap-1">
                        {c?.phone_primary && <a href={`tel:${c.phone_primary}`} className="p-1.5 rounded hover:bg-gray-100 text-gray-400"><Phone size={13} /></a>}
                        <button onClick={() => setLogLead(l)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400"><MessageSquare size={13} /></button>
                        {STAGE_NEXT[l.stage] && (
                          <button onClick={() => advanceStage(l.id, STAGE_NEXT[l.stage]!)}
                            className="p-1.5 rounded hover:bg-brand-50 text-brand-600"><ChevronRight size={13} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <AddLeadModal open={showAdd} onClose={() => setShowAdd(false)} onSaved={fetchLeads} />
      <LogActivityModal open={!!logLead} onClose={() => { setLogLead(null); fetchLeads() }} lead={logLead} />
    </div>
  )
}
