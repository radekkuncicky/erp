import type { Metadata } from "next"
import { getOrders } from "@/actions/orders"
import { OrderListClient } from "./order-list-client"

export const metadata: Metadata = {
  title: "Zakázky",
}

export default async function ZakazkyPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string; page?: string }>
}) {
  const params = await searchParams
  const page = parseInt(params.page || "1", 10)
  const result = await getOrders({
    status: (params.status as any) || null,
    search: params.search || null,
    page,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Zakázky</h1>
        <p className="text-muted-foreground">Správa zakázek a objednávek</p>
      </div>
      <OrderListClient
        initialOrders={result.data?.orders ?? []}
        initialCount={result.data?.count ?? 0}
        initialPage={page}
        initialSearch={params.search || ""}
        initialStatus={params.status || null}
        error={result.error}
      />
    </div>
  )
}
