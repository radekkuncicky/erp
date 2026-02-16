import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Detail zakázky",
}

export default async function ZakazkaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Detail zakázky</h1>
        <p className="text-muted-foreground">ID: {id}</p>
      </div>
      <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
        Připojte Supabase pro zobrazení detailu
      </div>
    </div>
  )
}
