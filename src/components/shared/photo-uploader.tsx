"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { useUpload } from "@/lib/hooks/use-upload"
import { useToast } from "@/lib/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import { Camera, Upload, X, Loader2, Image as ImageIcon } from "lucide-react"
import type { DocumentType } from "@/lib/supabase/types"

const PHOTO_TYPES: Record<string, string> = {
  foto_pred: "Před instalací",
  foto_v_prubehu: "V průběhu",
  foto_po: "Po instalaci",
  ostatni: "Ostatní",
}

interface PhotoUploaderProps {
  orderId: string
  onUploadComplete?: () => void
}

export function PhotoUploader({ orderId, onUploadComplete }: PhotoUploaderProps) {
  const [photos, setPhotos] = useState<Array<{ url: string; type: string; id?: string }>>([])
  const [photoType, setPhotoType] = useState<string>("foto_v_prubehu")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { uploadPhoto, uploading, progress } = useUpload()
  const { toast } = useToast()

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return

    for (const file of Array.from(files)) {
      try {
        const result = await uploadPhoto(file, "photos", `orders/${orderId}`)

        // Save document record
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        const { data: doc, error } = await supabase
          .from("documents")
          .insert({
            order_id: orderId,
            document_type: photoType as DocumentType,
            file_name: file.name,
            file_url: result.url,
            file_size: result.fileSize,
            mime_type: "image/jpeg",
            uploaded_by: user?.id || "",
          })
          .select("id")
          .single()

        if (error) throw error

        setPhotos(prev => [...prev, { url: result.url, type: photoType, id: doc?.id }])
        toast({ title: "Foto nahráno", description: PHOTO_TYPES[photoType] })
      } catch (err) {
        toast({
          title: "Chyba při nahrávání",
          description: err instanceof Error ? err.message : "Neznámá chyba",
          variant: "destructive",
        })
      }
    }

    if (fileInputRef.current) fileInputRef.current.value = ""
    onUploadComplete?.()
  }

  async function removePhoto(index: number) {
    const photo = photos[index]
    if (photo.id) {
      const supabase = createClient()
      await supabase.from("documents").delete().eq("id", photo.id)
    }
    setPhotos(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={photoType} onValueChange={setPhotoType}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(PHOTO_TYPES).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />

        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {progress}%
            </>
          ) : (
            <>
              <Camera className="h-4 w-4" />
              Vyfotit
            </>
          )}
        </Button>
      </div>

      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map((photo, index) => (
            <div key={index} className="relative group">
              <img
                src={photo.url}
                alt={`Foto ${index + 1}`}
                className="w-full h-32 object-cover rounded-lg border"
              />
              <div className="absolute top-1 left-1">
                <span className="text-xs bg-black/60 text-white px-2 py-0.5 rounded">
                  {PHOTO_TYPES[photo.type]}
                </span>
              </div>
              <button
                onClick={() => removePhoto(index)}
                className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {photos.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Zatím žádné fotografie</p>
            <p className="text-xs">Vyfotit můžete tlačítkem výše</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
