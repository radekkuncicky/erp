"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { OrderStatusBadge } from "@/components/shared/order-status-badge"
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatPhone,
  formatRelativeTime,
  ORDER_STATUS_LABELS,
  UNIT_LABELS,
} from "@/lib/utils/format"
import { ORDER_STATUS_TRANSITIONS } from "@/lib/utils/constants"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table"
import {
  ArrowRight,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  ClipboardList,
  Package,
  Receipt,
  FileText,
  Activity,
  Users,
  Loader2,
} from "lucide-react"
import type { OrderStatus } from "@/lib/supabase/types"

interface OrderItem {
  id: string
  name: string
  description: string | null
  unit_price: number
  cost_price: number
  quantity: number
  discount_percent: number
  vat_rate: number
  unit: string
  sort_order: number
}

interface OrderTechnician {
  id: string
  technician_id: string
  profiles: { full_name: string; email: string; phone: string | null }
}

interface ActivityEntry {
  id: string
  action: string
  description: string
  created_at: string
  profiles: { full_name: string } | null
}

interface Order {
  id: string
  order_number: string
  raynet_id: string | null
  client_name: string
  client_email: string | null
  client_phone: string | null
  contact_person: string | null
  contact_phone: string | null
  category: string | null
  status: OrderStatus
  total_price_without_vat: number
  deposit_with_vat: number | null
  installation_address: string | null
  address_street: string | null
  address_city: string | null
  address_zip: string | null
  project_start_date: string | null
  project_end_date: string | null
  project_manager_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
  profiles: { full_name: string } | null
  order_items: OrderItem[]
  order_technicians: OrderTechnician[]
  activity_log: ActivityEntry[]
}

interface OrderDetailProps {
  order: Order
  onStatusChange?: (newStatus: OrderStatus) => Promise<void>
}

export function OrderDetail({ order, onStatusChange }: OrderDetailProps) {
  const [changingStatus, setChangingStatus] = useState(false)
  const allowedTransitions = ORDER_STATUS_TRANSITIONS[order.status] || []

  const totalItems = order.order_items.reduce((sum, item) => {
    const lineTotal = item.unit_price * item.quantity * (1 - item.discount_percent / 100)
    return sum + lineTotal
  }, 0)

  const totalCost = order.order_items.reduce((sum, item) => {
    return sum + item.cost_price * item.quantity
  }, 0)

  const margin = totalItems > 0 ? ((totalItems - totalCost) / totalItems) * 100 : 0

  async function handleStatusChange(newStatus: OrderStatus) {
    if (!onStatusChange) return
    setChangingStatus(true)
    try {
      await onStatusChange(newStatus)
    } finally {
      setChangingStatus(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{order.order_number}</h1>
            <OrderStatusBadge status={order.status} />
          </div>
          <p className="text-muted-foreground mt-1">
            {order.client_name}
            {order.category && <> &middot; {order.category}</>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {allowedTransitions.map((status) => (
            <Button
              key={status}
              size="sm"
              onClick={() => handleStatusChange(status as OrderStatus)}
              disabled={changingStatus}
              variant={status === allowedTransitions[0] ? "default" : "outline"}
            >
              {changingStatus && <Loader2 className="animate-spin" />}
              <ArrowRight className="h-4 w-4" />
              {ORDER_STATUS_LABELS[status]}
            </Button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="polozky">
        <TabsList className="flex-wrap">
          <TabsTrigger value="polozky">
            <ClipboardList className="h-4 w-4 mr-1.5" />
            Položky
          </TabsTrigger>
          <TabsTrigger value="info">
            <User className="h-4 w-4 mr-1.5" />
            Info
          </TabsTrigger>
          <TabsTrigger value="technici">
            <Users className="h-4 w-4 mr-1.5" />
            Technici
          </TabsTrigger>
          <TabsTrigger value="finance">
            <Receipt className="h-4 w-4 mr-1.5" />
            Finance
          </TabsTrigger>
          <TabsTrigger value="dokumenty">
            <FileText className="h-4 w-4 mr-1.5" />
            Dokumenty
          </TabsTrigger>
          <TabsTrigger value="aktivita">
            <Activity className="h-4 w-4 mr-1.5" />
            Aktivita
          </TabsTrigger>
        </TabsList>

        {/* Items Tab */}
        <TabsContent value="polozky">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Položky zakázky</CardTitle>
              <Badge variant="secondary">{order.order_items.length} položek</Badge>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Název</TableHead>
                    <TableHead className="text-right">Cena/ks</TableHead>
                    <TableHead className="text-right">Množství</TableHead>
                    <TableHead className="text-right">Sleva</TableHead>
                    <TableHead className="text-right">DPH</TableHead>
                    <TableHead className="text-right">Celkem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.order_items
                    .sort((a, b) => a.sort_order - b.sort_order)
                    .map((item) => {
                      const lineTotal =
                        item.unit_price * item.quantity * (1 - item.discount_percent / 100)
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="text-muted-foreground">
                            {item.sort_order}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{item.name}</div>
                            {item.description && (
                              <div className="text-sm text-muted-foreground">
                                {item.description}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.unit_price)}
                          </TableCell>
                          <TableCell className="text-right">
                            {item.quantity} {UNIT_LABELS[item.unit] || item.unit}
                          </TableCell>
                          <TableCell className="text-right">
                            {item.discount_percent > 0
                              ? `${item.discount_percent} %`
                              : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            {item.vat_rate} %
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(lineTotal)}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={6} className="text-right font-semibold">
                      Celkem bez DPH
                    </TableCell>
                    <TableCell className="text-right font-bold text-lg">
                      {formatCurrency(totalItems)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Info Tab */}
        <TabsContent value="info">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Klient
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="font-medium">{order.client_name}</p>
                </div>
                {order.client_email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${order.client_email}`} className="hover:text-nanto-yellow">
                      {order.client_email}
                    </a>
                  </div>
                )}
                {order.client_phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${order.client_phone}`} className="hover:text-nanto-yellow">
                      {formatPhone(order.client_phone)}
                    </a>
                  </div>
                )}
                {order.contact_person && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm text-muted-foreground">Kontaktní osoba</p>
                      <p className="font-medium">{order.contact_person}</p>
                    </div>
                    {order.contact_phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <a href={`tel:${order.contact_phone}`} className="hover:text-nanto-yellow">
                          {formatPhone(order.contact_phone)}
                        </a>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Adresa instalace
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {order.installation_address ? (
                  <p>{order.installation_address}</p>
                ) : order.address_street ? (
                  <>
                    <p>{order.address_street}</p>
                    <p>
                      {order.address_city}
                      {order.address_zip && `, ${order.address_zip}`}
                    </p>
                  </>
                ) : (
                  <p className="text-muted-foreground">Adresa neuvedena</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Termíny
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Začátek</p>
                    <p className="font-medium">
                      {order.project_start_date
                        ? formatDate(order.project_start_date)
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Konec</p>
                    <p className="font-medium">
                      {order.project_end_date
                        ? formatDate(order.project_end_date)
                        : "—"}
                    </p>
                  </div>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">Projektový manažer</p>
                  <p className="font-medium">
                    {order.profiles?.full_name || "—"}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Další info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {order.raynet_id && (
                  <div>
                    <p className="text-sm text-muted-foreground">Raynet ID</p>
                    <p className="font-medium">{order.raynet_id}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Vytvořeno</p>
                  <p className="font-medium">{formatDateTime(order.created_at)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Aktualizováno</p>
                  <p className="font-medium">{formatRelativeTime(order.updated_at)}</p>
                </div>
                {order.notes && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm text-muted-foreground">Poznámky</p>
                      <p className="text-sm whitespace-pre-wrap">{order.notes}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Technicians Tab */}
        <TabsContent value="technici">
          <Card>
            <CardHeader>
              <CardTitle>Přiřazení technici</CardTitle>
            </CardHeader>
            <CardContent>
              {order.order_technicians.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  Žádní technici nejsou přiřazeni
                </p>
              ) : (
                <div className="space-y-3">
                  {order.order_technicians.map((ot) => (
                    <div
                      key={ot.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
                          <User className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">{ot.profiles.full_name}</p>
                          <p className="text-sm text-muted-foreground">{ot.profiles.email}</p>
                        </div>
                      </div>
                      {ot.profiles.phone && (
                        <a
                          href={`tel:${ot.profiles.phone}`}
                          className="text-sm text-muted-foreground hover:text-nanto-yellow"
                        >
                          {formatPhone(ot.profiles.phone)}
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Finance Tab */}
        <TabsContent value="finance">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Cena bez DPH
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(totalItems)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Náklady
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(totalCost)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Marže
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{margin.toFixed(1)} %</p>
                <p className="text-sm text-muted-foreground">
                  {formatCurrency(totalItems - totalCost)}
                </p>
              </CardContent>
            </Card>
          </div>
          {order.deposit_with_vat && order.deposit_with_vat > 0 && (
            <Card className="mt-4">
              <CardContent className="pt-6">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Záloha vč. DPH</span>
                  <span className="font-semibold">{formatCurrency(order.deposit_with_vat)}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="dokumenty">
          <Card>
            <CardHeader>
              <CardTitle>Dokumenty a fotografie</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-4">
                Dokumenty budou dostupné po připojení Supabase Storage
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="aktivita">
          <Card>
            <CardHeader>
              <CardTitle>Historie aktivit</CardTitle>
            </CardHeader>
            <CardContent>
              {order.activity_log.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  Žádná aktivita k zobrazení
                </p>
              ) : (
                <div className="space-y-4">
                  {order.activity_log
                    .sort(
                      (a, b) =>
                        new Date(b.created_at).getTime() -
                        new Date(a.created_at).getTime()
                    )
                    .map((entry) => (
                      <div key={entry.id} className="flex gap-3">
                        <div className="mt-1 h-2 w-2 rounded-full bg-nanto-yellow shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">{entry.description}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {entry.profiles?.full_name || "Systém"} &middot;{" "}
                            {formatRelativeTime(entry.created_at)}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
