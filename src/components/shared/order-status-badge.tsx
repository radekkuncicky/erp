import { Badge } from "@/components/ui/badge"
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/lib/utils/format"
import { cn } from "@/lib/utils"
import type { OrderStatus } from "@/lib/supabase/types"

interface OrderStatusBadgeProps {
  status: OrderStatus
  className?: string
}

export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        ORDER_STATUS_COLORS[status],
        "font-medium",
        className
      )}
    >
      {ORDER_STATUS_LABELS[status] || status}
    </Badge>
  )
}
