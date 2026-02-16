"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { PhotoUploader } from "@/components/shared/photo-uploader"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

const PHOTO_TYPE_LABELS: Record<string, string> = {
  foto_pred: "Před instalací",
  foto_v_prubehu: "V průběhu",
  foto_po: "Po instalaci",
  ostatni: "Ostatní",
}

interface PhotoPageClientProps {
  orderId: string
  orderNumber: string
  existingPhotos: any[]
}

export function PhotoPageClient({ orderId, orderNumber, existingPhotos }: PhotoPageClientProps) {
  const router = useRouter()

  return (
    <div className="space-y-4">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2">
          <Link href={`/zakazka/${orderId}`}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Zpět
          </Link>
        </Button>
        <h1 className="text-lg font-bold">Fotodokumentace</h1>
        <p className="text-sm text-muted-foreground">{orderNumber}</p>
      </div>

      <PhotoUploader orderId={orderId} onUploadComplete={() => router.refresh()} />

      {/* Existing photos */}
      {existingPhotos.length > 0 && (
        <div>
          <h2 className="text-sm font-medium mb-3">Nahrané fotografie ({existingPhotos.length})</h2>
          <div className="grid grid-cols-2 gap-2">
            {existingPhotos.map((photo: any) => (
              <div key={photo.id} className="relative">
                <img
                  src={photo.file_url}
                  alt={photo.file_name}
                  className="w-full h-28 object-cover rounded-lg border"
                />
                <span className="absolute bottom-1 left-1 text-xs bg-black/60 text-white px-1.5 py-0.5 rounded">
                  {PHOTO_TYPE_LABELS[photo.document_type] || photo.document_type}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
