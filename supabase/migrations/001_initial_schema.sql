-- ============================================================
-- NC AutoDealer DMS Pro — Supabase Migration 001
-- Stack: React + Vite + Supabase + Vercel
-- NC Compliance: MVR-1, MVR-180, MVR-181, MVR-2, FTC, BOS
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- DEALERS (Multi-tenant root table)
-- ============================================================
CREATE TABLE dealers (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  legal_name            TEXT NOT NULL,
  trade_name            TEXT,
  nc_dealer_license     TEXT NOT NULL UNIQUE,
  address_line1         TEXT NOT NULL,
  address_line2         TEXT,
  city                  TEXT NOT NULL,
  state                 CHAR(2) NOT NULL DEFAULT 'NC',
  zip                   TEXT NOT NULL,
  phone                 TEXT,
  email                 TEXT,
  dmv_county_code       TEXT,           -- NC county code for title filing
  elt_participant       BOOLEAN DEFAULT FALSE, -- Electronic Lien & Title
  doc_fee_amount        NUMERIC(8,2) DEFAULT 599.00 CHECK (doc_fee_amount <= 599.00),
  dealer_pack_amount    NUMERIC(8,2) DEFAULT 0.00,
  active                BOOLEAN DEFAULT TRUE,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- USERS (Staff accounts — scoped to dealer)
-- ============================================================
CREATE TABLE users (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dealer_id             UUID NOT NULL REFERENCES dealers(id) ON DELETE CASCADE,
  auth_user_id          UUID UNIQUE,    -- Supabase auth.users foreign key
  first_name            TEXT NOT NULL,
  last_name             TEXT NOT NULL,
  email                 TEXT NOT NULL,
  role                  TEXT NOT NULL CHECK (role IN ('admin','sales','fi_manager','accounting','service')),
  phone                 TEXT,
  active                BOOLEAN DEFAULT TRUE,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(dealer_id, email)
);

-- ============================================================
-- VEHICLES (Inventory)
-- ============================================================
CREATE TABLE vehicles (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dealer_id             UUID NOT NULL REFERENCES dealers(id) ON DELETE CASCADE,

  -- Identity
  vin                   CHAR(17) NOT NULL,
  year                  SMALLINT NOT NULL CHECK (year >= 1980 AND year <= 2030),
  make                  TEXT NOT NULL,
  model                 TEXT NOT NULL,
  trim                  TEXT,
  body_style            TEXT,
  engine                TEXT,
  transmission          TEXT,
  drivetrain            TEXT,
  fuel_type             TEXT,

  -- Colors
  color_exterior        TEXT,
  color_interior        TEXT,

  -- Mileage & Condition
  odometer_acquisition  INTEGER NOT NULL CHECK (odometer_acquisition >= 0),
  odometer_current      INTEGER,
  condition_grade       TEXT CHECK (condition_grade IN ('excellent','good','fair','poor')),

  -- Financials
  cost_basis            NUMERIC(10,2) NOT NULL DEFAULT 0.00,  -- Total dealer cost
  recon_cost            NUMERIC(10,2) DEFAULT 0.00,
  pack_amount           NUMERIC(10,2) DEFAULT 0.00,
  list_price            NUMERIC(10,2),
  floor_plan_lender     TEXT,
  floor_plan_rate       NUMERIC(5,4),

  -- Status & Compliance
  status                TEXT NOT NULL DEFAULT 'acquired'
                          CHECK (status IN ('acquired','recon','frontline','sold','wholesale','pending_title')),
  frontline_ready       BOOLEAN DEFAULT FALSE,
  frontline_ready_date  DATE,

  -- NC Compliance Flags
  damage_flag           BOOLEAN DEFAULT FALSE, -- Triggers MVR-181
  damage_description    TEXT,
  flood_salvage_flag    BOOLEAN DEFAULT FALSE,
  branded_title_type    TEXT,            -- salvage/flood/rebuilt/lemon
  airbag_deployed       BOOLEAN DEFAULT FALSE,
  prior_accident        BOOLEAN DEFAULT FALSE,
  prior_accident_desc   TEXT,
  odometer_actual       BOOLEAN DEFAULT TRUE, -- FALSE = not actual / exceeds
  title_in_hand         BOOLEAN DEFAULT FALSE,
  title_number          TEXT,
  title_state           CHAR(2) DEFAULT 'NC',

  -- Acquisition
  acquired_from         TEXT,
  acquisition_type      TEXT CHECK (acquisition_type IN ('auction','trade','purchase','consignment','other')),
  acquired_date         DATE,

  -- Metadata
  notes                 TEXT,
  created_by            UUID REFERENCES users(id),
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(dealer_id, vin)
);

-- Vehicle photos
CREATE TABLE vehicle_photos (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id            UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  dealer_id             UUID NOT NULL REFERENCES dealers(id),
  storage_path          TEXT NOT NULL,   -- Supabase Storage path
  public_url            TEXT,
  position              SMALLINT DEFAULT 0,
  is_primary            BOOLEAN DEFAULT FALSE,
  uploaded_at           TIMESTAMPTZ DEFAULT NOW()
);

-- Vehicle recon checklist
CREATE TABLE vehicle_recon_items (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id            UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  dealer_id             UUID NOT NULL REFERENCES dealers(id),
  category              TEXT NOT NULL,  -- mechanical/cosmetic/safety/detail
  item_name             TEXT NOT NULL,
  status                TEXT DEFAULT 'pending' CHECK (status IN ('pending','in_progress','complete','waived')),
  cost                  NUMERIC(8,2) DEFAULT 0.00,
  vendor                TEXT,
  completed_by          UUID REFERENCES users(id),
  completed_at          TIMESTAMPTZ,
  notes                 TEXT
);

-- ============================================================
-- CUSTOMERS
-- ============================================================
CREATE TABLE customers (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dealer_id             UUID NOT NULL REFERENCES dealers(id) ON DELETE CASCADE,

  -- Identity
  first_name            TEXT NOT NULL,
  last_name             TEXT NOT NULL,
  middle_name           TEXT,
  customer_type         TEXT DEFAULT 'individual' CHECK (customer_type IN ('individual','business')),
  business_name         TEXT,           -- If business buyer

  -- Address
  address_line1         TEXT,
  address_line2         TEXT,
  city                  TEXT,
  state                 CHAR(2) DEFAULT 'NC',
  zip                   TEXT,

  -- Contact
  phone_primary         TEXT,
  phone_secondary       TEXT,
  email                 TEXT,

  -- ID (encrypted via pgcrypto in application layer)
  drivers_license_num   TEXT,           -- Store encrypted in app
  dl_state              CHAR(2),
  dl_expiration         DATE,
  date_of_birth         DATE,           -- Encrypted
  ssn_last4             TEXT,           -- Last 4 only, for identity confirm

  -- Metadata
  source                TEXT,           -- walk-in/web/referral/repeat
  assigned_to           UUID REFERENCES users(id),
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- LEADS (CRM Pipeline)
-- ============================================================
CREATE TABLE leads (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dealer_id             UUID NOT NULL REFERENCES dealers(id) ON DELETE CASCADE,
  customer_id           UUID REFERENCES customers(id),

  -- Lead Info
  source                TEXT NOT NULL CHECK (source IN ('web','walk_in','phone','referral','repeat','carfax','autotrader','cars_com','facebook','other')),
  vehicle_interest_text TEXT,
  vehicle_id            UUID REFERENCES vehicles(id),
  budget_min            NUMERIC(10,2),
  budget_max            NUMERIC(10,2),

  -- Pipeline
  stage                 TEXT NOT NULL DEFAULT 'new'
                          CHECK (stage IN ('new','contacted','appointment','demo','offer','negotiation','won','lost','dead')),
  lost_reason           TEXT,
  priority              TEXT DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),

  -- Assignment
  assigned_to           UUID REFERENCES users(id),

  -- Follow-up
  next_followup_at      TIMESTAMPTZ,
  last_contact_at       TIMESTAMPTZ,
  follow_up_count       INTEGER DEFAULT 0,

  -- Converted
  converted_deal_id     UUID,           -- Set when lead → deal
  converted_at          TIMESTAMPTZ,

  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Lead activity log
CREATE TABLE lead_activities (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id               UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  dealer_id             UUID NOT NULL REFERENCES dealers(id),
  user_id               UUID REFERENCES users(id),
  activity_type         TEXT NOT NULL CHECK (activity_type IN ('call','email','sms','walk_in','demo','note','stage_change','followup_scheduled')),
  subject               TEXT,
  body                  TEXT,
  outcome               TEXT,
  logged_at             TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DEALS (The core transaction record)
-- ============================================================
CREATE TABLE deals (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_number           TEXT UNIQUE,    -- Auto-generated e.g. DL-2024-0001
  dealer_id             UUID NOT NULL REFERENCES dealers(id) ON DELETE CASCADE,
  vehicle_id            UUID NOT NULL REFERENCES vehicles(id),
  buyer_id              UUID NOT NULL REFERENCES customers(id),
  lead_id               UUID REFERENCES leads(id),
  salesperson_id        UUID REFERENCES users(id),
  fi_manager_id         UUID REFERENCES users(id),

  -- Sale Details
  sale_type             TEXT NOT NULL DEFAULT 'retail'
                          CHECK (sale_type IN ('retail','wholesale','buy_here_pay_here')),
  sale_date             DATE NOT NULL DEFAULT CURRENT_DATE,
  delivery_date         DATE,

  -- Pricing (19A NCAC 03D .0228 compliant)
  sale_price            NUMERIC(10,2) NOT NULL,
  doc_fee               NUMERIC(8,2) DEFAULT 0.00 CHECK (doc_fee <= 599.00),
  dealer_conveyance_fee NUMERIC(8,2) DEFAULT 0.00,
  inspection_fee        NUMERIC(8,2) DEFAULT 0.00,
  registration_fee      NUMERIC(8,2) DEFAULT 0.00,
  title_fee             NUMERIC(8,2) DEFAULT 58.00, -- NC title fee

  -- NC Highway-Use Tax (N.C.G.S. §105-187.3)
  -- 3% of adjusted selling price, capped at $2,000
  hut_basis             NUMERIC(10,2), -- Sale price minus trade allowance
  hut_rate              NUMERIC(4,3) DEFAULT 0.030,
  hut_amount            NUMERIC(8,2),  -- Auto-calculated, max $2,000
  hut_capped            BOOLEAN DEFAULT FALSE,

  -- F&I Products
  extended_warranty_amount NUMERIC(8,2) DEFAULT 0.00,
  gap_insurance_amount  NUMERIC(8,2) DEFAULT 0.00,
  credit_life_amount    NUMERIC(8,2) DEFAULT 0.00,
  credit_disability_amount NUMERIC(8,2) DEFAULT 0.00,
  tire_wheel_amount     NUMERIC(8,2) DEFAULT 0.00,

  -- Trade-In Summary (detail in trade_ins table)
  has_trade_in          BOOLEAN DEFAULT FALSE,
  trade_allowance       NUMERIC(10,2) DEFAULT 0.00,
  trade_payoff          NUMERIC(10,2) DEFAULT 0.00,
  net_trade             NUMERIC(10,2) GENERATED ALWAYS AS (trade_allowance - trade_payoff) STORED,

  -- Payment
  cash_down             NUMERIC(10,2) DEFAULT 0.00,
  rebates               NUMERIC(8,2) DEFAULT 0.00,
  amount_financed       NUMERIC(10,2), -- Calculated
  payment_type          TEXT NOT NULL DEFAULT 'cash'
                          CHECK (payment_type IN ('cash','finance','lease','buy_here_pay_here')),

  -- Totals
  total_fees            NUMERIC(10,2), -- Sum of all fees
  total_amount_due      NUMERIC(10,2), -- Grand total
  total_of_payments     NUMERIC(10,2), -- Finance: principal + interest

  -- Status
  status                TEXT NOT NULL DEFAULT 'pencil'
                          CHECK (status IN ('pencil','pending','funded','cancelled','unwound')),
  funded_at             TIMESTAMPTZ,
  cancelled_reason      TEXT,

  -- NC Title Filing
  title_filing_due      DATE GENERATED ALWAYS AS (sale_date + INTERVAL '28 days') STORED,
  title_filed_at        DATE,
  temp_tag_issued       BOOLEAN DEFAULT FALSE,
  temp_tag_expiry       DATE GENERATED ALWAYS AS (sale_date + INTERVAL '30 days') STORED,

  -- FTC Buyers Guide
  warranty_type         TEXT NOT NULL DEFAULT 'as_is'
                          CHECK (warranty_type IN ('as_is','full_warranty','limited_warranty')),
  warranty_details      TEXT,

  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Deal fees (itemized line items per 19A NCAC 03D .0228)
CREATE TABLE deal_fees (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id               UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  dealer_id             UUID NOT NULL REFERENCES dealers(id),
  fee_name              TEXT NOT NULL,
  fee_amount            NUMERIC(8,2) NOT NULL,
  fee_type              TEXT CHECK (fee_type IN ('government','dealer','fi_product','other')),
  taxable               BOOLEAN DEFAULT FALSE,
  sort_order            SMALLINT DEFAULT 0
);

-- ============================================================
-- TRADE-INS
-- ============================================================
CREATE TABLE trade_ins (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id               UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  dealer_id             UUID NOT NULL REFERENCES dealers(id),

  -- Vehicle Identity (for MVR-180 odometer disclosure on trade)
  vin                   CHAR(17) NOT NULL,
  year                  SMALLINT,
  make                  TEXT,
  model                 TEXT,
  trim                  TEXT,
  color                 TEXT,

  -- Mileage
  odometer_in           INTEGER NOT NULL,
  odometer_actual       BOOLEAN DEFAULT TRUE,

  -- NC Title Info
  title_number          TEXT,
  title_state           CHAR(2) DEFAULT 'NC',
  lien_holder           TEXT,

  -- Valuation
  acv                   NUMERIC(10,2),  -- Actual Cash Value
  allowance             NUMERIC(10,2) NOT NULL,
  payoff_amount         NUMERIC(10,2) DEFAULT 0.00,
  payoff_lender         TEXT,
  payoff_good_through   DATE,

  -- Condition
  condition_grade       TEXT,
  damage_notes          TEXT,

  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- FINANCING
-- ============================================================
CREATE TABLE financing (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id               UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  dealer_id             UUID NOT NULL REFERENCES dealers(id),

  lender_name           TEXT NOT NULL,
  lender_code           TEXT,

  -- Terms
  apr                   NUMERIC(6,4) NOT NULL,      -- e.g. 0.0699 = 6.99%
  term_months           SMALLINT NOT NULL,
  amount_financed       NUMERIC(10,2) NOT NULL,
  monthly_payment       NUMERIC(8,2) NOT NULL,
  first_payment_date    DATE,
  final_payment_date    DATE,
  finance_charge        NUMERIC(10,2),              -- Total interest
  total_of_payments     NUMERIC(10,2),

  -- Dealer Back-End
  dealer_reserve        NUMERIC(8,2) DEFAULT 0.00,
  reserve_rate          NUMERIC(5,4),
  buy_rate              NUMERIC(5,4),
  sell_rate             NUMERIC(5,4),

  -- Status
  status                TEXT DEFAULT 'pending'
                          CHECK (status IN ('pending','approved','funded','declined','unwound')),
  approval_number       TEXT,
  funded_at             TIMESTAMPTZ,
  conditions            TEXT,

  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- NC DMV FORMS (Document tracking)
-- ============================================================
CREATE TABLE nc_forms (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id               UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  dealer_id             UUID NOT NULL REFERENCES dealers(id),

  form_type             TEXT NOT NULL
                          CHECK (form_type IN ('mvr1','mvr180','mvr181','mvr2','ftc_buyers_guide','bill_of_sale','buyer_order')),

  -- Generation
  generated_at          TIMESTAMPTZ,
  generated_by          UUID REFERENCES users(id),
  pdf_storage_path      TEXT,           -- Supabase Storage
  pdf_public_url        TEXT,

  -- Signing
  signed_at             TIMESTAMPTZ,
  signed_by_buyer       BOOLEAN DEFAULT FALSE,
  signed_by_seller      BOOLEAN DEFAULT FALSE,
  esign_provider        TEXT,           -- docusign/notarize/wet
  esign_envelope_id     TEXT,

  -- Notarization (MVR-1 only)
  requires_notary       BOOLEAN DEFAULT FALSE,
  notarized_at          TIMESTAMPTZ,
  notary_name           TEXT,
  notary_commission_exp DATE,
  notary_county         TEXT,
  ron_session_id        TEXT,           -- Remote Online Notarization

  -- DMV Filing
  submitted_to_dmv      BOOLEAN DEFAULT FALSE,
  dmv_submitted_at      DATE,
  dmv_confirmation      TEXT,

  -- Immutable snapshot of deal data at time of generation
  data_snapshot         JSONB NOT NULL DEFAULT '{}',

  status                TEXT DEFAULT 'draft'
                          CHECK (status IN ('draft','generated','signed','notarized','filed','void')),

  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ACCOUNTING LEDGER
-- ============================================================
CREATE TABLE ledger_entries (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dealer_id             UUID NOT NULL REFERENCES dealers(id) ON DELETE CASCADE,
  deal_id               UUID REFERENCES deals(id),
  vehicle_id            UUID REFERENCES vehicles(id),

  entry_date            DATE NOT NULL DEFAULT CURRENT_DATE,
  entry_type            TEXT NOT NULL CHECK (entry_type IN ('debit','credit')),
  account_code          TEXT NOT NULL,  -- e.g. 4000-SALES-RETAIL
  account_name          TEXT NOT NULL,
  description           TEXT NOT NULL,
  amount                NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  reference_number      TEXT,
  source                TEXT CHECK (source IN ('deal','purchase','expense','adjustment','floor_plan','payoff','hut')),

  posted_by             UUID REFERENCES users(id),
  posted_at             TIMESTAMPTZ DEFAULT NOW(),
  is_reconciled         BOOLEAN DEFAULT FALSE,
  reconciled_at         TIMESTAMPTZ,

  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DEAL NUMBER SEQUENCE
-- ============================================================
CREATE SEQUENCE deal_number_seq START 1000;

CREATE OR REPLACE FUNCTION generate_deal_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.deal_number := 'DL-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(NEXTVAL('deal_number_seq')::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_deal_number
  BEFORE INSERT ON deals
  FOR EACH ROW
  WHEN (NEW.deal_number IS NULL)
  EXECUTE FUNCTION generate_deal_number();

-- ============================================================
-- HUT AUTO-CALCULATION TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION calculate_hut()
RETURNS TRIGGER AS $$
DECLARE
  basis NUMERIC(10,2);
  raw_hut NUMERIC(10,2);
BEGIN
  -- HUT basis = sale price minus trade-in allowance (N.C.G.S. §105-187.3)
  basis := COALESCE(NEW.sale_price, 0) - COALESCE(NEW.trade_allowance, 0);
  basis := GREATEST(basis, 0);

  -- 3% rate
  raw_hut := ROUND(basis * 0.030, 2);

  -- Cap at $2,000
  IF raw_hut > 2000.00 THEN
    NEW.hut_amount := 2000.00;
    NEW.hut_capped := TRUE;
  ELSE
    NEW.hut_amount := raw_hut;
    NEW.hut_capped := FALSE;
  END IF;

  NEW.hut_basis := basis;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_calculate_hut
  BEFORE INSERT OR UPDATE OF sale_price, trade_allowance ON deals
  FOR EACH ROW
  EXECUTE FUNCTION calculate_hut();

-- ============================================================
-- UPDATED_AT AUTO-TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_dealers_updated_at    BEFORE UPDATE ON dealers    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_users_updated_at      BEFORE UPDATE ON users      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_vehicles_updated_at   BEFORE UPDATE ON vehicles   FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_customers_updated_at  BEFORE UPDATE ON customers  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_leads_updated_at      BEFORE UPDATE ON leads      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_deals_updated_at      BEFORE UPDATE ON deals      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_financing_updated_at  BEFORE UPDATE ON financing  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_nc_forms_updated_at   BEFORE UPDATE ON nc_forms   FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_vehicles_dealer     ON vehicles(dealer_id);
CREATE INDEX idx_vehicles_vin        ON vehicles(vin);
CREATE INDEX idx_vehicles_status     ON vehicles(dealer_id, status);
CREATE INDEX idx_customers_dealer    ON customers(dealer_id);
CREATE INDEX idx_customers_name      ON customers(dealer_id, last_name, first_name);
CREATE INDEX idx_deals_dealer        ON deals(dealer_id);
CREATE INDEX idx_deals_vehicle       ON deals(vehicle_id);
CREATE INDEX idx_deals_buyer         ON deals(buyer_id);
CREATE INDEX idx_deals_status        ON deals(dealer_id, status);
CREATE INDEX idx_deals_sale_date     ON deals(dealer_id, sale_date);
CREATE INDEX idx_leads_dealer        ON leads(dealer_id);
CREATE INDEX idx_leads_stage         ON leads(dealer_id, stage);
CREATE INDEX idx_leads_followup      ON leads(next_followup_at) WHERE next_followup_at IS NOT NULL;
CREATE INDEX idx_nc_forms_deal       ON nc_forms(deal_id);
CREATE INDEX idx_nc_forms_type       ON nc_forms(dealer_id, form_type);
CREATE INDEX idx_ledger_dealer       ON ledger_entries(dealer_id);
CREATE INDEX idx_ledger_deal         ON ledger_entries(deal_id);
CREATE INDEX idx_ledger_date         ON ledger_entries(dealer_id, entry_date);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE dealers            ENABLE ROW LEVEL SECURITY;
ALTER TABLE users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_photos     ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_recon_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads              ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_activities    ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals              ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_fees          ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_ins          ENABLE ROW LEVEL SECURITY;
ALTER TABLE financing          ENABLE ROW LEVEL SECURITY;
ALTER TABLE nc_forms           ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries     ENABLE ROW LEVEL SECURITY;

-- Helper: get current user's dealer_id
CREATE OR REPLACE FUNCTION auth_dealer_id() RETURNS UUID AS $$
  SELECT dealer_id FROM users WHERE auth_user_id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- RLS Policies — dealer-scoped (users only see their dealer's data)
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'vehicles','vehicle_photos','vehicle_recon_items',
    'customers','leads','lead_activities',
    'deals','deal_fees','trade_ins','financing',
    'nc_forms','ledger_entries'
  ] LOOP
    EXECUTE FORMAT(
      'CREATE POLICY %I_dealer_isolation ON %I
       USING (dealer_id = auth_dealer_id())
       WITH CHECK (dealer_id = auth_dealer_id())',
      tbl || '_policy', tbl
    );
  END LOOP;
END;
$$;

-- Users can read their own dealer record
CREATE POLICY dealers_read_own ON dealers
  FOR SELECT USING (id = auth_dealer_id());

-- Users can read/update their own user record
CREATE POLICY users_own_record ON users
  FOR ALL USING (
    dealer_id = auth_dealer_id()
    OR auth_user_id = auth.uid()
  );

-- ============================================================
-- SEED: Default chart of accounts codes
-- ============================================================
CREATE TABLE chart_of_accounts (
  code          TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  account_type  TEXT NOT NULL CHECK (account_type IN ('asset','liability','equity','revenue','expense')),
  category      TEXT,
  active        BOOLEAN DEFAULT TRUE
);

INSERT INTO chart_of_accounts (code, name, account_type, category) VALUES
  ('1000', 'Cash - Operating',                     'asset',     'cash'),
  ('1100', 'Accounts Receivable',                  'asset',     'receivable'),
  ('1200', 'Vehicle Inventory',                    'asset',     'inventory'),
  ('1300', 'Parts Inventory',                      'asset',     'inventory'),
  ('1400', 'Prepaid Expenses',                     'asset',     'prepaid'),
  ('2000', 'Accounts Payable',                     'liability', 'payable'),
  ('2100', 'Floor Plan Payable',                   'liability', 'floor_plan'),
  ('2200', 'HUT Payable - NCDOR',                  'liability', 'tax'),
  ('2300', 'Sales Tax Payable',                    'liability', 'tax'),
  ('2400', 'Customer Deposits',                    'liability', 'deposits'),
  ('3000', 'Owner Equity',                         'equity',    'equity'),
  ('4000', 'Used Vehicle Sales - Retail',          'revenue',   'sales'),
  ('4100', 'Used Vehicle Sales - Wholesale',       'revenue',   'sales'),
  ('4200', 'F&I Revenue',                          'revenue',   'fi'),
  ('4300', 'Doc Fee Revenue',                      'revenue',   'fees'),
  ('4400', 'Service Revenue',                      'revenue',   'service'),
  ('5000', 'Cost of Used Vehicles - Retail',       'expense',   'cost_of_sales'),
  ('5100', 'Cost of Used Vehicles - Wholesale',    'expense',   'cost_of_sales'),
  ('5200', 'Recon Expense',                        'expense',   'cost_of_sales'),
  ('5300', 'Floor Plan Interest',                  'expense',   'interest'),
  ('6000', 'Salesperson Commission',               'expense',   'payroll'),
  ('6100', 'Advertising',                          'expense',   'marketing'),
  ('6200', 'Dealer Supplies',                      'expense',   'operations'),
  ('6300', 'Professional Fees',                    'expense',   'operations');

-- ============================================================
-- VIEW: Deal summary (for Quick-Close dashboard)
-- ============================================================
CREATE OR REPLACE VIEW v_deal_summary AS
SELECT
  d.id,
  d.deal_number,
  d.dealer_id,
  d.sale_date,
  d.status,
  d.payment_type,
  d.warranty_type,
  d.sale_price,
  d.hut_amount,
  d.hut_capped,
  d.doc_fee,
  d.trade_allowance,
  d.cash_down,
  d.amount_financed,
  d.total_amount_due,
  d.title_filing_due,
  d.title_filed_at,
  d.temp_tag_expiry,
  -- Vehicle
  v.vin,
  v.year,
  v.make,
  v.model,
  v.trim,
  v.color_exterior,
  v.odometer_acquisition AS odometer,
  v.damage_flag,
  v.flood_salvage_flag,
  -- Buyer
  c.first_name || ' ' || c.last_name AS buyer_name,
  c.email AS buyer_email,
  c.phone_primary AS buyer_phone,
  c.address_line1,
  c.city,
  c.state,
  c.zip,
  -- Forms status (as JSON array of completed forms)
  (
    SELECT JSON_AGG(JSON_BUILD_OBJECT('form_type', f.form_type, 'status', f.status))
    FROM nc_forms f
    WHERE f.deal_id = d.id
  ) AS forms,
  -- Days until title deadline
  (d.sale_date + INTERVAL '28 days')::DATE - CURRENT_DATE AS title_days_remaining,
  -- Temp tag status
  CURRENT_DATE <= d.temp_tag_expiry AS temp_tag_valid
FROM deals d
JOIN vehicles v ON d.vehicle_id = v.id
JOIN customers c ON d.buyer_id = c.id;

-- ============================================================
-- VIEW: Inventory summary (for frontline / aging)
-- ============================================================
CREATE OR REPLACE VIEW v_inventory_summary AS
SELECT
  v.*,
  CURRENT_DATE - v.acquired_date::DATE AS days_in_inventory,
  CASE
    WHEN CURRENT_DATE - v.acquired_date::DATE > 90 THEN 'aged'
    WHEN CURRENT_DATE - v.acquired_date::DATE > 60 THEN 'watch'
    ELSE 'fresh'
  END AS age_status,
  (v.list_price - v.cost_basis - v.recon_cost - v.pack_amount) AS gross_potential
FROM vehicles v
WHERE v.status != 'sold';

COMMENT ON TABLE deals IS 'Core transaction. NC title clock starts at sale_date. HUT auto-calculated via trigger.';
COMMENT ON COLUMN deals.hut_amount IS 'NC Highway-Use Tax: 3% of (sale_price - trade_allowance), max $2,000. N.C.G.S. §105-187.3';
COMMENT ON COLUMN deals.title_filing_due IS 'NC GS §20-75: Title must be filed within 28 days of sale.';
COMMENT ON COLUMN deals.temp_tag_expiry IS '30-day temporary registration plate limit.';
COMMENT ON COLUMN vehicles.damage_flag IS 'When TRUE, MVR-181 Damage Disclosure is required.';

