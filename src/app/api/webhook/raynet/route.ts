import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { raynetWebhookSchema } from "@/lib/utils/validation"
import { mapRaynetUnit } from "@/lib/utils/format"

export async function POST(request: Request) {
  const supabase = createAdminClient()
  let logId: string | null = null

  try {
    // 1. Validate webhook secret
    const webhookSecret = process.env.RAYNET_WEBHOOK_SECRET
    const headerSecret = request.headers.get("x-webhook-secret")

    if (!webhookSecret || headerSecret !== webhookSecret) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // 2. Parse and validate payload
    const rawPayload = await request.json()
    const parseResult = raynetWebhookSchema.safeParse(rawPayload)

    if (!parseResult.success) {
      // Log the failed validation
      await supabase.from("webhook_logs").insert({
        event_type: rawPayload?.event ?? "unknown",
        raynet_id: rawPayload?.raynet_id ?? null,
        payload: rawPayload,
        status: "error",
        error_message: `Validation failed: ${parseResult.error.message}`,
        processed_at: new Date().toISOString(),
      })

      return NextResponse.json(
        { error: "Invalid payload", details: parseResult.error.flatten() },
        { status: 400 }
      )
    }

    const payload = parseResult.data

    // 3. Log the webhook
    const { data: logEntry, error: logError } = await supabase
      .from("webhook_logs")
      .insert({
        event_type: payload.event,
        raynet_id: payload.raynet_id,
        payload: rawPayload,
        status: "processing",
      })
      .select("id")
      .single()

    if (logError) {
      console.error("Failed to create webhook log:", logError)
    } else {
      logId = logEntry.id
    }

    // 4. Handle events
    if (payload.event === "sync_project") {
      await handleSyncProject(supabase, payload, logId)
    }

    // 5. Mark webhook as processed
    if (logId) {
      await supabase
        .from("webhook_logs")
        .update({
          status: "processed",
          processed_at: new Date().toISOString(),
        })
        .eq("id", logId)
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error("Webhook processing error:", error)

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error"

    // Update webhook log with error status
    if (logId) {
      await supabase
        .from("webhook_logs")
        .update({
          status: "error",
          error_message: errorMessage,
          processed_at: new Date().toISOString(),
        })
        .eq("id", logId)
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

async function handleSyncProject(
  supabase: ReturnType<typeof createAdminClient>,
  payload: Awaited<ReturnType<typeof raynetWebhookSchema.parse>>,
  logId: string | null
) {
  // --- Upsert products ---
  const productIdMap = new Map<number, string>() // raynet product id -> our product uuid

  if (payload.products?.items) {
    for (const item of payload.products.items) {
      const raynetProduct = item.priceListItem?.product
      if (!raynetProduct) continue

      const raynetProductId = raynetProduct.id

      // Try to find existing product by raynet_id
      const { data: existingProduct } = await supabase
        .from("products")
        .select("id")
        .eq("raynet_id", raynetProductId)
        .single()

      const productData = {
        name: item.name,
        category: raynetProduct.category?.value ?? null,
        product_line: raynetProduct.productLine?.value ?? null,
        sell_price: item.price,
      }

      let productId: string

      if (existingProduct) {
        // Update existing product
        await supabase
          .from("products")
          .update(productData)
          .eq("id", existingProduct.id)

        productId = existingProduct.id
      } else {
        // Create new product
        const { data: newProduct, error: insertError } = await supabase
          .from("products")
          .insert({
            ...productData,
            raynet_id: raynetProductId,
            sku: raynetProduct.code,
            unit: "ks" as const,
            is_active: true,
          })
          .select("id")
          .single()

        if (insertError || !newProduct) {
          console.error("Failed to create product:", insertError)
          continue
        }

        productId = newProduct.id
      }

      productIdMap.set(raynetProductId, productId)

      // Update stock.last_purchase_price if cost > 0
      if (item.cost > 0) {
        const { data: existingStock } = await supabase
          .from("stock")
          .select("id")
          .eq("product_id", productId)
          .single()

        if (existingStock) {
          await supabase
            .from("stock")
            .update({ last_purchase_price: item.cost })
            .eq("product_id", productId)
        }
      }
    }
  }

  // --- Parse deposit ---
  let depositWithVat: number | null = null
  if (payload.zaloha_vc_DPH !== undefined && payload.zaloha_vc_DPH !== null) {
    const parsed =
      typeof payload.zaloha_vc_DPH === "number"
        ? payload.zaloha_vc_DPH
        : parseFloat(payload.zaloha_vc_DPH)
    depositWithVat = isNaN(parsed) ? null : parsed
  }

  // --- Map project manager by full_name ---
  let projectManagerId: string | null = null
  if (payload.project_manager_email) {
    const { data: manager } = await supabase
      .from("profiles")
      .select("id")
      .eq("full_name", payload.project_manager_email)
      .single()

    if (manager) {
      projectManagerId = manager.id
    }
  }

  // --- Upsert order ---
  const orderData = {
    client_name: payload.client_name,
    client_email: payload.client_email ?? null,
    client_phone: payload.client_phone ?? null,
    contact_person: payload.contact_person ?? null,
    contact_phone: payload.contact_phone ?? null,
    category: payload.category ?? null,
    total_price_without_vat: payload.total_price_wo_vat,
    deposit_with_vat: depositWithVat,
    installation_address: payload.installation_address ?? null,
    address_street: payload.address_street ?? null,
    address_city: payload.address_city ?? null,
    address_zip: payload.address_zip ?? null,
    project_start_date: payload.project_start_date ?? null,
    project_end_date: payload.project_end_date ?? null,
    project_manager_id: projectManagerId,
    notes: payload.project_notes ?? null,
  }

  // Check if order with this raynet_id already exists
  const { data: existingOrder } = await supabase
    .from("orders")
    .select("id")
    .eq("raynet_id", payload.raynet_id)
    .single()

  let orderId: string

  if (existingOrder) {
    await supabase
      .from("orders")
      .update(orderData)
      .eq("id", existingOrder.id)

    orderId = existingOrder.id
  } else {
    const { data: newOrder, error: orderInsertError } = await supabase
      .from("orders")
      .insert({
        ...orderData,
        raynet_id: payload.raynet_id,
        status: "novy" as const,
      })
      .select("id")
      .single()

    if (orderInsertError || !newOrder) {
      throw new Error(
        `Failed to create order: ${orderInsertError?.message ?? "Unknown error"}`
      )
    }

    orderId = newOrder.id
  }

  // --- Create/update order items ---
  // Delete existing items for this order, then re-insert
  await supabase.from("order_items").delete().eq("order_id", orderId)

  if (payload.products?.items) {
    const orderItems = payload.products.items.map((item) => {
      const raynetProductId = item.priceListItem?.product?.id
      const matchedProductId = raynetProductId
        ? productIdMap.get(raynetProductId) ?? null
        : null

      return {
        order_id: orderId,
        name: item.name,
        unit_price: item.price,
        cost_price: item.cost,
        quantity: item.count,
        discount_percent: item.discountPercent,
        vat_rate: item.taxRate,
        unit: mapRaynetUnit(item.unit) as "ks" | "m" | "m2" | "hod" | "komplet",
        sort_order: item.sequenceNumber,
        product_id: matchedProductId,
        raynet_item_id: item.id,
      }
    })

    if (orderItems.length > 0) {
      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems)

      if (itemsError) {
        console.error("Failed to insert order items:", itemsError)
      }
    }
  }

  // --- Log activity ---
  await supabase.from("activity_log").insert({
    order_id: orderId,
    user_id: null,
    action: "webhook_sync",
    description: "Zakázka synchronizována z Raynet CRM",
    metadata: {
      raynet_id: payload.raynet_id,
      webhook_log_id: logId,
    },
  })
}
