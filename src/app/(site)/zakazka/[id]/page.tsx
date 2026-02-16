import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getOrder } from "@/actions/orders"
import { MobileOrderDetail } from "./mobile-order-detail"

export const metadata: Metadata = {
  title: "Detail zakázky",
}

export default async function MobileZakazkaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const result = await getOrder(id)

  if (result.error || !result.data) {
    notFound()
  }

  return <MobileOrderDetail order={result.data as any} />
}
