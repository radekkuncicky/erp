import { z } from "zod"

// Raynet webhook payload validation
export const raynetWebhookSchema = z.object({
  event: z.string(),
  raynet_id: z.string(),
  project_name: z.string(),
  client_name: z.string(),
  client_email: z.string().email().nullable().optional(),
  client_phone: z.string().nullable().optional(),
  contact_person: z.string().nullable().optional(),
  contact_phone: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  total_price_wo_vat: z.number(),
  zaloha_vc_DPH: z.union([z.string(), z.number()]).optional(),
  installation_address: z.string().optional(),
  address_street: z.string().optional(),
  address_city: z.string().optional(),
  address_zip: z.string().optional(),
  project_start_date: z.string().optional(),
  project_end_date: z.string().optional(),
  project_manager_email: z.string().optional(),
  project_notes: z.string().optional(),
  products: z.object({
    items: z.array(
      z.object({
        id: z.number(),
        name: z.string(),
        price: z.number(),
        cost: z.number(),
        count: z.number(),
        discountPercent: z.number(),
        sequenceNumber: z.number(),
        taxRate: z.number(),
        unit: z.number(),
        description: z.string().nullable().optional(),
        priceListItem: z.object({
          product: z.object({
            id: z.number(),
            code: z.string(),
            category: z.object({
              id: z.number(),
              value: z.string(),
            }).optional(),
            productLine: z.object({
              id: z.number(),
              value: z.string(),
            }).optional(),
          }),
        }).optional(),
      })
    ),
  }).optional(),
})

export type RaynetWebhookPayload = z.infer<typeof raynetWebhookSchema>

// Order form validation
export const orderFormSchema = z.object({
  client_name: z.string().min(1, "Jméno klienta je povinné"),
  client_email: z.string().email("Neplatný email").nullable().optional(),
  client_phone: z.string().nullable().optional(),
  contact_person: z.string().nullable().optional(),
  contact_phone: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  installation_address: z.string().nullable().optional(),
  address_street: z.string().nullable().optional(),
  address_city: z.string().nullable().optional(),
  address_zip: z.string().nullable().optional(),
  project_start_date: z.string().nullable().optional(),
  project_end_date: z.string().nullable().optional(),
  project_manager_id: z.string().uuid().nullable().optional(),
  notes: z.string().nullable().optional(),
})

export type OrderFormValues = z.infer<typeof orderFormSchema>

// Order item form validation
export const orderItemSchema = z.object({
  product_id: z.string().uuid().nullable().optional(),
  name: z.string().min(1, "Název položky je povinný"),
  description: z.string().nullable().optional(),
  unit_price: z.number().min(0, "Cena musí být kladná"),
  cost_price: z.number().min(0).default(0),
  quantity: z.number().min(1, "Množství musí být alespoň 1"),
  discount_percent: z.number().min(0).max(100).default(0),
  vat_rate: z.number().default(21),
  unit: z.enum(["ks", "m", "m2", "hod", "komplet"]).default("ks"),
})

export type OrderItemFormValues = z.infer<typeof orderItemSchema>

// Stock receipt form
export const stockReceiptSchema = z.object({
  product_id: z.string().uuid("Vyberte produkt"),
  quantity: z.number().min(1, "Množství musí být alespoň 1"),
  unit_price: z.number().min(0, "Cena musí být kladná"),
  note: z.string().optional(),
})

export type StockReceiptFormValues = z.infer<typeof stockReceiptSchema>

// Protocol form
export const protocolFormSchema = z.object({
  handover_date: z.string().min(1, "Datum předání je povinné"),
  notes: z.string().optional(),
  items: z.array(
    z.object({
      id: z.string(),
      is_installed: z.boolean(),
      notes: z.string().optional(),
    })
  ),
})

export type ProtocolFormValues = z.infer<typeof protocolFormSchema>
