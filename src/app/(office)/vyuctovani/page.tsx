import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Vyúčtování",
}

export default function VyuctovaniPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Vyúčtování</h1>
        <p className="text-muted-foreground">Správa vyúčtování zakázek</p>
      </div>
      <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
        Připojte Supabase pro zobrazení vyúčtování
      </div>
    </div>
  )
}
