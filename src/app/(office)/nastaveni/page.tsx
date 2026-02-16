import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Nastavení",
}

export default function NastaveniPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Nastavení</h1>
        <p className="text-muted-foreground">Uživatelé, webhook a konfigurace</p>
      </div>
      <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
        Připojte Supabase pro nastavení
      </div>
    </div>
  )
}
