-- UFIP PostgreSQL relational schema
-- Step 3: users, farms, plots, activities, expenses, harvests, sales

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(180) NOT NULL UNIQUE,
  phone VARCHAR(30),
  password_hash TEXT NOT NULL,
  role VARCHAR(30) NOT NULL DEFAULT 'farmer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT users_email_format_chk CHECK (POSITION('@' IN email) > 1)
);

CREATE TABLE IF NOT EXISTS farms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  location VARCHAR(180) NOT NULL,
  country VARCHAR(120),
  county VARCHAR(120),
  location_latitude NUMERIC(10,7),
  location_longitude NUMERIC(10,7),
  location_accuracy_meters NUMERIC(10,2),
  location_source VARCHAR(80),
  acreage_hectares NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT farms_acreage_non_negative_chk CHECK (acreage_hectares >= 0)
);

CREATE TABLE IF NOT EXISTS plots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  crop VARCHAR(120),
  season VARCHAR(60),
  area_hectares NUMERIC(10,2) NOT NULL,
  soil_type VARCHAR(80),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT plots_area_positive_chk CHECK (area_hectares > 0),
  CONSTRAINT plots_unique_name_per_farm UNIQUE (farm_id, name)
);

CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  plot_id UUID REFERENCES plots(id) ON DELETE SET NULL,
  activity_type VARCHAR(30) NOT NULL,
  activity_date DATE NOT NULL,
  cost_kes NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT activities_type_chk CHECK (activity_type IN ('planting', 'spraying', 'harvesting')),
  CONSTRAINT activities_cost_non_negative_chk CHECK (cost_kes >= 0)
);

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  plot_id UUID REFERENCES plots(id) ON DELETE SET NULL,
  category VARCHAR(100) NOT NULL,
  amount_kes NUMERIC(12,2) NOT NULL,
  expense_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT expenses_amount_positive_chk CHECK (amount_kes > 0)
);

CREATE TABLE IF NOT EXISTS harvests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  plot_id UUID REFERENCES plots(id) ON DELETE SET NULL,
  crop VARCHAR(120) NOT NULL,
  quantity_kg NUMERIC(12,2) NOT NULL,
  harvest_date DATE NOT NULL,
  quality_grade VARCHAR(10),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT harvests_quantity_positive_chk CHECK (quantity_kg > 0)
);

CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  harvest_id UUID REFERENCES harvests(id) ON DELETE SET NULL,
  buyer_name VARCHAR(140) NOT NULL,
  quantity_kg NUMERIC(12,2) NOT NULL,
  unit_price_kes NUMERIC(12,2) NOT NULL,
  sale_date DATE NOT NULL,
  payment_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT sales_quantity_positive_chk CHECK (quantity_kg > 0),
  CONSTRAINT sales_unit_price_positive_chk CHECK (unit_price_kes > 0),
  CONSTRAINT sales_payment_status_chk CHECK (payment_status IN ('pending', 'paid', 'partial'))
);

CREATE INDEX IF NOT EXISTS idx_farms_user_id ON farms(user_id);
CREATE INDEX IF NOT EXISTS idx_plots_farm_id ON plots(farm_id);
CREATE INDEX IF NOT EXISTS idx_activities_farm_id_date ON activities(farm_id, activity_date);
CREATE INDEX IF NOT EXISTS idx_expenses_farm_id_date ON expenses(farm_id, expense_date);
CREATE INDEX IF NOT EXISTS idx_harvests_farm_id_date ON harvests(farm_id, harvest_date);
CREATE INDEX IF NOT EXISTS idx_sales_farm_id_date ON sales(farm_id, sale_date);

CREATE TABLE IF NOT EXISTS marketplace_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  crop VARCHAR(120) NOT NULL,
  quantity_kg NUMERIC(12,2) NOT NULL,
  price_per_kg_kes NUMERIC(12,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT marketplace_listings_quantity_positive_chk CHECK (quantity_kg > 0),
  CONSTRAINT marketplace_listings_price_positive_chk CHECK (price_per_kg_kes > 0),
  CONSTRAINT marketplace_listings_status_chk CHECK (status IN ('active', 'sold', 'cancelled'))
);

CREATE TABLE IF NOT EXISTS marketplace_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
  buyer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quantity_kg NUMERIC(12,2) NOT NULL,
  offered_price_per_kg_kes NUMERIC(12,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT marketplace_orders_quantity_positive_chk CHECK (quantity_kg > 0),
  CONSTRAINT marketplace_orders_price_positive_chk CHECK (offered_price_per_kg_kes > 0),
  CONSTRAINT marketplace_orders_status_chk CHECK (status IN ('pending', 'confirmed', 'rejected', 'completed'))
);

CREATE INDEX IF NOT EXISTS idx_marketplace_listings_farm_id ON marketplace_listings(farm_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_orders_listing_id ON marketplace_orders(listing_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_orders_buyer_user_id ON marketplace_orders(buyer_user_id);

CREATE TABLE IF NOT EXISTS loan_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  amount_kes NUMERIC(14,2) NOT NULL,
  duration_months INTEGER NOT NULL,
  purpose VARCHAR(300) NOT NULL,
  credit_score_snapshot INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  reviewer_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT loan_amount_min_chk CHECK (amount_kes >= 1000),
  CONSTRAINT loan_duration_range_chk CHECK (duration_months BETWEEN 1 AND 60),
  CONSTRAINT loan_credit_score_chk CHECK (credit_score_snapshot BETWEEN 0 AND 100),
  CONSTRAINT loan_status_chk CHECK (status IN ('pending', 'approved', 'rejected'))
);

CREATE INDEX IF NOT EXISTS idx_loan_applications_user_id ON loan_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_loan_applications_farm_id ON loan_applications(farm_id);
CREATE INDEX IF NOT EXISTS idx_loan_applications_status ON loan_applications(status);

CREATE TABLE IF NOT EXISTS carbon_practices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  practice_type VARCHAR(30) NOT NULL,
  value NUMERIC(12,2) NOT NULL,
  unit VARCHAR(20) NOT NULL,
  recorded_at DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT carbon_practice_type_chk CHECK (practice_type IN ('no_till', 'tree_planting', 'organic_farming')),
  CONSTRAINT carbon_practice_value_positive_chk CHECK (value > 0)
);

CREATE TABLE IF NOT EXISTS carbon_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  certificate_code VARCHAR(60) NOT NULL UNIQUE,
  total_credits NUMERIC(12,3) NOT NULL,
  earning_kes NUMERIC(14,2) NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status VARCHAR(20) NOT NULL DEFAULT 'issued',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT carbon_certificate_credits_non_negative_chk CHECK (total_credits >= 0),
  CONSTRAINT carbon_certificate_earning_non_negative_chk CHECK (earning_kes >= 0),
  CONSTRAINT carbon_certificate_status_chk CHECK (status IN ('issued', 'revoked'))
);

CREATE INDEX IF NOT EXISTS idx_carbon_practices_farm_id ON carbon_practices(farm_id);
CREATE INDEX IF NOT EXISTS idx_carbon_practices_recorded_at ON carbon_practices(recorded_at);
CREATE INDEX IF NOT EXISTS idx_carbon_certificates_user_id ON carbon_certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_carbon_certificates_farm_id ON carbon_certificates(farm_id);

CREATE TABLE IF NOT EXISTS traceability_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  harvest_id UUID REFERENCES harvests(id) ON DELETE SET NULL,
  batch_code VARCHAR(60) NOT NULL UNIQUE,
  crop VARCHAR(120) NOT NULL,
  quantity_kg NUMERIC(12,2) NOT NULL,
  produced_at DATE NOT NULL,
  metadata JSONB,
  data_hash VARCHAR(128) NOT NULL,
  ipfs_cid VARCHAR(160),
  ipfs_url TEXT,
  polygon_tx_hash VARCHAR(130),
  qr_code_data_url TEXT NOT NULL,
  verification_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT traceability_quantity_positive_chk CHECK (quantity_kg > 0),
  CONSTRAINT traceability_status_chk CHECK (verification_status IN ('pending', 'anchored', 'simulated'))
);

CREATE INDEX IF NOT EXISTS idx_traceability_batches_farm_id ON traceability_batches(farm_id);
CREATE INDEX IF NOT EXISTS idx_traceability_batches_harvest_id ON traceability_batches(harvest_id);
CREATE INDEX IF NOT EXISTS idx_traceability_batches_code ON traceability_batches(batch_code);

CREATE TABLE IF NOT EXISTS farm_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  productivity INTEGER NOT NULL,
  sustainability INTEGER NOT NULL,
  reliability INTEGER NOT NULL,
  overall INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT farm_score_productivity_chk CHECK (productivity BETWEEN 0 AND 100),
  CONSTRAINT farm_score_sustainability_chk CHECK (sustainability BETWEEN 0 AND 100),
  CONSTRAINT farm_score_reliability_chk CHECK (reliability BETWEEN 0 AND 100),
  CONSTRAINT farm_score_overall_chk CHECK (overall BETWEEN 0 AND 100)
);

CREATE INDEX IF NOT EXISTS idx_farm_scores_farm_id ON farm_scores(farm_id);

CREATE TABLE IF NOT EXISTS enterprise_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(80) NOT NULL,
  subtype VARCHAR(120) NOT NULL,
  name VARCHAR(160) NOT NULL,
  lifecycle_stages JSONB NOT NULL DEFAULT '[]'::jsonb,
  default_calendar JSONB NOT NULL DEFAULT '[]'::jsonb,
  required_inputs JSONB NOT NULL DEFAULT '[]'::jsonb,
  expected_outputs JSONB NOT NULL DEFAULT '[]'::jsonb,
  kpis JSONB NOT NULL DEFAULT '[]'::jsonb,
  ai_rules JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT enterprise_templates_unique_type_subtype UNIQUE (type, subtype)
);

CREATE TABLE IF NOT EXISTS enterprises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  template_id UUID REFERENCES enterprise_templates(id) ON DELETE SET NULL,
  name VARCHAR(140) NOT NULL,
  type VARCHAR(80) NOT NULL,
  subtype VARCHAR(120) NOT NULL,
  start_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  scale_units NUMERIC(14,2) NOT NULL DEFAULT 1,
  scale_unit_label VARCHAR(40) NOT NULL DEFAULT 'units',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT enterprise_status_chk CHECK (status IN ('active', 'paused', 'completed'))
);

CREATE TABLE IF NOT EXISTS enterprise_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  activity_type VARCHAR(120) NOT NULL,
  scheduled_date DATE NOT NULL,
  completed_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT enterprise_activity_status_chk CHECK (status IN ('scheduled', 'completed', 'skipped', 'overdue'))
);

CREATE TABLE IF NOT EXISTS enterprise_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  resource_type VARCHAR(80) NOT NULL,
  quantity NUMERIC(14,3) NOT NULL DEFAULT 0,
  cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  recorded_at DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS enterprise_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  output_type VARCHAR(80) NOT NULL,
  quantity NUMERIC(14,3) NOT NULL DEFAULT 0,
  revenue NUMERIC(14,2) NOT NULL DEFAULT 0,
  recorded_at DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS enterprise_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  buyer_name VARCHAR(140) NOT NULL,
  output_type VARCHAR(80) NOT NULL,
  quantity NUMERIC(14,3) NOT NULL,
  unit_price_kes NUMERIC(14,2) NOT NULL,
  delivery_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  settlement_reference VARCHAR(120),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT enterprise_contract_status_chk CHECK (status IN ('draft', 'active', 'delivered', 'paid', 'disputed'))
);

CREATE INDEX IF NOT EXISTS idx_enterprises_farm_id ON enterprises(farm_id);
CREATE INDEX IF NOT EXISTS idx_enterprise_activities_enterprise_id_date ON enterprise_activities(enterprise_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_enterprise_resources_enterprise_id ON enterprise_resources(enterprise_id);
CREATE INDEX IF NOT EXISTS idx_enterprise_outputs_enterprise_id ON enterprise_outputs(enterprise_id);
CREATE INDEX IF NOT EXISTS idx_enterprise_contracts_enterprise_id ON enterprise_contracts(enterprise_id);
