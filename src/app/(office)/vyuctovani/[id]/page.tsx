import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getVyuctovani } from "@/actions/vyuctovani"
import { VyuctovaniDetailClient } from "./vyuctovani-detail-client"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export const metadata: Metadata = {
  title: "Detail vyúčtování",
}

export default async function VyuctovaniDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const result = await getVyuctovani(id)

  if (result.error || !result.data) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2">
          <Link href="/vyuctovani">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Zpět na vyúčtování
          </Link>
        </Button>
      </div>
      <VyuctovaniDetailClient vyuctovani={result.data as any} />
    </div>
  )
}
