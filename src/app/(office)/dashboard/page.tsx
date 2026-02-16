import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ClipboardList, Package, Receipt, TrendingUp, AlertTriangle } from "lucide-react"
import { formatCurrency, formatRelativeTime, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/lib/utils/format"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Dashboard",
}

async function getDashboardData() {
  const supabase = await createClient()

  const [ordersRes, stockRes, vyuctovaniRes, recentActivityRes, lowStockRes] = await Promise.all([
    supabase.from("orders").select("id, status, total_price_without_vat", { count: "exact" }),
    supabase.from("stock").select("id, on_hand, available, min_quantity, products(name)"),
    supabase.from("vyuctovani").select("id, status, remaining_amount", { count: "exact" }).eq("status", "ke_schvaleni"),
    supabase.from("activity_log").select("id, action, description, created_at, order_id, user:profiles!activity_log_user_id_fkey(full_name)").order("created_at", { ascending: false }).limit(10),
    supabase.from("stock").select("id, available, min_quantity, products(name, sku)"),
  ])

  const orders = ordersRes.data || []
  const activeOrders = orders.filter(o => !["dokonceny", "vyuctovano"].includes(o.status))
  const monthlyRevenue = orders.reduce((sum, o) => sum + (o.total_price_without_vat || 0), 0)
  const stockItems = stockRes.data || []
  const totalStockItems = stockItems.reduce((sum, s) => sum + s.on_hand, 0)
  const pendingSettlements = vyuctovaniRes.count || 0
  const recentActivity = recentActivityRes.data || []
  const lowStock = (lowStockRes.data || []).filter(s => s.min_quantity > 0 && s.available <= s.min_quantity)

  // Count orders by status
  const statusCounts: Record<string, number> = {}
  for (const order of orders) {
    statusCounts[order.status] = (statusCounts[order.status] || 0) + 1
  }

  return { activeOrders: activeOrders.length, totalStockItems, pendingSettlements, monthlyRevenue, recentActivity, statusCounts, lowStock }
}

export default async function DashboardPage() {
  const data = await getDashboardData()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Přehled zakázek a skladů</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktivní zakázky</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.activeOrders}</div>
            <p className="text-xs text-muted-foreground">rozpracovaných</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Položky na skladě</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalStockItems}</div>
            <p className="text-xs text-muted-foreground">celkem kusů</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">K vyúčtování</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.pendingSettlements}</div>
            <p className="text-xs text-muted-foreground">čeká na schválení</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Celkový obrat</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.monthlyRevenue)}</div>
            <p className="text-xs text-muted-foreground">všechny zakázky</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Status overview */}
        <Card>
          <CardHeader>
            <CardTitle>Zakázky dle stavu</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(data.statusCounts).map(([status, count]) => (
                <Link key={status} href={`/zakazky?status=${status}`} className="flex items-center justify-between py-1.5 hover:bg-secondary/50 rounded px-2 -mx-2 transition-colors">
                  <Badge className={ORDER_STATUS_COLORS[status]}>{ORDER_STATUS_LABELS[status] || status}</Badge>
                  <span className="text-sm font-medium">{count}</span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent activity */}
        <Card>
          <CardHeader>
            <CardTitle>Poslední aktivita</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground">Žádná aktivita</p>
            ) : (
              <div className="space-y-3">
                {data.recentActivity.map((entry: any) => (
                  <div key={entry.id} className="flex gap-3">
                    <div className="mt-1.5 h-2 w-2 rounded-full bg-nanto-yellow shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{entry.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {(entry.user as any)?.full_name || "Systém"} · {formatRelativeTime(entry.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low stock alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Nízký stav skladu
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.lowStock.length === 0 ? (
              <p className="text-sm text-muted-foreground">Žádné upozornění</p>
            ) : (
              <div className="space-y-2">
                {data.lowStock.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between py-1.5">
                    <span className="text-sm truncate">{(item.products as any)?.name}</span>
                    <Badge variant="destructive">{item.available} ks</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
