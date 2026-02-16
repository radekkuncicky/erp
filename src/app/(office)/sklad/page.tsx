import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Sklad",
}

export default function SkladPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sklad</h1>
        <p className="text-muted-foreground">Přehled skladu a produktový katalog</p>
      </div>
      <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
        Připojte Supabase pro zobrazení skladu
      </div>
    </div>
  )
}
