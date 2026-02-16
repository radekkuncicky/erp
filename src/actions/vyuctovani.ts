"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function getVyuctovaniList(filters?: {
  status?: string
  search?: string
}) {
  const supabase = await createClient()

  let query = supabase
    .from("vyuctovani")
    .select(`
      *,
      orders (order_number, client_name, category),
      handover_protocols:protocol_id (protocol_number)
    `)
    .order("created_at", { ascending: false })

  if (filters?.status) {
    query = query.eq("status", filters.status)
  }

  const { data, error } = await query

  if (error) return { data: null, error: error.message }

  // Client-side search filter
  let filtered = data || []
  if (filters?.search) {
    const s = filters.search.toLowerCase()
    filtered = filtered.filter(
      (v) =>
        v.vyuctovani_number.toLowerCase().includes(s) ||
        (v.orders as { client_name: string })?.client_name?.toLowerCase().includes(s) ||
        (v.orders as { order_number: string })?.order_number?.toLowerCase().includes(s)
    )
  }

  return { data: filtered, error: null }
}

export async function getVyuctovani(id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("vyuctovani")
    .select(`
      *,
      orders (
        id,
        order_number,
        client_name,
        client_email,
        client_phone,
        category,
        order_items (*)
      ),
      handover_protocols:protocol_id (
        protocol_number,
        handover_date,
        notes,
        profiles:technician_id (full_name)
      ),
      profiles:approved_by (full_name)
    `)
    .eq("id", id)
    .single()

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

export async function updateVyuctovani(
  id: string,
  data: {
    material_total?: number
    labor_total?: number
    other_costs?: number
    notes?: string
  }
) {
  const supabase = await createClient()

  // Get current vyuctovani to recalculate
  const { data: current } = await supabase
    .from("vyuctovani")
    .select("*")
    .eq("id", id)
    .single()

  if (!current) return { data: null, error: "Vyúčtování nenalezeno" }

  const materialTotal = data.material_total ?? current.material_total
  const laborTotal = data.labor_total ?? current.labor_total
  const otherCosts = data.other_costs ?? current.other_costs
  const totalWithoutVat = materialTotal + laborTotal + otherCosts
  const totalWithVat = totalWithoutVat * 1.21 // Default 21% VAT
  const remaining = totalWithVat - current.deposit_paid

  const { error } = await supabase
    .from("vyuctovani")
    .update({
      material_total: materialTotal,
      labor_total: laborTotal,
      other_costs: otherCosts,
      total_without_vat: Math.round(totalWithoutVat * 100) / 100,
      total_with_vat: Math.round(totalWithVat * 100) / 100,
      remaining_amount: Math.round(remaining * 100) / 100,
      notes: data.notes ?? current.notes,
    })
    .eq("id", id)

  if (error) return { data: null, error: error.message }

  revalidatePath("/vyuctovani")
  revalidatePath(`/vyuctovani/${id}`)
  return { data: true, error: null }
}

export async function approveVyuctovani(id: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: "Neautorizovaný přístup" }

  const { data: vyuctovani, error } = await supabase
    .from("vyuctovani")
    .update({
      status: "schvaleno" as const,
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("order_id")
    .single()

  if (error || !vyuctovani) {
    return { data: null, error: error?.message || "Chyba při schvalování" }
  }

  // Update order status
  await supabase
    .from("orders")
    .update({ status: "vyuctovano" as const })
    .eq("id", vyuctovani.order_id)

  // Log activity
  await supabase.from("activity_log").insert({
    order_id: vyuctovani.order_id,
    user_id: user.id,
    action: "vyuctovani_approved",
    description: "Vyúčtování schváleno",
  })

  revalidatePath("/vyuctovani")
  revalidatePath(`/zakazky/${vyuctovani.order_id}`)
  return { data: true, error: null }
}

export async function rejectVyuctovani(id: string, reason?: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: "Neautorizovaný přístup" }

  const { data: vyuctovani, error } = await supabase
    .from("vyuctovani")
    .update({
      status: "zamitnuto" as const,
      notes: reason || null,
    })
    .eq("id", id)
    .select("order_id")
    .single()

  if (error || !vyuctovani) {
    return { data: null, error: error?.message || "Chyba při zamítnutí" }
  }

  // Log activity
  await supabase.from("activity_log").insert({
    order_id: vyuctovani.order_id,
    user_id: user.id,
    action: "vyuctovani_rejected",
    description: `Vyúčtování zamítnuto${reason ? `: ${reason}` : ""}`,
  })

  revalidatePath("/vyuctovani")
  return { data: true, error: null }
}
