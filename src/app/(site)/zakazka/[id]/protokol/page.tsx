import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getOrder } from "@/actions/orders"
import { createClient } from "@/lib/supabase/server"
import { ProtocolWizard } from "./protocol-wizard"

export const metadata: Metadata = {
  title: "Předávací protokol",
}

export default async function ProtokolPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const result = await getOrder(id)
  if (result.error || !result.data) notFound()

  const order = result.data as any

  // Check for existing draft protocol
  const supabase = await createClient()
  const { data: existingProtocol } = await supabase
    .from("handover_protocols")
    .select("*, protocol_items (*)")
    .eq("order_id", id)
    .in("status", ["koncept", "vyplneny"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  return (
    <ProtocolWizard
      order={order}
      existingProtocol={existingProtocol}
    />
  )
}
