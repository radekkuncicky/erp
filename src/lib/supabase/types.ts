// Database types - will be generated from Supabase schema
// For now, define the basic structure that matches our plan

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

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
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
        Insert: Omit<Database["public"]["Tables"]["profiles"]["Row"], "created_at" | "updated_at">
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>
      }
      orders: {
        Row: {
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
        Insert: Omit<Database["public"]["Tables"]["orders"]["Row"], "id" | "order_number" | "created_at" | "updated_at"> & {
          id?: string
          order_number?: string
        }
        Update: Partial<Database["public"]["Tables"]["orders"]["Insert"]>
      }
      order_items: {
        Row: {
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
        Insert: Omit<Database["public"]["Tables"]["order_items"]["Row"], "id" | "created_at"> & { id?: string }
        Update: Partial<Database["public"]["Tables"]["order_items"]["Insert"]>
      }
      products: {
        Row: {
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
        Insert: Omit<Database["public"]["Tables"]["products"]["Row"], "id" | "created_at" | "updated_at"> & { id?: string }
        Update: Partial<Database["public"]["Tables"]["products"]["Insert"]>
      }
      stock: {
        Row: {
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
        Insert: Omit<Database["public"]["Tables"]["stock"]["Row"], "id" | "available" | "updated_at"> & { id?: string }
        Update: Partial<Database["public"]["Tables"]["stock"]["Insert"]>
      }
      stock_movements: {
        Row: {
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
        Insert: Omit<Database["public"]["Tables"]["stock_movements"]["Row"], "id" | "created_at"> & { id?: string }
        Update: Partial<Database["public"]["Tables"]["stock_movements"]["Insert"]>
      }
      stock_reservations: {
        Row: {
          id: string
          order_id: string
          product_id: string
          quantity: number
          status: ReservationStatus
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["stock_reservations"]["Row"], "id" | "created_at" | "updated_at"> & { id?: string }
        Update: Partial<Database["public"]["Tables"]["stock_reservations"]["Insert"]>
      }
      handover_protocols: {
        Row: {
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
        Insert: Omit<Database["public"]["Tables"]["handover_protocols"]["Row"], "id" | "protocol_number" | "created_at" | "updated_at"> & { id?: string; protocol_number?: string }
        Update: Partial<Database["public"]["Tables"]["handover_protocols"]["Insert"]>
      }
      protocol_items: {
        Row: {
          id: string
          protocol_id: string
          order_item_id: string | null
          name: string
          quantity: number
          is_installed: boolean
          notes: string | null
          sort_order: number
        }
        Insert: Omit<Database["public"]["Tables"]["protocol_items"]["Row"], "id"> & { id?: string }
        Update: Partial<Database["public"]["Tables"]["protocol_items"]["Insert"]>
      }
      vyuctovani: {
        Row: {
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
        Insert: Omit<Database["public"]["Tables"]["vyuctovani"]["Row"], "id" | "vyuctovani_number" | "created_at" | "updated_at"> & { id?: string; vyuctovani_number?: string }
        Update: Partial<Database["public"]["Tables"]["vyuctovani"]["Insert"]>
      }
      documents: {
        Row: {
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
        Insert: Omit<Database["public"]["Tables"]["documents"]["Row"], "id" | "created_at"> & { id?: string }
        Update: Partial<Database["public"]["Tables"]["documents"]["Insert"]>
      }
      activity_log: {
        Row: {
          id: string
          order_id: string
          user_id: string | null
          action: string
          description: string
          metadata: Record<string, unknown> | null
          created_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["activity_log"]["Row"], "id" | "created_at"> & { id?: string }
        Update: Partial<Database["public"]["Tables"]["activity_log"]["Insert"]>
      }
      order_technicians: {
        Row: {
          id: string
          order_id: string
          technician_id: string
          assigned_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["order_technicians"]["Row"], "id" | "assigned_at"> & { id?: string }
        Update: Partial<Database["public"]["Tables"]["order_technicians"]["Insert"]>
      }
      webhook_logs: {
        Row: {
          id: string
          event_type: string
          raynet_id: string | null
          payload: Record<string, unknown>
          status: string
          error_message: string | null
          processed_at: string | null
          created_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["webhook_logs"]["Row"], "id" | "created_at"> & { id?: string }
        Update: Partial<Database["public"]["Tables"]["webhook_logs"]["Insert"]>
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
