import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getOrder } from "@/actions/orders"
import { createClient } from "@/lib/supabase/server"
import { PhotoPageClient } from "./photo-page-client"

export const metadata: Metadata = {
  title: "Fotodokumentace",
}

export default async function FotkyPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const result = await getOrder(id)
  if (result.error || !result.data) notFound()

  const supabase = await createClient()
  const { data: existingPhotos } = await supabase
    .from("documents")
    .select("id, file_url, document_type, file_name, created_at")
    .eq("order_id", id)
    .in("document_type", ["foto_pred", "foto_v_prubehu", "foto_po", "ostatni"])
    .order("created_at", { ascending: false })

  return (
    <PhotoPageClient
      orderId={id}
      orderNumber={(result.data as any).order_number}
      existingPhotos={existingPhotos || []}
    />
  )
}
