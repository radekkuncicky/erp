"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { formatCurrency, formatDateTime, UNIT_LABELS } from "@/lib/utils/format"
import { receiveStock } from "@/actions/stock"
import { useToast } from "@/lib/hooks/use-toast"
import { Package, ArrowDownToLine, ArrowUpFromLine, Search, Plus } from "lucide-react"

interface StockPageClientProps {
  stock: any[]
  movements: any[]
  products: any[]
  error: string | null
}

export function StockPageClient({ stock, movements, products, error }: StockPageClientProps) {
  const [search, setSearch] = useState("")
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [receiptForm, setReceiptForm] = useState({ product_id: "", quantity: "", unit_price: "", note: "" })
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const filteredStock = stock.filter((s: any) => {
    if (!search) return true
    const name = (s.products as any)?.name?.toLowerCase() || ""
    const sku = (s.products as any)?.sku?.toLowerCase() || ""
    return name.includes(search.toLowerCase()) || sku.includes(search.toLowerCase())
  })

  async function handleReceive() {
    if (!receiptForm.product_id || !receiptForm.quantity || !receiptForm.unit_price) {
      toast({ title: "Chyba", description: "Vyplňte všechna povinná pole", variant: "destructive" })
      return
    }
    setSubmitting(true)
    const result = await receiveStock({
      product_id: receiptForm.product_id,
      quantity: parseInt(receiptForm.quantity),
      unit_price: parseFloat(receiptForm.unit_price),
      note: receiptForm.note || undefined,
    })
    setSubmitting(false)
    if (result.error) {
      toast({ title: "Chyba", description: result.error, variant: "destructive" })
    } else {
      toast({ title: "Příjem zaznamenán", description: "Stav skladu byl aktualizován" })
      setReceiptOpen(false)
      setReceiptForm({ product_id: "", quantity: "", unit_price: "", note: "" })
      router.refresh()
    }
  }

  if (error) {
    return <div className="rounded-xl border border-destructive/50 bg-destructive/5 p-8 text-center"><p className="text-destructive">{error}</p></div>
  }

  return (
    <Tabs defaultValue="prehled">
      <div className="flex items-center justify-between gap-4 mb-4">
        <TabsList>
          <TabsTrigger value="prehled">
            <Package className="h-4 w-4 mr-1.5" />
            Přehled
          </TabsTrigger>
          <TabsTrigger value="pohyby">
            <ArrowUpFromLine className="h-4 w-4 mr-1.5" />
            Pohyby
          </TabsTrigger>
        </TabsList>
        <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              Příjem zboží
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Příjem zboží na sklad</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Produkt</Label>
                <Select value={receiptForm.product_id} onValueChange={(v) => setReceiptForm(f => ({ ...f, product_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Vyberte produkt" /></SelectTrigger>
                  <SelectContent>
                    {products.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Množství</Label>
                  <Input type="number" min="1" value={receiptForm.quantity} onChange={(e) => setReceiptForm(f => ({ ...f, quantity: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Nákupní cena/ks</Label>
                  <Input type="number" min="0" step="0.01" value={receiptForm.unit_price} onChange={(e) => setReceiptForm(f => ({ ...f, unit_price: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Poznámka</Label>
                <Input value={receiptForm.note} onChange={(e) => setReceiptForm(f => ({ ...f, note: e.target.value }))} placeholder="Volitelná poznámka" />
              </div>
              <Button onClick={handleReceive} disabled={submitting} className="w-full">
                {submitting ? "Zpracovávám..." : "Přijmout na sklad"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stock Overview Tab */}
      <TabsContent value="prehled">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Stav skladu</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Hledat produkty..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Název</TableHead>
                  <TableHead>Kategorie</TableHead>
                  <TableHead className="text-right">Na skladě</TableHead>
                  <TableHead className="text-right">Rezervováno</TableHead>
                  <TableHead className="text-right">Dostupné</TableHead>
                  <TableHead className="text-right">Nákupní cena</TableHead>
                  <TableHead className="text-right">Prodejní cena</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStock.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Žádné položky na skladě</TableCell></TableRow>
                ) : (
                  filteredStock.map((item: any) => {
                    const product = item.products as any
                    const isLow = item.min_quantity > 0 && item.available <= item.min_quantity
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-sm">{product?.sku}</TableCell>
                        <TableCell className="font-medium">{product?.name}</TableCell>
                        <TableCell className="text-muted-foreground">{product?.category || "—"}</TableCell>
                        <TableCell className="text-right">{item.on_hand}</TableCell>
                        <TableCell className="text-right">{item.reserved > 0 ? <Badge variant="secondary">{item.reserved}</Badge> : "0"}</TableCell>
                        <TableCell className="text-right">
                          {isLow ? <Badge variant="destructive">{item.available}</Badge> : item.available}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">{formatCurrency(item.avg_purchase_price)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(product?.sell_price || 0)}</TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Movements Tab */}
      <TabsContent value="pohyby">
        <Card>
          <CardHeader>
            <CardTitle>Pohyby skladu</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Datum</TableHead>
                  <TableHead>Typ</TableHead>
                  <TableHead>Produkt</TableHead>
                  <TableHead className="text-right">Množství</TableHead>
                  <TableHead className="text-right">Cena/ks</TableHead>
                  <TableHead>Zakázka</TableHead>
                  <TableHead>Uživatel</TableHead>
                  <TableHead>Poznámka</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Žádné pohyby</TableCell></TableRow>
                ) : (
                  movements.map((m: any) => {
                    const typeLabels: Record<string, string> = { prijem: "Příjem", vydej: "Výdej", rezervace: "Rezervace", vraceni: "Vrácení" }
                    const typeColors: Record<string, string> = { prijem: "bg-green-100 text-green-800", vydej: "bg-red-100 text-red-800", rezervace: "bg-blue-100 text-blue-800", vraceni: "bg-yellow-100 text-yellow-800" }
                    return (
                      <TableRow key={m.id}>
                        <TableCell className="text-sm">{formatDateTime(m.created_at)}</TableCell>
                        <TableCell><Badge className={typeColors[m.movement_type] || ""}>{typeLabels[m.movement_type] || m.movement_type}</Badge></TableCell>
                        <TableCell className="font-medium">{(m.products as any)?.name || "—"}</TableCell>
                        <TableCell className="text-right font-medium">{m.movement_type === "vydej" ? `-${m.quantity}` : `+${m.quantity}`}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{m.unit_price ? formatCurrency(m.unit_price) : "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{(m.orders as any)?.order_number || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{(m.profiles as any)?.full_name || "—"}</TableCell>
                        <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">{m.note || "—"}</TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
