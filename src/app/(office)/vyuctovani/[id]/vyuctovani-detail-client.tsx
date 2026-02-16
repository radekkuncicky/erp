"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter,
} from "@/components/ui/table"
import { formatCurrency, formatDate, UNIT_LABELS } from "@/lib/utils/format"
import { updateVyuctovani, approveVyuctovani, rejectVyuctovani } from "@/actions/vyuctovani"
import { useToast } from "@/lib/hooks/use-toast"
import {
  Receipt, CheckCircle, XCircle, Edit, Save, Loader2,
} from "lucide-react"
import Link from "next/link"

const STATUS_LABELS: Record<string, string> = {
  koncept: "Koncept",
  ke_schvaleni: "Ke schválení",
  schvaleno: "Schváleno",
  zamitnuto: "Zamítnuto",
}

const STATUS_COLORS: Record<string, string> = {
  koncept: "bg-gray-100 text-gray-800",
  ke_schvaleni: "bg-yellow-100 text-yellow-800",
  schvaleno: "bg-green-100 text-green-800",
  zamitnuto: "bg-red-100 text-red-800",
}

interface VyuctovaniDetailClientProps {
  vyuctovani: any
}

export function VyuctovaniDetailClient({ vyuctovani }: VyuctovaniDetailClientProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [editing, setEditing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    material_total: vyuctovani.material_total,
    labor_total: vyuctovani.labor_total,
    other_costs: vyuctovani.other_costs,
    notes: vyuctovani.notes || "",
  })

  const order = vyuctovani.orders as any
  const protocol = vyuctovani.handover_protocols as any
  const approver = vyuctovani.profiles as any

  async function handleSave() {
    setSubmitting(true)
    const result = await updateVyuctovani(vyuctovani.id, {
      material_total: form.material_total,
      labor_total: form.labor_total,
      other_costs: form.other_costs,
      notes: form.notes || undefined,
    })
    setSubmitting(false)
    if (result.error) {
      toast({ title: "Chyba", description: result.error, variant: "destructive" })
    } else {
      toast({ title: "Uloženo" })
      setEditing(false)
      router.refresh()
    }
  }

  async function handleApprove() {
    setSubmitting(true)
    const result = await approveVyuctovani(vyuctovani.id)
    setSubmitting(false)
    if (result.error) {
      toast({ title: "Chyba", description: result.error, variant: "destructive" })
    } else {
      toast({ title: "Vyúčtování schváleno" })
      router.refresh()
    }
  }

  async function handleReject() {
    const reason = prompt("Důvod zamítnutí:")
    if (reason === null) return
    setSubmitting(true)
    const result = await rejectVyuctovani(vyuctovani.id, reason || undefined)
    setSubmitting(false)
    if (result.error) {
      toast({ title: "Chyba", description: result.error, variant: "destructive" })
    } else {
      toast({ title: "Vyúčtování zamítnuto" })
      router.refresh()
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{vyuctovani.vyuctovani_number}</h1>
            <Badge className={STATUS_COLORS[vyuctovani.status]}>
              {STATUS_LABELS[vyuctovani.status]}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            Zakázka{" "}
            <Link href={`/zakazky/${order?.id}`} className="hover:text-nanto-yellow transition-colors">
              {order?.order_number}
            </Link>
            {" · "}
            {order?.client_name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {vyuctovani.status === "ke_schvaleni" && (
            <>
              <Button onClick={handleApprove} disabled={submitting} className="bg-green-600 hover:bg-green-700">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                Schválit
              </Button>
              <Button variant="destructive" onClick={handleReject} disabled={submitting}>
                <XCircle className="h-4 w-4" />
                Zamítnout
              </Button>
            </>
          )}
          {(vyuctovani.status === "koncept" || vyuctovani.status === "zamitnuto") && !editing && (
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Edit className="h-4 w-4" />
              Upravit
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Financial Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Finanční přehled
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {editing ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Materiál</Label>
                  <Input
                    type="number"
                    value={form.material_total}
                    onChange={(e) => setForm(f => ({ ...f, material_total: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Práce</Label>
                  <Input
                    type="number"
                    value={form.labor_total}
                    onChange={(e) => setForm(f => ({ ...f, labor_total: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ostatní náklady</Label>
                  <Input
                    type="number"
                    value={form.other_costs}
                    onChange={(e) => setForm(f => ({ ...f, other_costs: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Poznámky</Label>
                  <Textarea
                    value={form.notes}
                    onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setEditing(false)} className="flex-1">
                    Zrušit
                  </Button>
                  <Button onClick={handleSave} disabled={submitting} className="flex-1">
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Uložit
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between py-1.5">
                    <span className="text-muted-foreground">Materiál</span>
                    <span className="font-medium">{formatCurrency(vyuctovani.material_total)}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-muted-foreground">Práce</span>
                    <span className="font-medium">{formatCurrency(vyuctovani.labor_total)}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-muted-foreground">Ostatní</span>
                    <span className="font-medium">{formatCurrency(vyuctovani.other_costs)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between py-1.5">
                    <span className="text-muted-foreground">Celkem bez DPH</span>
                    <span className="font-semibold">{formatCurrency(vyuctovani.total_without_vat)}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-muted-foreground">Celkem s DPH</span>
                    <span className="font-bold text-lg">{formatCurrency(vyuctovani.total_with_vat)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between py-1.5">
                    <span className="text-muted-foreground">Zaplacená záloha</span>
                    <span className="font-medium text-green-600">{formatCurrency(vyuctovani.deposit_paid)}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="font-medium">Doplatek</span>
                    <span className="font-bold text-lg">{formatCurrency(vyuctovani.remaining_amount)}</span>
                  </div>
                </div>
                {vyuctovani.notes && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm text-muted-foreground">Poznámky</p>
                      <p className="text-sm whitespace-pre-wrap mt-1">{vyuctovani.notes}</p>
                    </div>
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Info */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Detail</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {protocol && (
                <div className="flex justify-between py-1.5 border-b">
                  <span className="text-muted-foreground">Protokol</span>
                  <span className="font-medium">{protocol.protocol_number}</span>
                </div>
              )}
              {protocol?.handover_date && (
                <div className="flex justify-between py-1.5 border-b">
                  <span className="text-muted-foreground">Datum předání</span>
                  <span className="font-medium">{formatDate(protocol.handover_date)}</span>
                </div>
              )}
              {protocol?.profiles && (
                <div className="flex justify-between py-1.5 border-b">
                  <span className="text-muted-foreground">Technik</span>
                  <span className="font-medium">{(protocol.profiles as any)?.full_name}</span>
                </div>
              )}
              {approver && (
                <div className="flex justify-between py-1.5 border-b">
                  <span className="text-muted-foreground">Schválil</span>
                  <span className="font-medium">{approver.full_name}</span>
                </div>
              )}
              {vyuctovani.approved_at && (
                <div className="flex justify-between py-1.5">
                  <span className="text-muted-foreground">Datum schválení</span>
                  <span className="font-medium">{formatDate(vyuctovani.approved_at)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Summary */}
          {vyuctovani.ai_summary && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">AI shrnutí</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{vyuctovani.ai_summary}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Order Items */}
      {order?.order_items && order.order_items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Položky zakázky</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Název</TableHead>
                  <TableHead className="text-right">Cena/ks</TableHead>
                  <TableHead className="text-right">Množství</TableHead>
                  <TableHead className="text-right">Celkem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.order_items
                  .sort((a: any, b: any) => a.sort_order - b.sort_order)
                  .map((item: any) => {
                    const lineTotal = item.unit_price * item.quantity * (1 - item.discount_percent / 100)
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                        <TableCell className="text-right">{item.quantity} {UNIT_LABELS[item.unit] || item.unit}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(lineTotal)}</TableCell>
                      </TableRow>
                    )
                  })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
