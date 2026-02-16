"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function createProtocol(orderId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: "Neautorizovaný přístup" }

  // Get order with items
  const { data: order } = await supabase
    .from("orders")
    .select("id, client_name, order_items (*)")
    .eq("id", orderId)
    .single()

  if (!order) return { data: null, error: "Zakázka nenalezena" }

  // Create protocol
  const { data: protocol, error: protError } = await supabase
    .from("handover_protocols")
    .insert({
      order_id: orderId,
      technician_id: user.id,
      client_name: order.client_name,
      status: "koncept" as const,
    })
    .select("id")
    .single()

  if (protError || !protocol) {
    return { data: null, error: protError?.message || "Chyba při vytváření protokolu" }
  }

  // Auto-populate protocol items from order items
  const protocolItems = order.order_items.map((item: {
    id: string
    name: string
    quantity: number
    sort_order: number
  }) => ({
    protocol_id: protocol.id,
    order_item_id: item.id,
    name: item.name,
    quantity: item.quantity,
    is_installed: false,
    sort_order: item.sort_order,
  }))

  if (protocolItems.length > 0) {
    await supabase.from("protocol_items").insert(protocolItems)
  }

  // Log activity
  await supabase.from("activity_log").insert({
    order_id: orderId,
    user_id: user.id,
    action: "protocol_created",
    description: "Vytvořen předávací protokol",
  })

  revalidatePath(`/zakazky/${orderId}`)
  return { data: protocol, error: null }
}

export async function getProtocol(protocolId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("handover_protocols")
    .select(`
      *,
      protocol_items (*),
      orders (order_number, client_name),
      profiles:technician_id (full_name)
    `)
    .eq("id", protocolId)
    .single()

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

export async function updateProtocolItems(
  protocolId: string,
  items: Array<{ id: string; is_installed: boolean; notes?: string }>
) {
  const supabase = await createClient()

  for (const item of items) {
    await supabase
      .from("protocol_items")
      .update({
        is_installed: item.is_installed,
        notes: item.notes || null,
      })
      .eq("id", item.id)
  }

  revalidatePath(`/prehled`)
  return { data: true, error: null }
}

export async function completeProtocol(
  protocolId: string,
  data: {
    handover_date: string
    notes?: string
    client_signature_url?: string
    technician_signature_url?: string
  }
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: "Neautorizovaný přístup" }

  // Update protocol
  const { data: protocol, error: protError } = await supabase
    .from("handover_protocols")
    .update({
      status: "podepsany" as const,
      handover_date: data.handover_date,
      notes: data.notes || null,
      client_signature_url: data.client_signature_url || null,
      technician_signature_url: data.technician_signature_url || null,
    })
    .eq("id", protocolId)
    .select("*, orders (id, order_items (*), deposit_with_vat)")
    .single()

  if (protError || !protocol) {
    return { data: null, error: protError?.message || "Chyba při dokončování protokolu" }
  }

  // Auto-create vyuctovani
  const order = protocol.orders as {
    id: string
    deposit_with_vat: number | null
    order_items: Array<{
      unit_price: number
      cost_price: number
      quantity: number
      discount_percent: number
      vat_rate: number
      category?: string
    }>
  }

  const items = order.order_items || []
  const materialTotal = items
    .filter((i) => !i.category?.includes("Montáž"))
    .reduce((sum, i) => sum + i.unit_price * i.quantity * (1 - i.discount_percent / 100), 0)
  const laborTotal = items
    .filter((i) => i.category?.includes("Montáž"))
    .reduce((sum, i) => sum + i.unit_price * i.quantity * (1 - i.discount_percent / 100), 0)
  const totalWithoutVat = materialTotal + laborTotal
  // Average VAT rate
  const avgVatRate = items.length > 0
    ? items.reduce((sum, i) => sum + i.vat_rate, 0) / items.length
    : 21
  const totalWithVat = totalWithoutVat * (1 + avgVatRate / 100)
  const depositPaid = order.deposit_with_vat || 0
  const remaining = totalWithVat - depositPaid

  await supabase.from("vyuctovani").insert({
    order_id: order.id,
    protocol_id: protocolId,
    status: "koncept" as const,
    material_total: Math.round(materialTotal * 100) / 100,
    labor_total: Math.round(laborTotal * 100) / 100,
    other_costs: 0,
    total_without_vat: Math.round(totalWithoutVat * 100) / 100,
    total_with_vat: Math.round(totalWithVat * 100) / 100,
    deposit_paid: depositPaid,
    remaining_amount: Math.round(remaining * 100) / 100,
  })

  // Update order status to predano
  await supabase
    .from("orders")
    .update({ status: "predano" as const })
    .eq("id", order.id)

  // Log activity
  await supabase.from("activity_log").insert({
    order_id: order.id,
    user_id: user.id,
    action: "protocol_completed",
    description: "Předávací protokol dokončen, vyúčtování vytvořeno automaticky",
  })

  revalidatePath(`/zakazky/${order.id}`)
  revalidatePath("/vyuctovani")
  revalidatePath("/prehled")
  return { data: protocol, error: null }
}
