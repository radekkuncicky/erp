import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Reporty",
}

export default function ReportyPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reporty</h1>
        <p className="text-muted-foreground">Grafy a exporty</p>
      </div>
      <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
        Připojte Supabase pro zobrazení reportů
      </div>
    </div>
  )
}
