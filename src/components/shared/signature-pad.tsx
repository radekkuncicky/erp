"use client"

import { useRef, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { RotateCcw, Check } from "lucide-react"

interface SignaturePadProps {
  onSave: (dataUrl: string) => void
  label?: string
}

export function SignaturePad({ onSave, label = "Podpis" }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasDrawn, setHasDrawn] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * 2
    canvas.height = rect.height * 2
    ctx.scale(2, 2)

    // Style
    ctx.strokeStyle = "#111111"
    ctx.lineWidth = 2
    ctx.lineCap = "round"
    ctx.lineJoin = "round"

    // White background
    ctx.fillStyle = "#FFFFFF"
    ctx.fillRect(0, 0, rect.width, rect.height)

    // Signature line
    ctx.strokeStyle = "#DDDDDD"
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(20, rect.height - 40)
    ctx.lineTo(rect.width - 20, rect.height - 40)
    ctx.stroke()

    // Reset for drawing
    ctx.strokeStyle = "#111111"
    ctx.lineWidth = 2
  }, [])

  function getCoords(e: React.TouchEvent | React.MouseEvent) {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()

    if ("touches" in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      }
    }
    return {
      x: (e as React.MouseEvent).clientX - rect.left,
      y: (e as React.MouseEvent).clientY - rect.top,
    }
  }

  function startDrawing(e: React.TouchEvent | React.MouseEvent) {
    e.preventDefault()
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!ctx) return

    setIsDrawing(true)
    setHasDrawn(true)
    const { x, y } = getCoords(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  function draw(e: React.TouchEvent | React.MouseEvent) {
    e.preventDefault()
    if (!isDrawing) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!ctx) return

    const { x, y } = getCoords(e)
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  function stopDrawing(e: React.TouchEvent | React.MouseEvent) {
    e.preventDefault()
    setIsDrawing(false)
  }

  function clear() {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!ctx || !canvas) return

    const rect = canvas.getBoundingClientRect()
    ctx.fillStyle = "#FFFFFF"
    ctx.fillRect(0, 0, rect.width, rect.height)

    // Redraw signature line
    ctx.strokeStyle = "#DDDDDD"
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(20, rect.height - 40)
    ctx.lineTo(rect.width - 20, rect.height - 40)
    ctx.stroke()

    ctx.strokeStyle = "#111111"
    ctx.lineWidth = 2
    setHasDrawn(false)
  }

  function save() {
    const canvas = canvasRef.current
    if (!canvas) return
    const dataUrl = canvas.toDataURL("image/png")
    onSave(dataUrl)
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">{label}</p>
      <div className="border rounded-xl overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          className="w-full touch-none"
          style={{ height: "180px" }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={clear}>
          <RotateCcw className="h-4 w-4" />
          Vymazat
        </Button>
        <Button size="sm" onClick={save} disabled={!hasDrawn}>
          <Check className="h-4 w-4" />
          Potvrdit podpis
        </Button>
      </div>
    </div>
  )
}
