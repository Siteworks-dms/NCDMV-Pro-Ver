import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Filter, RefreshCw, Car, CheckCircle, AlertTriangle, Clock, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'
import { supabase, formatCurrency } from '@/lib/supabase'
import type { InventorySummary, VehicleStatus } from '@/types/database'
import { VEHICLE_STATUS_STYLES } from '@/types/database'
import { StatCard, EmptyState, Currency } from '@/components/ui'
import AddVehicleModal from '@/components/inventory/AddVehicleModal'

const DEALER_ID = import.meta.env.VITE_DEALER_ID ?? ''

const STATUS_FILTERS: { value: VehicleStatus | 'all'; label: string }[] = [
  { value: 'all',       label: 'All Stock' },
  { value: 'acquired',  label: 'Acquired' },
  { value: 'recon',     label: 'In Recon' },
  { value: 'frontline', label: 'Frontline' },
  { value: 'sold',      label: 'Sold' },
]

const STATUS_LABELS: Record<VehicleStatus, string> = {
  acquired:      'Acquired',
  recon:         'In Recon',
  frontline:     'Frontline',
  sold:          'Sold',
  wholesale:     'Wholesale',
  pending_title: 'Pending Title',
}

export default function Inventory() {
  const [vehicles, setVehicles] = useState<InventorySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<VehicleStatus | 'all'>('all')
  const [search, setSearch] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)

  const fetchVehicles = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('v_inventory_summary')
      .select('*')
      .order('acquired_date', { ascending: false })
    if (statusFilter !== 'all') q = q.eq('status', statusFilter)
    const { data, error } = await q
    setLoading(false)
    if (error) { toast.error('Failed to load inventory'); return }
    setVehicles((data ?? []) as InventorySummary[])
  }, [statusFilter])

  useEffect(() => { fetchVehicles() }, [fetchVehicles])

  const toggleFrontlineReady = async (id: string, current: boolean) => {
    const { error } = await supabase
      .from('vehicles')
      .update({
        frontline_ready: !current,
        frontline_ready_date: !current ? new Date().toISOString().split('T')[0] : null,
        status: !current ? 'frontline' : 'recon',
      })
      .eq('id', id)
    if (error) { toast.error('Update failed'); return }
    toast.success(!current ? 'Vehicle marked frontline ready' : 'Moved back to recon')
    fetchVehicles()
  }

  const filtered = vehicles.filter(v => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      v.vin.toLowerCase().includes(q) ||
      v.make.toLowerCase().includes(q) ||
      v.model.toLowerCase().includes(q) ||
      String(v.year).includes(q) ||
      (v.color_exterior ?? '').toLowerCase().includes(q)
    )
  })

  const frontlineCount = vehicles.filter(v => v.status === 'frontline').length
  const reconCount     = vehicles.filter(v => v.status === 'recon').length
  const agedCount      = vehicles.filter(v => v.age_status === 'aged').length
  const totalListValue = vehicles.reduce((s, v) => s + (v.list_price ?? 0), 0)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Vehicle Inventory</h2>
          <p className="text-xs text-gray-400 mt-0.5">{vehicles.length} vehicles in stock</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn-primary">
          <Plus size={15} /> Add Vehicle
        </button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Frontline Ready" value={frontlineCount} sub="Ready to sell" color="green" />
        <StatCard label="In Recon" value={reconCount} sub="Not yet frontline" color="amber" />
        <StatCard label="Aged 90+ Days" value={agedCount} sub="Needs attention" color="red" />
        <StatCard label="Total List Value" value={formatCurrency(totalListValue)} sub="All active stock" color="blue" />
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex bg-gray-100 rounded-lg p-1 gap-0.5">
          {STATUS_FILTERS.map(f => (
            <button key={f.value} onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${statusFilter === f.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-48">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input-base pl-8 py-1.5 text-xs" placeholder="Search VIN, make, model, color..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button onClick={fetchVehicles} className="btn-secondary py-1.5 px-3 text-xs gap-1.5">
          <RefreshCw size={13} /> Refresh
        </button>
        <button className="btn-secondary py-1.5 px-3 text-xs gap-1.5">
          <Filter size={13} /> Filters
        </button>
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
            <RefreshCw size={16} className="animate-spin" />
            <span className="text-sm">Loading inventory...</span>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Car} title="No vehicles found"
            description={search ? 'Try a different search term' : 'Add your first vehicle to get started'}
            action={!search ? <button onClick={() => setShowAddModal(true)} className="btn-primary text-sm"><Plus size={14} /> Add First Vehicle</button> : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>VIN</th>
                  <th className="text-right">Odometer</th>
                  <th className="text-right">Cost</th>
                  <th className="text-right">List Price</th>
                  <th className="text-right">Gross Pot.</th>
                  <th>Age</th>
                  <th>Status</th>
                  <th>Frontline</th>
                  <th>Flags</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(v => {
                  const gross = (v.list_price ?? 0) - v.cost_basis - v.recon_cost
                  const ageStyle = v.age_status === 'aged' ? 'text-red-600 font-semibold' : v.age_status === 'watch' ? 'text-amber-600' : 'text-gray-500'
                  return (
                    <tr key={v.id}>
                      <td>
                        <div className="font-medium text-gray-900 text-sm">{v.year} {v.make} {v.model}</div>
                        {v.trim && <div className="text-xs text-gray-400">{v.trim}</div>}
                        {v.color_exterior && <div className="text-xs text-gray-400">{v.color_exterior}</div>}
                      </td>
                      <td><span className="font-mono text-xs text-gray-600 tracking-wider">{v.vin}</span></td>
                      <td className="text-right">
                        <span className="font-mono text-sm">{v.odometer_acquisition?.toLocaleString()}</span>
                        {!v.odometer_actual && <div className="text-[10px] text-amber-600 font-mono">NOT ACTUAL</div>}
                      </td>
                      <td className="text-right">
                        <Currency value={v.cost_basis} className="text-sm" />
                        {v.recon_cost > 0 && <div className="text-xs text-gray-400">+{formatCurrency(v.recon_cost)} recon</div>}
                      </td>
                      <td className="text-right"><Currency value={v.list_price} className="text-sm font-medium" /></td>
                      <td className="text-right">
                        <span className={`font-mono text-sm ${gross >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                          {gross >= 0 ? '+' : ''}{formatCurrency(gross)}
                        </span>
                      </td>
                      <td>
                        <div className={`flex items-center gap-1 text-xs font-mono ${ageStyle}`}>
                          {v.age_status === 'aged' && <AlertTriangle size={12} />}
                          {v.age_status === 'watch' && <Clock size={12} />}
                          {v.days_in_inventory != null ? `${v.days_in_inventory}d` : '—'}
                        </div>
                      </td>
                      <td>
                        <span className={VEHICLE_STATUS_STYLES[v.status as VehicleStatus] ?? 'badge-gray'}>
                          {STATUS_LABELS[v.status as VehicleStatus] ?? v.status}
                        </span>
                      </td>
                      <td>
                        <button onClick={() => toggleFrontlineReady(v.id, v.frontline_ready)}
                          className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg border transition-all ${v.frontline_ready ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}`}>
                          {v.frontline_ready ? <><CheckCircle size={12} /> Ready</> : <><TrendingUp size={12} /> Mark Ready</>}
                        </button>
                      </td>
                      <td>
                        <div className="flex gap-1 flex-wrap">
                          {v.damage_flag && <span className="badge-red text-[10px]">DMG</span>}
                          {v.flood_salvage_flag && <span className="badge-red text-[10px]">FLOOD</span>}
                          {!v.title_in_hand && <span className="badge-amber text-[10px]">NO TITLE</span>}
                          {v.prior_accident && <span className="badge-amber text-[10px]">ACCIDENT</span>}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddVehicleModal open={showAddModal} onClose={() => setShowAddModal(false)} onAdded={fetchVehicles} dealerId={DEALER_ID} />
    </div>
  )
}
