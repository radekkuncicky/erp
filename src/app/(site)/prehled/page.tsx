import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatDate, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/lib/utils/format"
import { Calendar, MapPin, User } from "lucide-react"

export const metadata: Metadata = {
  title: "Přehled",
}

export default async function PrehledPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return <div className="p-4 text-center text-muted-foreground">Přihlaste se pro zobrazení zakázek</div>
  }

  // Get orders assigned to this technician
  const { data: assignments } = await supabase
    .from("order_technicians")
    .select("order_id")
    .eq("technician_id", user.id)

  const orderIds = assignments?.map(a => a.order_id) || []

  let orders: any[] = []
  if (orderIds.length > 0) {
    const { data } = await supabase
      .from("orders")
      .select("id, order_number, client_name, client_phone, category, status, total_price_without_vat, project_start_date, installation_address, address_city")
      .in("id", orderIds)
      .not("status", "eq", "dokonceny")
      .order("project_start_date", { ascending: true, nullsFirst: false })
    orders = data || []
  }

  // Also get orders where user is not explicitly assigned but for admins/PMs show all
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "technik" && orderIds.length === 0) {
    const { data } = await supabase
      .from("orders")
      .select("id, order_number, client_name, client_phone, category, status, total_price_without_vat, project_start_date, installation_address, address_city")
      .not("status", "in", '("dokonceny","vyuctovano")')
      .order("project_start_date", { ascending: true, nullsFirst: false })
      .limit(20)
    orders = data || []
  }

  return (
    <div className="space-y-4">
      <div className="px-1">
        <h1 className="text-xl font-bold tracking-tight">Moje zakázky</h1>
        <p className="text-sm text-muted-foreground">{orders.length} aktivních</p>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nemáte přiřazené žádné aktivní zakázky
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link key={order.id} href={`/zakazka/${order.id}`}>
              <Card className="active:scale-[0.98] transition-transform">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{order.client_name}</p>
                      <p className="text-xs text-muted-foreground">{order.order_number}</p>
                    </div>
                    <Badge className={ORDER_STATUS_COLORS[order.status] + " shrink-0"}>
                      {ORDER_STATUS_LABELS[order.status]}
                    </Badge>
                  </div>

                  <div className="mt-3 space-y-1.5">
                    {order.category && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-3.5 w-3.5" />
                        <span>{order.category}</span>
                      </div>
                    )}
                    {(order.installation_address || order.address_city) && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" />
                        <span className="truncate">{order.installation_address || order.address_city}</span>
                      </div>
                    )}
                    {order.project_start_date && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{formatDate(order.project_start_date)}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 pt-3 border-t flex justify-between items-center">
                    <span className="text-sm font-medium">{formatCurrency(order.total_price_without_vat)}</span>
                    <span className="text-xs text-nanto-yellow font-medium">Zobrazit →</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
