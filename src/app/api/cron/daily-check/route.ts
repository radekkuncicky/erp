import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createAdminClient()
  const today = new Date().toISOString().split("T")[0]
  const alerts: string[] = []

  // 1. Check overdue orders (past project_end_date, not completed)
  const { data: overdueOrders } = await supabase
    .from("orders")
    .select("id, order_number, client_name, project_end_date")
    .lt("project_end_date", today)
    .not("status", "in", '("dokonceny","vyuctovano")')

  if (overdueOrders && overdueOrders.length > 0) {
    alerts.push(`${overdueOrders.length} zakázek po termínu`)
    for (const order of overdueOrders) {
      await supabase.from("activity_log").insert({
        order_id: order.id,
        user_id: null,
        action: "overdue_alert",
        description: `Zakázka ${order.order_number} je po termínu (konec: ${order.project_end_date})`,
      })
    }
  }

  // 2. Check low stock
  const { data: stockItems } = await supabase
    .from("stock")
    .select("id, available, min_quantity, products(name, sku)")

  const lowStock = (stockItems || []).filter(s => s.min_quantity > 0 && s.available <= s.min_quantity)
  if (lowStock.length > 0) {
    alerts.push(`${lowStock.length} položek s nízkým stavem skladu`)
  }

  // 3. Check stale draft protocols (older than 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data: staleProtocols } = await supabase
    .from("handover_protocols")
    .select("id, protocol_number, order_id")
    .eq("status", "koncept")
    .lt("created_at", sevenDaysAgo)

  if (staleProtocols && staleProtocols.length > 0) {
    alerts.push(`${staleProtocols.length} rozpracovaných protokolů starších než 7 dní`)
  }

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    alerts,
    details: {
      overdue_orders: overdueOrders?.length || 0,
      low_stock_items: lowStock.length,
      stale_protocols: staleProtocols?.length || 0,
    },
  })
}
