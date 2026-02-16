import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Zakázky",
}

export default function ZakazkyPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Zakázky</h1>
          <p className="text-muted-foreground">Správa zakázek a objednávek</p>
        </div>
      </div>
      <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
        Připojte Supabase pro zobrazení zakázek
      </div>
    </div>
  )
}
