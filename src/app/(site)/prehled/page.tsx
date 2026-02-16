import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Přehled",
}

export default function PrehledPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold tracking-tight">Moje zakázky</h1>
      <div className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
        Připojte Supabase pro zobrazení zakázek
      </div>
    </div>
  )
}
