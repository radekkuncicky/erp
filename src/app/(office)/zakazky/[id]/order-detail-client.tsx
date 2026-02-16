"use client"

import { useRouter } from "next/navigation"
import { OrderDetail } from "@/components/office/order-detail"
import { updateOrderStatus } from "@/actions/orders"
import { useToast } from "@/lib/hooks/use-toast"
import { ORDER_STATUS_LABELS } from "@/lib/utils/format"
import type { OrderStatus } from "@/lib/supabase/types"

interface OrderDetailClientProps {
  order: any
}

export function OrderDetailClient({ order }: OrderDetailClientProps) {
  const router = useRouter()
  const { toast } = useToast()

  async function handleStatusChange(newStatus: OrderStatus) {
    const result = await updateOrderStatus(order.id, newStatus)
    if (result.error) {
      toast({
        title: "Chyba",
        description: result.error,
        variant: "destructive",
      })
    } else {
      toast({
        title: "Stav změněn",
        description: `Zakázka přesunuta do stavu "${ORDER_STATUS_LABELS[newStatus]}"`,
      })
      router.refresh()
    }
  }

  return <OrderDetail order={order} onStatusChange={handleStatusChange} />
}
