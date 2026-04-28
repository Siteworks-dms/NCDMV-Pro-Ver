import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables.\n' +
    'Copy .env.example → .env.local and fill in your project URL and anon key.'
  )
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

// ── Typed query helpers ────────────────────────────────────────────────────

/** Get vehicles for the current dealer, with optional status filter */
export const vehicleQuery = (status?: string) => {
  const q = supabase
    .from('vehicles')
    .select('*')
    .order('acquired_date', { ascending: false })
  return status ? q.eq('status', status) : q
}

/** Get deal summary view (joins vehicle + buyer + forms) */
export const dealSummaryQuery = (dealId?: string) => {
  const q = supabase.from('v_deal_summary').select('*')
  return dealId ? q.eq('id', dealId) : q.order('sale_date', { ascending: false })
}

/** Get all NC forms for a deal */
export const dealFormsQuery = (dealId: string) =>
  supabase
    .from('nc_forms')
    .select('*')
    .eq('deal_id', dealId)
    .order('created_at', { ascending: true })

/** Get leads in pipeline order */
export const leadsQuery = (stage?: string) => {
  const q = supabase
    .from('leads')
    .select(`
      *,
      customers (first_name, last_name, phone_primary, email),
      vehicles (year, make, model, vin)
    `)
    .order('next_followup_at', { ascending: true, nullsFirst: false })
  return stage ? q.eq('stage', stage) : q
}

// ── NC HUT Calculator (mirrors DB trigger logic) ───────────────────────────

/** Calculate NC Highway-Use Tax — 3% of adjusted price, max $2,000 */
export function calculateHUT(salePrice: number, tradeAllowance = 0): {
  basis: number
  amount: number
  capped: boolean
} {
  const basis = Math.max(salePrice - tradeAllowance, 0)
  const raw = Math.round(basis * 0.03 * 100) / 100
  const capped = raw > 2000
  return {
    basis,
    amount: capped ? 2000 : raw,
    capped,
  }
}

/** Format currency for display */
export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value)
}

/** Days until NC title deadline (28 days from sale) */
export function titleDaysRemaining(saleDate: string): number {
  const sale = new Date(saleDate)
  const deadline = new Date(sale.getTime() + 28 * 24 * 60 * 60 * 1000)
  return Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}
