"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function getStockOverview() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("stock")
    .select(`
      *,
      products (
        id,
        sku,
        name,
        category,
        product_line,
        unit,
        sell_price,
        is_active
      )
    `)
    .order("updated_at", { ascending: false })

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

export async function getStockMovements(filters?: {
  productId?: string
  type?: string
  limit?: number
}) {
  const supabase = await createClient()

  let query = supabase
    .from("stock_movements")
    .select(`
      *,
      products (name, sku),
      orders (order_number),
      profiles:created_by (full_name)
    `)
    .order("created_at", { ascending: false })
    .limit(filters?.limit || 50)

  if (filters?.productId) {
    query = query.eq("product_id", filters.productId)
  }
  if (filters?.type) {
    query = query.eq("movement_type", filters.type)
  }

  const { data, error } = await query

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

export async function receiveStock(data: {
  product_id: string
  quantity: number
  unit_price: number
  note?: string
}) {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: "Neautorizovaný přístup" }

  // Get current stock
  const { data: currentStock } = await supabase
    .from("stock")
    .select("on_hand, avg_purchase_price")
    .eq("product_id", data.product_id)
    .single()

  // Calculate new average purchase price
  const currentOnHand = currentStock?.on_hand || 0
  const currentAvg = currentStock?.avg_purchase_price || 0
  const newAvg =
    currentOnHand + data.quantity > 0
      ? (currentAvg * currentOnHand + data.unit_price * data.quantity) /
        (currentOnHand + data.quantity)
      : data.unit_price

  // Create stock movement
  const { error: movementError } = await supabase
    .from("stock_movements")
    .insert({
      product_id: data.product_id,
      movement_type: "prijem" as const,
      quantity: data.quantity,
      unit_price: data.unit_price,
      note: data.note || null,
      created_by: user.id,
    })

  if (movementError) return { data: null, error: movementError.message }

  // Update stock
  const { error: stockError } = await supabase
    .from("stock")
    .update({
      on_hand: currentOnHand + data.quantity,
      last_purchase_price: data.unit_price,
      avg_purchase_price: Math.round(newAvg * 100) / 100,
    })
    .eq("product_id", data.product_id)

  if (stockError) return { data: null, error: stockError.message }

  revalidatePath("/sklad")
  return { data: true, error: null }
}

export async function issueStock(data: {
  product_id: string
  quantity: number
  order_id?: string
  note?: string
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: "Neautorizovaný přístup" }

  // Check available stock
  const { data: currentStock } = await supabase
    .from("stock")
    .select("on_hand, reserved, available")
    .eq("product_id", data.product_id)
    .single()

  if (!currentStock || currentStock.available < data.quantity) {
    return { data: null, error: "Nedostatečné množství na skladě" }
  }

  // Create movement
  const { error: movementError } = await supabase
    .from("stock_movements")
    .insert({
      product_id: data.product_id,
      movement_type: "vydej" as const,
      quantity: data.quantity,
      order_id: data.order_id || null,
      note: data.note || null,
      created_by: user.id,
    })

  if (movementError) return { data: null, error: movementError.message }

  // Update stock
  const { error: stockError } = await supabase
    .from("stock")
    .update({
      on_hand: currentStock.on_hand - data.quantity,
    })
    .eq("product_id", data.product_id)

  if (stockError) return { data: null, error: stockError.message }

  revalidatePath("/sklad")
  return { data: true, error: null }
}

export async function createReservation(data: {
  order_id: string
  product_id: string
  quantity: number
}) {
  const supabase = await createClient()

  // Check available stock
  const { data: currentStock } = await supabase
    .from("stock")
    .select("available")
    .eq("product_id", data.product_id)
    .single()

  if (!currentStock || currentStock.available < data.quantity) {
    return { data: null, error: "Nedostatečné množství na skladě" }
  }

  // Create reservation
  const { error: resError } = await supabase
    .from("stock_reservations")
    .insert({
      order_id: data.order_id,
      product_id: data.product_id,
      quantity: data.quantity,
      status: "aktivni" as const,
    })

  if (resError) return { data: null, error: resError.message }

  // Update stock reserved amount
  const { error: stockError } = await supabase
    .from("stock")
    .update({
      reserved: currentStock.available > 0 ? data.quantity : 0,
    })
    .eq("product_id", data.product_id)

  if (stockError) return { data: null, error: stockError.message }

  revalidatePath("/sklad")
  return { data: true, error: null }
}

export async function getProducts(activeOnly = true) {
  const supabase = await createClient()

  let query = supabase
    .from("products")
    .select("*")
    .order("name")

  if (activeOnly) {
    query = query.eq("is_active", true)
  }

  const { data, error } = await query

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

export async function getLowStockAlerts() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("stock")
    .select(`
      *,
      products (name, sku, category)
    `)
    .lt("available", "min_quantity" as unknown as number)

  // Note: The above filter may need a raw SQL approach.
  // For now, we'll filter client-side
  if (error) return { data: null, error: error.message }

  const alerts = (data || []).filter(
    (s) => s.min_quantity > 0 && s.available <= s.min_quantity
  )

  return { data: alerts, error: null }
}
