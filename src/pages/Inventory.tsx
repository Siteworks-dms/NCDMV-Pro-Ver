import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Filter, RefreshCw, Car, CheckCircle, AlertTriangle, Clock, TrendingUp, Pencil, Trash2, Image, Loader2, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { supabase, formatCurrency } from '@/lib/supabase'
import type { InventorySummary, VehicleStatus } from '@/types/database'
import { VEHICLE_STATUS_STYLES } from '@/types/database'
import { StatCard, EmptyState, Modal, Field } from '@/components/ui'
import AddVehicleModal from '@/components/inventory/AddVehicleModal'
import VehicleImageUpload from '@/components/inventory/VehicleImageUpload'

const DEALER_ID = import.meta.env.VITE_DEALER_ID ?? ''

const STATUS_FILTERS: { value: VehicleStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Stock' },
  { value: 'acquired', label: 'Acquired' },
  { value: 'recon', label: 'In Recon' },
  { value: 'frontline', label: 'Frontline' },
  { value: 'sold', label: 'Sold' },
]

const STATUS_LABELS: Record<VehicleStatus, string> = {
  acquired: 'Acquired', recon: 'In Recon', frontline: 'Frontline',
  sold: 'Sold', wholesale: 'Wholesale', pending_title: 'Pending Title',
}

// ── Edit Vehicle Modal ────────────────────────────────────────────────────────
function EditVehicleModal({ open, onClose, onSaved, vehicle }: {
  open: boolean; onClose: () => void; onSaved: () => void; vehicle: InventorySummary | null
}) {
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<'details' | 'photos'>('details')
  const [photos, setPhotos] = useState<any[]>([])
  const [form, setForm] = useState({
    listPrice: '', reconCost: '', costBasis: '', status: '',
    colorExterior: '', colorInterior: '', notes: '',
    titleNumber: '', titleInHand: false, frontlineReady: false,
    conditionGrade: '', damageFlag: false, damageDescription: '',
  })

  useEffect(() => {
    if (!vehicle || !open) return
    setForm({
      listPrice:       String(vehicle.list_price ?? ''),
      reconCost:       String(vehicle.recon_cost ?? '0'),
      costBasis:       String(vehicle.cost_basis ?? ''),
      status:          vehicle.status,
      colorExterior:   vehicle.color_exterior ?? '',
      colorInterior:   vehicle.color_interior ?? '',
      notes:           vehicle.notes ?? '',
      titleNumber:     vehicle.title_number ?? '',
      titleInHand:     vehicle.title_in_hand ?? false,
      frontlineReady:  vehicle.frontline_ready ?? false,
      conditionGrade:  vehicle.condition_grade ?? 'good',
      damageFlag:      vehicle.damage_flag ?? false,
      damageDescription: vehicle.damage_description ?? '',
    })
    // Load photos
    supabase.from('vehicle_photos').select('*').eq('vehicle_id', vehicle.id).order('position')
      .then(({ data }) => setPhotos(data ?? []))
  }, [vehicle, open])

  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!vehicle) return
    setSaving(true)
    const { error } = await supabase.from('vehicles').update({
      list_price:        form.listPrice ? parseFloat(form.listPrice) : null,
      recon_cost:        parseFloat(form.reconCost) || 0,
      cost_basis:        parseFloat(form.costBasis) || 0,
      status:            form.status as VehicleStatus,
      color_exterior:    form.colorExterior || null,
      color_interior:    form.colorInterior || null,
      notes:             form.notes || null,
      title_number:      form.titleNumber || null,
      title_in_hand:     form.titleInHand,
      frontline_ready:   form.frontlineReady,
      frontline_ready_date: form.frontlineReady ? new Date().toISOString().split('T')[0] : null,
      condition_grade:   form.conditionGrade as any,
      damage_flag:       form.damageFlag,
      damage_description: form.damageDescription || null,
    }).eq('id', vehicle.id)
    setSaving(false)
    if (error) { toast.error(error.message); return }
    toast.success('Vehicle updated')
    onSaved(); onClose()
  }

  if (!vehicle) return null

  return (
    <Modal open={open} onClose={onClose} title={`Edit — ${vehicle.year} ${vehicle.make} ${vehicle.model}`} subtitle={vehicle.vin} width="max-w-2xl">
      {/* Tabs */}
      <div className="flex gap-1 mb-5 -mx-6 px-6 border-b border-gray-100">
        {(['details', 'photos'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-all capitalize ${tab === t ? 'border-brand-400 text-brand-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t === 'photos' ? `📷 Photos (${photos.length})` : '✏️ Details'}
          </button>
        ))}
      </div>

      {tab === 'details' && (
        <div className="space-y-4">
          {/* Read-only VIN info */}
          <div className="bg-gray-50 rounded-xl p-3 grid grid-cols-4 gap-3 text-xs">
            <div><span className="text-gray-400 block">VIN</span><span className="font-mono font-medium">{vehicle.vin}</span></div>
            <div><span className="text-gray-400 block">Year</span><span className="font-medium">{vehicle.year}</span></div>
            <div><span className="text-gray-400 block">Make</span><span className="font-medium">{vehicle.make}</span></div>
            <div><span className="text-gray-400 block">Model</span><span className="font-medium">{vehicle.model}</span></div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Cost Basis ($)" required>
              <input className="input-base font-mono" value={form.costBasis} onChange={e => set('costBasis', e.target.value)} type="number" step="0.01" />
            </Field>
            <Field label="Recon Cost ($)">
              <input className="input-base font-mono" value={form.reconCost} onChange={e => set('reconCost', e.target.value)} type="number" step="0.01" />
            </Field>
            <Field label="List Price ($)">
              <input className="input-base font-mono" value={form.listPrice} onChange={e => set('listPrice', e.target.value)} type="number" step="0.01" />
            </Field>
            <Field label="Exterior Color">
              <input className="input-base" value={form.colorExterior} onChange={e => set('colorExterior', e.target.value)} placeholder="Silver" />
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
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </Field>
            <Field label="Status">
              <div className="relative">
                <select className="input-base appearance-none pr-8" value={form.status} onChange={e => set('status', e.target.value)}>
                  <option value="acquired">Acquired</option>
                  <option value="recon">In Recon</option>
                  <option value="frontline">Frontline</option>
                  <option value="pending_title">Pending Title</option>
                  <option value="sold">Sold</option>
                  <option value="wholesale">Wholesale</option>
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </Field>
            <Field label="Title Number">
              <input className="input-base font-mono" value={form.titleNumber} onChange={e => set('titleNumber', e.target.value)} placeholder="NC title #" />
            </Field>
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.titleInHand} onChange={e => set('titleInHand', e.target.checked)} className="w-4 h-4" />
              <span className="text-sm text-gray-700">Title in hand</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.frontlineReady} onChange={e => set('frontlineReady', e.target.checked)} className="w-4 h-4" />
              <span className="text-sm text-gray-700">Frontline ready</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.damageFlag} onChange={e => set('damageFlag', e.target.checked)} className="w-4 h-4" />
              <span className="text-sm text-red-700">Damage flag (MVR-181)</span>
            </label>
          </div>

          {form.damageFlag && (
            <Field label="Damage Description">
              <textarea className="input-base" rows={2} value={form.damageDescription} onChange={e => set('damageDescription', e.target.value)} placeholder="Describe damage..." />
            </Field>
          )}

          <Field label="Internal Notes">
            <textarea className="input-base" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Notes..." />
          </Field>
        </div>
      )}

      {tab === 'photos' && (
        <VehicleImageUpload
          vehicleId={vehicle.id}
          dealerId={DEALER_ID}
          existingPhotos={photos}
          onUploaded={() => {
            supabase.from('vehicle_photos').select('*').eq('vehicle_id', vehicle.id).order('position')
              .then(({ data }) => setPhotos(data ?? []))
          }}
        />
      )}

      <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
        <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
        {tab === 'details' && (
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 gap-2">
            {saving && <Loader2 size={14} className="animate-spin" />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        )}
      </div>
    </Modal>
  )
}

// ── Delete confirm ────────────────────────────────────────────────────────────
function DeleteConfirm({ open, onClose, onConfirm, title, description }: {
  open: boolean; onClose: () => void; onConfirm: () => void; title: string; description: string
}) {
  return (
    <Modal open={open} onClose={onClose} title="Confirm Delete" width="max-w-sm">
      <p className="text-sm text-gray-700 font-medium mb-1">{title}</p>
      <p className="text-xs text-gray-500 mb-6">{description}</p>
      <div className="flex gap-3">
        <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
        <button onClick={() => { onConfirm(); onClose() }} className="btn-danger flex-1">Delete</button>
      </div>
    </Modal>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Inventory() {
  const [vehicles, setVehicles] = useState<InventorySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<VehicleStatus | 'all'>('all')
  const [search, setSearch] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editVehicle, setEditVehicle] = useState<InventorySummary | null>(null)
  const [deleteVehicle, setDeleteVehicle] = useState<InventorySummary | null>(null)

  const fetchVehicles = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('v_inventory_summary').select('*').order('acquired_date', { ascending: false })
    if (statusFilter !== 'all') q = q.eq('status', statusFilter)
    const { data, error } = await q
    setLoading(false)
    if (error) { toast.error('Failed to load inventory'); return }
    setVehicles((data ?? []) as InventorySummary[])
  }, [statusFilter])

  useEffect(() => { fetchVehicles() }, [fetchVehicles])

  const toggleFrontlineReady = async (id: string, current: boolean) => {
    const { error } = await supabase.from('vehicles').update({
      frontline_ready: !current,
      frontline_ready_date: !current ? new Date().toISOString().split('T')[0] : null,
      status: !current ? 'frontline' : 'recon',
    }).eq('id', id)
    if (error) { toast.error('Update failed'); return }
    toast.success(!current ? 'Marked frontline ready' : 'Moved back to recon')
    fetchVehicles()
  }

  const handleDelete = async (vehicle: InventorySummary) => {
    // Delete photos from storage first
    const { data: photos } = await supabase.from('vehicle_photos').select('storage_path').eq('vehicle_id', vehicle.id)
    if (photos && photos.length > 0) {
      await supabase.storage.from('vehicle-photos').remove(photos.map(p => p.storage_path))
    }
    const { error } = await supabase.from('vehicles').delete().eq('id', vehicle.id)
    if (error) { toast.error(error.message); return }
    toast.success(`${vehicle.year} ${vehicle.make} ${vehicle.model} deleted`)
    fetchVehicles()
  }

  const filtered = vehicles.filter(v => {
    if (!search) return true
    const q = search.toLowerCase()
    return v.vin.toLowerCase().includes(q) || v.make.toLowerCase().includes(q) ||
      v.model.toLowerCase().includes(q) || String(v.year).includes(q) ||
      (v.color_exterior ?? '').toLowerCase().includes(q)
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
        <button onClick={() => setShowAddModal(true)} className="btn-primary"><Plus size={15} /> Add Vehicle</button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Frontline Ready" value={frontlineCount} sub="Ready to sell" color="green" />
        <StatCard label="In Recon"        value={reconCount}     sub="Not yet frontline" color="amber" />
        <StatCard label="Aged 90+ Days"   value={agedCount}      sub="Needs attention" color="red" />
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
        <button onClick={fetchVehicles} className="btn-secondary py-1.5 px-3 text-xs gap-1.5"><RefreshCw size={13} /> Refresh</button>
        <button className="btn-secondary py-1.5 px-3 text-xs gap-1.5"><Filter size={13} /> Filters</button>
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
            <RefreshCw size={16} className="animate-spin" /><span className="text-sm">Loading inventory...</span>
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
                  <th>Actions</th>
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
                        <span className="font-mono text-sm">{formatCurrency(v.cost_basis)}</span>
                        {v.recon_cost > 0 && <div className="text-xs text-gray-400">+{formatCurrency(v.recon_cost)} recon</div>}
                      </td>
                      <td className="text-right"><span className="font-mono text-sm font-medium">{formatCurrency(v.list_price)}</span></td>
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
                      <td><span className={VEHICLE_STATUS_STYLES[v.status as VehicleStatus] ?? 'badge-gray'}>{STATUS_LABELS[v.status as VehicleStatus] ?? v.status}</span></td>
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
                      <td>
                        <div className="flex items-center gap-1">
                          <button onClick={() => setEditVehicle(v)} className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors" title="Edit vehicle">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => setDeleteVehicle(v)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors" title="Delete vehicle">
                            <Trash2 size={14} />
                          </button>
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
      <EditVehicleModal open={!!editVehicle} onClose={() => setEditVehicle(null)} onSaved={fetchVehicles} vehicle={editVehicle} />
      <DeleteConfirm
        open={!!deleteVehicle}
        onClose={() => setDeleteVehicle(null)}
        onConfirm={() => deleteVehicle && handleDelete(deleteVehicle)}
        title={deleteVehicle ? `Delete ${deleteVehicle.year} ${deleteVehicle.make} ${deleteVehicle.model}?` : ''}
        description="This will permanently remove the vehicle and all associated photos. This cannot be undone."
      />
    </div>
  )
}
