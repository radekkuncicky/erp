"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { PHOTO_COMPRESSION_MAX_WIDTH, PHOTO_COMPRESSION_QUALITY } from "@/lib/utils/constants"

interface UploadResult {
  url: string
  fileName: string
  fileSize: number
}

async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement("canvas")
      let { width, height } = img

      if (width > PHOTO_COMPRESSION_MAX_WIDTH) {
        height = (height * PHOTO_COMPRESSION_MAX_WIDTH) / width
        width = PHOTO_COMPRESSION_MAX_WIDTH
      }

      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext("2d")
      if (!ctx) {
        reject(new Error("Canvas context not available"))
        return
      }
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob)
          else reject(new Error("Compression failed"))
        },
        "image/jpeg",
        PHOTO_COMPRESSION_QUALITY
      )
    }
    img.onerror = () => reject(new Error("Failed to load image"))
    img.src = URL.createObjectURL(file)
  })
}

function extractGPS(file: File): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    // Simple GPS extraction - in production use exifr library
    resolve(null)
  })
}

export function useUpload() {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  async function uploadPhoto(
    file: File,
    bucket: string,
    path: string
  ): Promise<UploadResult> {
    setUploading(true)
    setProgress(0)

    try {
      const supabase = createClient()

      // Compress if image
      let uploadBlob: Blob = file
      if (file.type.startsWith("image/")) {
        setProgress(20)
        uploadBlob = await compressImage(file)
      }

      setProgress(50)

      const fileName = `${path}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`

      const { error } = await supabase.storage
        .from(bucket)
        .upload(fileName, uploadBlob, {
          contentType: "image/jpeg",
          upsert: false,
        })

      if (error) throw error

      setProgress(90)

      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName)

      setProgress(100)

      return {
        url: urlData.publicUrl,
        fileName,
        fileSize: uploadBlob.size,
      }
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }

  async function uploadSignature(dataUrl: string, path: string): Promise<string> {
    setUploading(true)
    try {
      const supabase = createClient()
      const blob = await (await fetch(dataUrl)).blob()
      const fileName = `${path}/${Date.now()}-signature.png`

      const { error } = await supabase.storage
        .from("signatures")
        .upload(fileName, blob, {
          contentType: "image/png",
          upsert: false,
        })

      if (error) throw error

      const { data } = supabase.storage
        .from("signatures")
        .getPublicUrl(fileName)

      return data.publicUrl
    } finally {
      setUploading(false)
    }
  }

  return { uploadPhoto, uploadSignature, uploading, progress }
}
