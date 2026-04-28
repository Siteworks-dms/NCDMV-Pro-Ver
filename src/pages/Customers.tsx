import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, RefreshCw, Users, ChevronDown, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import type { Customer } from '@/types/database'
import { EmptyState, Modal, Field } from '@/components/ui'

const DEALER_ID = import.meta.env.VITE_DEALER_ID ?? ''

const EMPTY_FORM = {
  firstName: '', lastName: '', middleName: '',
  customerType: 'individual' as 'individual' | 'business',
  businessName: '',
  addressLine1: '', addressLine2: '', city: '', state: 'NC', zip: '',
  phonePrimary: '', phoneSecondary: '', email: '',
  driversLicense: '', dlState: 'NC', dlExpiration: '',
  source: 'walk_in', notes: '',
}

function CustomerModal({ open, onClose, onSaved, editCustomer }: {
  open: boolean; onClose: () => void; onSaved: () => void; editCustomer?: Customer | null
}) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (editCustomer) {
      setForm({
        firstName: editCustomer.first_name, lastName: editCustomer.last_name,
        middleName: editCustomer.middle_name ?? '', customerType: editCustomer.customer_type,
        businessName: editCustomer.business_name ?? '',
        addressLine1: editCustomer.address_line1 ?? '', addressLine2: editCustomer.address_line2 ?? '',
        city: editCustomer.city ?? '', state: editCustomer.state ?? 'NC', zip: editCustomer.zip ?? '',
        phonePrimary: editCustomer.phone_primary ?? '', phoneSecondary: editCustomer.phone_secondary ?? '',
        email: editCustomer.email ?? '', driversLicense: editCustomer.drivers_license_num ?? '',
        dlState: editCustomer.dl_state ?? 'NC', dlExpiration: editCustomer.dl_expiration ?? '',
        source: editCustomer.source ?? 'walk_in', notes: editCustomer.notes ?? '',
      })
    } else {
      setForm(EMPTY_FORM)
    }
  }, [editCustomer, open])

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }))

  const handleSave = async () => {
    if (!form.firstName || !form.lastName) { toast.error('First and last name required'); return }
    setSaving(true)
    const payload = {
      dealer_id: DEALER_ID,
      first_name: form.firstName, last_name: form.lastName, middle_name: form.middleName || null,
      customer_type: form.customerType, business_name: form.businessName || null,
      address_line1: form.addressLine1 || null, address_line2: form.addressLine2 || null,
      city: form.city || null, state: form.state || 'NC', zip: form.zip || null,
      phone_primary: form.phonePrimary || null, phone_secondary: form.phoneSecondary || null,
      email: form.email || null, drivers_license_num: form.driversLicense || null,
      dl_state: form.dlState || null, dl_expiration: form.dlExpiration || null,
      source: form.source || null, notes: form.notes || null,
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
    <Modal open={open} onClose={onClose} title={editCustomer ? 'Edit Customer' : 'Add Customer'} subtitle="Customer record for deals and CRM" width="max-w-2xl">
      <div className="space-y-4">
        {/* Type */}
        <div className="flex gap-3">
          {(['individual', 'business'] as const).map(t => (
            <label key={t} className={`flex-1 flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${form.customerType === t ? 'bg-brand-50 border-brand-400' : 'border-gray-200 hover:border-gray-300'}`}>
              <input type="radio" name="type" checked={form.customerType === t} onChange={() => set('customerType', t)} className="text-brand-400" />
              <span className="text-sm font-medium capitalize">{t}</span>
            </label>
          ))}
        </div>

        {/* Name */}
        <div className="grid grid-cols-3 gap-3">
          <Field label="First Name" required><input className="input-base" value={form.firstName} onChange={e => set('firstName', e.target.value)} placeholder="John" /></Field>
          <Field label="Middle Name"><input className="input-base" value={form.middleName} onChange={e => set('middleName', e.target.value)} placeholder="M." /></Field>
          <Field label="Last Name" required><input className="input-base" value={form.lastName} onChange={e => set('lastName', e.target.value)} placeholder="Smith" /></Field>
        </div>
        {form.customerType === 'business' && (
          <Field label="Business Name"><input className="input-base" value={form.businessName} onChange={e => set('businessName', e.target.value)} placeholder="Smith Auto LLC" /></Field>
        )}

        {/* Address */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Address — Required for NC title forms</p>
          <div className="space-y-2">
            <Field label="Street Address"><input className="input-base" value={form.addressLine1} onChange={e => set('addressLine1', e.target.value)} placeholder="123 Main St" /></Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="City"><input className="input-base" value={form.city} onChange={e => set('city', e.target.value)} placeholder="Charlotte" /></Field>
              <Field label="State"><input className="input-base uppercase" value={form.state} onChange={e => set('state', e.target.value.toUpperCase())} maxLength={2} placeholder="NC" /></Field>
              <Field label="ZIP"><input className="input-base font-mono" value={form.zip} onChange={e => set('zip', e.target.value)} placeholder="28202" /></Field>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="grid grid-cols-3 gap-3">
          <Field label="Primary Phone"><input className="input-base" value={form.phonePrimary} onChange={e => set('phonePrimary', e.target.value)} placeholder="(704) 555-0100" /></Field>
          <Field label="Secondary Phone"><input className="input-base" value={form.phoneSecondary} onChange={e => set('phoneSecondary', e.target.value)} placeholder="(704) 555-0101" /></Field>
          <Field label="Email"><input className="input-base" value={form.email} onChange={e => set('email', e.target.value)} placeholder="john@email.com" type="email" /></Field>
        </div>

        {/* ID — NC title requirement */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Driver's License — Required for MVR-1</p>
          <div className="grid grid-cols-3 gap-3">
            <Field label="DL Number" hint="Stored encrypted"><input className="input-base font-mono" value={form.driversLicense} onChange={e => set('driversLicense', e.target.value)} placeholder="NC12345678" /></Field>
            <Field label="DL State"><input className="input-base uppercase" value={form.dlState} onChange={e => set('dlState', e.target.value.toUpperCase())} maxLength={2} placeholder="NC" /></Field>
            <Field label="Expiration"><input className="input-base" value={form.dlExpiration} onChange={e => set('dlExpiration', e.target.value)} type="date" /></Field>
          </div>
        </div>

        {/* Source */}
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
          <Field label="Notes"><input className="input-base" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Internal notes..." /></Field>
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

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null)

  const fetchCustomers = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from('customers').select('*').order('last_name')
    setLoading(false)
    if (error) { toast.error('Failed to load customers'); return }
    setCustomers((data ?? []) as Customer[])
  }, [])

  useEffect(() => { fetchCustomers() }, [fetchCustomers])

  const filtered = customers.filter(c => {
    if (!search) return true
    const q = search.toLowerCase()
    return `${c.first_name} ${c.last_name} ${c.phone_primary ?? ''} ${c.email ?? ''}`.toLowerCase().includes(q)
  })

  const openEdit = (c: Customer) => { setEditCustomer(c); setShowModal(true) }
  const openNew  = () => { setEditCustomer(null); setShowModal(true) }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Customers</h2>
          <p className="text-xs text-gray-400 mt-0.5">{customers.length} customer records</p>
        </div>
        <button onClick={openNew} className="btn-primary"><Plus size={15} /> Add Customer</button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input-base pl-8 py-1.5 text-xs" placeholder="Search name, phone, email..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button onClick={fetchCustomers} className="btn-secondary py-1.5 px-3 text-xs gap-1.5">
          <RefreshCw size={13} /> Refresh
        </button>
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
                <th>DL State</th>
                <th>Source</th>
                <th>Added</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} onClick={() => openEdit(c)}>
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
                  <td><span className="badge-gray">{c.dl_state ?? '—'}</span></td>
                  <td className="text-xs capitalize text-gray-500">{(c.source ?? '—').replace('_',' ')}</td>
                  <td className="text-xs text-gray-400">{c.created_at.split('T')[0]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <CustomerModal open={showModal} onClose={() => setShowModal(false)} onSaved={fetchCustomers} editCustomer={editCustomer} />
    </div>
  )
}
