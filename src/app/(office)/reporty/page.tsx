import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { ReportsClient } from "./reports-client"

export const metadata: Metadata = {
  title: "Reporty",
}

async function getReportsData() {
  const supabase = await createClient()

  const [ordersRes, vyuctovaniRes, stockRes] = await Promise.all([
    supabase.from("orders").select("id, status, category, total_price_without_vat, created_at, project_start_date"),
    supabase.from("vyuctovani").select("id, status, total_without_vat, total_with_vat, material_total, labor_total, other_costs, deposit_paid, remaining_amount, created_at"),
    supabase.from("stock").select("id, on_hand, available, avg_purchase_price, last_purchase_price, products(name, category, sell_price)"),
  ])

  return {
    orders: ordersRes.data || [],
    vyuctovani: vyuctovaniRes.data || [],
    stock: stockRes.data || [],
  }
}

export default async function ReportyPage() {
  const data = await getReportsData()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reporty</h1>
        <p className="text-muted-foreground">Analýzy a přehledy</p>
      </div>
      <ReportsClient data={data} />
    </div>
  )
}
