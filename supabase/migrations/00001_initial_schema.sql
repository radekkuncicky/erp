-- NANTO ERP - Initial Database Schema
-- All tables, enums, triggers, indexes, and RLS policies

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE user_role AS ENUM ('admin', 'projektovy_manazer', 'technik');

CREATE TYPE order_status AS ENUM (
  'novy', 'potvrzeny', 'v_priprave', 'naplanovany',
  'v_realizaci', 'predano', 'vyuctovano', 'dokonceny'
);

CREATE TYPE product_unit AS ENUM ('ks', 'm', 'm2', 'hod', 'komplet');

CREATE TYPE stock_movement_type AS ENUM ('prijem', 'vydej', 'rezervace', 'vraceni');

CREATE TYPE reservation_status AS ENUM ('aktivni', 'vydano', 'zruseno');

CREATE TYPE protocol_status AS ENUM ('koncept', 'vyplneny', 'podepsany', 'schvaleny');

CREATE TYPE vyuctovani_status AS ENUM ('koncept', 'ke_schvaleni', 'schvaleno', 'zamitnuto');

CREATE TYPE document_type AS ENUM (
  'foto_pred', 'foto_v_prubehu', 'foto_po',
  'smlouva', 'faktura', 'technicka_zprava', 'ostatni'
);

-- ============================================================
-- SEQUENCES (for auto-generated numbers)
-- ============================================================
CREATE SEQUENCE order_number_seq START 1;
CREATE SEQUENCE protocol_number_seq START 1;
CREATE SEQUENCE vyuctovani_number_seq START 1;

-- ============================================================
-- TABLES
-- ============================================================

-- Profiles (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'technik',
  phone TEXT,
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Products catalog
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  raynet_id INTEGER UNIQUE,
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT,
  product_line TEXT,
  unit product_unit NOT NULL DEFAULT 'ks',
  sell_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Orders
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT NOT NULL UNIQUE,
  raynet_id TEXT UNIQUE,
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_phone TEXT,
  contact_person TEXT,
  contact_phone TEXT,
  category TEXT,
  status order_status NOT NULL DEFAULT 'novy',
  total_price_without_vat NUMERIC(12,2) NOT NULL DEFAULT 0,
  deposit_with_vat NUMERIC(12,2),
  installation_address TEXT,
  address_street TEXT,
  address_city TEXT,
  address_zip TEXT,
  project_start_date DATE,
  project_end_date DATE,
  project_manager_id UUID REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Order items
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  raynet_item_id INTEGER,
  name TEXT NOT NULL,
  description TEXT,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  cost_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  vat_rate NUMERIC(5,2) NOT NULL DEFAULT 21,
  unit product_unit NOT NULL DEFAULT 'ks',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Order-Technician assignments (M:N)
CREATE TABLE order_technicians (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  technician_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(order_id, technician_id)
);

-- Stock (one row per product)
CREATE TABLE stock (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
  on_hand NUMERIC(10,2) NOT NULL DEFAULT 0,
  reserved NUMERIC(10,2) NOT NULL DEFAULT 0,
  available NUMERIC(10,2) GENERATED ALWAYS AS (on_hand - reserved) STORED,
  min_quantity NUMERIC(10,2) NOT NULL DEFAULT 0,
  last_purchase_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  avg_purchase_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Stock movements (audit trail)
CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id),
  movement_type stock_movement_type NOT NULL,
  quantity NUMERIC(10,2) NOT NULL,
  unit_price NUMERIC(12,2),
  order_id UUID REFERENCES orders(id),
  note TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Stock reservations
CREATE TABLE stock_reservations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity NUMERIC(10,2) NOT NULL,
  status reservation_status NOT NULL DEFAULT 'aktivni',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Handover protocols
CREATE TABLE handover_protocols (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  protocol_number TEXT NOT NULL UNIQUE,
  order_id UUID NOT NULL REFERENCES orders(id),
  status protocol_status NOT NULL DEFAULT 'koncept',
  technician_id UUID NOT NULL REFERENCES profiles(id),
  client_name TEXT NOT NULL,
  handover_date DATE,
  notes TEXT,
  client_signature_url TEXT,
  technician_signature_url TEXT,
  ai_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Protocol items (checklist)
CREATE TABLE protocol_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  protocol_id UUID NOT NULL REFERENCES handover_protocols(id) ON DELETE CASCADE,
  order_item_id UUID REFERENCES order_items(id),
  name TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  is_installed BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- Vyuctovani (settlement)
CREATE TABLE vyuctovani (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vyuctovani_number TEXT NOT NULL UNIQUE,
  order_id UUID NOT NULL REFERENCES orders(id),
  protocol_id UUID REFERENCES handover_protocols(id),
  status vyuctovani_status NOT NULL DEFAULT 'koncept',
  material_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  labor_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  other_costs NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_without_vat NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_with_vat NUMERIC(12,2) NOT NULL DEFAULT 0,
  deposit_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  remaining_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  ai_summary TEXT,
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Documents (photos, PDFs, contracts)
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  document_type document_type NOT NULL DEFAULT 'ostatni',
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  description TEXT,
  gps_lat DOUBLE PRECISION,
  gps_lng DOUBLE PRECISION,
  uploaded_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Activity log
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Webhook logs
CREATE TABLE webhook_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT NOT NULL,
  raynet_id TEXT,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'received',
  error_message TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_raynet_id ON orders(raynet_id);
CREATE INDEX idx_orders_project_manager ON orders(project_manager_id);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);

CREATE INDEX idx_order_technicians_order ON order_technicians(order_id);
CREATE INDEX idx_order_technicians_tech ON order_technicians(technician_id);

CREATE INDEX idx_products_raynet_id ON products(raynet_id);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_category ON products(category);

CREATE INDEX idx_stock_product_id ON stock(product_id);

CREATE INDEX idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX idx_stock_movements_order ON stock_movements(order_id);
CREATE INDEX idx_stock_movements_created ON stock_movements(created_at DESC);

CREATE INDEX idx_stock_reservations_order ON stock_reservations(order_id);
CREATE INDEX idx_stock_reservations_product ON stock_reservations(product_id);
CREATE INDEX idx_stock_reservations_status ON stock_reservations(status);

CREATE INDEX idx_protocols_order ON handover_protocols(order_id);
CREATE INDEX idx_protocols_technician ON handover_protocols(technician_id);

CREATE INDEX idx_protocol_items_protocol ON protocol_items(protocol_id);

CREATE INDEX idx_vyuctovani_order ON vyuctovani(order_id);
CREATE INDEX idx_vyuctovani_status ON vyuctovani(status);

CREATE INDEX idx_documents_order ON documents(order_id);
CREATE INDEX idx_documents_type ON documents(document_type);

CREATE INDEX idx_activity_log_order ON activity_log(order_id);
CREATE INDEX idx_activity_log_created ON activity_log(created_at DESC);

CREATE INDEX idx_webhook_logs_raynet ON webhook_logs(raynet_id);
CREATE INDEX idx_webhook_logs_created ON webhook_logs(created_at DESC);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Generate order number: NANTO-YYYY-NNNN
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := 'NANTO-' || EXTRACT(YEAR FROM now())::TEXT || '-' ||
      LPAD(nextval('order_number_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Generate protocol number: PP-YYYY-NNNN
CREATE OR REPLACE FUNCTION generate_protocol_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.protocol_number IS NULL OR NEW.protocol_number = '' THEN
    NEW.protocol_number := 'PP-' || EXTRACT(YEAR FROM now())::TEXT || '-' ||
      LPAD(nextval('protocol_number_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Generate vyuctovani number: VY-YYYY-NNNN
CREATE OR REPLACE FUNCTION generate_vyuctovani_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.vyuctovani_number IS NULL OR NEW.vyuctovani_number = '' THEN
    NEW.vyuctovani_number := 'VY-' || EXTRACT(YEAR FROM now())::TEXT || '-' ||
      LPAD(nextval('vyuctovani_number_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-create stock row when product is created
CREATE OR REPLACE FUNCTION create_stock_for_product()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO stock (product_id) VALUES (NEW.id)
  ON CONFLICT (product_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-create profile when user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'technik')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-generate numbers
CREATE TRIGGER trg_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION generate_order_number();

CREATE TRIGGER trg_protocol_number
  BEFORE INSERT ON handover_protocols
  FOR EACH ROW EXECUTE FUNCTION generate_protocol_number();

CREATE TRIGGER trg_vyuctovani_number
  BEFORE INSERT ON vyuctovani
  FOR EACH ROW EXECUTE FUNCTION generate_vyuctovani_number();

-- Auto-update updated_at
CREATE TRIGGER trg_profiles_updated
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_orders_updated
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_products_updated
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_stock_updated
  BEFORE UPDATE ON stock
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_stock_reservations_updated
  BEFORE UPDATE ON stock_reservations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_protocols_updated
  BEFORE UPDATE ON handover_protocols
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_vyuctovani_updated
  BEFORE UPDATE ON vyuctovani
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create stock row for new products
CREATE TRIGGER trg_create_stock
  AFTER INSERT ON products
  FOR EACH ROW EXECUTE FUNCTION create_stock_for_product();

-- Auto-create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_technicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE handover_protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE protocol_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE vyuctovani ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

-- Helper function: check if user is admin or PM
CREATE OR REPLACE FUNCTION is_admin_or_pm()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'projektovy_manazer')
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: check if technician is assigned to order
CREATE OR REPLACE FUNCTION is_assigned_technician(p_order_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM order_technicians
    WHERE order_id = p_order_id
    AND technician_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PROFILES
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "profiles_admin_all" ON profiles
  FOR ALL USING (is_admin_or_pm());

-- ORDERS
CREATE POLICY "orders_admin_all" ON orders
  FOR ALL USING (is_admin_or_pm());

CREATE POLICY "orders_tech_select" ON orders
  FOR SELECT USING (is_assigned_technician(id));

-- ORDER ITEMS
CREATE POLICY "order_items_admin_all" ON order_items
  FOR ALL USING (is_admin_or_pm());

CREATE POLICY "order_items_tech_select" ON order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM order_technicians
      WHERE order_id = order_items.order_id
      AND technician_id = auth.uid()
    )
  );

-- ORDER TECHNICIANS
CREATE POLICY "order_tech_admin_all" ON order_technicians
  FOR ALL USING (is_admin_or_pm());

CREATE POLICY "order_tech_own_select" ON order_technicians
  FOR SELECT USING (technician_id = auth.uid());

-- PRODUCTS (readable by all authenticated users)
CREATE POLICY "products_select" ON products
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "products_admin_all" ON products
  FOR ALL USING (is_admin_or_pm());

-- STOCK (readable by all authenticated users)
CREATE POLICY "stock_select" ON stock
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "stock_admin_all" ON stock
  FOR ALL USING (is_admin_or_pm());

-- STOCK MOVEMENTS
CREATE POLICY "stock_movements_select" ON stock_movements
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "stock_movements_admin_insert" ON stock_movements
  FOR INSERT WITH CHECK (is_admin_or_pm());

-- STOCK RESERVATIONS
CREATE POLICY "stock_reservations_select" ON stock_reservations
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "stock_reservations_admin_all" ON stock_reservations
  FOR ALL USING (is_admin_or_pm());

-- HANDOVER PROTOCOLS
CREATE POLICY "protocols_admin_all" ON handover_protocols
  FOR ALL USING (is_admin_or_pm());

CREATE POLICY "protocols_tech_own" ON handover_protocols
  FOR ALL USING (technician_id = auth.uid());

-- PROTOCOL ITEMS
CREATE POLICY "protocol_items_admin_all" ON protocol_items
  FOR ALL USING (is_admin_or_pm());

CREATE POLICY "protocol_items_tech_select" ON protocol_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM handover_protocols
      WHERE id = protocol_items.protocol_id
      AND technician_id = auth.uid()
    )
  );

CREATE POLICY "protocol_items_tech_update" ON protocol_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM handover_protocols
      WHERE id = protocol_items.protocol_id
      AND technician_id = auth.uid()
    )
  );

-- VYUCTOVANI
CREATE POLICY "vyuctovani_admin_all" ON vyuctovani
  FOR ALL USING (is_admin_or_pm());

CREATE POLICY "vyuctovani_tech_select" ON vyuctovani
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders o
      JOIN order_technicians ot ON ot.order_id = o.id
      WHERE o.id = vyuctovani.order_id
      AND ot.technician_id = auth.uid()
    )
  );

-- DOCUMENTS
CREATE POLICY "documents_admin_all" ON documents
  FOR ALL USING (is_admin_or_pm());

CREATE POLICY "documents_tech_select" ON documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM order_technicians
      WHERE order_id = documents.order_id
      AND technician_id = auth.uid()
    )
  );

CREATE POLICY "documents_tech_insert" ON documents
  FOR INSERT WITH CHECK (
    uploaded_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM order_technicians
      WHERE order_id = documents.order_id
      AND technician_id = auth.uid()
    )
  );

-- ACTIVITY LOG
CREATE POLICY "activity_log_admin_all" ON activity_log
  FOR ALL USING (is_admin_or_pm());

CREATE POLICY "activity_log_tech_select" ON activity_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM order_technicians
      WHERE order_id = activity_log.order_id
      AND technician_id = auth.uid()
    )
  );

-- WEBHOOK LOGS (admin only)
CREATE POLICY "webhook_logs_admin_all" ON webhook_logs
  FOR ALL USING (is_admin_or_pm());

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES
  ('photos', 'photos', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']),
  ('documents', 'documents', false, 26214400, ARRAY['application/pdf', 'image/jpeg', 'image/png']),
  ('signatures', 'signatures', false, 1048576, ARRAY['image/png', 'image/svg+xml'])
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
CREATE POLICY "storage_photos_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'photos' AND auth.uid() IS NOT NULL);

CREATE POLICY "storage_photos_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'photos' AND auth.uid() IS NOT NULL);

CREATE POLICY "storage_documents_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "storage_documents_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "storage_signatures_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'signatures' AND auth.uid() IS NOT NULL);

CREATE POLICY "storage_signatures_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'signatures' AND auth.uid() IS NOT NULL);
