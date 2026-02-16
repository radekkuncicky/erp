import type { Metadata } from "next"
import { getStockOverview, getStockMovements, getProducts } from "@/actions/stock"
import { StockPageClient } from "./stock-page-client"

export const metadata: Metadata = {
  title: "Sklad",
}

export default async function SkladPage() {
  const [stockResult, movementsResult, productsResult] = await Promise.all([
    getStockOverview(),
    getStockMovements({ limit: 50 }),
    getProducts(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sklad</h1>
        <p className="text-muted-foreground">Přehled skladu a produktový katalog</p>
      </div>
      <StockPageClient
        stock={stockResult.data ?? []}
        movements={movementsResult.data ?? []}
        products={productsResult.data ?? []}
        error={stockResult.error || movementsResult.error}
      />
    </div>
  )
}
