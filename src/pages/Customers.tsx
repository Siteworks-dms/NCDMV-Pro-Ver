import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Search, RefreshCw, Users, ChevronDown, Loader2, Pencil, Trash2, Upload, FileText, X } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import type { Customer } from '@/types/database'
import { EmptyState, Modal, Field } from '@/components/ui'

const DEALER_ID = import.meta.env.VITE_DEALER_ID ?? ''

const EMPTY_FORM = {
  firstName: '', lastName: '', middleName: '',
  customerType: 'individual' as 'individual' | 'business',
  businessName: '', addressLine1: '', addressLine2: '',
  city: '', state: 'NC', zip: '',
  phonePrimary: '', phoneSecondary: '', email: '',
  driversLicense: '', dlState: 'NC', dlExpiration: '',
  source: 'walk_in', notes: '',
}

// ── ID Document Upload ────────────────────────────────────────────────────────
function IDDocUpload({ customerId, existingUrl, onUploaded }: {
  customerId: string; existingUrl?: string | null; onUploaded: (url: string, path: string) => void
}) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(existingUrl ?? null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (file: File) => {
    setUploading(true)
    const ext  = file.name.split('.').pop()
    const path = `${DEALER_ID}/${customerId}/id-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('customer-docs').upload(path, file, { upsert: true })
    setUploading(false)
    if (error) { toast.error('Upload failed: ' + error.message); return }
    const { data } = supabase.storage.from('customer-docs').getPublicUrl(path)
    setPreview(data.publicUrl)
    onUploaded(data.publicUrl, path)
    toast.success('ID document uploaded')
  }

  const handleRemove = async () => {
    setPreview(null)
    onUploaded('', '')
  }

  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        Driver's License / ID Document <span className="text-gray-400">(optional)</span>
      </label>
      {preview ? (
        <div className="relative inline-block">
          {preview.match(/\.(jpg|jpeg|png|webp)$/i) ? (
            <img src={preview} alt="ID" className="h-28 rounded-lg object-cover border border-gray-200" />
          ) : (
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
              <FileText size={16} className="text-gray-400" />
              <span className="text-xs text-gray-600">ID Document uploaded</span>
            </div>
          )}
          <button onClick={handleRemove} className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600">
            <X size={10} />
          </button>
        </div>
      ) : (
        <div onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-gray-200 hover:border-brand-400 rounded-xl p-4 text-center cursor-pointer transition-colors">
          <input ref={inputRef} type="file" accept="image/*,.pdf" className="hidden"
            onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} />
          {uploading ? (
            <div className="flex items-center justify-center gap-2 text-brand-600">
              <Loader2 size={14} className="animate-spin" />
              <span className="text-xs">Uploading...</span>
            </div>
          ) : (
            <>
              <Upload size={16} className="mx-auto text-gray-300 mb-1" />
              <p className="text-xs text-gray-500">Upload DL photo or scan</p>
              <p className="text-xs text-gray-400">JPG, PNG, PDF</p>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Customer Modal (Add + Edit) ───────────────────────────────────────────────
function CustomerModal({ open, onClose, onSaved, editCustomer }: {
  open: boolean; onClose: () => void; onSaved: () => void; editCustomer?: Customer | null
}) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [idDocUrl, setIdDocUrl]   = useState<string>('')
  const [idDocPath, setIdDocPath] = useState<string>('')
  const [tempId, setTempId] = useState<string>('')

  useEffect(() => {
    if (editCustomer) {
      setForm({
        firstName: editCustomer.first_name, lastName: editCustomer.last_name,
        middleName: editCustomer.middle_name ?? '',
        customerType: editCustomer.customer_type,
        businessName: editCustomer.business_name ?? '',
        addressLine1: editCustomer.address_line1 ?? '', addressLine2: editCustomer.address_line2 ?? '',
        city: editCustomer.city ?? '', state: editCustomer.state ?? 'NC', zip: editCustomer.zip ?? '',
        phonePrimary: editCustomer.phone_primary ?? '', phoneSecondary: editCustomer.phone_secondary ?? '',
        email: editCustomer.email ?? '', driversLicense: editCustomer.drivers_license_num ?? '',
        dlState: editCustomer.dl_state ?? 'NC', dlExpiration: editCustomer.dl_expiration ?? '',
        source: editCustomer.source ?? 'walk_in', notes: editCustomer.notes ?? '',
      })
      setIdDocUrl((editCustomer as any).id_document_url ?? '')
      setTempId(editCustomer.id)
    } else {
      setForm(EMPTY_FORM)
      setIdDocUrl(''); setIdDocPath('')
      setTempId(crypto.randomUUID())
    }
  }, [editCustomer, open])

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.firstName || !form.lastName) { toast.error('Name required'); return }
    setSaving(true)
    const payload: any = {
      dealer_id: DEALER_ID,
      first_name: form.firstName, last_name: form.lastName, middle_name: form.middleName || null,
      customer_type: form.customerType, business_name: form.businessName || null,
      address_line1: form.addressLine1 || null, address_line2: form.addressLine2 || null,
      city: form.city || null, state: form.state || 'NC', zip: form.zip || null,
      phone_primary: form.phonePrimary || null, phone_secondary: form.phoneSecondary || null,
      email: form.email || null, drivers_license_num: form.driversLicense || null,
      dl_state: form.dlState || null, dl_expiration: form.dlExpiration || null,
      source: form.source || null, notes: form.notes || null,
      id_document_url: idDocUrl || null, id_document_path: idDocPath || null,
    }
    const { error } = editCustomer
      ? await supabase.from('customers').update(payload).eq('id', editCustomer.id)
      : await supabase.from('customers').insert(payload)
    setSaving(false)
    if (error) { toast.error(error.message); return }
    toast.success(editCustomer ? 'Customer updated' : `${form.firstName} ${form.lastName} added`)
    onSaved(); onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={editCustomer ? 'Edit Customer' : 'Add Customer'} width="max-w-2xl">
      <div className="space-y-4">
        <div className="flex gap-3">
          {(['individual', 'business'] as const).map(t => (
            <label key={t} className={`flex-1 flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${form.customerType === t ? 'bg-brand-50 border-brand-400' : 'border-gray-200 hover:border-gray-300'}`}>
              <input type="radio" name="type" checked={form.customerType === t} onChange={() => set('customerType', t)} className="text-brand-400" />
              <span className="text-sm font-medium capitalize">{t}</span>
            </label>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Field label="First Name" required><input className="input-base" value={form.firstName} onChange={e => set('firstName', e.target.value)} placeholder="John" /></Field>
          <Field label="Middle Name"><input className="input-base" value={form.middleName} onChange={e => set('middleName', e.target.value)} placeholder="M." /></Field>
          <Field label="Last Name" required><input className="input-base" value={form.lastName} onChange={e => set('lastName', e.target.value)} placeholder="Smith" /></Field>
        </div>

        {form.customerType === 'business' && (
          <Field label="Business Name"><input className="input-base" value={form.businessName} onChange={e => set('businessName', e.target.value)} /></Field>
        )}

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Address — Required for NC title forms</p>
          <Field label="Street Address"><input className="input-base" value={form.addressLine1} onChange={e => set('addressLine1', e.target.value)} placeholder="123 Main St" /></Field>
          <div className="grid grid-cols-3 gap-3 mt-2">
            <Field label="City"><input className="input-base" value={form.city} onChange={e => set('city', e.target.value)} placeholder="Charlotte" /></Field>
            <Field label="State"><input className="input-base uppercase" value={form.state} onChange={e => set('state', e.target.value.toUpperCase())} maxLength={2} /></Field>
            <Field label="ZIP"><input className="input-base font-mono" value={form.zip} onChange={e => set('zip', e.target.value)} placeholder="28202" /></Field>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Primary Phone"><input className="input-base" value={form.phonePrimary} onChange={e => set('phonePrimary', e.target.value)} placeholder="(704) 555-0100" /></Field>
          <Field label="Secondary Phone"><input className="input-base" value={form.phoneSecondary} onChange={e => set('phoneSecondary', e.target.value)} /></Field>
          <Field label="Email"><input className="input-base" value={form.email} onChange={e => set('email', e.target.value)} type="email" /></Field>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Driver's License — Required for MVR-1</p>
          <div className="grid grid-cols-3 gap-3">
            <Field label="DL Number"><input className="input-base font-mono" value={form.driversLicense} onChange={e => set('driversLicense', e.target.value)} /></Field>
            <Field label="DL State"><input className="input-base uppercase" value={form.dlState} onChange={e => set('dlState', e.target.value.toUpperCase())} maxLength={2} /></Field>
            <Field label="Expiration"><input className="input-base" value={form.dlExpiration} onChange={e => set('dlExpiration', e.target.value)} type="date" /></Field>
          </div>
        </div>

        {/* ID Document Upload */}
        <IDDocUpload
          customerId={editCustomer?.id ?? tempId}
          existingUrl={idDocUrl || null}
          onUploaded={(url, path) => { setIdDocUrl(url); setIdDocPath(path) }}
        />

        <div className="grid grid-cols-2 gap-3">
          <Field label="Lead Source">
            <div className="relative">
              <select className="input-base appearance-none pr-8" value={form.source} onChange={e => set('source', e.target.value)}>
                {['walk_in','web','phone','referral','repeat','autotrader','cars_com','facebook','other'].map(s => (
                  <option key={s} value={s}>{s.replace('_',' ')}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </Field>
          <Field label="Notes"><input className="input-base" value={form.notes} onChange={e => set('notes', e.target.value)} /></Field>
        </div>
      </div>

      <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
        <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
        <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 gap-2">
          {saving && <Loader2 size={14} className="animate-spin" />}
          {saving ? 'Saving...' : editCustomer ? 'Update Customer' : 'Add Customer'}
        </button>
      </div>
    </Modal>
  )
}

// ── Delete Confirm ────────────────────────────────────────────────────────────
function DeleteConfirm({ open, onClose, onConfirm, name }: {
  open: boolean; onClose: () => void; onConfirm: () => void; name: string
}) {
  return (
    <Modal open={open} onClose={onClose} title="Delete Customer" width="max-w-sm">
      <p className="text-sm text-gray-700 mb-1">Delete <strong>{name}</strong>?</p>
      <p className="text-xs text-gray-500 mb-2">This will permanently remove the customer record and uploaded ID. Cannot be undone.</p>
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700 mb-5">
        ⚠ If this customer has linked deals, deletion will be blocked. Cancel or reassign those deals first.
      </div>
      <div className="flex gap-3">
        <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
        <button onClick={() => { onConfirm(); onClose() }} className="btn-danger flex-1">Delete</button>
      </div>
    </Modal>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Customers() {
  const [customers, setCustomers]       = useState<Customer[]>([])
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState('')
  const [showModal, setShowModal]       = useState(false)
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null)
  const [deleteCustomer, setDeleteCustomer] = useState<Customer | null>(null)

  const fetchCustomers = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from('customers').select('*').order('last_name')
    setLoading(false)
    if (error) { toast.error('Failed to load'); return }
    setCustomers((data ?? []) as Customer[])
  }, [])

  useEffect(() => { fetchCustomers() }, [fetchCustomers])

  const handleDelete = async (c: Customer) => {
    // Check if customer has any linked deals first
    const { count } = await supabase
      .from('deals')
      .select('id', { count: 'exact', head: true })
      .eq('buyer_id', c.id)

    if ((count ?? 0) > 0) {
      toast.error(`Cannot delete — ${c.first_name} ${c.last_name} has ${count} deal(s) on record. Cancel or reassign the deals first.`)
      return
    }

    // Delete ID document from storage if exists
    if ((c as any).id_document_path) {
      await supabase.storage.from('customer-docs').remove([(c as any).id_document_path])
    }
    const { error } = await supabase.from('customers').delete().eq('id', c.id)
    if (error) { toast.error(error.message); return }
    toast.success(`${c.first_name} ${c.last_name} deleted`)
    fetchCustomers()
  }

  const openEdit = (c: Customer) => { setEditCustomer(c); setShowModal(true) }
  const openNew  = () => { setEditCustomer(null); setShowModal(true) }

  const filtered = customers.filter(c => {
    if (!search) return true
    const q = search.toLowerCase()
    return `${c.first_name} ${c.last_name} ${c.phone_primary ?? ''} ${c.email ?? ''}`.toLowerCase().includes(q)
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Customers</h2>
          <p className="text-xs text-gray-400 mt-0.5">{customers.length} records</p>
        </div>
        <button onClick={openNew} className="btn-primary"><Plus size={15} /> Add Customer</button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input-base pl-8 py-1.5 text-xs" placeholder="Search name, phone, email..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button onClick={fetchCustomers} className="btn-secondary py-1.5 px-3 text-xs gap-1.5"><RefreshCw size={13} /> Refresh</button>
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
            <RefreshCw size={16} className="animate-spin" /><span className="text-sm">Loading...</span>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Users} title="No customers" description="Add your first customer to get started"
            action={<button onClick={openNew} className="btn-primary text-sm"><Plus size={14} /> Add Customer</button>} />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Address</th>
                <th>Phone</th>
                <th>Email</th>
                <th>DL / ID</th>
                <th>Source</th>
                <th>Added</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-brand-800 text-xs font-semibold">{c.first_name[0]}{c.last_name[0]}</span>
                      </div>
                      <div>
                        <div className="text-sm font-medium">{c.first_name} {c.last_name}</div>
                        {c.business_name && <div className="text-xs text-gray-400">{c.business_name}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="text-xs text-gray-500">{c.city ?? '—'}, {c.state ?? 'NC'}</td>
                  <td className="font-mono text-xs">{c.phone_primary ?? '—'}</td>
                  <td className="text-xs text-gray-500">{c.email ?? '—'}</td>
                  <td>
                    {(c as any).id_document_url ? (
                      <a href={(c as any).id_document_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                        <FileText size={12} /> View ID
                      </a>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                  <td className="text-xs capitalize text-gray-500">{(c.source ?? '—').replace('_',' ')}</td>
                  <td className="text-xs text-gray-400">{c.created_at.split('T')[0]}</td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors" title="Edit">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => setDeleteCustomer(c)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors" title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <CustomerModal open={showModal} onClose={() => setShowModal(false)} onSaved={fetchCustomers} editCustomer={editCustomer} />
      <DeleteConfirm
        open={!!deleteCustomer}
        onClose={() => setDeleteCustomer(null)}
        onConfirm={() => deleteCustomer && handleDelete(deleteCustomer)}
        name={deleteCustomer ? `${deleteCustomer.first_name} ${deleteCustomer.last_name}` : ''}
      />
    </div>
  )
}
