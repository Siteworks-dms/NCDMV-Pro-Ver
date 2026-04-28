import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables.\n' +
    'Copy .env.example → .env.local and fill in your project URL and anon key.'
  )
}

// Untyped client — avoids `never` type errors on insert/update/upsert
// at build time while keeping full runtime functionality.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
}) as any // eslint-disable-line

// ── Query helpers ──────────────────────────────────────────────────────────

export const vehicleQuery = (status?: string) => {
  const q = supabase
    .from('vehicles')
    .select('*')
    .order('acquired_date', { ascending: false })
  return status ? q.eq('status', status) : q
}

export const dealSummaryQuery = (dealId?: string) => {
  const q = supabase.from('v_deal_summary').select('*')
  return dealId ? q.eq('id', dealId) : q.order('sale_date', { ascending: false })
}

export const dealFormsQuery = (dealId: string) =>
  supabase
    .from('nc_forms')
    .select('*')
    .eq('deal_id', dealId)
    .order('created_at', { ascending: true })

export const leadsQuery = (stage?: string) => {
  const q = supabase
    .from('leads')
    .select('*, customers(first_name,last_name,phone_primary,email), vehicles(year,make,model,vin)')
    .order('next_followup_at', { ascending: true, nullsFirst: false })
  return stage ? q.eq('stage', stage) : q
}

// ── NC HUT Calculator ──────────────────────────────────────────────────────

export function calculateHUT(salePrice: number, tradeAllowance = 0): {
  basis: number; amount: number; capped: boolean
} {
  const basis = Math.max(salePrice - tradeAllowance, 0)
  const raw   = Math.round(basis * 0.03 * 100) / 100
  const capped = raw > 2000
  return { basis, amount: capped ? 2000 : raw, capped }
}

export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(value)
}

export function titleDaysRemaining(saleDate: string): number {
  const sale     = new Date(saleDate)
  const deadline = new Date(sale.getTime() + 28 * 24 * 60 * 60 * 1000)
  return Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}
