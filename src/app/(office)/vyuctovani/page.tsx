import type { Metadata } from "next"
import { getVyuctovaniList } from "@/actions/vyuctovani"
import { VyuctovaniListClient } from "./vyuctovani-list-client"

export const metadata: Metadata = {
  title: "Vyúčtování",
}

export default async function VyuctovaniPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string }>
}) {
  const params = await searchParams
  const result = await getVyuctovaniList({
    status: params.status,
    search: params.search,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Vyúčtování</h1>
        <p className="text-muted-foreground">Přehled vyúčtování zakázek</p>
      </div>
      <VyuctovaniListClient
        items={result.data ?? []}
        error={result.error}
        initialStatus={params.status || null}
        initialSearch={params.search || ""}
      />
    </div>
  )
}
