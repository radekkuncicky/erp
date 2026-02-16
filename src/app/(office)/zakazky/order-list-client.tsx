"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useTransition } from "react"
import { OrderTable } from "@/components/office/order-table"

interface OrderListClientProps {
  initialOrders: any[]
  initialCount: number
  initialPage: number
  initialSearch: string
  initialStatus: string | null
  error: string | null
}

export function OrderListClient({
  initialOrders,
  initialCount,
  initialPage,
  initialSearch,
  initialStatus,
  error,
}: OrderListClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") {
          params.delete(key)
        } else {
          params.set(key, value)
        }
      }
      startTransition(() => {
        router.push(`/zakazky?${params.toString()}`)
      })
    },
    [router, searchParams, startTransition]
  )

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/50 bg-destructive/5 p-8 text-center">
        <p className="text-destructive">{error}</p>
      </div>
    )
  }

  return (
    <div className={isPending ? "opacity-70 pointer-events-none transition-opacity" : ""}>
      <OrderTable
        orders={initialOrders as any}
        totalCount={initialCount}
        page={initialPage}
        pageSize={20}
        onPageChange={(page) => updateParams({ page: page.toString() })}
        onSearch={(query) => updateParams({ search: query, page: null })}
        onStatusFilter={(status) => updateParams({ status, page: null })}
        searchQuery={initialSearch}
        statusFilter={initialStatus}
      />
    </div>
  )
}
