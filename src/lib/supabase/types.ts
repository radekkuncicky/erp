// Database types matching our Supabase schema

export type UserRole = "admin" | "projektovy_manazer" | "technik"

export type OrderStatus =
  | "novy"
  | "potvrzeny"
  | "v_priprave"
  | "naplanovany"
  | "v_realizaci"
  | "predano"
  | "vyuctovano"
  | "dokonceny"

export type StockMovementType = "prijem" | "vydej" | "rezervace" | "vraceni"

export type ReservationStatus = "aktivni" | "vydano" | "zruseno"

export type ProtocolStatus = "koncept" | "vyplneny" | "podepsany" | "schvaleny"

export type VyuctovaniStatus = "koncept" | "ke_schvaleni" | "schvaleno" | "zamitnuto"

export type DocumentType = "foto_pred" | "foto_v_prubehu" | "foto_po" | "smlouva" | "faktura" | "technicka_zprava" | "ostatni"

export type ProductUnit = "ks" | "m" | "m2" | "hod" | "komplet"

// Row types
interface ProfileRow {
  id: string
  email: string
  full_name: string
  role: UserRole
  phone: string | null
  avatar_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

interface OrderRow {
  id: string
  order_number: string
  raynet_id: string | null
  client_name: string
  client_email: string | null
  client_phone: string | null
  contact_person: string | null
  contact_phone: string | null
  category: string | null
  status: OrderStatus
  total_price_without_vat: number
  deposit_with_vat: number | null
  installation_address: string | null
  address_street: string | null
  address_city: string | null
  address_zip: string | null
  project_start_date: string | null
  project_end_date: string | null
  project_manager_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

interface OrderItemRow {
  id: string
  order_id: string
  product_id: string | null
  raynet_item_id: number | null
  name: string
  description: string | null
  unit_price: number
  cost_price: number
  quantity: number
  discount_percent: number
  vat_rate: number
  unit: ProductUnit
  sort_order: number
  created_at: string
}

interface ProductRow {
  id: string
  raynet_id: number | null
  sku: string
  name: string
  category: string | null
  product_line: string | null
  unit: ProductUnit
  sell_price: number
  is_active: boolean
  created_at: string
  updated_at: string
}

interface StockRow {
  id: string
  product_id: string
  on_hand: number
  reserved: number
  available: number
  min_quantity: number
  last_purchase_price: number
  avg_purchase_price: number
  updated_at: string
}

interface StockMovementRow {
  id: string
  product_id: string
  movement_type: StockMovementType
  quantity: number
  unit_price: number | null
  order_id: string | null
  note: string | null
  created_by: string
  created_at: string
}

interface StockReservationRow {
  id: string
  order_id: string
  product_id: string
  quantity: number
  status: ReservationStatus
  created_at: string
  updated_at: string
}

interface HandoverProtocolRow {
  id: string
  protocol_number: string
  order_id: string
  status: ProtocolStatus
  technician_id: string
  client_name: string
  handover_date: string | null
  notes: string | null
  client_signature_url: string | null
  technician_signature_url: string | null
  ai_summary: string | null
  created_at: string
  updated_at: string
}

interface ProtocolItemRow {
  id: string
  protocol_id: string
  order_item_id: string | null
  name: string
  quantity: number
  is_installed: boolean
  notes: string | null
  sort_order: number
}

interface VyuctovaniRow {
  id: string
  vyuctovani_number: string
  order_id: string
  protocol_id: string | null
  status: VyuctovaniStatus
  material_total: number
  labor_total: number
  other_costs: number
  total_without_vat: number
  total_with_vat: number
  deposit_paid: number
  remaining_amount: number
  notes: string | null
  ai_summary: string | null
  approved_by: string | null
  approved_at: string | null
  created_at: string
  updated_at: string
}

interface DocumentRow {
  id: string
  order_id: string
  document_type: DocumentType
  file_name: string
  file_url: string
  file_size: number | null
  mime_type: string | null
  description: string | null
  gps_lat: number | null
  gps_lng: number | null
  uploaded_by: string
  created_at: string
}

interface ActivityLogRow {
  id: string
  order_id: string
  user_id: string | null
  action: string
  description: string
  metadata: Record<string, unknown> | null
  created_at: string
}

interface OrderTechnicianRow {
  id: string
  order_id: string
  technician_id: string
  assigned_at: string
}

interface WebhookLogRow {
  id: string
  event_type: string
  raynet_id: string | null
  payload: Record<string, unknown>
  status: string
  error_message: string | null
  processed_at: string | null
  created_at: string
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow
        Insert: Omit<ProfileRow, "created_at" | "updated_at">
        Update: Partial<Omit<ProfileRow, "created_at" | "updated_at">>
      }
      orders: {
        Row: OrderRow
        Insert: Omit<OrderRow, "id" | "order_number" | "created_at" | "updated_at"> & { id?: string; order_number?: string }
        Update: Partial<Omit<OrderRow, "id" | "order_number" | "created_at" | "updated_at">>
      }
      order_items: {
        Row: OrderItemRow
        Insert: Omit<OrderItemRow, "id" | "created_at"> & { id?: string }
        Update: Partial<Omit<OrderItemRow, "id" | "created_at">>
      }
      products: {
        Row: ProductRow
        Insert: Omit<ProductRow, "id" | "created_at" | "updated_at"> & { id?: string }
        Update: Partial<Omit<ProductRow, "id" | "created_at" | "updated_at">>
      }
      stock: {
        Row: StockRow
        Insert: Omit<StockRow, "id" | "available" | "updated_at"> & { id?: string }
        Update: Partial<Omit<StockRow, "id" | "available" | "updated_at">>
      }
      stock_movements: {
        Row: StockMovementRow
        Insert: Omit<StockMovementRow, "id" | "created_at"> & { id?: string }
        Update: Partial<Omit<StockMovementRow, "id" | "created_at">>
      }
      stock_reservations: {
        Row: StockReservationRow
        Insert: Omit<StockReservationRow, "id" | "created_at" | "updated_at"> & { id?: string }
        Update: Partial<Omit<StockReservationRow, "id" | "created_at" | "updated_at">>
      }
      handover_protocols: {
        Row: HandoverProtocolRow
        Insert: Omit<HandoverProtocolRow, "id" | "protocol_number" | "created_at" | "updated_at"> & { id?: string; protocol_number?: string }
        Update: Partial<Omit<HandoverProtocolRow, "id" | "protocol_number" | "created_at" | "updated_at">>
      }
      protocol_items: {
        Row: ProtocolItemRow
        Insert: Omit<ProtocolItemRow, "id"> & { id?: string }
        Update: Partial<Omit<ProtocolItemRow, "id">>
      }
      vyuctovani: {
        Row: VyuctovaniRow
        Insert: Omit<VyuctovaniRow, "id" | "vyuctovani_number" | "created_at" | "updated_at"> & { id?: string; vyuctovani_number?: string }
        Update: Partial<Omit<VyuctovaniRow, "id" | "vyuctovani_number" | "created_at" | "updated_at">>
      }
      documents: {
        Row: DocumentRow
        Insert: Omit<DocumentRow, "id" | "created_at"> & { id?: string }
        Update: Partial<Omit<DocumentRow, "id" | "created_at">>
      }
      activity_log: {
        Row: ActivityLogRow
        Insert: Omit<ActivityLogRow, "id" | "created_at"> & { id?: string }
        Update: Partial<Omit<ActivityLogRow, "id" | "created_at">>
      }
      order_technicians: {
        Row: OrderTechnicianRow
        Insert: Omit<OrderTechnicianRow, "id" | "assigned_at"> & { id?: string }
        Update: Partial<Omit<OrderTechnicianRow, "id" | "assigned_at">>
      }
      webhook_logs: {
        Row: WebhookLogRow
        Insert: Omit<WebhookLogRow, "id" | "created_at"> & { id?: string }
        Update: Partial<Omit<WebhookLogRow, "id" | "created_at">>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      user_role: UserRole
      order_status: OrderStatus
      stock_movement_type: StockMovementType
      reservation_status: ReservationStatus
      protocol_status: ProtocolStatus
      vyuctovani_status: VyuctovaniStatus
      document_type: DocumentType
      product_unit: ProductUnit
    }
  }
}
