import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Detail zakázky",
}

export default async function SiteZakazkaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold tracking-tight">Zakázka</h1>
      <p className="text-sm text-muted-foreground">ID: {id}</p>
      <div className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
        Připojte Supabase pro zobrazení detailu
      </div>
    </div>
  )
}
