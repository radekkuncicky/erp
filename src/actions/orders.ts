"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { ORDER_STATUS_TRANSITIONS, DEFAULT_PAGE_SIZE } from "@/lib/utils/constants"
import {
  orderFormSchema,
  orderItemSchema,
  type OrderFormValues,
  type OrderItemFormValues,
} from "@/lib/utils/validation"
import type { OrderStatus } from "@/lib/supabase/types"

// ---------------------------------------------------------------------------
// Typy
// ---------------------------------------------------------------------------

interface ActionResult<T = null> {
  data: T | null
  error: string | null
}

interface GetOrdersFilters {
  status?: OrderStatus | null
  search?: string | null
  category?: string | null
  manager?: string | null
  page?: number
  pageSize?: number
  sortBy?: string
  sortDirection?: "asc" | "desc"
}

interface GetOrdersResult {
  orders: Record<string, unknown>[]
  count: number
  page: number
  pageSize: number
}

// ---------------------------------------------------------------------------
// Pomocne funkce
// ---------------------------------------------------------------------------

/**
 * Prepocita celkovou cenu zakazky bez DPH na zaklade jejich polozek
 * a ulozi ji do orders.total_price_without_vat.
 */
async function recalculateOrderTotal(orderId: string): Promise<void> {
  const supabase = await createClient()

  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select("unit_price, quantity, discount_percent")
    .eq("order_id", orderId)

  if (itemsError) {
    throw new Error(`Chyba pri nacitani polozek zakazky: ${itemsError.message}`)
  }

  const totalPriceWithoutVat = (items ?? []).reduce((sum, item) => {
    const lineTotal =
      item.unit_price * item.quantity * (1 - item.discount_percent / 100)
    return sum + lineTotal
  }, 0)

  const { error: updateError } = await supabase
    .from("orders")
    .update({ total_price_without_vat: Math.round(totalPriceWithoutVat * 100) / 100 })
    .eq("id", orderId)

  if (updateError) {
    throw new Error(`Chyba pri aktualizaci celkove ceny: ${updateError.message}`)
  }
}

/**
 * Zapise zaznam do activity_log pro danou zakazku.
 */
async function logActivity(
  orderId: string,
  action: string,
  description: string,
  metadata?: Record<string, unknown> | null,
): Promise<void> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { error } = await supabase.from("activity_log").insert({
    order_id: orderId,
    user_id: user?.id ?? null,
    action,
    description,
    metadata: metadata ?? null,
  })

  if (error) {
    // Logovani neni kriticke - nechceme aby selhani logu zabilo celou operaci
    console.error("Chyba pri zapisu do activity_log:", error.message)
  }
}

// ---------------------------------------------------------------------------
// 1. getOrders - Seznam zakazek s filtry, strankovani, razeni
// ---------------------------------------------------------------------------

export async function getOrders(
  filters: GetOrdersFilters = {},
): Promise<ActionResult<GetOrdersResult>> {
  try {
    const supabase = await createClient()

    const {
      status,
      search,
      category,
      manager,
      page = 1,
      pageSize = DEFAULT_PAGE_SIZE,
      sortBy = "created_at",
      sortDirection = "desc",
    } = filters

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabase
      .from("orders")
      .select(
        `
        *,
        project_manager:profiles!orders_project_manager_id_fkey(id, full_name, email)
      `,
        { count: "exact" },
      )

    // Filtry
    if (status) {
      query = query.eq("status", status)
    }

    if (category) {
      query = query.eq("category", category)
    }

    if (manager) {
      query = query.eq("project_manager_id", manager)
    }

    if (search) {
      // Hledame v cislu zakazky, jmenu klienta a kontaktni osobe
      query = query.or(
        `order_number.ilike.%${search}%,client_name.ilike.%${search}%,contact_person.ilike.%${search}%`,
      )
    }

    // Razeni
    query = query.order(sortBy, { ascending: sortDirection === "asc" })

    // Strankovani
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
      return { data: null, error: `Chyba pri nacitani zakazek: ${error.message}` }
    }

    return {
      data: {
        orders: data ?? [],
        count: count ?? 0,
        page,
        pageSize,
      },
      error: null,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Neznama chyba"
    return { data: null, error: `Neocekavana chyba: ${message}` }
  }
}

// ---------------------------------------------------------------------------
// 2. getOrder - Detail zakazky se vsemi souvisejicimi daty
// ---------------------------------------------------------------------------

export async function getOrder(
  id: string,
): Promise<ActionResult<Record<string, unknown>>> {
  try {
    const supabase = await createClient()

    // Zakazka se spojenymi daty
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(
        `
        *,
        project_manager:profiles!orders_project_manager_id_fkey(id, full_name, email, phone),
        order_items(*),
        order_technicians(
          id,
          technician_id,
          assigned_at,
          technician:profiles!order_technicians_technician_id_fkey(id, full_name, email, phone)
        ),
        activity_log(
          id,
          user_id,
          action,
          description,
          metadata,
          created_at,
          user:profiles!activity_log_user_id_fkey(id, full_name)
        )
      `,
      )
      .eq("id", id)
      .order("sort_order", { referencedTable: "order_items", ascending: true })
      .order("created_at", { referencedTable: "activity_log", ascending: false })
      .single()

    if (orderError) {
      if (orderError.code === "PGRST116") {
        return { data: null, error: "Zakazka nebyla nalezena." }
      }
      return { data: null, error: `Chyba pri nacitani zakazky: ${orderError.message}` }
    }

    return { data: order, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Neznama chyba"
    return { data: null, error: `Neocekavana chyba: ${message}` }
  }
}

// ---------------------------------------------------------------------------
// 3. createOrder - Vytvoreni nove zakazky (rucne z formulare)
// ---------------------------------------------------------------------------

export async function createOrder(
  formData: OrderFormValues,
): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createClient()

    // Validace dat
    const parsed = orderFormSchema.safeParse(formData)
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]
      return {
        data: null,
        error: firstError?.message ?? "Neplatna data formulare.",
      }
    }

    const data = parsed.data

    // Vlozeni zakazky - order_number a id se generuji automaticky
    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        client_name: data.client_name,
        client_email: data.client_email ?? null,
        client_phone: data.client_phone ?? null,
        contact_person: data.contact_person ?? null,
        contact_phone: data.contact_phone ?? null,
        category: data.category ?? null,
        installation_address: data.installation_address ?? null,
        address_street: data.address_street ?? null,
        address_city: data.address_city ?? null,
        address_zip: data.address_zip ?? null,
        project_start_date: data.project_start_date ?? null,
        project_end_date: data.project_end_date ?? null,
        project_manager_id: data.project_manager_id ?? null,
        notes: data.notes ?? null,
        status: "novy" as const,
        total_price_without_vat: 0,
      })
      .select("id")
      .single()

    if (error) {
      return { data: null, error: `Chyba pri vytvareni zakazky: ${error.message}` }
    }

    // Zalogovat vytvoreni
    await logActivity(order.id, "order_created", `Zakazka vytvorena rucne pro klienta ${data.client_name}.`)

    revalidatePath("/orders")
    revalidatePath("/dashboard")

    return { data: { id: order.id }, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Neznama chyba"
    return { data: null, error: `Neocekavana chyba: ${message}` }
  }
}

// ---------------------------------------------------------------------------
// 4. updateOrder - Aktualizace poli zakazky
// ---------------------------------------------------------------------------

export async function updateOrder(
  id: string,
  formData: Partial<OrderFormValues>,
): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createClient()

    // Castecna validace - pouzijeme partial schema
    const partialSchema = orderFormSchema.partial()
    const parsed = partialSchema.safeParse(formData)
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]
      return {
        data: null,
        error: firstError?.message ?? "Neplatna data formulare.",
      }
    }

    const data = parsed.data

    const { error } = await supabase
      .from("orders")
      .update(data)
      .eq("id", id)

    if (error) {
      return { data: null, error: `Chyba pri aktualizaci zakazky: ${error.message}` }
    }

    // Zalogovat zmenu
    const changedFields = Object.keys(data)
    await logActivity(
      id,
      "order_updated",
      `Aktualizovana pole: ${changedFields.join(", ")}.`,
      { changed_fields: changedFields },
    )

    revalidatePath("/orders")
    revalidatePath(`/orders/${id}`)
    revalidatePath("/dashboard")

    return { data: { id }, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Neznama chyba"
    return { data: null, error: `Neocekavana chyba: ${message}` }
  }
}

// ---------------------------------------------------------------------------
// 5. updateOrderStatus - Zmena stavu zakazky s validaci prechodu
// ---------------------------------------------------------------------------

export async function updateOrderStatus(
  id: string,
  newStatus: OrderStatus,
): Promise<ActionResult<{ id: string; status: OrderStatus }>> {
  try {
    const supabase = await createClient()

    // Nacteme aktualni stav zakazky
    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("id, status, order_number")
      .eq("id", id)
      .single()

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return { data: null, error: "Zakazka nebyla nalezena." }
      }
      return { data: null, error: `Chyba pri nacitani zakazky: ${fetchError.message}` }
    }

    const currentStatus = order.status as string

    // Validace prechodu stavu
    const allowedTransitions = ORDER_STATUS_TRANSITIONS[currentStatus]
    if (!allowedTransitions || !allowedTransitions.includes(newStatus)) {
      return {
        data: null,
        error: `Neplatny prechod stavu: ze stavu "${currentStatus}" nelze prejit do "${newStatus}".`,
      }
    }

    // Provedeme zmenu stavu
    const { error: updateError } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", id)

    if (updateError) {
      return { data: null, error: `Chyba pri zmene stavu: ${updateError.message}` }
    }

    // Zalogovat zmenu stavu
    await logActivity(
      id,
      "status_changed",
      `Stav zakazky ${order.order_number} zmenen z "${currentStatus}" na "${newStatus}".`,
      {
        previous_status: currentStatus,
        new_status: newStatus,
      },
    )

    revalidatePath("/orders")
    revalidatePath(`/orders/${id}`)
    revalidatePath("/dashboard")

    return { data: { id, status: newStatus }, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Neznama chyba"
    return { data: null, error: `Neocekavana chyba: ${message}` }
  }
}

// ---------------------------------------------------------------------------
// 6. deleteOrder - Smazani zakazky (pouze ve stavu 'novy')
// ---------------------------------------------------------------------------

export async function deleteOrder(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createClient()

    // Overime stav zakazky
    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("id, status, order_number")
      .eq("id", id)
      .single()

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return { data: null, error: "Zakazka nebyla nalezena." }
      }
      return { data: null, error: `Chyba pri nacitani zakazky: ${fetchError.message}` }
    }

    if (order.status !== "novy") {
      return {
        data: null,
        error: `Zakazku lze smazat pouze ve stavu "novy". Aktualni stav: "${order.status}".`,
      }
    }

    // Smazeme souvisejici data - polozky, techniky, aktivitu
    const { error: itemsDeleteError } = await supabase
      .from("order_items")
      .delete()
      .eq("order_id", id)

    if (itemsDeleteError) {
      return {
        data: null,
        error: `Chyba pri mazani polozek zakazky: ${itemsDeleteError.message}`,
      }
    }

    const { error: techDeleteError } = await supabase
      .from("order_technicians")
      .delete()
      .eq("order_id", id)

    if (techDeleteError) {
      return {
        data: null,
        error: `Chyba pri mazani prirazeni techniku: ${techDeleteError.message}`,
      }
    }

    const { error: logDeleteError } = await supabase
      .from("activity_log")
      .delete()
      .eq("order_id", id)

    if (logDeleteError) {
      return {
        data: null,
        error: `Chyba pri mazani logu aktivity: ${logDeleteError.message}`,
      }
    }

    // Smazeme samotnou zakazku
    const { error: deleteError } = await supabase
      .from("orders")
      .delete()
      .eq("id", id)

    if (deleteError) {
      return { data: null, error: `Chyba pri mazani zakazky: ${deleteError.message}` }
    }

    revalidatePath("/orders")
    revalidatePath("/dashboard")

    return { data: { id }, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Neznama chyba"
    return { data: null, error: `Neocekavana chyba: ${message}` }
  }
}

// ---------------------------------------------------------------------------
// 7. addOrderItem - Pridani polozky k zakazce + prepocet celkove ceny
// ---------------------------------------------------------------------------

export async function addOrderItem(
  orderId: string,
  formData: OrderItemFormValues,
): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createClient()

    // Validace dat polozky
    const parsed = orderItemSchema.safeParse(formData)
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]
      return {
        data: null,
        error: firstError?.message ?? "Neplatna data polozky.",
      }
    }

    const data = parsed.data

    // Zjistime aktualni maximalni sort_order
    const { data: existingItems } = await supabase
      .from("order_items")
      .select("sort_order")
      .eq("order_id", orderId)
      .order("sort_order", { ascending: false })
      .limit(1)

    const nextSortOrder =
      existingItems && existingItems.length > 0
        ? existingItems[0].sort_order + 1
        : 0

    // Vlozime polozku
    const { data: item, error } = await supabase
      .from("order_items")
      .insert({
        order_id: orderId,
        product_id: data.product_id ?? null,
        name: data.name,
        description: data.description ?? null,
        unit_price: data.unit_price,
        cost_price: data.cost_price,
        quantity: data.quantity,
        discount_percent: data.discount_percent,
        vat_rate: data.vat_rate,
        unit: data.unit,
        sort_order: nextSortOrder,
      })
      .select("id")
      .single()

    if (error) {
      return { data: null, error: `Chyba pri pridavani polozky: ${error.message}` }
    }

    // Prepocitame celkovou cenu zakazky
    await recalculateOrderTotal(orderId)

    // Zalogovat
    await logActivity(
      orderId,
      "item_added",
      `Pridana polozka "${data.name}" (${data.quantity}x).`,
      { item_id: item.id, item_name: data.name },
    )

    revalidatePath(`/orders/${orderId}`)

    return { data: { id: item.id }, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Neznama chyba"
    return { data: null, error: `Neocekavana chyba: ${message}` }
  }
}

// ---------------------------------------------------------------------------
// 8. updateOrderItem - Aktualizace polozky zakazky + prepocet celkove ceny
// ---------------------------------------------------------------------------

export async function updateOrderItem(
  itemId: string,
  formData: Partial<OrderItemFormValues>,
): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createClient()

    // Castecna validace
    const partialSchema = orderItemSchema.partial()
    const parsed = partialSchema.safeParse(formData)
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]
      return {
        data: null,
        error: firstError?.message ?? "Neplatna data polozky.",
      }
    }

    const data = parsed.data

    // Zjistime order_id pred updatem (potrebujeme pro prepocet)
    const { data: existingItem, error: fetchError } = await supabase
      .from("order_items")
      .select("id, order_id, name")
      .eq("id", itemId)
      .single()

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return { data: null, error: "Polozka nebyla nalezena." }
      }
      return { data: null, error: `Chyba pri nacitani polozky: ${fetchError.message}` }
    }

    // Aktualizujeme polozku
    const { error: updateError } = await supabase
      .from("order_items")
      .update(data)
      .eq("id", itemId)

    if (updateError) {
      return { data: null, error: `Chyba pri aktualizaci polozky: ${updateError.message}` }
    }

    // Prepocitame celkovou cenu zakazky
    await recalculateOrderTotal(existingItem.order_id)

    // Zalogovat
    const changedFields = Object.keys(data)
    await logActivity(
      existingItem.order_id,
      "item_updated",
      `Aktualizovana polozka "${existingItem.name}" - pole: ${changedFields.join(", ")}.`,
      { item_id: itemId, changed_fields: changedFields },
    )

    revalidatePath(`/orders/${existingItem.order_id}`)

    return { data: { id: itemId }, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Neznama chyba"
    return { data: null, error: `Neocekavana chyba: ${message}` }
  }
}

// ---------------------------------------------------------------------------
// 9. deleteOrderItem - Smazani polozky zakazky + prepocet celkove ceny
// ---------------------------------------------------------------------------

export async function deleteOrderItem(
  itemId: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createClient()

    // Zjistime order_id pred smazanim
    const { data: existingItem, error: fetchError } = await supabase
      .from("order_items")
      .select("id, order_id, name")
      .eq("id", itemId)
      .single()

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return { data: null, error: "Polozka nebyla nalezena." }
      }
      return { data: null, error: `Chyba pri nacitani polozky: ${fetchError.message}` }
    }

    // Smazeme polozku
    const { error: deleteError } = await supabase
      .from("order_items")
      .delete()
      .eq("id", itemId)

    if (deleteError) {
      return { data: null, error: `Chyba pri mazani polozky: ${deleteError.message}` }
    }

    // Prepocitame celkovou cenu zakazky
    await recalculateOrderTotal(existingItem.order_id)

    // Zalogovat
    await logActivity(
      existingItem.order_id,
      "item_deleted",
      `Smazana polozka "${existingItem.name}".`,
      { item_id: itemId, item_name: existingItem.name },
    )

    revalidatePath(`/orders/${existingItem.order_id}`)

    return { data: { id: itemId }, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Neznama chyba"
    return { data: null, error: `Neocekavana chyba: ${message}` }
  }
}

// ---------------------------------------------------------------------------
// 10. assignTechnician - Prirazeni technika k zakazce
// ---------------------------------------------------------------------------

export async function assignTechnician(
  orderId: string,
  technicianId: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createClient()

    // Overime ze technik jiz neni prirazen
    const { data: existing } = await supabase
      .from("order_technicians")
      .select("id")
      .eq("order_id", orderId)
      .eq("technician_id", technicianId)
      .maybeSingle()

    if (existing) {
      return { data: null, error: "Technik je jiz k teto zakazce prirazen." }
    }

    // Overime ze uzivatel existuje a je technik
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, role")
      .eq("id", technicianId)
      .single()

    if (profileError) {
      if (profileError.code === "PGRST116") {
        return { data: null, error: "Technik nebyl nalezen." }
      }
      return { data: null, error: `Chyba pri overovani technika: ${profileError.message}` }
    }

    if (profile.role !== "technik") {
      return { data: null, error: "Vybrany uzivatel neni technik." }
    }

    // Priradime technika
    const { data: assignment, error } = await supabase
      .from("order_technicians")
      .insert({
        order_id: orderId,
        technician_id: technicianId,
      })
      .select("id")
      .single()

    if (error) {
      return { data: null, error: `Chyba pri prirazovani technika: ${error.message}` }
    }

    // Zalogovat
    await logActivity(
      orderId,
      "technician_assigned",
      `Prirazen technik ${profile.full_name}.`,
      { technician_id: technicianId, technician_name: profile.full_name },
    )

    revalidatePath(`/orders/${orderId}`)

    return { data: { id: assignment.id }, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Neznama chyba"
    return { data: null, error: `Neocekavana chyba: ${message}` }
  }
}

// ---------------------------------------------------------------------------
// 11. removeTechnician - Odebrani technika ze zakazky
// ---------------------------------------------------------------------------

export async function removeTechnician(
  orderId: string,
  technicianId: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createClient()

    // Zjistime jmeno technika pro log
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("id", technicianId)
      .single()

    // Smazeme prirazeni
    const { error, count } = await supabase
      .from("order_technicians")
      .delete()
      .eq("order_id", orderId)
      .eq("technician_id", technicianId)

    if (error) {
      return { data: null, error: `Chyba pri odebirani technika: ${error.message}` }
    }

    // Pokud nebylo nic smazano, prirazeni neexistovalo
    if (count === 0) {
      return {
        data: null,
        error: "Prirazeni technika k teto zakazce nebylo nalezeno.",
      }
    }

    // Zalogovat
    const technicianName = profile?.full_name ?? technicianId
    await logActivity(
      orderId,
      "technician_removed",
      `Odebran technik ${technicianName}.`,
      { technician_id: technicianId, technician_name: technicianName },
    )

    revalidatePath(`/orders/${orderId}`)

    return { data: { id: technicianId }, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Neznama chyba"
    return { data: null, error: `Neocekavana chyba: ${message}` }
  }
}

// ---------------------------------------------------------------------------
// 12. getOrderActivity - Ziskani logu aktivity pro zakazku
// ---------------------------------------------------------------------------

export async function getOrderActivity(
  orderId: string,
): Promise<ActionResult<Record<string, unknown>[]>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("activity_log")
      .select(
        `
        id,
        action,
        description,
        metadata,
        created_at,
        user:profiles!activity_log_user_id_fkey(id, full_name)
      `,
      )
      .eq("order_id", orderId)
      .order("created_at", { ascending: false })

    if (error) {
      return { data: null, error: `Chyba pri nacitani aktivity: ${error.message}` }
    }

    return { data: data ?? [], error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Neznama chyba"
    return { data: null, error: `Neocekavana chyba: ${message}` }
  }
}
