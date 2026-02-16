"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { SignaturePad } from "@/components/shared/signature-pad"
import { useUpload } from "@/lib/hooks/use-upload"
import { useToast } from "@/lib/hooks/use-toast"
import { createProtocol, updateProtocolItems, completeProtocol } from "@/actions/protocols"
import { formatCurrency, UNIT_LABELS } from "@/lib/utils/format"
import { ArrowLeft, ArrowRight, Check, Loader2, ClipboardCheck } from "lucide-react"
import Link from "next/link"

const STEPS = ["Info", "Položky", "Poznámky", "Podpisy", "Shrnutí"]

interface ProtocolWizardProps {
  order: any
  existingProtocol: any | null
}

export function ProtocolWizard({ order, existingProtocol }: ProtocolWizardProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { uploadSignature, uploading } = useUpload()

  const [step, setStep] = useState(0)
  const [protocolId, setProtocolId] = useState<string | null>(existingProtocol?.id || null)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [handoverDate, setHandoverDate] = useState(new Date().toISOString().split("T")[0])
  const [notes, setNotes] = useState(existingProtocol?.notes || "")
  const [items, setItems] = useState<Array<{ id: string; name: string; quantity: number; is_installed: boolean; notes: string }>>(
    existingProtocol?.protocol_items?.map((pi: any) => ({
      id: pi.id,
      name: pi.name,
      quantity: pi.quantity,
      is_installed: pi.is_installed,
      notes: pi.notes || "",
    })) ||
    (order.order_items || []).map((oi: any) => ({
      id: oi.id,
      name: oi.name,
      quantity: oi.quantity,
      is_installed: false,
      notes: "",
    }))
  )
  const [clientSignature, setClientSignature] = useState<string | null>(null)
  const [techSignature, setTechSignature] = useState<string | null>(null)

  async function handleCreateProtocol() {
    if (protocolId) {
      setStep(1)
      return
    }
    setSubmitting(true)
    const result = await createProtocol(order.id)
    setSubmitting(false)
    if (result.error) {
      toast({ title: "Chyba", description: result.error, variant: "destructive" })
      return
    }
    setProtocolId(result.data?.id || null)
    // Update item IDs from newly created protocol items
    if (result.data?.id) {
      // Items will be auto-populated, fetch them
      setStep(1)
    }
  }

  function toggleItem(index: number) {
    setItems(prev => prev.map((item, i) =>
      i === index ? { ...item, is_installed: !item.is_installed } : item
    ))
  }

  function updateItemNotes(index: number, notes: string) {
    setItems(prev => prev.map((item, i) =>
      i === index ? { ...item, notes } : item
    ))
  }

  async function handleComplete() {
    if (!protocolId) return
    setSubmitting(true)

    try {
      // Save item states
      await updateProtocolItems(protocolId, items.map(i => ({
        id: i.id,
        is_installed: i.is_installed,
        notes: i.notes || undefined,
      })))

      // Upload signatures
      let clientSigUrl: string | undefined
      let techSigUrl: string | undefined

      if (clientSignature) {
        clientSigUrl = await uploadSignature(clientSignature, `protocols/${protocolId}`)
      }
      if (techSignature) {
        techSigUrl = await uploadSignature(techSignature, `protocols/${protocolId}`)
      }

      // Complete protocol
      const result = await completeProtocol(protocolId, {
        handover_date: handoverDate,
        notes: notes || undefined,
        client_signature_url: clientSigUrl,
        technician_signature_url: techSigUrl,
      })

      if (result.error) {
        toast({ title: "Chyba", description: result.error, variant: "destructive" })
      } else {
        toast({ title: "Protokol dokončen", description: "Vyúčtování bylo automaticky vytvořeno" })
        router.push(`/zakazka/${order.id}`)
        router.refresh()
      }
    } catch (err) {
      toast({ title: "Chyba", description: "Neočekávaná chyba", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  const installedCount = items.filter(i => i.is_installed).length

  return (
    <div className="space-y-4 pb-4">
      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2">
          <Link href={`/zakazka/${order.id}`}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Zpět
          </Link>
        </Button>
        <h1 className="text-lg font-bold">Předávací protokol</h1>
        <p className="text-sm text-muted-foreground">{order.order_number} · {order.client_name}</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-1">
        {STEPS.map((name, i) => (
          <div key={name} className="flex items-center flex-1">
            <button
              onClick={() => i <= step && setStep(i)}
              className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium transition-colors ${
                i === step
                  ? "bg-nanto-yellow text-nanto-black"
                  : i < step
                  ? "bg-green-500 text-white"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              {i < step ? <Check className="h-3 w-3" /> : i + 1}
            </button>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 ${i < step ? "bg-green-500" : "bg-secondary"}`} />
            )}
          </div>
        ))}
      </div>
      <p className="text-center text-sm font-medium">{STEPS[step]}</p>

      {/* Step 0: Info */}
      {step === 0 && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-2">
              <Label>Datum předání</Label>
              <Input type="date" value={handoverDate} onChange={(e) => setHandoverDate(e.target.value)} />
            </div>
            <div className="space-y-1 text-sm">
              <p><span className="text-muted-foreground">Klient:</span> {order.client_name}</p>
              <p><span className="text-muted-foreground">Zakázka:</span> {order.order_number}</p>
              <p><span className="text-muted-foreground">Položek:</span> {items.length}</p>
              <p><span className="text-muted-foreground">Celkem:</span> {formatCurrency(order.total_price_without_vat)}</p>
            </div>
            <Button onClick={handleCreateProtocol} disabled={submitting} className="w-full">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              Pokračovat
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 1: Items checklist */}
      {step === 1 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Kontrolní seznam</CardTitle>
              <Badge>{installedCount}/{items.length}</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-2">
            {items.map((item, index) => (
              <div key={item.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggleItem(index)}
                    className={`mt-0.5 h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                      item.is_installed
                        ? "bg-green-500 border-green-500 text-white"
                        : "border-gray-300"
                    }`}
                  >
                    {item.is_installed && <Check className="h-3 w-3" />}
                  </button>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.quantity}x</p>
                  </div>
                </div>
                <Input
                  placeholder="Poznámka k položce..."
                  value={item.notes}
                  onChange={(e) => updateItemNotes(index, e.target.value)}
                  className="text-sm h-8"
                />
              </div>
            ))}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep(0)} className="flex-1">
                <ArrowLeft className="h-4 w-4" /> Zpět
              </Button>
              <Button onClick={() => setStep(2)} className="flex-1">
                Pokračovat <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Notes */}
      {step === 2 && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-2">
              <Label>Poznámky technika</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Poznámky k instalaci, případné problémy, doporučení..."
                rows={5}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                <ArrowLeft className="h-4 w-4" /> Zpět
              </Button>
              <Button onClick={() => setStep(3)} className="flex-1">
                Pokračovat <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Signatures */}
      {step === 3 && (
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <SignaturePad
                label="Podpis klienta"
                onSave={(dataUrl) => setClientSignature(dataUrl)}
              />
              {clientSignature && (
                <p className="text-xs text-green-600 mt-1">Podpis klienta uložen</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <SignaturePad
                label="Podpis technika"
                onSave={(dataUrl) => setTechSignature(dataUrl)}
              />
              {techSignature && (
                <p className="text-xs text-green-600 mt-1">Podpis technika uložen</p>
              )}
            </CardContent>
          </Card>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
              <ArrowLeft className="h-4 w-4" /> Zpět
            </Button>
            <Button onClick={() => setStep(4)} className="flex-1">
              Pokračovat <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Summary + Submit */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Shrnutí protokolu
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-1 border-b">
                <span className="text-muted-foreground">Datum předání</span>
                <span className="font-medium">{handoverDate}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-muted-foreground">Nainstalováno</span>
                <span className="font-medium">{installedCount} z {items.length} položek</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-muted-foreground">Podpis klienta</span>
                <span className="font-medium">{clientSignature ? "Ano" : "Ne"}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-muted-foreground">Podpis technika</span>
                <span className="font-medium">{techSignature ? "Ano" : "Ne"}</span>
              </div>
              {notes && (
                <div className="py-2">
                  <p className="text-muted-foreground mb-1">Poznámky:</p>
                  <p className="text-sm">{notes}</p>
                </div>
              )}
            </div>

            {items.some(i => !i.is_installed) && (
              <div className="rounded-lg bg-orange-50 border border-orange-200 p-3">
                <p className="text-sm text-orange-800 font-medium">Nenainstalované položky:</p>
                <ul className="text-sm text-orange-700 mt-1 space-y-0.5">
                  {items.filter(i => !i.is_installed).map(i => (
                    <li key={i.id}>• {i.name} ({i.quantity}x)</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep(3)} className="flex-1">
                <ArrowLeft className="h-4 w-4" /> Zpět
              </Button>
              <Button
                onClick={handleComplete}
                disabled={submitting || uploading}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {submitting || uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Dokončit a odeslat
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
