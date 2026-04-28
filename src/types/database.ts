// ============================================================
// NC DMS Pro — Auto-generated database types
// Matches 001_initial_schema.sql exactly
// ============================================================

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      dealers: {
        Row: Dealer
        Insert: Omit<Dealer, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Dealer, 'id'>>
      }
      users: {
        Row: User
        Insert: Omit<User, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<User, 'id'>>
      }
      vehicles: {
        Row: Vehicle
        Insert: Omit<Vehicle, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Vehicle, 'id'>>
      }
      vehicle_photos: {
        Row: VehiclePhoto
        Insert: Omit<VehiclePhoto, 'id' | 'uploaded_at'>
        Update: Partial<Omit<VehiclePhoto, 'id'>>
      }
      vehicle_recon_items: {
        Row: VehicleReconItem
        Insert: Omit<VehicleReconItem, 'id'>
        Update: Partial<Omit<VehicleReconItem, 'id'>>
      }
      customers: {
        Row: Customer
        Insert: Omit<Customer, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Customer, 'id'>>
      }
      leads: {
        Row: Lead
        Insert: Omit<Lead, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Lead, 'id'>>
      }
      lead_activities: {
        Row: LeadActivity
        Insert: Omit<LeadActivity, 'id' | 'logged_at'>
        Update: Partial<Omit<LeadActivity, 'id'>>
      }
      deals: {
        Row: Deal
        Insert: Omit<Deal, 'id' | 'deal_number' | 'hut_amount' | 'hut_basis' | 'hut_capped' | 'net_trade' | 'title_filing_due' | 'temp_tag_expiry' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Deal, 'id' | 'deal_number'>>
      }
      deal_fees: {
        Row: DealFee
        Insert: Omit<DealFee, 'id'>
        Update: Partial<Omit<DealFee, 'id'>>
      }
      trade_ins: {
        Row: TradeIn
        Insert: Omit<TradeIn, 'id' | 'created_at'>
        Update: Partial<Omit<TradeIn, 'id'>>
      }
      financing: {
        Row: Financing
        Insert: Omit<Financing, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Financing, 'id'>>
      }
      nc_forms: {
        Row: NCForm
        Insert: Omit<NCForm, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<NCForm, 'id'>>
      }
      ledger_entries: {
        Row: LedgerEntry
        Insert: Omit<LedgerEntry, 'id' | 'created_at'>
        Update: Partial<Omit<LedgerEntry, 'id'>>
      }
      chart_of_accounts: {
        Row: ChartOfAccount
        Insert: Omit<ChartOfAccount, never>
        Update: Partial<ChartOfAccount>
      }
    }
    Views: {
      v_deal_summary: { Row: DealSummary }
      v_inventory_summary: { Row: InventorySummary }
    }
    Functions: {
      auth_dealer_id: { Returns: string }
      calculate_hut: { Returns: undefined }
    }
  }
}

// ── Table Row Types ──────────────────────────────────────────────────────────

export interface Dealer {
  id: string
  legal_name: string
  trade_name: string | null
  nc_dealer_license: string
  address_line1: string
  address_line2: string | null
  city: string
  state: string
  zip: string
  phone: string | null
  email: string | null
  dmv_county_code: string | null
  elt_participant: boolean
  doc_fee_amount: number
  dealer_pack_amount: number
  active: boolean
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  dealer_id: string
  auth_user_id: string | null
  first_name: string
  last_name: string
  email: string
  role: 'admin' | 'sales' | 'fi_manager' | 'accounting' | 'service'
  phone: string | null
  active: boolean
  created_at: string
  updated_at: string
}

export type VehicleStatus = 'acquired' | 'recon' | 'frontline' | 'sold' | 'wholesale' | 'pending_title'
export type AcquisitionType = 'auction' | 'trade' | 'purchase' | 'consignment' | 'other'
export type ConditionGrade = 'excellent' | 'good' | 'fair' | 'poor'

export interface Vehicle {
  id: string
  dealer_id: string
  vin: string
  year: number
  make: string
  model: string
  trim: string | null
  body_style: string | null
  engine: string | null
  transmission: string | null
  drivetrain: string | null
  fuel_type: string | null
  color_exterior: string | null
  color_interior: string | null
  odometer_acquisition: number
  odometer_current: number | null
  condition_grade: ConditionGrade | null
  cost_basis: number
  recon_cost: number
  pack_amount: number
  list_price: number | null
  floor_plan_lender: string | null
  floor_plan_rate: number | null
  status: VehicleStatus
  frontline_ready: boolean
  frontline_ready_date: string | null
  // NC Compliance
  damage_flag: boolean
  damage_description: string | null
  flood_salvage_flag: boolean
  branded_title_type: string | null
  airbag_deployed: boolean
  prior_accident: boolean
  prior_accident_desc: string | null
  odometer_actual: boolean
  title_in_hand: boolean
  title_number: string | null
  title_state: string
  // Acquisition
  acquired_from: string | null
  acquisition_type: AcquisitionType | null
  acquired_date: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface VehiclePhoto {
  id: string
  vehicle_id: string
  dealer_id: string
  storage_path: string
  public_url: string | null
  position: number
  is_primary: boolean
  uploaded_at: string
}

export interface VehicleReconItem {
  id: string
  vehicle_id: string
  dealer_id: string
  category: string
  item_name: string
  status: 'pending' | 'in_progress' | 'complete' | 'waived'
  cost: number
  vendor: string | null
  completed_by: string | null
  completed_at: string | null
  notes: string | null
}

export interface Customer {
  id: string
  dealer_id: string
  first_name: string
  last_name: string
  middle_name: string | null
  customer_type: 'individual' | 'business'
  business_name: string | null
  address_line1: string | null
  address_line2: string | null
  city: string | null
  state: string | null
  zip: string | null
  phone_primary: string | null
  phone_secondary: string | null
  email: string | null
  drivers_license_num: string | null
  dl_state: string | null
  dl_expiration: string | null
  date_of_birth: string | null
  ssn_last4: string | null
  source: string | null
  assigned_to: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type LeadStage = 'new' | 'contacted' | 'appointment' | 'demo' | 'offer' | 'negotiation' | 'won' | 'lost' | 'dead'
export type LeadSource = 'web' | 'walk_in' | 'phone' | 'referral' | 'repeat' | 'carfax' | 'autotrader' | 'cars_com' | 'facebook' | 'other'

export interface Lead {
  id: string
  dealer_id: string
  customer_id: string | null
  source: LeadSource
  vehicle_interest_text: string | null
  vehicle_id: string | null
  budget_min: number | null
  budget_max: number | null
  stage: LeadStage
  lost_reason: string | null
  priority: 'low' | 'medium' | 'high'
  assigned_to: string | null
  next_followup_at: string | null
  last_contact_at: string | null
  follow_up_count: number
  converted_deal_id: string | null
  converted_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface LeadActivity {
  id: string
  lead_id: string
  dealer_id: string
  user_id: string | null
  activity_type: 'call' | 'email' | 'sms' | 'walk_in' | 'demo' | 'note' | 'stage_change' | 'followup_scheduled'
  subject: string | null
  body: string | null
  outcome: string | null
  logged_at: string
}

export type DealStatus = 'pencil' | 'pending' | 'funded' | 'cancelled' | 'unwound'
export type PaymentType = 'cash' | 'finance' | 'lease' | 'buy_here_pay_here'
export type WarrantyType = 'as_is' | 'full_warranty' | 'limited_warranty'

export interface Deal {
  id: string
  deal_number: string
  dealer_id: string
  vehicle_id: string
  buyer_id: string
  lead_id: string | null
  salesperson_id: string | null
  fi_manager_id: string | null
  sale_type: 'retail' | 'wholesale' | 'buy_here_pay_here'
  sale_date: string
  delivery_date: string | null
  sale_price: number
  doc_fee: number
  dealer_conveyance_fee: number
  inspection_fee: number
  registration_fee: number
  title_fee: number
  // HUT (auto-calculated by trigger)
  hut_basis: number
  hut_rate: number
  hut_amount: number
  hut_capped: boolean
  // F&I
  extended_warranty_amount: number
  gap_insurance_amount: number
  credit_life_amount: number
  credit_disability_amount: number
  tire_wheel_amount: number
  // Trade
  has_trade_in: boolean
  trade_allowance: number
  trade_payoff: number
  net_trade: number  // generated
  // Payment
  cash_down: number
  rebates: number
  amount_financed: number | null
  payment_type: PaymentType
  // Totals
  total_fees: number | null
  total_amount_due: number | null
  total_of_payments: number | null
  // Status
  status: DealStatus
  funded_at: string | null
  cancelled_reason: string | null
  // NC Title
  title_filing_due: string  // generated: sale_date + 28 days
  title_filed_at: string | null
  temp_tag_issued: boolean
  temp_tag_expiry: string  // generated: sale_date + 30 days
  // FTC
  warranty_type: WarrantyType
  warranty_details: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface DealFee {
  id: string
  deal_id: string
  dealer_id: string
  fee_name: string
  fee_amount: number
  fee_type: 'government' | 'dealer' | 'fi_product' | 'other' | null
  taxable: boolean
  sort_order: number
}

export interface TradeIn {
  id: string
  deal_id: string
  dealer_id: string
  vin: string
  year: number | null
  make: string | null
  model: string | null
  trim: string | null
  color: string | null
  odometer_in: number
  odometer_actual: boolean
  title_number: string | null
  title_state: string
  lien_holder: string | null
  acv: number | null
  allowance: number
  payoff_amount: number
  payoff_lender: string | null
  payoff_good_through: string | null
  condition_grade: string | null
  damage_notes: string | null
  created_at: string
}

export interface Financing {
  id: string
  deal_id: string
  dealer_id: string
  lender_name: string
  lender_code: string | null
  apr: number
  term_months: number
  amount_financed: number
  monthly_payment: number
  first_payment_date: string | null
  final_payment_date: string | null
  finance_charge: number | null
  total_of_payments: number | null
  dealer_reserve: number
  reserve_rate: number | null
  buy_rate: number | null
  sell_rate: number | null
  status: 'pending' | 'approved' | 'funded' | 'declined' | 'unwound'
  approval_number: string | null
  funded_at: string | null
  conditions: string | null
  created_at: string
  updated_at: string
}

export type NCFormType = 'mvr1' | 'mvr180' | 'mvr181' | 'mvr2' | 'ftc_buyers_guide' | 'bill_of_sale' | 'buyer_order'
export type NCFormStatus = 'draft' | 'generated' | 'signed' | 'notarized' | 'filed' | 'void'

export interface NCForm {
  id: string
  deal_id: string
  dealer_id: string
  form_type: NCFormType
  generated_at: string | null
  generated_by: string | null
  pdf_storage_path: string | null
  pdf_public_url: string | null
  signed_at: string | null
  signed_by_buyer: boolean
  signed_by_seller: boolean
  esign_provider: string | null
  esign_envelope_id: string | null
  requires_notary: boolean
  notarized_at: string | null
  notary_name: string | null
  notary_commission_exp: string | null
  notary_county: string | null
  ron_session_id: string | null
  submitted_to_dmv: boolean
  dmv_submitted_at: string | null
  dmv_confirmation: string | null
  data_snapshot: Json
  status: NCFormStatus
  created_at: string
  updated_at: string
}

export interface LedgerEntry {
  id: string
  dealer_id: string
  deal_id: string | null
  vehicle_id: string | null
  entry_date: string
  entry_type: 'debit' | 'credit'
  account_code: string
  account_name: string
  description: string
  amount: number
  reference_number: string | null
  source: 'deal' | 'purchase' | 'expense' | 'adjustment' | 'floor_plan' | 'payoff' | 'hut' | null
  posted_by: string | null
  posted_at: string
  is_reconciled: boolean
  reconciled_at: string | null
  created_at: string
}

export interface ChartOfAccount {
  code: string
  name: string
  account_type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'
  category: string | null
  active: boolean
}

// ── View Types ───────────────────────────────────────────────────────────────

export interface DealSummary {
  id: string
  deal_number: string
  dealer_id: string
  sale_date: string
  status: DealStatus
  payment_type: PaymentType
  warranty_type: WarrantyType
  sale_price: number
  hut_amount: number
  hut_capped: boolean
  doc_fee: number
  trade_allowance: number
  cash_down: number
  amount_financed: number | null
  total_amount_due: number | null
  title_filing_due: string
  title_filed_at: string | null
  temp_tag_expiry: string
  // Vehicle
  vin: string
  year: number
  make: string
  model: string
  trim: string | null
  color_exterior: string | null
  odometer: number
  damage_flag: boolean
  flood_salvage_flag: boolean
  // Buyer
  buyer_name: string
  buyer_email: string | null
  buyer_phone: string | null
  address_line1: string | null
  city: string | null
  state: string | null
  zip: string | null
  // Computed
  forms: { form_type: NCFormType; status: NCFormStatus }[] | null
  title_days_remaining: number
  temp_tag_valid: boolean
}

export interface InventorySummary extends Vehicle {
  days_in_inventory: number | null
  age_status: 'fresh' | 'watch' | 'aged' | null
  gross_potential: number | null
}

// ── Utility Types ────────────────────────────────────────────────────────────

/** All NC forms required for a standard retail deal */
export const REQUIRED_FORMS: NCFormType[] = [
  'mvr180',         // Always required
  'ftc_buyers_guide', // Always required
  'bill_of_sale',   // Always required
  'mvr1',           // Required for title transfer
  'mvr2',           // Required for dealer reassignment
]

/** Forms that require damage_flag = true */
export const DAMAGE_TRIGGERED_FORMS: NCFormType[] = ['mvr181']

/** Human-readable form names */
export const FORM_LABELS: Record<NCFormType, string> = {
  mvr1:             'MVR-1 Title Application',
  mvr180:           'MVR-180 Odometer Disclosure',
  mvr181:           'MVR-181 Damage Disclosure',
  mvr2:             "MVR-2 Dealer's Reassignment",
  ftc_buyers_guide: "FTC Buyer's Guide",
  bill_of_sale:     'Bill of Sale / Buyer\'s Order',
  buyer_order:      'Buyer\'s Order',
}

/** Which forms require notarization */
export const NOTARY_REQUIRED: NCFormType[] = ['mvr1']

/** Deal status colors for UI */
export const DEAL_STATUS_STYLES: Record<DealStatus, string> = {
  pencil:    'badge-gray',
  pending:   'badge-amber',
  funded:    'badge-green',
  cancelled: 'badge-red',
  unwound:   'badge-red',
}

/** Vehicle status colors */
export const VEHICLE_STATUS_STYLES: Record<VehicleStatus, string> = {
  acquired:      'badge-gray',
  recon:         'badge-amber',
  frontline:     'badge-green',
  sold:          'badge-blue',
  wholesale:     'badge-blue',
  pending_title: 'badge-nc-red',
}
